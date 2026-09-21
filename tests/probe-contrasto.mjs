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
// ⚠️ Su Windows, Git Bash trasforma un argomento che inizia con «/» in un
// percorso di sistema (`/r/garage22` diventa `C:/Program Files/Git/r/...`).
// Per questo il percorso si può passare anche come variabile: PERCORSO=/r/garage22
// ⚠️ Su Windows, Git Bash trasforma un percorso che inizia con «/» in un
// percorso di sistema: `/r/garage22` arriva qui come
// `C:/Program Files/Git/r/garage22`, e la sonda chiedeva un indirizzo inesistente.
// Si rimette a posto invece di pretendere che chi la lancia se lo ricordi.
function percorso(p) {
  if (!p) return '/template-preview/notte'
  let v = String(p).replace(/^[A-Za-z]:[\\/].*?Git[\\/]?/i, '/').replace(/\\/g, '/')
  if (v === '.' || v === '') v = '/'
  return v.startsWith('/') ? v : '/' + v
}
const PERCORSO = percorso(process.env.PERCORSO || process.argv[2])

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
  // ⛔ Prima questa sonda confrontava due luminanze «a occhio», con una soglia
  // inventata. Il 21/09/2026 ha dato per buono un paragrafo **#444 su fondo
  // scuro** su un sito di un cliente vero: rapporto reale **1,84**, cioè
  // illeggibile. Ora si calcola il contrasto come lo calcola il mondo (WCAG),
  // con la correzione gamma, e la soglia è quella vera: 4,5.
  const canale = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const luminanza = c => {
    const m = String(c).match(/\d+(\.\d+)?/g)
    if (!m || m.length < 3) return null
    if (m[3] !== undefined && Number(m[3]) < 0.5) return null   // quasi trasparente: non è testo visibile
    const [r, g, b] = m.slice(0, 3).map(Number)
    return 0.2126 * canale(r) + 0.7152 * canale(g) + 0.0722 * canale(b)
  }
  const rapporto = (a, b) => {
    const [alto, basso] = [a, b].sort((x, y) => y - x)
    return (alto + 0.05) / (basso + 0.05)
  }
  const out = []
  document.querySelectorAll('h1,h2,h3,h4,h5,p,span,li,a,div,button').forEach(el => {
    if (!el.innerText || el.children.length || !el.offsetParent) return
    const st = getComputedStyle(el)
    // ⚠️ Se sopra c'è un'immagine di sfondo (o un gradiente) non si può dire
    // niente guardando i colori: il testo bianco su una foto è corretto, ed è
    // il caso di quasi tutti gli hero. Misurarlo darebbe un allarme perenne.
    let sfondo = null, n = el, suImmagine = false
    while (n && !sfondo && !suImmagine) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== 'none') suImmagine = true
      else if (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) sfondo = s.backgroundColor
      n = n.parentElement
    }
    if (suImmagine) return
    const lt = luminanza(st.color), lb = sfondo ? luminanza(sfondo) : null
    if (lt == null || lb == null) return
    const r = rapporto(lt, lb)
    // Il testo grande si legge anche con meno contrasto: la soglia WCAG è 3,0
    // sopra i 24px (o 18,66px in grassetto), 4,5 per tutto il resto.
    const px = parseFloat(st.fontSize) || 16
    const grande = px >= 24 || (px >= 18.66 && Number(st.fontWeight) >= 700)
    // Eccezione dichiarata: il pulsante di WhatsApp è bianco sul verde di
    // WhatsApp. È la coppia ufficiale del marchio, ed è così che la gente lo
    // riconosce: cambiarla per guadagnare contrasto renderebbe il pulsante meno
    // riconoscibile. Scritta qui perché un allarme che suona sempre si smette
    // di leggere — e questo suonerebbe su ogni sito che ha quel pulsante.
    const verdeWhatsapp = /rgb\(37, 211, 102\)|rgb\(18, 140, 126\)/.test(sfondo)
    if (verdeWhatsapp) return

    if (r < (grande ? 3 : 4.5)) {
      out.push(`«${el.innerText.replace(/\s+/g, ' ').slice(0, 42)}» — contrasto ${r.toFixed(2)} (serve ${grande ? '3,0' : '4,5'}): ${st.color} su ${sfondo}`)
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
