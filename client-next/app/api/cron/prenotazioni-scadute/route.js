import { liberaPostiNonPagati, MINUTI_PER_PAGARE } from '@/lib/prenotazioni-scadute'
import { logError } from '@/lib/observability'
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
    const esito = await liberaPostiNonPagati()
    // ⚠️ Un webhook che non arriva va detto, non solo riparato in silenzio: se
    // capita spesso c'è qualcosa di rotto nella consegna, e il prossimo caso
    // potrebbe non avere un cron che lo raccoglie.
    if (esito.recuperate > 0) {
      await logError('cron/prenotazioni-scadute',
        new Error(`${esito.recuperate} pagamenti risultavano non pagati ma su Stripe erano riusciti: il webhook non è arrivato`),
        { alert: true })
    }
    await battitoEControllo('prenotazioni-scadute')
    return Response.json({ ok: true, minuti_per_pagare: MINUTI_PER_PAGARE, ...esito })
  } catch (e) {
    await logError('cron/prenotazioni-scadute', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
