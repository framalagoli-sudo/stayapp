// Il banner dei cookie non deve coprire i pulsanti con cui si contatta il locale.
//
// Su telefono il banner è alto più di cento pixel e sta sopra a tutto, di
// proposito. I pulsanti fissi in basso (WhatsApp, assistente, carrello) ci
// finivano sotto: alla prima visita non si vedevano. Ora salgono sopra il
// banner finché è aperto, e tornano al loro posto quando si risponde.
//
// Uso:  node probe-banner-cookie.mjs [/a/slug ...]     (TEST_URL per il locale)
// Non scrive niente: apre pagine pubbliche e misura.
import { chromium } from 'playwright'
import { config } from 'dotenv'
config({ path: '.env.test', quiet: true })

const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const pagine = process.argv.slice(2).filter(a => a.startsWith('/'))
if (!pagine.length) pagine.push('/a/guru-management', '/r/garage22', '/a/metodotvb')

let rossi = 0
const esito = (ok, cosa, dettaglio = '') => { console.log(`  ${ok ? '✓' : '✗'} ${cosa}${ok || !dettaglio ? '' : ' — ' + dettaglio}`); if (!ok) rossi++ }

// I pulsanti fissi nell'angolo in basso, banner escluso: dove stanno e se
// qualcosa li copre nel loro punto centrale.
const fissi = () => {
  const banner = document.querySelector('[data-cookie-banner]')
  const cima = banner ? banner.getBoundingClientRect().top : innerHeight
  return {
    banner: banner ? Math.round(banner.getBoundingClientRect().height) : 0,
    variabile: getComputedStyle(document.documentElement).getPropertyValue('--spazio-banner').trim(),
    pulsanti: [...document.querySelectorAll('body *')].filter(e => {
      if (e.closest('[data-cookie-banner]')) return false
      const s = getComputedStyle(e); if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden') return false
      const r = e.getBoundingClientRect()
      return r.width >= 40 && r.width <= 200 && r.height >= 40 && r.height <= 80 && r.top > innerHeight / 2
    }).map(e => {
      const r = e.getBoundingClientRect()
      const sopra = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { chi: (e.querySelector('[aria-label]')?.getAttribute('aria-label') || e.getAttribute('aria-label') || e.tagName).slice(0, 30),
        dalBasso: Math.round(innerHeight - r.bottom), sottoIlBanner: r.bottom > cima + 1, coperto: !!sopra?.closest('[data-cookie-banner]') }
    }),
  }
}

const browser = await chromium.launch()
try {
  for (const largo of [390, 1280]) {
    for (const percorso of pagine) {
      console.log(`\n${percorso} · ${largo}px\n`)
      const ctx = await browser.newContext({ viewport: { width: largo, height: 780 }, locale: 'it-IT', isMobile: largo < 600, hasTouch: largo < 600 })
      const page = await ctx.newPage()
      const errori = []; page.on('pageerror', e => errori.push(e.message))
      const r = await page.goto(BASE + percorso, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => ({ status: () => e.message }))
      const banner = page.locator('[data-cookie-banner]')
      if (!(await banner.waitFor({ timeout: 30000 }).then(() => true).catch(() => false))) { esito(false, 'il banner compare', `HTTP ${r?.status?.()}`); await ctx.close(); continue }
      await page.waitForTimeout(800)
      const prima = await page.evaluate(fissi)
      if (!prima.pulsanti.length) { console.log('  · nessun pulsante fisso in basso su questa pagina'); await ctx.close(); continue }
      esito(prima.variabile === `${prima.banner}px`, `il banner dichiara la sua altezza (${prima.banner}px)`, prima.variabile || 'variabile assente')
      for (const p of prima.pulsanti) esito(!p.sottoIlBanner && !p.coperto, `«${p.chi}» sta sopra il banner e si può toccare`, JSON.stringify(p))

      // Il pulsante si tocca davvero, col banner ancora aperto.
      const wa = page.locator('button[aria-label*="WhatsApp" i], a[aria-label*="WhatsApp" i]').first()
      if (await wa.count()) await wa.click({ timeout: 5000 }).then(() => esito(true, 'WhatsApp si apre senza rispondere ai cookie')).catch(e => esito(false, 'WhatsApp si apre senza rispondere ai cookie', e.message.split('\n')[0]))

      // Risposto al banner, tutto torna dov'era.
      await banner.getByRole('button').last().click()
      await banner.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(300)
      const dopo = await page.evaluate(fissi)
      esito(dopo.banner === 0 && dopo.variabile === '', 'chiuso il banner la sua altezza non resta in giro', JSON.stringify({ b: dopo.banner, v: dopo.variabile }))
      const scesi = prima.pulsanti.every(p => { const d = dopo.pulsanti.find(x => x.chi === p.chi); return !d || d.dalBasso === p.dalBasso - prima.banner })
      esito(scesi, 'e i pulsanti tornano al loro posto', JSON.stringify(dopo.pulsanti.map(p => [p.chi, p.dalBasso])))
      esito(errori.length === 0, 'nessun errore nel browser', errori.slice(0, 2).join(' | '))
      await ctx.close()
    }
  }
} finally { await browser.close() }
console.log(rossi ? `\n✗ ${rossi} da guardare\n` : '\n✓ tutto regge\n')
process.exit(rossi ? 1 : 0)
