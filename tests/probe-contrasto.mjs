// Un testo che non si legge non dà errore: si vede solo guardando.
//
// Nata il 18/09/2026 col tema scuro. I blocchi avevano 277 colori scritti a
// mano, pensati per una pagina bianca: su fondo scuro un titolo «#1a1a2e»
// spariva dentro il fondo. Il `next build` non lo vede, e nemmeno una GET:
// serve un browser che misuri il colore VERO di ogni testo e del suo sfondo.
//
//   node probe-contrasto.mjs                     → il template scuro in produzione
//   node probe-contrasto.mjs /r/garage22         → un sito vero
//   TEST_URL=http://localhost:3000 node probe-contrasto.mjs  → il dev locale
//
// Scorre tutta la pagina prima di misurare: i blocchi compaiono allo scroll, e
// uno non ancora comparso è trasparente — misurarlo darebbe falsi allarmi.

import { chromium } from '@playwright/test'

const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const PERCORSO = process.argv[2] || '/template-preview/notte'

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const erroriJs = []
page.on('pageerror', e => erroriJs.push(e.message))

console.log(`\nSI LEGGE TUTTO? ${BASE}${PERCORSO}\n`)
await page.goto(`${BASE}${PERCORSO}`, { waitUntil: 'networkidle', timeout: 180000 })
await page.waitForTimeout(2500)

const altezza = await page.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < altezza; y += 700) {
  await page.evaluate(v => window.scrollTo(0, v), y)
  await page.waitForTimeout(300)
}
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)

const sospetti = await page.evaluate(() => {
  const luminanza = c => {
    const m = String(c).match(/\d+(\.\d+)?/g)
    if (!m || m.length < 3) return null
    if (m[3] !== undefined && Number(m[3]) < 0.5) return null   // quasi trasparente: non è testo visibile
    const [r, g, b] = m.slice(0, 3).map(Number)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  }
  const out = []
  document.querySelectorAll('h1,h2,h3,h4,h5,p,span,li,a,div,button').forEach(el => {
    if (!el.innerText || el.children.length || !el.offsetParent) return
    const st = getComputedStyle(el)
    let sfondo = null, n = el
    while (n && !sfondo) {
      const c = getComputedStyle(n).backgroundColor
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) sfondo = c
      n = n.parentElement
    }
    const lt = luminanza(st.color), lb = sfondo ? luminanza(sfondo) : null
    if (lt != null && lb != null && Math.abs(lt - lb) < 0.16) {
      out.push(`«${el.innerText.replace(/\s+/g, ' ').slice(0, 45)}» — testo ${st.color} su ${sfondo}`)
    }
  })
  return [...new Set(out)]
})

await browser.close()

if (erroriJs.length) {
  console.log('  ⚠️  errori JavaScript nella pagina:')
  for (const e of erroriJs.slice(0, 5)) console.log('     · ' + e)
}
if (sospetti.length) {
  console.log(`  ${sospetti.length} TESTI CHE NON SI LEGGONO\n`)
  for (const s of sospetti.slice(0, 25)) console.log('  · ' + s)
  console.log('')
  process.exit(1)
}
console.log('  ✓ ogni testo si stacca dal suo sfondo\n')
process.exit(0)
