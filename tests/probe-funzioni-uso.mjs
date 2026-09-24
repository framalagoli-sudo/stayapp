// «Funzioni e profili»: la pagina del super_admin che dice chi usa cosa.
//
// La route legge TUTTE le aziende insieme: è esattamente la classe di codice
// da cui escono i dati di un cliente verso un altro. Qui si prova:
//  · chi non è super_admin non ottiene niente (401 senza login, 404 da admin
//    di un'azienda — e nel corpo nessun dato);
//  · il corpo grezzo della risposta contiene SOLO nomi e conteggi: si guardano
//    tutte le chiavi, non quelle che ci si aspetta, e si cercano email e
//    numeri di telefono ovunque;
//  · i conteggi sono veri: quelli dei contatti si rifanno dal database;
//  · la pagina si apre nel browser e non dà errori.
//
// Uso: node probe-funzioni-uso.mjs   ($env:TEST_URL per il dev locale)
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marca = Date.now()
let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

let aziendaId = null
const utenti = []
async function sessione(ruolo, extra = {}) {
  const email = `zz-fuso-${ruolo}-${marca}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(data.user.id)
  await admin.from('profiles').upsert({ id: data.user.id, role: ruolo, full_name: 'Fuso', ...extra }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  return s.session
}

// Le sole chiavi che la risposta può contenere, a ogni livello.
const CHIAVI_AMMESSE = new Set([
  'funzioniAzienda', 'funzioniEntita', 'aziende', 'nonMisurate',
  'chiave', 'titolo', 'sempre',
  'id', 'nome', 'uso', 'entita', 'tipo', 'accese',
  'funzioni', 'profilo', 'profilo_versione',
])
function chiaviEstranee(v, via = '') {
  const fuori = []
  if (Array.isArray(v)) v.forEach((x, i) => fuori.push(...chiaviEstranee(x, `${via}[${i}]`)))
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      // Dentro `uso` le chiavi sono i nomi delle funzioni: si controlla il valore, che dev'essere un numero.
      if (via.endsWith('.uso')) { if (typeof x !== 'number') fuori.push(`${via}.${k}`); continue }
      // Dentro `funzioni` le chiavi sono funzioni del catalogo, i valori sì/no.
      if (via.endsWith('.funzioni')) { if (typeof x !== 'boolean') fuori.push(`${via}.${k}`); continue }
      if (!CHIAVI_AMMESSE.has(k)) fuori.push(`${via}.${k}`)
      fuori.push(...chiaviEstranee(x, `${via}.${k}`))
    }
  }
  return fuori
}

let browser = null
try {
  const URL_API = `${BASE}/api/admin/funzioni-uso`

  const senza = await fetch(URL_API)
  ok(senza.status === 401, `senza login → ${senza.status} (atteso 401)`)

  const { data: az, error: azErr } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-FUSO-${marca}`, require_2fa: false }).select('id').single()
  if (azErr) throw new Error(azErr.message)
  aziendaId = az.id

  const sCliente = await sessione('admin_azienda', { azienda_id: aziendaId })
  const rCliente = await fetch(URL_API, { headers: { Authorization: `Bearer ${sCliente.access_token}` } })
  const corpoCliente = await rCliente.text()
  ok(rCliente.status === 404, `admin di un'azienda → ${rCliente.status} (atteso 404)`)
  ok(!corpoCliente.includes('aziende') && corpoCliente.length < 200, `admin di un'azienda: nessun dato nel corpo (${corpoCliente.length} caratteri)`)

  const sSuper = await sessione('super_admin')
  const rSuper = await fetch(URL_API, { headers: { Authorization: `Bearer ${sSuper.access_token}` } })
  const grezzo = await rSuper.text()
  ok(rSuper.status === 200, `super_admin → ${rSuper.status}`)
  const dati = JSON.parse(grezzo)

  const estranee = chiaviEstranee(dati)
  ok(estranee.length === 0, `nel corpo solo nomi e conteggi${estranee.length ? ' — estranee: ' + estranee.slice(0, 5).join(', ') : ''}`)
  const email = grezzo.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []
  ok(email.length === 0, `nessuna email nel corpo${email.length ? ': ' + email.length + ' trovate' : ''}`)
  // Il nome dell'azienda di prova contiene la marca temporale: 13 cifre di fila
  // che somigliano a un telefono. Si toglie prima di cercare.
  const telefoni = grezzo.split(String(marca)).join('').match(/\+?\d[\d\s]{8,}\d/g) || []
  ok(telefoni.length === 0, `nessun numero di telefono nel corpo${telefoni.length ? ': ' + telefoni.length : ''}`)

  // I contatti si rifanno a mano: la route deve dire lo stesso numero.
  const contatti = []
  for (let da = 0; ; da += 1000) {
    const { data } = await admin.from('contatti').select('azienda_id').range(da, da + 999)
    contatti.push(...data); if (data.length < 1000) break
  }
  const attesi = {}
  for (const c of contatti) attesi[c.azienda_id] = (attesi[c.azienda_id] || 0) + 1
  const diversi = dati.aziende.filter(a => (a.uso.contatti || 0) !== (attesi[a.id] || 0))
  ok(diversi.length === 0, `contatti per azienda uguali al database (${dati.aziende.length} aziende)${diversi.length ? ' — diversi: ' + diversi.map(a => a.nome).join(', ') : ''}`)
  ok((dati.nonMisurate || []).length === 0, `tutte le tabelle misurate${dati.nonMisurate?.length ? ' — mancano: ' + dati.nonMisurate.join(', ') : ''}`)

  // La pagina, aperta come la apre Francesco.
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin,
      localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sSuper) }] }] },
  })
  const page = await context.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()) })
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside.admin-sidebar nav a', { timeout: 30_000 })
  await page.click('aside.admin-sidebar a[href="/admin/funzioni"]')
  await page.waitForSelector('h1:has-text("Funzioni e profili")', { timeout: 30_000 })
  await page.waitForSelector('text=Matrice aziende', { timeout: 30_000 })
  // I titoletti sono in maiuscolo da CSS, e innerText li restituisce così.
  const testo = (await page.innerText('main')).toLowerCase()
  ok(testo.includes('funzioni dell\'azienda') && testo.includes('funzioni delle entità'), 'la pagina si apre dal menu e mostra le tre sezioni')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ': ' + errori.slice(0, 3).join(' | ') : ''}`)
  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true })
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  if (aziendaId) await admin.from('aziende').delete().eq('id', aziendaId)
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nTUTTO A POSTO')
  process.exit(problemi ? 1 : 0)
}
