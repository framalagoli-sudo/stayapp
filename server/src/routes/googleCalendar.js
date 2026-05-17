import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { getAuthUrl, exchangeCode } from '../lib/googleCalendar.js'

const router = express.Router()

// GET /api/google-calendar/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('aziende')
      .select('google_calendar_token').eq('id', req.user.azienda_id).single()
    const tok = data?.google_calendar_token
    res.json({ connected: !!(tok?.refresh_token), email: tok?.email || null })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/google-calendar/auth — redirect a Google OAuth
router.get('/auth', requireAuth, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google Calendar non configurato' })
  res.redirect(getAuthUrl(req.user.azienda_id))
})

// GET /api/google-calendar/callback — Google rimanda qui dopo il consenso
router.get('/callback', async (req, res) => {
  const { code, state: aziendaId, error } = req.query
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  if (error || !code || !aziendaId) {
    return res.redirect(`${clientUrl}/admin/integrazioni?gcal=error`)
  }

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.access_token) throw new Error('no access_token')

    // Recupera email account Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userRes.json()

    const tokenData = {
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date:   Date.now() + tokens.expires_in * 1000,
      email:         userInfo.email || '',
    }

    await supabase.from('aziende').update({ google_calendar_token: tokenData }).eq('id', aziendaId)
    res.redirect(`${clientUrl}/admin/integrazioni?gcal=ok`)
  } catch (e) {
    console.error('[gcal] callback:', e.message)
    res.redirect(`${clientUrl}/admin/integrazioni?gcal=error`)
  }
})

// DELETE /api/google-calendar/disconnect
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    await supabase.from('aziende').update({ google_calendar_token: null }).eq('id', req.user.azienda_id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
