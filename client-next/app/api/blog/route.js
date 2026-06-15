import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, resolveAziendaId } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function toUuid(v) { return (v && UUID_RE.test(v)) ? v : null }

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('articoli')
      .select('id, title, slug, excerpt, cover_url, published, published_at, created_at, category_id, entity_tipo, entity_id, author, active')
      .order('created_at', { ascending: false })

    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      q = q.eq('azienda_id', searchParams.get('azienda_id'))
    }

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const body = await request.json()
    const { title, excerpt, content, cover_url, author, category_id, entity_tipo, entity_id, published } = body
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id || !title?.trim()) return Response.json({ error: 'azienda_id e title obbligatori' }, { status: 400 })

    let slug = slugify(title) || `articolo-${Date.now().toString(36)}`
    const { count } = await supabaseAdmin.from('articoli').select('id', { count: 'exact', head: true }).like('slug', `${slug}%`)
    if (count > 0) slug = `${slug}-${Date.now().toString(36)}`

    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('articoli').insert({
      azienda_id, slug, title: title.trim(),
      excerpt: excerpt || null, content: content || null,
      cover_url: cover_url || null, author: author || null,
      category_id: toUuid(category_id),
      entity_tipo: entity_tipo || null, entity_id: toUuid(entity_id),
      published: !!published, published_at: published ? now : null,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
