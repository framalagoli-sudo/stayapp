// Il menu del pannello, ruolo per ruolo, com'è DAVVERO nel browser.
//
// Il menu era scritto a mano tre volte (super_admin, admin_azienda, staff) più
// un ramo per i profili senza azienda. Per riscriverlo da una fonte sola senza
// che un cliente se ne accorga serve una fotografia di prima da confrontare con
// quella di dopo: a occhio, su quattro ruoli e una dozzina di permessi, una voce
// sparita non si nota — la nota il cliente, cercandola.
//
// Legge il DOM della barra laterale (intestazioni, voci, indirizzi, sezioni
// richiudibili, pallino «spenta») e non il codice: così fotografa anche quello
// che il codice fa senza dirlo.
//
// Uso:
//   node probe-menu-pannello.mjs            → confronta con menu-pannello.atteso.json
//   node probe-menu-pannello.mjs --salva    → riscrive la fotografia attesa
//   $env:TEST_URL='http://localhost:3000'   → prova il dev locale
//
// Tutto effimero: azienda, entità e utenti vengono creati e poi eliminati.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const FILE_ATTESO = new URL('./menu-pannello.atteso.json', import.meta.url)
const SALVA = process.argv.includes('--salva')

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const marca = Date.now()

// I permessi dello staff si provano in tre combinazioni: tutto, niente, e un
// misto scelto apposta per toccare le voci che un permesso apre in coppia
// (eventi → anche Offerte, newsletter → anche WhatsApp, shop → Prodotti e Shop).
const PERMESSI_TUTTI = {
  richieste: true, prenotazioni: true, booking: true, eventi: true, recensioni: true, survey: true,
  contatti: true, newsletter: true, blog: true, automazioni: true, piano_editoriale: true,
  content_studio: true, preventivi: true, form_builder: true, shop: true, loyalty: true,
  struttura: true, ristorante: true, attivita_gestione: true, analytics: true,
}
const PERMESSI_MISTI = { eventi: true, newsletter: true, shop: true, ristorante: true, analytics: true }

let aziendaId = null
const utenti = []
const entita = {}

async function creaUtente(ruolo, extra = {}) {
  const email = `zz-menu-${ruolo}-${marca}-${utenti.length}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${ruolo}: ${error.message}`)
  utenti.push(data.user.id)
  const { error: pErr } = await admin.from('profiles').upsert(
    { id: data.user.id, role: ruolo, full_name: `Menu ${ruolo}`, ...extra }, { onConflict: 'id' })
  if (pErr) throw new Error(`profilo ${ruolo}: ${pErr.message}`)
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn ${ruolo}: ${sErr.message}`)
  return s.session
}

// Gli id cambiano a ogni giro: negli indirizzi diventano il nome del tipo.
function normalizza(testo) {
  let t = testo.replace(BASE, '')
  for (const [tipo, id] of Object.entries(entita)) t = t.split(id).join(`<${tipo}>`)
  return t
}

async function leggiMenu(browser, sessione, percorso) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin,
      localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sessione) }] }] },
  })
  const page = await context.newPage()
  try {
    await page.goto(BASE + percorso, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForSelector('aside.admin-sidebar nav a', { timeout: 20_000 })
    // Il menu compare solo quando l'azienda è caricata (prima c'è la sola
    // Dashboard, apposta): si aspetta una voce che hanno tutti i ruoli.
    await page.waitForSelector('aside.admin-sidebar nav a:has-text("Sicurezza")', { timeout: 30_000 }).catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const righe = await page.$$eval('aside.admin-sidebar nav *', (els) => {
      const out = []
      for (const el of els) {
        if (el.tagName === 'A') {
          // Anche lo stile dice qualcosa: una voce secondaria (più piccola) e
          // quella evidenziata come «sei qui» sono comportamento, non estetica.
          const segni = [
            el.style.fontSize === '13px' ? 'sub' : '',
            el.style.background.includes('0.13') ? 'attiva' : '',
            el.querySelector('[title^="Spenta"]') ? 'spenta' : '',
          ].filter(Boolean).map(s => ` •${s}`).join('')
          out.push(`voce  ${el.textContent.trim()} → ${el.getAttribute('href')}${segni}`)
        } else if (el.tagName === 'BUTTON' && el.classList.contains('sidebar-collapse-btn')) {
          out.push(`gruppo ${el.textContent.replace('›', '').trim()}`)
        } else if (el.classList.contains('sidebar-divider')) {
          out.push('———')
        } else if (el.tagName === 'DIV' && el.children.length === 0 && el.style.textTransform === 'uppercase') {
          out.push(`## ${el.textContent.trim()}`)
        } else if (el.tagName === 'DIV' && el.children.length === 0 && el.style.fontStyle === 'italic') {
          out.push(`(${el.textContent.trim()})`)
        }
      }
      return out
    })
    return righe.map(normalizza)
  } finally {
    await context.close()
  }
}

