// «Inizia qui» provato come lo usa il titolare, e come lo userebbe un estraneo.
//
// 1. La route /api/primi-passi: senza accesso 401, staff 403, super_admin senza
//    azienda 400; un titolare che chiede un'altra azienda riceve comunque la
//    SUA. Il corpo grezzo non deve contenere email né telefoni dei clienti:
//    solo esiti e nomi di campi.
// 2. Per ogni azienda vera, la Dashboard aperta da un titolare di prova col
//    secondo fattore fatto come una persona (il 2FA dei clienti non si spegne
//    mai per provare): il riquadro c'è solo se manca qualcosa, e dice cosa.
//
// Uso (a mano: tocca aziende vere, per un minuto ciascuna):
//   node probe-inizia-qui.mjs [cartella-foto]      ·  $env:TEST_URL per il locale
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes, createHmac } from 'crypto'
import fs from 'fs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const cartella = process.argv[2] || null
if (cartella) fs.mkdirSync(cartella, { recursive: true })
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

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

const creati = []
// Un accesso di prova col secondo fattore fatto: sessione aal2.
async function accesso(role, aziendaId) {
  const email = `zz-inizia-qui-${Date.now()}-${randomBytes(3).toString('hex')}@playwright.internal`
  const password = randomBytes(20).toString('base64url') + 'Aa1!'
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  creati.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role, azienda_id: aziendaId, full_name: 'Prova inizia qui' }, { onConflict: 'id' })
  const cli = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { error: sErr } = await cli.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  if (role !== 'super_admin') {
    const { data: enr, error: eErr } = await cli.auth.mfa.enroll({ factorType: 'totp' })
    if (eErr) throw new Error(`2FA: ${eErr.message}`)
    const { error: vErr } = await cli.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) })
    if (vErr) throw new Error(`2FA: ${vErr.message}`)
  }
  return (await cli.auth.getSession()).data.session
}

let problemi = 0
const ok = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) problemi++ }
const chiama = (tok, q = '') => fetch(`${BASE}/api/primi-passi${q}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} })

const browser = await chromium.launch()
try {
  const { data: aziende } = await admin.from('aziende').select('id, ragione_sociale').order('ragione_sociale')
  const conEntita = []
  for (const az of aziende) {
    const { data: ent } = await admin.from('entita').select('id, email, phone').eq('azienda_id', az.id)
    if (ent?.length) conEntita.push({ ...az, ent })
  }
  const [A, B] = conEntita

  console.log('\nLA ROUTE, DA FUORI')
  ok((await chiama(null)).status === 401, 'senza accesso → 401')
  const staff = await accesso('staff', A.id)
  ok((await chiama(staff.access_token)).status === 403, 'staff → 403')
  const sup = await accesso('super_admin', null)
  ok((await chiama(sup.access_token)).status === 400, 'super_admin senza azienda → 400')
  ok((await chiama(sup.access_token, '?azienda_id=1%27%20or%201%3D1')).status === 400, 'super_admin con azienda inventata → 400')
  const rs = await chiama(sup.access_token, `?azienda_id=${A.id}`)
  ok(rs.status === 200, `super_admin con azienda → 200`)

  const titA = await accesso('admin_azienda', A.id)
  const r = await chiama(titA.access_token, `?azienda_id=${B.id}`)
  const grezzo = await r.text()
  const corpo = JSON.parse(grezzo)
  const idsA = new Set(A.ent.map(e => e.id))
  ok(r.status === 200 && corpo.entita.every(e => idsA.has(e.id)), `titolare di «${A.ragione_sociale}» che chiede un'altra azienda riceve solo la sua`)
  // Il corpo grezzo: nessun recapito di nessun cliente, solo nomi di campi.
  const recapiti = conEntita.flatMap(a => a.ent.flatMap(e => [e.email, e.phone])).filter(v => v && String(v).length > 5)
  ok(!recapiti.some(v => grezzo.includes(v)), 'nel corpo grezzo nessuna email né telefono')
  await admin.auth.admin.deleteUser(creati.splice(creati.indexOf(staff.user.id), 1)[0])

  console.log('\nLA DASHBOARD, COME LA APRE IL TITOLARE')
  for (const az of conEntita) {
    const s = await accesso('admin_azienda', az.id)
    const atteso = await (await chiama(s.access_token)).json()
    const mancanti = [...atteso.entita.flatMap(e => e.passi.filter(p => !p.facoltativo && !p.fatto).map(p => `${e.nome}: ${p.titolo} (${p.dettaglio})`)),
      ...(atteso.contatto && !atteso.contatto.fatto ? [atteso.contatto.titolo] : [])]
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(s) }] }] } })
    const p = await ctx.newPage()
    const errori = []; p.on('pageerror', e => errori.push(String(e).slice(0, 150)))
    await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
    // Si aspetta il menu vero: prima è una pagina ancora in caricamento.
    const menu = await p.waitForSelector('aside.admin-sidebar nav a:has-text("Sito web")', { timeout: 40_000 }).then(() => true).catch(() => false)
    await p.waitForTimeout(2500)
    const riquadro = await p.getByText('Inizia qui', { exact: true }).count()
    if (cartella) await p.screenshot({ path: `${cartella}/${az.ragione_sociale.replace(/\W+/g, '-')}.png` })
    console.log(`\n  ${az.ragione_sociale}: ${mancanti.length ? mancanti.length + ' passi da fare' : 'tutto fatto'}`)
    for (const m of mancanti) console.log(`     · ${m}`)
    ok(riquadro === (mancanti.length ? 1 : 0), mancanti.length ? 'il riquadro c\'è' : 'nessun riquadro (ha già tutto)')
    ok(menu, 'il menu laterale si è caricato')
    ok(!errori.length, `nessun errore nella pagina${errori.length ? ': ' + errori.join(' | ') : ''}`)
    // Dove porta: si clicca il primo passo da fare e la pagina deve esistere.
    if (mancanti.length) {
      const primo = atteso.entita.flatMap(e => e.passi).find(x => !x.fatto && !x.facoltativo) || atteso.contatto
      await p.locator('button', { hasText: primo.titolo }).first().click()
      await p.waitForURL(u => u.pathname === primo.link, { timeout: 30_000 }).catch(() => {})
      await p.waitForTimeout(2500)
      const nonTrovata = await p.getByText(/404|non trovat/i).count()
      ok(new URL(p.url()).pathname === primo.link && !nonTrovata, `il passo «${primo.titolo}» porta a ${primo.link}`)
    }
    await ctx.close()
    await admin.auth.admin.deleteUser(creati.pop())
  }
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  await browser.close()
  for (const id of creati) await admin.auth.admin.deleteUser(id).catch(() => {})
  console.log('\n[probe] accessi di prova eliminati')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\n«INIZIA QUI» DICE A OGNUNO QUELLO CHE GLI MANCA, E A NESSUN ALTRO')
  process.exit(problemi ? 1 : 0)
}
