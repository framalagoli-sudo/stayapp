// Prova end-to-end delle passkey con un autenticatore virtuale (CDP), per sapere
// PRIMA di scrivere UI: il flusso funziona con la configurazione attuale? e che
// livello di sessione (aal) produce un accesso con passkey, visto che il nostro
// require_2fa pretende aal2? Utente effimero, sempre eliminato.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const aal = t => JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString()).aal

let userId = null, aziendaId = null, browser = null
try {
  const email = `probe-pk-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `TEST-PK-${Date.now()}`, require_2fa: true }).select().single()
  aziendaId = az.id
  const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = c.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'admin_azienda', full_name: 'Probe passkey', azienda_id: aziendaId }, { onConflict: 'id' })
  const cli = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: s } = await cli.auth.signInWithPassword({ email, password })
  console.log('[0] login con password              → aal:', aal(s.session.access_token))

  browser = await chromium.launch()
  const page = await browser.newPage()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  })
  await page.goto(TEST_URL + '/admin/login', { waitUntil: 'domcontentloaded' })

  const esito = await page.evaluate(async ({ url, anon, token }) => {
    const b64u = { to: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
                   from: s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)) }
    const post = (path, body, tok) => fetch(`${url}/auth/v1${path}`, {
      method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
      body: JSON.stringify(body || {}),
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }))

    // 1. registrazione
    const opt = await post('/passkeys/registration/options', { friendly_name: 'Probe device' }, token)
    if (opt.status !== 200) return { fase: 'registration/options', ...opt }
    const pk = opt.body.options
    const challengeId = opt.body.challenge_id
    pk.challenge = b64u.from(pk.challenge)
    pk.user.id = b64u.from(pk.user.id)
    if (pk.excludeCredentials) pk.excludeCredentials = pk.excludeCredentials.map(c => ({ ...c, id: b64u.from(c.id) }))
    const cred = await navigator.credentials.create({ publicKey: pk })
    const ver = await post('/passkeys/registration/verify', {
      challenge_id: challengeId,
      credential: { id: cred.id, rawId: b64u.to(cred.rawId), type: cred.type,
        response: { clientDataJSON: b64u.to(cred.response.clientDataJSON), attestationObject: b64u.to(cred.response.attestationObject) } },
    }, token)
    if (ver.status !== 200) return { fase: 'registration/verify', ...ver }

    // 2. accesso con la sola passkey
    const aopt = await post('/passkeys/authentication/options', {})
    if (aopt.status !== 200) return { fase: 'authentication/options', ...aopt }
    const apk = aopt.body.options
    const aChallengeId = aopt.body.challenge_id
    apk.challenge = b64u.from(apk.challenge)
    if (apk.allowCredentials) apk.allowCredentials = apk.allowCredentials.map(c => ({ ...c, id: b64u.from(c.id) }))
    const asr = await navigator.credentials.get({ publicKey: apk })
    const averify = await post('/passkeys/authentication/verify', {
      challenge_id: aChallengeId,
      credential: { id: asr.id, rawId: b64u.to(asr.rawId), type: asr.type,
        response: { clientDataJSON: b64u.to(asr.response.clientDataJSON), authenticatorData: b64u.to(asr.response.authenticatorData),
          signature: b64u.to(asr.response.signature), userHandle: asr.response.userHandle ? b64u.to(asr.response.userHandle) : null } },
    })
    return { fase: 'completato', status: averify.status, access_token: averify.body?.access_token, body: averify.body }
  }, { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY, token: s.session.access_token })

  if (esito.fase !== 'completato') {
    console.log(`[!] fermato a ${esito.fase} → HTTP ${esito.status}`, JSON.stringify(esito.body)?.slice(0, 200))
  } else {
    console.log('[1] registrazione passkey           → riuscita')
    console.log('[2] accesso con la SOLA passkey     → HTTP', esito.status)
    if (esito.access_token) {
      const claims = JSON.parse(Buffer.from(esito.access_token.split('.')[1], 'base64').toString())
      console.log('[3] livello della sessione ottenuta → aal:', claims.aal, '| amr:', JSON.stringify(claims.amr))
      const r = await fetch(TEST_URL + '/api/properties', { headers: { Authorization: `Bearer ${esito.access_token}` } })
      console.log('[4] le nostre API con quella sessione → HTTP', r.status, r.status === 200 ? '(passa)' : '(bloccata da require_2fa)')
    } else {
      console.log('    risposta:', JSON.stringify(esito.body)?.slice(0, 300))
    }
  }
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  if (browser) await browser.close().catch(() => {})
  if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) console.error('cleanup utente:', error.message) }
  if (aziendaId) { const { error } = await admin.from('aziende').delete().eq('id', aziendaId); if (error) console.error('cleanup azienda:', error.message) }
  console.log('\n[probe] utente effimero eliminato')
}