let esito = 0
let browser = null
try {
  const { data: az, error: azErr } = await admin.from('aziende').insert({
    ragione_sociale: `ZZ-MENU-${marca}`, require_2fa: false,
    moduli: { struttura: true, ristorante: true, attivita: true },
  }).select('id').single()
  if (azErr) throw new Error(`azienda: ${azErr.message}`)
  aziendaId = az.id

  // Le entità si creano come le crea un cliente, dalla route.
  const sAdmin = await creaUtente('admin_azienda', { azienda_id: aziendaId })
  const H = { Authorization: `Bearer ${sAdmin.access_token}`, 'Content-Type': 'application/json' }
  const API = { struttura: '/api/properties', ristorante: '/api/ristoranti', attivita: '/api/attivita' }
  for (const [tipo, rotta] of Object.entries(API)) {
    const r = await fetch(BASE + rotta, { method: 'POST', headers: H, body: JSON.stringify({ name: `ZZ menu ${tipo}` }) })
    const e = await r.json()
    if (!e?.id) throw new Error(`creazione ${tipo}: ${r.status} ${JSON.stringify(e).slice(0, 120)}`)
    entita[tipo] = e.id
  }
  // Un interruttore spento, per fotografare anche il filtro delle funzioni
  // (e il pallino che il super_admin vede al suo posto).
  await admin.from('entita').update({ moduli: { menu: false } }).eq('id', entita.ristorante)

  const sessioni = {
    super_admin: await creaUtente('super_admin'),
    admin_azienda: sAdmin,
    staff_tutto: await creaUtente('staff', { azienda_id: aziendaId, permissions: PERMESSI_TUTTI }),
    staff_misto: await creaUtente('staff', { azienda_id: aziendaId, permissions: PERMESSI_MISTI }),
    staff_niente: await creaUtente('staff', { azienda_id: aziendaId, permissions: {} }),
    senza_azienda: await creaUtente('staff'),
  }
  const percorsi = (tipi) => ['/admin', ...tipi.map(t => `/admin/${{ struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }[t]}/${entita[t]}/info`)]
  const scenari = [
    ['super_admin', percorsi(['struttura', 'ristorante', 'attivita'])],
    ['admin_azienda', percorsi(['struttura', 'ristorante', 'attivita'])],
    ['staff_tutto', percorsi(['ristorante'])],
    ['staff_misto', percorsi(['ristorante'])],
    ['staff_niente', ['/admin']],
    ['senza_azienda', ['/admin']],
  ]

  browser = await chromium.launch()
  const visto = {}
  for (const [chi, lista] of scenari) {
    for (const p of lista) {
      const chiave = `${chi} @ ${normalizza(p)}`
      visto[chiave] = await leggiMenu(browser, sessioni[chi], p)
      console.log(`  letto ${chiave}: ${visto[chiave].filter(r => r.startsWith('voce')).length} voci`)
    }
  }

  if (SALVA) {
    writeFileSync(FILE_ATTESO, JSON.stringify(visto, null, 2) + '\n')
    console.log(`\nFotografia salvata in ${FILE_ATTESO.pathname}`)
  } else {
    if (!existsSync(FILE_ATTESO)) throw new Error('manca menu-pannello.atteso.json: lanciare prima con --salva')
    const atteso = JSON.parse(readFileSync(FILE_ATTESO, 'utf8'))
    for (const chiave of new Set([...Object.keys(atteso), ...Object.keys(visto)])) {
      const a = atteso[chiave] || [], v = visto[chiave] || []
      if (JSON.stringify(a) === JSON.stringify(v)) { console.log(`  ✓ ${chiave}`); continue }
      esito = 1
      console.log(`  ✗ ${chiave}`)
      const n = Math.max(a.length, v.length)
      for (let i = 0; i < n; i++) if (a[i] !== v[i]) console.log(`      riga ${i + 1}: atteso «${a[i] ?? '—'}»  visto «${v[i] ?? '—'}»`)
    }
    console.log(esito ? '\nIL MENU È CAMBIATO' : '\nMENU IDENTICO ALLA FOTOGRAFIA')
  }
} catch (e) {
  console.error('ERRORE:', e.message)
  esito = 1
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of Object.values(entita)) await admin.from('entita').delete().eq('id', id)
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  if (aziendaId) {
    const { error } = await admin.from('aziende').delete().eq('id', aziendaId)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] pulito')
  process.exit(esito)
}
