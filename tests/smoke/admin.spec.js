/**
 * Smoke test — tutte le voci del menu admin
 *
 * Esegui da tests/:
 *   npm install && npx playwright install chromium
 *   npm test
 *
 * Configura tests/.env.test:
 *   TEST_EMAIL=fra.malagoli@gmail.com
 *   TEST_PASSWORD=tuapassword
 *   TEST_URL=https://www.oltrenova.com   (opzionale, default prod)
 */

import { test, expect } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOADING_SELECTORS = [
  'text=Caricamento…',
  'text=Caricamento...',
  'text=Loading…',
]

const CRASH_SELECTORS = [
  'text=Something went wrong',
  'text=Errore critico',
  'text=Cannot read properties',
  'text=is not a function',
]

async function checkPage(page, path, label) {
  const errors = []

  // Intercetta errori JS in pagina
  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto(path, { waitUntil: 'domcontentloaded' })

  // Aspetta che le richieste di rete si calmino (max 8s)
  try {
    await page.waitForLoadState('networkidle', { timeout: 8_000 })
  } catch {
    // networkidle timeout non è fatale (alcune pagine hanno polling)
  }

  // Pausa extra per il rendering React
  await page.waitForTimeout(1_500)

  // ── 1. Verifica redirect corretto (non finisce su /login) ──
  const url = page.url()
  if (url.includes('/admin/login')) {
    errors.push('Redirect a login — sessione persa o route protetta non trovata')
  }

  // ── 2. Verifica no loop di caricamento ──
  for (const sel of LOADING_SELECTORS) {
    const count = await page.locator(sel).count()
    if (count > 0) {
      errors.push(`Loop di caricamento: trovato "${sel.replace('text=', '')}" dopo 9.5s`)
    }
  }

  // ── 3. Verifica no crash React ──
  for (const sel of CRASH_SELECTORS) {
    const count = await page.locator(sel).count()
    if (count > 0) {
      errors.push(`Crash React: trovato "${sel.replace('text=', '')}"`)
    }
  }

  // ── 4. Verifica che la pagina non sia completamente bianca ──
  const bodyText = await page.locator('body').innerText()
  if (bodyText.trim().length < 20) {
    errors.push('Pagina quasi vuota (meno di 20 caratteri visibili)')
  }

  // ── 5. Errori JS critici (filtra quelli noti come non-fatali) ──
  const criticalErrors = consoleErrors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('net::ERR') &&
    !e.includes('fonts.gstatic') &&
    !e.includes('VITE_SENTRY') &&
    !e.includes('_next') &&
    e.length < 500
  )
  if (criticalErrors.length > 0) {
    errors.push(`Errori console JS: ${criticalErrors.slice(0, 2).join(' | ')}`)
  }

  return errors
}

// ─── Route statiche ────────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  // Operativo
  { path: '/admin',                     label: 'Dashboard' },
  { path: '/admin/requests',            label: 'Richieste' },
  { path: '/admin/prenotazioni',        label: 'Prenotazioni' },
  { path: '/admin/booking',             label: 'Booking — Calendario' },
  { path: '/admin/booking/risorse',     label: 'Booking — Risorse' },
  { path: '/admin/booking/prenotazioni',label: 'Booking — Prenotazioni lista' },
  { path: '/admin/demo',                label: 'Richieste demo' },
  { path: '/admin/recensioni',          label: 'Recensioni' },
  { path: '/admin/survey',              label: 'Survey & NPS' },
  // Marketing
  { path: '/admin/contatti',            label: 'Contatti' },
  { path: '/admin/newsletter',          label: 'Newsletter' },
  { path: '/admin/automazioni',         label: 'Automazioni' },
  { path: '/admin/blog',                label: 'Blog & News' },
  { path: '/admin/blog/categories',     label: 'Blog — Categorie' },
  { path: '/admin/piano-editoriale',    label: 'Piano editoriale' },
  { path: '/admin/content-studio',      label: 'Content Studio' },
  { path: '/admin/ai-site-builder',     label: 'AI Site Builder' },
  { path: '/admin/preventivi',          label: 'Preventivi' },
  { path: '/admin/form-builder',        label: 'Form Builder' },
  { path: '/admin/shop',                label: 'Shop' },
  { path: '/admin/loyalty',             label: 'Loyalty' },
  { path: '/admin/eventi',              label: 'Eventi' },
  // Account
  { path: '/admin/analytics',           label: 'Analytics' },
  { path: '/admin/qrcode',              label: 'QR Code' },
  { path: '/admin/staff',               label: 'Collaboratori' },
  { path: '/admin/integrazioni',        label: 'Integrazioni' },
  { path: '/admin/seo-geo',             label: 'SEO & GEO' },
  { path: '/admin/audit-log',           label: 'Audit log' },
  { path: '/admin/impostazioni',        label: 'Impostazioni' },
  { path: '/admin/security',            label: 'Sicurezza' },
  { path: '/admin/help',                label: 'Aiuto' },
  // Piattaforma (super_admin)
  { path: '/admin/aziende',             label: 'Piattaforma — Aziende' },
  { path: '/admin/properties',          label: 'Piattaforma — Strutture' },
  { path: '/admin/ristoranti',          label: 'Piattaforma — Ristoranti' },
  { path: '/admin/attivita',            label: 'Piattaforma — Attività' },
  { path: '/admin/users',               label: 'Piattaforma — Utenti' },
]

