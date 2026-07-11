import crypto from 'crypto'
import { requireAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'

// `state` OAuth firmato HMAC: impedisce a un attaccante di forgiare uno state con
// l'azienda_id di una vittima (anti-CSRF). Secret solo server-side.
export function signCalendarState(aziendaId) {
  const secret = (process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const sig = crypto.createHmac('sha256', secret).update(String(aziendaId)).digest('hex').slice(0, 32)
  return `${aziendaId}.${sig}`
}

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
  if (!profile?.azienda_id) return Response.json({ error: 'Azienda non trovata' }, { status: 403 })
  return Response.redirect(getAuthUrl(signCalendarState(profile.azienda_id)))
}
