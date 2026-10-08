import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'
import { syncBookingCreate, syncBookingDelete } from '@/lib/google-calendar-stub'
import { mandaEmailPrenotazione, automazioniPrenotazione } from '@/lib/prenotazione-risorsa'
import { STATI_PRENOTAZIONE } from '@/lib/stato-prenotazione'
import { logError } from '@/lib/observability'
import { ritiraLink } from '@/lib/link-pagamento'

export async function PATCH(request, props) {
  const params = await props.params;
  try {
    const { response } = await requireRecordAccess(request, 'prenotazioni', params.id)
    if (response) return response
    const body = await request.json()
    const allowed = ['stato', 'note_interne', 'n_persone']
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    payload.updated_at = new Date().toISOString()
    // Lo stato arriva dal client: catalogo chiuso. Una stringa inventata
    // creerebbe una prenotazione che nessuna lista conta.
    if (payload.stato !== undefined && !STATI_PRENOTAZIONE.includes(payload.stato)) {
      return Response.json({ error: 'Stato non valido' }, { status: 400 })
    }

    const { data: prev } = await supabaseAdmin.from('prenotazioni').select('*').eq('id', params.id).single()
    // Il titolare conferma a mano una prenotazione che aspettava il pagamento:
    // vuol dire «la tengo io, pagherà sul posto». Il pagamento online smette di
    // essere atteso — altrimenti il giro che libera ciò che non è stato pagato
    // la annullerebbe contro la sua decisione.
    const attendevaPagamento = prev?.stato === 'in_attesa' && prev?.pagamento_stato === 'non_pagato'
    // Annullata con un link di pagamento ancora valido: il link si chiude,
    // altrimenti la persona potrebbe pagare una prenotazione che non c'è più.
    if (payload.stato === 'cancellata' && prev) Object.assign(payload, await ritiraLink('risorsa', prev, prev.azienda_id) || {})
    if (payload.stato === 'confermata' && attendevaPagamento) {
      payload.pagamento_stato = 'non_richiesto'
      payload.importo_online = null
    }
    const { data, error } = await supabaseAdmin.from('prenotazioni').update(payload).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    if (prev && payload.stato) {
      if (payload.stato === 'cancellata' && prev.google_event_id) {
        syncBookingDelete(prev.azienda_id, prev.google_event_id)
      } else if (payload.stato === 'confermata' && prev.stato === 'in_attesa') {
        const { data: risorsa } = prev.risorsa_id
          ? await supabaseAdmin.from('risorse').select('*').eq('id', prev.risorsa_id).maybeSingle()
          : { data: null }
        if (risorsa && !prev.google_event_id) syncBookingCreate(data, risorsa)
        // ⛔ Approvando una richiesta non partiva NIENTE verso chi l'aveva fatta:
        // la persona restava con «richiesta ricevuta» e nessuna conferma.
        // Adesso riceve «Prenotazione confermata». Si aspetta: dopo la risposta
        // il lavoro non è garantito.
        if (risorsa) {
          try {
            await mandaEmailPrenotazione(data, risorsa, 'confermata')
            // Chi aspettava il pagamento non aveva ancora avuto promemoria né
            // «nuova prenotazione»: partono ora che è vera. Una richiesta
            // approvata li aveva già avuti quando è arrivata.
            if (attendevaPagamento) await automazioniPrenotazione(data, risorsa)
          } catch (e) { await logError('booking/conferma-manuale', e, { alert: true }) }
        }
      }
    }

    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params;
  try {
    const { response } = await requireRecordAccess(request, 'prenotazioni', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('prenotazioni').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
