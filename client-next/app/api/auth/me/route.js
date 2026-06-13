import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  const { user, response } = await requireAuth(request)
  if (response) return response
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, property_id, group_id, azienda_id, permissions')
    .eq('id', user.id)
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
