/**
 * Flussi pubblici che eseguono JS lato client (browser vero, non HTTP puro).
 *
 * Perché serve: gli smoke admin non li toccano e `public-render.spec.js` verifica
 * solo l'HTML del server (request fixture, niente JS). Ma queste pagine leggono
 * ?token= / caricano dati DOPO l'idratazione: un crash client-side (es.
 * `const [x] = useSearchParams()` che rompe `.get()`, o `router.push(-1)`) dà
 * "Application error: a client-side exception" INVISIBILE ai test HTTP.
 *
 * Qui apriamo con Chromium e falliamo su:
 *   - qualunque eccezione JS non gestita (page 'pageerror')
 *   - il boundary di errore di Next ("Application error")
 * Inoltre un guard anti "tutto bianco": il blocco eventi async deve essere VISIBILE
 * (opacity > 0), non nascosto per sempre dall'animazione reveal.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

// Token fittizio: la pagina deve mostrare uno STATO d'errore gestito (es. "token non
// valido"), MAI crashare. Il bug che cerchiamo esplode prima ancora di validare il token.
const TOKEN = 'ci-smoke-invalid-token'
const PUBLIC_PAGES = [
  { name: 'unsubscribe',           path: `/unsubscribe?token=${TOKEN}` },
  { name: 'recensione',            path: `/recensione?token=${TOKEN}` },
  { name: 'confirm-subscription',  path: `/confirm-subscription?token=${TOKEN}` },
  { name: 'cancella-prenotazione', path: `/cancella-prenotazione?token=${TOKEN}` },
  { name: 'blog',                  path: `/blog` },
]

// Registra i listener PRIMA della navigazione così cattura anche gli errori di idratazione.
function guardErrors(page) {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  return errors
}

async function expectNoClientCrash(page, errors, label) {
  await expect(page.locator('body'), `${label}: nessun boundary "Application error"`).not.toContainText('Application error', { timeout: 5_000 })
  expect(errors, `${label}: eccezioni JS non gestite → ${errors.join(' | ')}`).toHaveLength(0)
}

test.describe('Flussi pubblici — no crash client-side', () => {
  for (const p of PUBLIC_PAGES) {
    test(`${p.name} carica senza eccezioni JS`, async ({ page }) => {
      const errors = guardErrors(page)
      await page.goto(p.path, { waitUntil: 'load' })
      await page.waitForTimeout(1_500) // lascia girare idratazione + fetch client
      await expectNoClientCrash(page, errors, p.name)
    })
  }

  test('dettaglio evento carica + bottone Indietro presente', async ({ page }) => {
    const { data: ev } = await admin.from('eventi')
      .select('id').eq('published', true).eq('active', true).limit(1).maybeSingle()
    test.skip(!ev, 'nessun evento pubblicato disponibile')
    const errors = guardErrors(page)
    await page.goto(`/eventi/${ev.id}?back=%2F`, { waitUntil: 'load' })
    await page.waitForTimeout(1_500)
    await expectNoClientCrash(page, errors, 'dettaglio evento')
    // Il bottone di ritorno deve esserci (regressione router.push(-1)).
    await expect(page.getByText('Indietro').first()).toBeVisible()
  })

  test('blocco eventi VISIBILE sulla landing (guard "tutto bianco")', async ({ page }) => {
    // Trova la home (__home__) di un'entità che contiene un blocco eventi.
    // Filtro in JS: `.contains` su jsonb array-di-oggetti è fragile via PostgREST.
    let target = null
    try {
      const { data: pages } = await admin.from('pagine')
        .select('entity_tipo, entity_id, blocks')
        .eq('slug', '__home__')
        .limit(200)
      const withEventi = (pages || []).filter(p => Array.isArray(p.blocks) && p.blocks.some(b => b?.type === 'eventi'))
      const TBL = { struttura: ['properties', 's'], ristorante: ['ristoranti', 'r'], attivita: ['attivita', 'a'] }
      for (const pg of withEventi) {
        const [table, prefix] = TBL[pg.entity_tipo] || []
        if (!table) continue
        const { data: ent } = await admin.from(table).select('slug, active').eq('id', pg.entity_id).maybeSingle()
        if (ent?.slug && ent.active) { target = `/${prefix}/${ent.slug}`; break }
      }
    } catch { /* schema diverso → skip sotto */ }
    test.skip(!target, 'nessuna landing attiva con blocco eventi')

    await page.goto(target, { waitUntil: 'networkidle' })
    // Il blocco eventi carica async: aspetta il link all'evento (attached anche se il
    // reveal lo tiene a opacity 0 → così il guard "tutto bianco" può comunque misurarlo).
    const link = page.locator('a[href*="/eventi/"]').first()
    await link.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {})
    test.skip(!(await link.count()), 'blocco eventi senza eventi futuri da mostrare')
    const section = page.locator('section:has(a[href*="/eventi/"])').first()
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(900) // transizione reveal (.6s) + margine

    // opacity dell'elemento .lbr-reveal (il reveal è sulla section): 0 = "tutto bianco".
    const opacity = await section.evaluate(el => {
      let n = el
      while (n && !n.classList?.contains('lbr-reveal')) n = n.parentElement
      return getComputedStyle(n || el).opacity
    })
    expect(Number(opacity), 'blocco eventi deve essere visibile (opacity>0), non nascosto dal reveal').toBeGreaterThan(0.5)
  })
})
