import { requireAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'

function getAuthUrl(state) {
  const APP_URL = (process.env.APP_URL ?? '').trim() || process.env.NEXT_PUBLIC_APP_URL || 'https://oltrenova.com'
  const p = new URLSearchParams({
    client_id: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
    redirect_uri: `${APP_URL}/api/google-calendar/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/auth?${p}`
}

export async function GET(request) {
  const { user, response } = await requireAuth(request)
  if (response) return response
  if (!process.env.GOOGLE_CLIENT_ID) return Response.json({ error: 'Google Calendar non configurato' }, { status: 500 })
  const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
  return Response.redirect(getAuthUrl(profile?.azienda_id))
}
