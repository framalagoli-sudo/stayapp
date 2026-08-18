// Test avversariale sul secondo fattore: verifica se una sessione a UN solo fattore
// (quella che si ottiene con la sola password, o dopo un reset) riesce a:
//   1. disattivare il TOTP dell'utente  → sarebbe un bypass completo del 2FA
//   2. leggere dati dalle nostre API    → deve rispondere 403 mfa_required
// Crea un utente e un'azienda effimeri e li elimina sempre.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes, createHmac } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// TOTP RFC 6238 per generare un codice valido dal secret dell'enroll.
function base32Decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0')
  const out = []
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(out)
}
function totp(secret, t = Date.now()) {
  const counter = Buffer.alloc(8)
  counter.writeBigInt64BE(BigInt(Math.floor(t / 1000 / 30)))
  const h = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const off = h[h.length - 1] & 0xf
  return String(((h.readUInt32BE(off) & 0x7fffffff) % 1000000)).padStart(6, '0')
}

const nuovoClient = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const aal = tok => JSON.parse(Buffer.from(tok.split('.')[1], 'base64').toString()).aal

let userId = null, aziendaId = null
try {
  const email = `probe-mfa-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')

  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `TEST-MFA-${Date.now()}`, require_2fa: true }).select().single()
  aziendaId = az.id
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = created.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'admin_azienda', full_name: 'Probe MFA', azienda_id: aziendaId }, { onConflict: 'id' })
  console.log('utente e azienda effimeri creati (require_2fa attivo)\n')

  // 1. login con sola password → attiva il TOTP
  const c1 = nuovoClient()
  const { data: s1 } = await c1.auth.signInWithPassword({ email, password })
  console.log('[1] login con password             → aal:', aal(s1.session.access_token))
  const { data: enroll, error: eErr } = await c1.auth.mfa.enroll({ factorType: 'totp' })
  if (eErr) throw new Error('enroll: ' + eErr.message)
  const { error: vErr } = await c1.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: totp(enroll.totp.secret) })
  if (vErr) throw new Error('verify: ' + vErr.message)
  const { data: sess2 } = await c1.auth.getSession()
  console.log('[2] dopo il codice TOTP            → aal:', aal(sess2.session.access_token), '(secondo fattore attivo)')

  // 2. nuova sessione con la SOLA password: è quella che ottiene un attaccante
  const c2 = nuovoClient()
  const { data: s3 } = await c2.auth.signInWithPassword({ email, password })
  const tokenAal1 = s3.session.access_token
  console.log('\n[3] nuovo login, solo password     → aal:', aal(tokenAal1), '← sessione dell’attaccante')

  // 3. con quella sessione, prova a DISATTIVARE il secondo fattore
  const { error: unErr } = await c2.auth.mfa.unenroll({ factorId: enroll.id })
  console.log('[4] disattivare il TOTP con aal1   →', unErr ? `RIFIUTATO (${unErr.message})` : '*** RIUSCITO: BYPASS DEL 2FA ***')

  // 4. con quella sessione, prova a leggere dalle nostre API
  for (const path of ['/api/auth/me', '/api/properties', '/api/contatti', '/api/aziende/' + aziendaId]) {
    const r = await fetch(TEST_URL + path, { headers: { Authorization: `Bearer ${tokenAal1}` } })
    let code = ''
    try { code = (await r.clone().json())?.code || '' } catch {}
    console.log(`[5] GET ${path.padEnd(28)} → HTTP ${r.status} ${code}`)
  }

  // 5. e prova a spegnere require_2fa dell'azienda con la stessa sessione
  const rp = await fetch(`${TEST_URL}/api/aziende/${aziendaId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenAal1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ require_2fa: false }),
  })
  console.log(`[6] PATCH require_2fa=false con aal1 → HTTP ${rp.status}`)
  const { data: azDopo } = await admin.from('aziende').select('require_2fa').eq('id', aziendaId).single()
  console.log('    require_2fa nel database dopo il tentativo:', azDopo.require_2fa)
} catch (e) {
  console.error('ERRORE:', e.message)
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
  // Niente .catch() su una query Supabase: non e' una Promise, va await-ata e basta.
  if (aziendaId) { const { error } = await admin.from('aziende').delete().eq('id', aziendaId); if (error) console.error('pulizia azienda:', error.message) }
  console.log('\n[probe] utente e azienda effimeri eliminati')
}
