import { supabase } from './supabase.js'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI  = `${process.env.APP_URL}/api/google-calendar/callback`
const SCOPES        = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'

export function getAuthUrl(state) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/auth?${p}`
}

export async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

async function refreshToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET, grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

async function getValidAccessToken(aziendaId) {
  const { data: az } = await supabase.from('aziende')
    .select('google_calendar_token').eq('id', aziendaId).single()
  const tok = az?.google_calendar_token
  if (!tok?.refresh_token) return null

  // Valido con buffer 5 min
  if (tok.expiry_date && tok.expiry_date > Date.now() + 300_000) return tok.access_token

  const refreshed = await refreshToken(tok.refresh_token)
  if (!refreshed.access_token) return null

  const updated = { ...tok, access_token: refreshed.access_token, expiry_date: Date.now() + refreshed.expires_in * 1000 }
  await supabase.from('aziende').update({ google_calendar_token: updated }).eq('id', aziendaId)
  return updated.access_token
}

function endTime(start, durationMinutes) {
  if (!start) return '10:00:00'
  const [h, m] = start.split(':').map(Number)
  const tot = h * 60 + m + (durationMinutes || 60)
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}:00`
}

export async function syncBookingCreate(prenotazione, risorsa) {
  try {
    const accessToken = await getValidAccessToken(prenotazione.azienda_id)
    if (!accessToken) return

    const start = `${prenotazione.data}T${prenotazione.ora_inizio || '09:00:00'}`
    const end   = `${prenotazione.data}T${prenotazione.ora_fine  || endTime(prenotazione.ora_inizio, risorsa?.durata_minuti)}`

    const body = {
      summary: `${risorsa?.nome || 'Prenotazione'} — ${prenotazione.cliente_nome}`,
      description: [
        `Cliente: ${prenotazione.cliente_nome}`,
        `Email: ${prenotazione.cliente_email}`,
        prenotazione.cliente_telefono && `Tel: ${prenotazione.cliente_telefono}`,
        prenotazione.n_persone > 1   && `Persone: ${prenotazione.n_persone}`,
        prenotazione.note_cliente    && `Note: ${prenotazione.note_cliente}`,
        `Importo: €${prenotazione.importo_totale ?? 0}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: start, timeZone: 'Europe/Rome' },
      end:   { dateTime: end,   timeZone: 'Europe/Rome' },
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const evt = await res.json()
    if (evt.id) {
      await supabase.from('prenotazioni').update({ google_event_id: evt.id }).eq('id', prenotazione.id)
    }
  } catch (e) { console.error('[gcal] create:', e.message) }
}

export async function syncBookingDelete(aziendaId, googleEventId) {
  try {
    if (!googleEventId) return
    const accessToken = await getValidAccessToken(aziendaId)
    if (!accessToken) return

    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (e) { console.error('[gcal] delete:', e.message) }
}