// ─── Setup: recupera IDs entità per route dinamiche ──────────────────────────

let entityRoutes = []

test.beforeAll(async ({ request }) => {
  try {
    // Usiamo l'API per ottenere i primi ID disponibili
    const [strutture, ristoranti, attivita] = await Promise.all([
      request.get('/api/properties').then(r => r.json()).catch(() => []),
      request.get('/api/ristoranti').then(r => r.json()).catch(() => []),
      request.get('/api/attivita').then(r => r.json()).catch(() => []),
    ])

    const s = strutture?.[0]
    const r = ristoranti?.[0]
    const a = attivita?.[0]

    if (s?.id) {
      entityRoutes.push(
        { path: `/admin/struttura/${s.id}/info`,       label: `Struttura "${s.name}" — Info` },
        { path: `/admin/struttura/${s.id}/gallery`,    label: `Struttura "${s.name}" — Galleria` },
        { path: `/admin/struttura/${s.id}/theme`,      label: `Struttura "${s.name}" — Tema` },
        { path: `/admin/struttura/${s.id}/sito`,       label: `Struttura "${s.name}" — Sito web` },
        { path: `/admin/struttura/${s.id}/chatbot`,    label: `Struttura "${s.name}" — Chatbot` },
        { path: `/admin/struttura/${s.id}/domini`,     label: `Struttura "${s.name}" — Domini` },
      )
    }

    if (r?.id) {
      entityRoutes.push(
        { path: `/admin/ristoranti/${r.id}/info`,     label: `Ristorante "${r.name}" — Info` },
        { path: `/admin/ristoranti/${r.id}/menu`,     label: `Ristorante "${r.name}" — Menu` },
        { path: `/admin/ristoranti/${r.id}/gallery`,  label: `Ristorante "${r.name}" — Galleria` },
        { path: `/admin/ristoranti/${r.id}/sito`,     label: `Ristorante "${r.name}" — Sito web` },
        { path: `/admin/ristoranti/${r.id}/chatbot`,  label: `Ristorante "${r.name}" — Chatbot` },
        { path: `/admin/ristoranti/${r.id}/domini`,   label: `Ristorante "${r.name}" — Domini` },
      )
    }

    if (a?.id) {
      entityRoutes.push(
        { path: `/admin/attivita/${a.id}/info`,       label: `Attività "${a.name}" — Info` },
        { path: `/admin/attivita/${a.id}/gallery`,    label: `Attività "${a.name}" — Galleria` },
        { path: `/admin/attivita/${a.id}/sito`,       label: `Attività "${a.name}" — Sito web` },
        { path: `/admin/attivita/${a.id}/chatbot`,    label: `Attività "${a.name}" — Chatbot` },
        { path: `/admin/attivita/${a.id}/domini`,     label: `Attività "${a.name}" — Domini` },
      )
    }
  } catch (e) {
    console.warn('beforeAll: impossibile recuperare IDs entità:', e.message)
  }
})

// ─── Test: route statiche ─────────────────────────────────────────────────────

test.describe('Operativo + Marketing + Account', () => {
  for (const route of STATIC_ROUTES) {
    test(route.label, async ({ page }) => {
      const errors = await checkPage(page, route.path, route.label)
      if (errors.length > 0) {
        console.error(`\n❌ ${route.label} (${route.path}):`)
        errors.forEach(e => console.error(`   • ${e}`))
      }
      expect(errors, `Problemi rilevati su ${route.label}:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }
})

// ─── Test: route entità (IDs dinamici) ───────────────────────────────────────

test.describe('Sito & App — entità', () => {
  test('struttura + ristorante + attività sub-pages', async ({ page }) => {
    if (entityRoutes.length === 0) {
      test.skip(true, 'Nessuna entità trovata — skip route dinamiche')
    }

    const allErrors = []

    for (const route of entityRoutes) {
      const errors = await checkPage(page, route.path, route.label)
      if (errors.length > 0) {
        allErrors.push(`${route.label}: ${errors.join('; ')}`)
        console.error(`❌ ${route.label} — ${errors.join(' | ')}`)
      } else {
        console.log(`✅ ${route.label}`)
      }
    }

    expect(
      allErrors,
      `Problemi nelle pagine entità:\n${allErrors.join('\n')}`
    ).toHaveLength(0)
  })
})
