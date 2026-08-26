import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'
import { impegnoValido, modoDedotto } from '@/lib/offerte-catalogo'
import { formatoValido, focalValido } from '@/lib/formati-foto'

// Le stesse colonne che il pannello può scrivere in creazione. Restano fuori
// `azienda_id` (chi crea un'offerta non la sposta a un'altra azienda),
// `posti_occupati` (lo muove chi prenota: azzerarlo rivenderebbe posti già
// venduti), `origine` e `origine_id`.
const AMMESSI = [
  'entity_id', 'impegno', 'titolo', 'descrizione', 'categoria',
  'cover_url', 'formato_cover', 'cover_focal', 'colore',
  'luogo', 'prezzo', 'valuta', 'mostra_prezzo', 'mostra_prezzo_pagina', 'prezzo_testo',
  'data_inizio', 'data_fine', 'durata_minuti', 'quantita', 'max_coperti',
  'posti_totali', 'disponibilita', 'chiusure', 'pacchetti',
  'cta_label', 'cta_condizioni', 'avvisa_titolare', 'conferma_ospite',
  'attiva', 'pubblicata', 'ordine',
]

export async function PATCH(request, props) {
  const params = await props.params
  try {
    // Controlla in un colpo solo che chi scrive sia autenticato e che questa
    // offerta sia della sua azienda.
    const { profile, response } = await requireRecordAccess(request, 'offerte', params.id)
    if (response) return response

    const body = await request.json()
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => AMMESSI.includes(k)))

    if ('impegno' in payload) payload.impegno = impegnoValido(payload.impegno) || 'chiedi'
    // Il «quando» lo dicono le date: se cambiano, si ricalcola. Non è una
    // domanda in più da fare al cliente.
    if ('data_inizio' in payload) payload.modo = modoDedotto(payload)
    if ('formato_cover' in payload) payload.formato_cover = formatoValido(payload.formato_cover)
    if ('cover_focal' in payload) payload.cover_focal = focalValido(payload.cover_focal)

    // Spostare un'offerta su un'altra entità è legittimo, ma solo dentro la
    // propria azienda: `entity_id` arriva dal client come tutto il resto.
    if (payload.entity_id) {
      const { data: mia } = await supabaseAdmin.from('offerte').select('azienda_id').eq('id', params.id).single()
      const { data: ent } = await supabaseAdmin.from('entita').select('azienda_id').eq('id', payload.entity_id).maybeSingle()
      if (!ent || !mia || ent.azienda_id !== mia.azienda_id)
        return Response.json({ error: 'Entità non valida' }, { status: 403 })
    }

    if (!Object.keys(payload).length) return Response.json({ error: 'Niente da salvare' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('offerte')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params
  try {
    const { response } = await requireRecordAccess(request, 'offerte', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('offerte').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
