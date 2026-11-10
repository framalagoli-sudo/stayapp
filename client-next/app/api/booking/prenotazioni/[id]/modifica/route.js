// Il titolare modifica una prenotazione: date, dati del cliente, totale.
//
// `{ anteprima: true }` fa i conti senza scrivere niente: il pannello mostra il
// totale col listino e gli avvisi prima che si prema «Salva».
// Le regole stanno in `lib/modifica-prenotazione.js`.

import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'
import { prepara, salva } from '@/lib/modifica-prenotazione'
import { mandaEmailPrenotazione } from '@/lib/prenotazione-risorsa'
import { registraContatto } from '@/lib/crm'
import { logError } from '@/lib/observability'
import { after } from 'next/server'

export async function POST(request, props) {
  const params = await props.params
  try {
    // «Esiste ed è tua?» prima di ogni lettura: a un'altra azienda risponde come
    // a un id inventato.
    const { response } = await requireRecordAccess(request, 'prenotazioni', params.id)
    if (response) return response
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return Response.json({ error: 'Richiesta non valida' }, { status: 400 })

    const { data: prev, error: e1 } = await supabaseAdmin.from('prenotazioni').select('*').eq('id', params.id).single()
    if (e1 || !prev) return Response.json({ error: 'Non trovato' }, { status: 404 })
    const { data: risorsa } = prev.risorsa_id
      ? await supabaseAdmin.from('risorse').select('*').eq('id', prev.risorsa_id).maybeSingle()
      : { data: null }

    const preparato = await prepara(prev, risorsa, body)
    if (preparato.errore) return Response.json({ error: preparato.errore }, { status: preparato.status })

    if (body.anteprima === true) {
      return Response.json({
        totale: preparato.totale,
        listino: preparato.conto ? preparato.conto.totale : null,
        giorni: preparato.conto?.giorni?.length ?? null,
        offerta: preparato.conto?.offerta?.nome || null,
        pagata: preparato.pagata,
        avvisi: preparato.avvisi,
      })
    }

    const esito = await salva(prev, risorsa, preparato)
    if (esito.errore) return Response.json({ error: esito.errore }, { status: esito.status })
    const nuova = esito.prenotazione

    // Avvisare il cliente è una scelta del titolare, ogni volta.
    let email = null
    if (body.avvisa === true) {
      if (!risorsa) email = 'non_prevista'
      else if (!nuova.cliente_email) email = 'senza_indirizzo'
      else email = (await mandaEmailPrenotazione(nuova, risorsa, 'modificata')) ? 'inviata' : 'non_partita'
      if (email === 'non_partita') await logError('booking/modifica-email', new Error('email «modificata» non partita'), { alert: false })
    }

    // Un recapito nuovo entra fra i contatti (la stessa riga del registro non
    // si duplica: il riferimento è la prenotazione).
    const recapitoNuovo = (nuova.cliente_email && nuova.cliente_email !== prev.cliente_email) ||
      (nuova.cliente_telefono && nuova.cliente_telefono !== prev.cliente_telefono)
    if (recapitoNuovo) {
      after(() => registraContatto({
        aziendaId: nuova.azienda_id,
        email: nuova.cliente_email, nome: nuova.cliente_nome, telefono: nuova.cliente_telefono,
        fonte: 'prenotazione',
        attivita: { tipo: 'prenotazione', titolo: risorsa?.nome || 'Prenotazione', origineId: risorsa?.id || prev.offerta_id, riferimento: nuova.id, entityId: risorsa?.entity_id || prev.entity_id, dettaglio: { persone: nuova.n_persone, canale: 'modifica' } },
      }))
    }

    return Response.json({ prenotazione: nuova, avvisi: esito.avvisi, email })
  } catch (e) {
    await logError('booking/modifica', e)
    return Response.json({ error: 'Non sono riuscito a salvare la modifica' }, { status: 500 })
  }
}
