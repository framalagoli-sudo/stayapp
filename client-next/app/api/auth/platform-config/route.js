import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function isSuperAdmin(request) {
  const { user, response } = await requireAuth(request)
  if (response) return { user: null, profile: null, response }
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { user, profile, response: Response.json({ error: 'Solo super admin' }, { status: 403 }) }
  return { user, profile, response: null }
}

export async function GET(request) {
  try {
    const { response } = await isSuperAdmin(request)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('platform_config').select('*').eq('id', 1).single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || { signup_enabled: false })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request) {
  try {
    const { response } = await isSuperAdmin(request)
    if (response) return response
    const body = await request.json()
    const allowed = ['signup_enabled']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('platform_config').upsert({ id: 1, ...updates }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
