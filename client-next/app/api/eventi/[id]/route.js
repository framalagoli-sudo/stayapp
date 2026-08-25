import { supabaseAdmin } from '@/lib/supabase-server'
import { formatoValido, focalValido } from '@/lib/formati-foto'
import { requireRecordAccess, entitaDellaAzienda } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUUID(v) { return UUID_RE.test(v) }

const ALLOWED = ['title', 'description', 'cover_url', 'date_start', 'date_end',
  'location', 'price', 'seats_total', 'active', 'published', 'packages', 'entity_tipo', 'entity_id',
  'notify_owner_on_booking', 'send_guest_confirmation', 'formato_cover', 'cover_focal',
  'cta_label', 'cta_condizioni']

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
    if (typeof payload.cta_condizioni === 'string') payload.cta_condizioni = payload.cta_condizioni.trim().slice(0, 600) || null
    if (payload.entity_id && !isUUID(payload.entity_id)) { payload.entity_id = null; payload.entity_tipo = null }
    // Spostare l'evento su un'entità altrui lo pubblicherebbe sul sito di un
    // altro cliente: il record è mio, la destinazione no.
    if (!(await entitaDellaAzienda(profile, payload.entity_tipo, payload.entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
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
