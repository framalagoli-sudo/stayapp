/**
 * Rete di sicurezza CROSS-BROWSER per i siti pubblici (minisiti).
 *
 * Il business si regge sui siti: DEVONO essere visibili da qualsiasi browser,
 * sempre. La causa storica delle pagine bianche (un service worker next-pwa che
 * precacheava lo shell e serviva versioni stale) è stata rimossa. Questi test
 * BLOCCANO il deploy se quel rischio rientra:
 *   1. il contenuto del sito deve essere nell'HTML del server (sito vero, non
 *      web-app JS-only) → così si vede anche senza/ con JS rotto, su ogni browser.
 *   2. non deve ricomparire un service worker che precachea lo shell.
 *
 * Gira via HTTP puro (fixture `request`), senza eseguire JS: verifica esattamente
 * ciò che riceve un browser prima di qualunque idratazione.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const TYPES = [
  { table: 'properties', prefix: 's' },
  { table: 'ristoranti', prefix: 'r' },
  { table: 'attivita',   prefix: 'a' },
]

// Testo visibile nel <body> dopo aver tolto <script> e <style>.
function visibleText(html) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const body = (clean.match(/<body[^>]*>([\s\S]*)<\/body>/i) || ['', ''])[1]
  return body.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

async function activeMinisito(table) {
  const { data } = await admin.from(table).select('slug, name, minisito').eq('active', true).limit(50)
  return (data || []).find((e) => e?.minisito?.active && e.slug && e.name) || null
}

test.describe('Render pubblico siti — cross-browser safety net', () => {
  test('il contenuto dei minisiti è nell\'HTML del server (no white screen)', async ({ request }) => {
    let tested = 0
    for (const { table, prefix } of TYPES) {
      const entity = await activeMinisito(table)
      if (!entity) continue
      const path = `/${prefix}/${entity.slug}`
      const res = await request.get(path)
      expect(res.status(), `${path} deve rispondere 200`).toBe(200)
      const html = await res.text()
      const text = visibleText(html)
      // Segnale anti-white-screen: il NOME dell'entità deve comparire nel contenuto
      // VISIBILE renderizzato dal server (non solo nel <title>). Uno shell JS-only /
      // pagina bianca avrebbe ~0 testo visibile e niente nome nel body.
      const firstWord = entity.name.split(/\s+/)[0]
      expect(text, `${path}: il nome (${firstWord}) deve comparire nel contenuto visibile server-side → no shell vuoto`).toContain(firstWord)
      // Soglia prudente: anche il minisito più scarno (nome+contatti+footer) supera ~100.
      // Sotto = shell vuoto = rischio pagina bianca.
      expect(text.length, `${path}: contenuto visibile server-side troppo scarno (shell vuoto?)`).toBeGreaterThan(100)
      tested++
    }
    expect(tested, 'almeno un minisito attivo deve essere testato').toBeGreaterThan(0)
  })

  test('versione inglese /en raggiungibile (no 404 da middleware/dominio)', async ({ request }) => {
    // Guard del bug 24/6: un BOM in NEXT_PUBLIC_STAYAPP_DOMAIN faceva sì che il dominio
    // proprio non venisse riconosciuto → ogni /en cadeva nel ramo domini-custom → 404.
    // Le pagine IT non lo mostravano (fallback next() le serve comunque): solo /en lo rivela.
    const home = await request.get('/en')
    expect(home.status(), '/en (marketing) deve rispondere 200, non 404').toBe(200)

    let tested = 0
    for (const { table, prefix } of TYPES) {
      const entity = await activeMinisito(table)
      if (!entity) continue
      const path = `/en/${prefix}/${entity.slug}`
      const res = await request.get(path)
      expect(res.status(), `${path} deve rispondere 200 (no 404 /en)`).toBe(200)
      const text = visibleText(await res.text())
      const firstWord = entity.name.split(/\s+/)[0]
      expect(text, `${path}: contenuto entità renderizzato server-side anche in EN`).toContain(firstWord)
      tested++
    }
    expect(tested, 'almeno un minisito attivo deve essere testato in /en').toBeGreaterThan(0)
  })

  test('nessun service worker che precachea lo shell (causa pagine bianche)', async ({ request }) => {
    const res = await request.get('/sw.js')
    if (res.status() === 200) {
      const sw = await res.text()
      expect(sw, 'sw.js NON deve precachare lo shell (next-pwa) — causa pagine bianche dopo i deploy')
        .not.toContain('precacheAndRoute')
    }
    // 404 va benissimo: niente service worker = nessun rischio di shell stale.
  })
})
