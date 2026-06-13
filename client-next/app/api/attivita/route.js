import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { createDefaultSubdomain } from '@/lib/create-subdomain'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'attivita'
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('attivita').select('*').order('name')
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      q = q.eq('azienda_id', searchParams.get('azienda_id'))
    }
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile || !['super_admin', 'admin_azienda'].includes(profile.role))
      return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    const body = await request.json()
    const { name } = body
    if (!name?.trim()) return Response.json({ error: 'Il nome è obbligatorio' }, { status: 400 })
    const azienda_id = profile.role === 'super_admin' ? body.azienda_id : profile.azienda_id
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })

    const baseSlug = slugify(name)
    const { data: existing } = await supabaseAdmin.from('attivita').select('id').eq('slug', baseSlug).limit(1)
    const slug = existing?.length > 0 ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug

    const allowed = ['name', 'tipo', 'description', 'address', 'phone', 'email', 'schedule']
    const extras = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    const { data, error } = await supabaseAdmin.from('attivita').insert({ azienda_id, slug, ...extras }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    createDefaultSubdomain({ azienda_id, entity_tipo: 'attivita', entity_id: data.id, entity_slug: data.slug })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
