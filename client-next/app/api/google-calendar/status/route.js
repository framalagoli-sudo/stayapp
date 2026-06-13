import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const { data } = await supabaseAdmin.from('aziende')
      .select('google_calendar_token').eq('id', profile?.azienda_id).single()
    const tok = data?.google_calendar_token
    return Response.json({ connected: !!(tok?.refresh_token), email: tok?.email || null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
