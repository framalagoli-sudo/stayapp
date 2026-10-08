import { liberaPostiNonPagati, liberaRisorseNonPagate, MINUTI_PER_PAGARE } from '@/lib/prenotazioni-scadute'
import { logError } from '@/lib/observability'
import { chiudiLinkScaduti } from '@/lib/link-pagamento'
import { battitoEControllo } from '@/lib/cron-battito'

// Restituisce i posti tenuti e mai pagati.
//
// Gira ogni cinque minuti: la scadenza è di trenta, quindi nel caso peggiore un
// posto resta occupato trentacinque minuti invece di trenta. Girare più spesso
// non servirebbe a niente e chiederebbe a Stripe più volte le stesse sessioni.

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // Eventi e risorse: due tabelle, la stessa regola. I numeri si sommano
    // perché a chi legge interessa «quanti posti sono tornati liberi».
    const eventi = await liberaPostiNonPagati()
    const risorse = await liberaRisorseNonPagate()
    // I link di pagamento mandati dal titolare: scaduti, tornano «si paga sul
    // posto» e la prenotazione resta.
    const link = await chiudiLinkScaduti()
    const esito = {
      esaminate: eventi.esaminate + risorse.esaminate, liberate: eventi.liberate + risorse.liberate,
      recuperate: eventi.recuperate + risorse.recuperate + link.recuperati, incerte: eventi.incerte + risorse.incerte + link.incerti,
      motivi: [...eventi.motivi, ...risorse.motivi, ...link.motivi],
      link_scaduti: link.chiusi,
    }
    // ⚠️ Un webhook che non arriva va detto, non solo riparato in silenzio: se
    // capita spesso c'è qualcosa di rotto nella consegna, e il prossimo caso
    // potrebbe non avere un cron che lo raccoglie.
    if (esito.recuperate > 0) {
      await logError('cron/prenotazioni-scadute',
        new Error(`${esito.recuperate} pagamenti risultavano non pagati ma su Stripe erano riusciti: il webhook non è arrivato`),
        { alert: true })
    }
    // ⛔ «Incerte» era un numero che nessuno leggeva: il cron diceva «ok» e
    // saltava, e una prenotazione mai pagata è rimasta «confermata» nove giorni.
    // Ora il motivo arriva per email (al massimo una all'ora, dice logError).
    if (esito.incerte > 0) {
      await logError('cron/prenotazioni-scadute',
        new Error(`${esito.incerte} prenotazioni non pagate non si possono verificare su Stripe: ${esito.motivi.slice(0, 5).join(' · ')}`),
        { alert: true })
    }
    await battitoEControllo('prenotazioni-scadute')
    return Response.json({ ok: true, minuti_per_pagare: MINUTI_PER_PAGARE, ...esito })
  } catch (e) {
    await logError('cron/prenotazioni-scadute', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
