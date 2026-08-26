// L'app dell'ospite apre senza errori, e l'interruttore vale anche lì.
//
// Le PWA sono codice di browser: un identificatore fuori scope non lo vede né
// `next build` né una GET con curl — si manifesta solo aprendo la pagina. È già
// costato due guasti, uno in produzione.
//
// Due domande: (1) le app dei clienti veri aprono ancora, con le stesse
// sezioni di prima? (2) se accendo il menù su un hotel, nell'app compare?
//
// Uso: TEST_LOCALE=http://localhost:3488 node probe-app-ospite.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const pref = { struttura:'s', ristorante:'r', attivita:'a' }
const API  = { struttura:'/api/properties', ristorante:'/api/ristoranti', attivita:'/api/attivita' }
let problemi = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) problemi++ }

const browser = await chromium.launch()
const creati = [], utenti = [], aziende = []
try {
  // ── 1. le app dei clienti veri aprono senza errori
  console.log('\nLE APP DEI CLIENTI VERI\n')
  const { data: reali } = await admin.from('entita').select('slug, tipo, name').eq('active', true)
  for (const e of reali) {
    const page = await browser.newPage()
    const errori = []
    page.on('pageerror', err => errori.push(err.message))
    page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|404/i.test(m.text())) errori.push(m.text()) })
    await page.goto(`${L}/${pref[e.tipo]}/${e.slug}?qr=1&tab=esplora`, { waitUntil: 'networkidle', timeout: 45000 })
    const chip = await page.locator('button, a').filter({ hasText: /^(Menu|Menù|Servizi|Attività|Escursioni|Galleria|Eventi)$/ }).allTextContents()
    // ⚠️ Aprire l'app non basta: ogni sezione si monta **al click**, e finché
    // nessuno clicca il suo codice non gira. Un identificatore fuori scope in
    // «Escursioni» è arrivato in produzione proprio così — questa sonda passava
    // perché guardava che l'app aprisse, non che ci si potesse entrare.
    for (const c of chip) {
      const b = page.locator('button, a').filter({ hasText: new RegExp(`^${c}$`) }).first()
      if (await b.count()) { await b.click(); await page.waitForTimeout(700) }
    }
    const rotta = /Ops, qualcosa è andato storto/.test(await page.locator('body').innerText())
    ok(errori.length === 0 && !rotta,
       `${e.slug.padEnd(33)} sezioni: [${chip.join(' ')||'—'}]${rotta?'  ← SCHERMATA D\'ERRORE':''}${errori.length?'  ERRORI: '+errori.slice(0,2).join(' | '):''}`)
    await page.close()
  }

  // ── 2. l'interruttore vale anche nell'app
  console.log("\nACCENDO IL MENÙ SU UN HOTEL — compare nell'app della camera?\n")
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-APP-${Date.now()}`, require_2fa:false, moduli:{struttura:true} }).select().single()
  aziende.push(az.id)
  const email=`zz-app-${Date.now()}@playwright.internal`, pw=randomBytes(24).toString('base64url')
  const { data:u } = await admin.auth.admin.createUser({ email, password:pw, email_confirm:true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id:u.user.id, role:'admin_azienda', azienda_id:az.id, full_name:'App' }, { onConflict:'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data:s } = await anon.auth.signInWithPassword({ email, password:pw })
  const H = { Authorization:`Bearer ${s.session.access_token}`, 'Content-Type':'application/json' }

  const ent = await (await fetch(L+API.struttura, { method:'POST', headers:H, body: JSON.stringify({ name:'ZZ Hotel con cucina' }) })).json()
  creati.push(ent.id)

  const apri = async () => {
    const page = await browser.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(`${L}/s/${ent.slug}?qr=1&tab=esplora`, { waitUntil:'networkidle', timeout: 45000 })
    const chip = await page.locator('button, a').filter({ hasText: /^(Menu|Menù|Servizi|Attività|Escursioni|Galleria)$/ }).allTextContents()
    await page.close()
    return { chip, errori }
  }

  // il menù riempito ma la funzione spenta: non deve comparire
  await fetch(`${L}${API.struttura}/${ent.id}`, { method:'PATCH', headers:H,
    body: JSON.stringify({ menu:[{ id:'c1', category:'Colazioni', items:[{ id:'i1', name:'Cornetto', price:1.5 }] }] }) })
  let r = await apri()
  ok(!r.chip.some(c => /^Men[uù]$/.test(c)), `menù riempito ma funzione spenta → non compare  [${r.chip.join(' ')||'—'}]`)

  // ora la accendo dal pannello
  await fetch(`${L}${API.struttura}/${ent.id}`, { method:'PATCH', headers:H, body: JSON.stringify({ modules:{ menu:true } }) })
  r = await apri()
  ok(r.errori.length === 0, `l'app apre senza errori${r.errori.length?': '+r.errori[0]:''}`)
  ok(r.chip.some(c => /^Men[uù]$/.test(c)), `funzione accesa → il menù compare nell'app  [${r.chip.join(' ')||'—'}]`)

  // e il contenuto si vede davvero
  const page = await browser.newPage()
  await page.goto(`${L}/s/${ent.slug}?qr=1&tab=esplora`, { waitUntil:'networkidle', timeout: 45000 })
  await page.locator('button', { hasText: /^Men[uù]$/ }).first().click()
  await page.waitForTimeout(600)
  ok((await page.content()).includes('Cornetto'), 'il piatto inserito si legge davvero nella scheda')
  await page.close()

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI` : "L'APP DELL'OSPITE SEGUE GLI INTERRUTTORI")
} catch (e) { console.error('ERRORE:', e.message); problemi++ }
finally {
  await browser.close()
  for (const id of creati) await admin.from('entita').delete().eq('id', id)
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
