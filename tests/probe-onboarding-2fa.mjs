// Prova il percorso di chi si trova il 2FA appena reso obbligatorio: deve poter
// leggere il flag (che è ciò che lo manda alla pagina di attivazione), registrare
// l'app e tornare operativo. Utente e azienda effimeri, sempre eliminati.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes, createHmac } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

function base32Decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0')
  const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(out)
}
function totp(secret) {
  const c = Buffer.alloc(8); c.writeBigInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)))
  const h = createHmac('sha1', base32Decode(secret)).update(c).digest()
  const o = h[h.length - 1] & 0xf
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0')
}

let userId = null, aziendaId = null
try {
  const email = `probe-onb-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `TEST-ONB-${Date.now()}`, require_2fa: true }).select().single()
  aziendaId = az.id
  const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = c.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'admin_azienda', full_name: 'Probe onboarding', azienda_id: aziendaId }, { onConflict: 'id' })

  const cli = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await cli.auth.signInWithPassword({ email, password })

  const { data: prof, error: pErr } = await cli.from('profiles').select('azienda_id, role').eq('id', userId).single()
  console.log('[1] il browser legge il proprio profilo      →', pErr ? 'NO: ' + pErr.message : 'si')

  const { data: azCli, error: aErr } = await cli.from('aziende').select('require_2fa').eq('id', aziendaId).single()
  console.log('[2] il browser legge require_2fa            →', aErr ? 'NO: ' + aErr.message : `si (valore: ${azCli.require_2fa})`)
  console.log('    ^ se fosse NO, l’utente non verrebbe guidato all’attivazione e resterebbe bloccato')

  const { data: enr, error: eErr } = await cli.auth.mfa.enroll({ factorType: 'totp' })
  console.log('[3] puo’ registrare l’app (QR + segreto)    →', eErr ? 'NO: ' + eErr.message : 'si')
  if (eErr) throw new Error('stop')

  const { error: vErr } = await cli.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) })
  console.log('[4] conferma con il codice a 6 cifre        →', vErr ? 'NO: ' + vErr.message : 'si')

  const { data: s } = await cli.auth.getSession()
  const r = await fetch(TEST_URL + '/api/properties', { headers: { Authorization: `Bearer ${s.session.access_token}` } })
  console.log('[5] dopo l’attivazione, le API rispondono   → HTTP', r.status, r.status === 200 ? '(operativo)' : '(ANCORA BLOCCATO)')
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) console.error('cleanup utente:', error.message) }
  if (aziendaId) { const { error } = await admin.from('aziende').delete().eq('id', aziendaId); if (error) console.error('cleanup azienda:', error.message) }
  console.log('\n[probe] utente e azienda effimeri eliminati')
}
