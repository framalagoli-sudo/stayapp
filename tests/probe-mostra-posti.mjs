// «Mostra quanti posti restano» (migration 149) col browser, dal punto da cui
// ci arrivano il titolare e chi guarda:
//   1. editor da titolare: il controllo c'è, «Quando stanno finendo» + soglia,
//      «Salva modifiche», e nel database finisce la scelta (soglia ripulita);
//   2. pagina dell'evento e app del QR nei tre modi: sempre / soglia (sotto e
//      sopra la soglia, coi posti del telefono contati come occupati) / mai,
//      e «Esaurito» che si vede anche con «mai»;
//   3. corpo grezzo: esce solo posti_visibili, mai la regola né la soglia;
//   4. caso ostile: la route rifiuta un modo inventato e una soglia fuori misura.
// I posti prenotati si scrivono direttamente su seats_booked di un evento ZZ:
// è la copia che legge il conto pubblico.
// Uso: cd tests && node probe-mostra-posti.mjs [cartella-foto]   ($env:TEST_URL per il locale)
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { chromium, devices } from 'playwright'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2]
let ko = 0
const ok = (c, t, x) => { console.log(`  ${c ? '✓' : '✗'} ${t}${!c && x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : ''}`); if (!c) ko++ }
const foto = async (p, nome) => { if (FOTO) await p.screenshot({ path: `${FOTO}/${nome}.png`, fullPage: false }) }

