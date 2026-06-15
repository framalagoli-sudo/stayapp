import { supabaseAdmin } from '@/lib/supabase-server'

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
  const aziendaId = searchParams.get('state')
  const error = searchParams.get('error')
  const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'

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
