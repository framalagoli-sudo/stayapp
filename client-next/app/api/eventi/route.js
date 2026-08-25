import { supabaseAdmin } from '@/lib/supabase-server'
import { formatoValido, focalValido } from '@/lib/formati-foto'
import { requireAuth, resolveAziendaId, entitaDellaAzienda } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUUID(v) { return UUID_RE.test(v) }

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

const ALLOWED = ['title', 'description', 'cover_url', 'date_start', 'date_end',
  'location', 'price', 'seats_total', 'active', 'published', 'packages', 'entity_tipo', 'entity_id',
  'notify_owner_on_booking', 'send_guest_confirmation', 'formato_cover', 'cover_focal',
  'cta_label', 'cta_condizioni', 'mostra_prezzo', 'mostra_prezzo_pagina', 'prezzo_testo']

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('eventi').select('*').order('date_start')
    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    if (!['super_admin', 'admin_azienda'].includes(profile.role))
      return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    const body = await request.json()
    const { title, date_start } = body
    if (!title?.trim()) return Response.json({ error: 'Il titolo è obbligatorio' }, { status: 400 })
    if (!date_start) return Response.json({ error: 'La data è obbligatoria' }, { status: 400 })

    const azienda_id = resolveAziendaId(profile, isUUID(body.azienda_id) ? body.azienda_id : null)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda valida associata al profilo.' }, { status: 400 })

    let base = slugify(title), slug = base, n = 0
    while (true) {
      const { data: ex } = await supabaseAdmin.from('eventi').select('id').eq('slug', slug).maybeSingle()
      if (!ex) break
      slug = `${base}-${(++n).toString(36)}`
    }

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
    if (typeof payload.prezzo_testo === 'string') payload.prezzo_testo = payload.prezzo_testo.trim().slice(0, 40) || null
    if ('mostra_prezzo' in payload) payload.mostra_prezzo = payload.mostra_prezzo !== false
    if ('mostra_prezzo_pagina' in payload) payload.mostra_prezzo_pagina = payload.mostra_prezzo_pagina !== false
    if (payload.entity_id && !isUUID(payload.entity_id)) { payload.entity_id = null; payload.entity_tipo = null }
    // L'entità dev'essere propria: altrimenti l'evento comparirebbe sul sito di
    // un altro cliente, raccogliendone anche le prenotazioni.
    if (!(await entitaDellaAzienda(profile, payload.entity_tipo, payload.entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }
    const { data, error } = await supabaseAdmin.from('eventi').insert({ ...payload, azienda_id, slug }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
