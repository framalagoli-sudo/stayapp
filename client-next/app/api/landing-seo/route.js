import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('landing_seo').select('*').single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || {})
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const body = await request.json()
    const { data: existing } = await supabaseAdmin.from('landing_seo').select('id').single()
    const payload = { ...body, updated_at: new Date().toISOString() }

    let result
    if (existing) {
      const { data, error } = await supabaseAdmin.from('landing_seo').update(payload).eq('id', existing.id).select().single()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      result = data
    } else {
      const { data, error } = await supabaseAdmin.from('landing_seo').insert(payload).select().single()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      result = data
    }
    return Response.json(result)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
