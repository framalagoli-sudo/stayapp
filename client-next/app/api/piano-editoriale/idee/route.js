import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfileData(userId, body, searchParams) {
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  if (!profile) return {}
  const isSuperAdmin = profile.role === 'super_admin'
  const azienda_id = isSuperAdmin ? (body?.azienda_id || searchParams?.get?.('azienda_id') || null) : profile.azienda_id
  return { ...profile, azienda_id, isSuperAdmin }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { azienda_id, isSuperAdmin } = await getProfileData(user.id, null, searchParams)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    let q = supabaseAdmin.from('idee_editoriali').select('*').order('created_at', { ascending: false })
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { azienda_id } = await getProfileData(user.id, body, null)
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })
    const { titolo, note, pillar, canali } = body
    const { data, error } = await supabaseAdmin.from('idee_editoriali')
      .insert({ azienda_id, titolo: titolo || '', note: note || '', pillar: pillar || '', canali: canali || [] })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
