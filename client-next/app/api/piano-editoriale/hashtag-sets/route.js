import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    const azienda_id = isSuperAdmin ? searchParams.get('azienda_id') : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    let q = supabaseAdmin.from('hashtag_sets').select('*').order('created_at', { ascending: false })
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.role === 'super_admin' ? (body.azienda_id || null) : profile?.azienda_id
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })
    const { nome, canale, pillar, tags } = body
    const { data, error } = await supabaseAdmin.from('hashtag_sets')
      .insert({ azienda_id, nome: nome || '', canale: canale || '', pillar: pillar || '', tags: Array.isArray(tags) ? tags : [] })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
