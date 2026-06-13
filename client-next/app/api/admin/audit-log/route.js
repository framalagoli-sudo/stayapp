import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const offset = Number(searchParams.get('offset')) || 0

    let query = supabaseAdmin.from('audit_log').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (searchParams.get('method'))      query = query.eq('method', searchParams.get('method').toUpperCase())
    if (searchParams.get('entity_tipo')) query = query.eq('entity_tipo', searchParams.get('entity_tipo'))
    if (searchParams.get('user_email'))  query = query.ilike('user_email', `%${searchParams.get('user_email')}%`)

    const { data, count, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data, count, limit, offset })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
