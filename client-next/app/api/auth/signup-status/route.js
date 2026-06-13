import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data } = await supabaseAdmin.from('platform_config').select('signup_enabled').eq('id', 1).single()
    return Response.json({ signup_enabled: data?.signup_enabled ?? false })
  } catch { return Response.json({ signup_enabled: false }) }
}
