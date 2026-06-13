import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('blog_categories').select('*').order('name')
    if (searchParams.get('azienda_id')) q = q.eq('azienda_id', searchParams.get('azienda_id'))
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { azienda_id, name, description } = await request.json()
    if (!azienda_id || !name?.trim()) return Response.json({ error: 'azienda_id e name obbligatori' }, { status: 400 })
    const slug = slugify(name) || `cat-${Date.now().toString(36)}`
    const { data, error } = await supabaseAdmin.from('blog_categories')
      .insert({ azienda_id, name: name.trim(), slug, description: description || null }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
