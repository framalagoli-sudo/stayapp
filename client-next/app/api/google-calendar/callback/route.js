import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'

// Verifica la firma HMAC dello `state` → ritorna l'azienda_id solo se autentico
// (anti-CSRF: un attaccante non può forgiare uno state per l'azienda di una vittima).
function verifyCalendarState(state) {
  if (typeof state !== 'string' || !state.includes('.')) return null
  const i = state.lastIndexOf('.')
  const aziendaId = state.slice(0, i), sig = state.slice(i + 1)
  const secret = (process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!secret || !aziendaId || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(aziendaId).digest('hex').slice(0, 32)
  const a = Buffer.from(sig), b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  return aziendaId
}

async function exchangeCode(code) {
  const APP_URL = (process.env.APP_URL ?? '').trim() || process.env.NEXT_PUBLIC_APP_URL || 'https://oltrenova.com'
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
      client_secret: (process.env.GOOGLE_CLIENT_SECRET ?? '').trim(),
      redirect_uri: `${APP_URL}/api/google-calendar/callback`,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const aziendaId = verifyCalendarState(searchParams.get('state'))
  const error = searchParams.get('error')
  const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'

  // aziendaId null = state assente/forgiato → rifiuta (anti-CSRF token-overwrite).
  if (error || !code || !aziendaId) {
    return Response.redirect(`${clientUrl}/admin/integrazioni?gcal=error`)
  }

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.access_token) throw new Error('no access_token')

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userRes.json()

    await supabaseAdmin.from('aziende').update({
      google_calendar_token: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: Date.now() + tokens.expires_in * 1000,
        email: userInfo.email || '',
      },
    }).eq('id', aziendaId)

    return Response.redirect(`${clientUrl}/admin/integrazioni?gcal=ok`)
  } catch (e) {
    console.error('[gcal] callback:', e.message)
    return Response.redirect(`${clientUrl}/admin/integrazioni?gcal=error`)
  }
}
