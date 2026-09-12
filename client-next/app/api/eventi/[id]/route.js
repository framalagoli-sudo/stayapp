import { supabaseAdmin } from '@/lib/supabase-server'
import { formatoValido, focalValido } from '@/lib/formati-foto'
import { requireRecordAccess, entitaDellaAzienda } from '@/lib/server-auth'
import { slugEvento, slugLibero } from '@/lib/evento-indirizzo'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUUID(v) { return UUID_RE.test(v) }

const ALLOWED = ['title', 'description', 'cover_url', 'date_start', 'date_end',
  'location', 'price', 'seats_total', 'active', 'published', 'packages', 'entity_tipo', 'entity_id',
  'notify_owner_on_booking', 'send_guest_confirmation', 'formato_cover', 'cover_focal',
  'cta_label', 'cta_condizioni', 'acconto_percentuale', 'mostra_prezzo', 'mostra_prezzo_pagina', 'prezzo_testo',
  'prenotazioni_chiuse', 'prenotazioni_chiuse_testo', 'slug']

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('eventi').select('*').eq('id', params.id).single()
    if (error || !data) return Response.json({ error: 'Evento non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, props) {
  const params = await props.params;
  try {
    const { profile, response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const body = await request.json()
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    // Questi due finiscono in una proprietà CSS della pagina pubblica: si
    // accettano solo una chiave del catalogo e una coppia di percentuali.
    // Qualsiasi altra cosa diventa null, cioè il predefinito.
    if ('formato_cover' in payload) payload.formato_cover = formatoValido(payload.formato_cover)
    if ('cover_focal' in payload) payload.cover_focal = focalValido(payload.cover_focal)
    // Il testo del pulsante e' una riga, le condizioni un paragrafo: si tagliano
    // qui, cosi il cliente vede il testo accorciato invece di un errore opaco.
    if (typeof payload.cta_label === 'string') payload.cta_label = payload.cta_label.trim().slice(0, 60) || null
    // Una stringa vuota non e' un messaggio: diventa null, cosi la pagina usa
    // la frase predefinita invece di mostrare un riquadro senza testo.
    if (typeof payload.prenotazioni_chiuse_testo === 'string')
      payload.prenotazioni_chiuse_testo = payload.prenotazioni_chiuse_testo.trim().slice(0, 300) || null
    if (typeof payload.cta_condizioni === 'string') payload.cta_condizioni = payload.cta_condizioni.trim().slice(0, 600) || null
    if (typeof payload.prezzo_testo === 'string') payload.prezzo_testo = payload.prezzo_testo.trim().slice(0, 40) || null
    if ('mostra_prezzo' in payload) payload.mostra_prezzo = payload.mostra_prezzo !== false
    if ('mostra_prezzo_pagina' in payload) payload.mostra_prezzo_pagina = payload.mostra_prezzo_pagina !== false
    if (payload.entity_id && !isUUID(payload.entity_id)) { payload.entity_id = null; payload.entity_tipo = null }
    // Spostare l'evento su un'entità altrui lo pubblicherebbe sul sito di un
    // altro cliente: il record è mio, la destinazione no.
    if (!(await entitaDellaAzienda(profile, payload.entity_tipo, payload.entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }
    // ── L'indirizzo pubblico ────────────────────────────────────────────────
    // Si può cambiare, ma il vecchio non muore: chi l'ha condiviso su un social
    // non torna indietro a correggere il link. Quello di prima finisce
    // nell'elenco degli indirizzi che portano ancora qui (migration 114).
    if ('slug' in payload) {
      const { data: prima } = await supabaseAdmin.from('eventi')
        .select('slug').eq('id', params.id).maybeSingle()
      const richiesto = slugEvento(payload.slug)
      if (!richiesto || richiesto === prima?.slug) {
        delete payload.slug               // svuotato o uguale a prima: niente da fare
      } else {
        payload.slug = await slugLibero(richiesto, params.id)
        // ⚠️ La colonna arriva con la migration 114. Finché non è stata
        // eseguita si cambia lo slug lo stesso — il vecchio indirizzo non viene
        // conservato, ma salvare l'evento non deve fallire per questo.
        const { data: storico, error: errStorico } = await supabaseAdmin.from('eventi')
          .select('slug_precedenti').eq('id', params.id).maybeSingle()
        if (!errStorico) {
          const vecchi = new Set(storico?.slug_precedenti || [])
          if (prima?.slug) vecchi.add(prima.slug)
          vecchi.delete(payload.slug)
          payload.slug_precedenti = [...vecchi].slice(-20)
        }
      }
    }

    payload.updated_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('eventi').update(payload).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params;
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('eventi').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
