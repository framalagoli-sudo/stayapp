import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, resolveAziendaId } from '@/lib/server-auth'

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
  'location', 'price', 'seats_total', 'active', 'published', 'packages', 'entity_tipo', 'entity_id']

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
    if (payload.entity_id && !isUUID(payload.entity_id)) { payload.entity_id = null; payload.entity_tipo = null }
    const { data, error } = await supabaseAdmin.from('eventi').insert({ ...payload, azienda_id, slug }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