let aziendaId = null, uid = null, browser = null
try {
  const tag = Date.now()
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-MOSTRA-POSTI-${tag}`, require_2fa: false, moduli: { struttura: true } }).select().single()
  aziendaId = az.id
  const slugEnt = `zz-mpos-${tag}`
  const { data: ent } = await admin.from('entita').insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Sala posti', slug: slugEnt, active: true, moduli: { eventi: true } }).select().single()
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_tipo: 'struttura', entity_id: ent.id, title: 'ZZ Serata posti', slug: `zz-serata-posti-${tag}`,
    date_start: new Date(Date.now() + 8 * 86400000).toISOString(), price: 20, seats_total: 10, seats_booked: 0, prezzo_modo: 'cifra',
    published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false,
  }).select().single()

  const email = `probe-mpos-${tag}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  uid = us.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'admin_azienda', azienda_id: az.id, full_name: 'P' }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const token = s.session.access_token
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
  browser = await chromium.launch()
  const sessione = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(s.session) }] }] }

  console.log('\n1. L’EDITOR, COME IL TITOLARE')
  const pc = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: sessione })).newPage()
  const errori = []; pc.on('pageerror', e => errori.push(e.message))
  await pc.goto(`${BASE}/admin/eventi/${ev.id}`, { waitUntil: 'networkidle', timeout: 90000 })
  const blocco = pc.locator('[data-mostra-posti]')
  ok(await blocco.count() === 1, 'il controllo «Mostra quanti posti restano» c’è')
  ok(await blocco.getByRole('button', { name: 'Sempre' }).getAttribute('aria-pressed') === 'true', 'parte da «Sempre»')
  await blocco.getByRole('button', { name: 'Quando stanno finendo' }).click()
  const soglia = blocco.getByLabel('Percentuale di posti occupati')
  ok(await soglia.inputValue() === '80', 'la soglia proposta è 80')
  await soglia.fill('150'); await soglia.blur()
  ok(await soglia.inputValue() === '99', 'una soglia fuori misura torna nei limiti (150 → 99)', await soglia.inputValue())
  await soglia.fill('70'); await soglia.blur()
  await blocco.scrollIntoViewIfNeeded(); await foto(pc, 'editor-mostra-posti')
  const [risp] = await Promise.all([
    pc.waitForResponse(r => r.url().includes(`/api/eventi/${ev.id}`) && r.request().method() === 'PATCH', { timeout: 30000 }),
    pc.getByRole('button', { name: 'Salva modifiche' }).click(),
  ])
  ok(risp.ok(), `il salvataggio risponde ${risp.status()}`, await risp.text().catch(() => ''))
  const { data: e1 } = await admin.from('eventi').select('mostra_posti, mostra_posti_soglia').eq('id', ev.id).single()
  ok(e1.mostra_posti === 'soglia' && e1.mostra_posti_soglia === 70, 'salvato: soglia al 70%', e1)
  await pc.reload({ waitUntil: 'networkidle' })
  ok(await pc.locator('[data-mostra-posti]').getByRole('button', { name: 'Quando stanno finendo' }).getAttribute('aria-pressed') === 'true', 'riaprendo l’editor la scelta è quella salvata')
  ok(!errori.length, 'nessun errore nel browser', errori)

  console.log('\n2. PAGINA DELL’EVENTO E APP DEL QR')
  const pagina = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'it-IT' })).newPage()
  const app = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage()
  const errPub = []; pagina.on('pageerror', e => errPub.push(e.message)); app.on('pageerror', e => errPub.push(e.message))
  for (const p of [pagina, app]) await p.addInitScript(() => { try { localStorage.setItem('cookie_consent_v2', JSON.stringify({ necessary: true })) } catch {} })

  const scritto = async () => {
    await pagina.goto(`${BASE}/eventi/${ev.slug}`, { waitUntil: 'networkidle', timeout: 90000 })
    const testoPagina = await pagina.locator('body').innerText()
    await app.goto(`${BASE}/s/${slugEnt}?qr=1`, { waitUntil: 'networkidle', timeout: 90000 })
    await app.getByText(/^Eventi$/).first().click().catch(() => {})
    await app.waitForTimeout(800)
    const testoApp = await app.locator('body').innerText()
    const r = await fetch(`${BASE}/api/guest/eventi/${ev.id}`)
    const grezzo = await r.text()
    return { pagina: testoPagina, app: testoApp, grezzo, json: JSON.parse(grezzo) }
  }
  const caso = async (nome, campi, attesa) => {
    await admin.from('eventi').update(campi).eq('id', ev.id)
    const t = await scritto()
    const ev2 = t.json.evento || t.json
    const vPag = attesa.esaurito ? /Esaurito/i.test(t.pagina) : /\d+ posti disponibili/.test(t.pagina)
    const vApp = /\d+ posti\b/.test(t.app)
    if (attesa.esaurito) ok(vPag, `${nome}: la pagina scrive «Esaurito»`, t.pagina.slice(0, 200))
    else ok(vPag === attesa.numero, `${nome}: pagina ${attesa.numero ? 'scrive' : 'non scrive'} il numero`)
    if (!attesa.esaurito) ok(vApp === attesa.numero, `${nome}: app del QR ${attesa.numero ? 'scrive' : 'non scrive'} il numero`)
    ok(ev2.posti_visibili === (attesa.numero || !!attesa.esaurito), `${nome}: posti_visibili = ${ev2.posti_visibili}`)
    ok(!/mostra_posti/.test(t.grezzo), `${nome}: nel corpo grezzo né regola né soglia`)
    await foto(pagina, `evento-${nome.replace(/\W+/g, '-')}`)
  }
  await caso('soglia 70%, 6/10 occupati', { seats_booked: 6, posti_riservati: 0 }, { numero: false })
  await caso('soglia 70%, 4 prenotati + 3 al telefono', { seats_booked: 4, posti_riservati: 3 }, { numero: true })
  await caso('sempre, sala vuota', { mostra_posti: 'sempre', seats_booked: 0, posti_riservati: 0 }, { numero: true })
  await caso('mai, 9/10', { mostra_posti: 'mai', seats_booked: 9 }, { numero: false })
  await caso('mai, esaurito', { mostra_posti: 'mai', seats_booked: 10 }, { esaurito: true })
  ok(!errPub.length, 'nessun errore nel browser (pagina e app)', errPub)

  console.log('\n3. CASO OSTILE SULLA ROUTE')
  const r = await fetch(`${BASE}/api/eventi/${ev.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mostra_posti: "'; drop table eventi; --", mostra_posti_soglia: -40 }) })
  const { data: e2 } = await admin.from('eventi').select('mostra_posti, mostra_posti_soglia').eq('id', ev.id).single()
  ok(r.ok && e2.mostra_posti === 'sempre' && e2.mostra_posti_soglia === 1, 'modo inventato → «sempre», soglia −40 → 1', { status: r.status, e2 })
} catch (e) {
  console.log('  ✗ ERRORE: ' + e.message); ko++
} finally {
  if (browser) await browser.close().catch(() => {})
  try { await cancellaAziendaDiProva(aziendaId) } catch (e) { console.log('pulizia: ' + e.message) }
  if (uid) { try { await admin.auth.admin.deleteUser(uid) } catch {} }
}
console.log(ko ? `\n${ko} DA GUARDARE` : '\n[probe] dati di prova eliminati — tutto verde')
process.exit(ko ? 1 : 0)
