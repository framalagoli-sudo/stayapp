// L'app del QR si legge? Apre l'app di un'entità, gira le schede (Home,
// Esplora con ogni sezione, Info) e misura il contrasto di OGNI testo e icona
// visibile contro il fondo su cui sta davvero — risalendo gli antenati fino al
// primo sfondo pieno. Serve per lo sfondo scuro dell'app (theme.appSfondo):
// un colore pensato per il bianco, su nero, non dà errore — sparisce.
//
// Uso: cd tests && node probe-app-leggibile.mjs /r/garage22 [cartella-foto]
// Locale: $env:TEST_URL='http://localhost:3000'
//
// ⚠️ Non misura il testo sopra una foto (il fondo vero è l'immagine): quello
// lo si guarda nelle fotografie che salva.

import { chromium } from '@playwright/test'
import fs from 'fs'
import { TEST_URL } from './probe-auth.mjs'

const percorso = process.argv[2]
const cartella = process.argv[3] || null
if (!percorso) { console.error('Uso: node probe-app-leggibile.mjs /r/slug [cartella]'); process.exit(2) }
if (cartella) fs.mkdirSync(cartella, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'it-IT' })
const errori = []
page.on('pageerror', e => errori.push(String(e).slice(0, 200)))

// Misura nel browser: testi (nodi di testo diretti) e icone SVG.
async function misura(nome) {
  const trovati = await page.evaluate(() => {
    const rgb = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(',').map(Number); return { r, g, b, a } }
    const lum = ({ r, g, b }) => { const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    const mescola = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
    const contrasto = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    // Il fondo vero: il primo antenato con sfondo pieno. Se in mezzo c'è una
    // foto o un gradiente, il fondo non è misurabile: si salta.
    function fondo(el) {
      let strati = []
      for (let n = el; n; n = n.parentElement) {
        const st = getComputedStyle(n)
        if (st.backgroundImage && st.backgroundImage !== 'none') return null
        if (n.tagName === 'IMG') return null
        if ([...n.children].some(c => c.tagName === 'IMG' && getComputedStyle(c).position === 'absolute')) return null
        const c = rgb(st.backgroundColor)
        if (c && c.a > 0) { strati.push(c); if (c.a >= 0.99) break }
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 }
      for (const s of strati.reverse()) bg = mescola(s, bg)
      return bg
    }
    function visibile(el) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return false
      for (let n = el; n; n = n.parentElement) { const st = getComputedStyle(n); if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false }
      return true
    }
    const opacitaTot = el => { let o = 1; for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o }
    const out = []
    const app = document.querySelector('.r-app, .g-app, .a-app') || document.body
    for (const el of app.querySelectorAll('*')) {
      const testo = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
      const icona = el.tagName.toLowerCase() === 'svg'
      if (!testo && !icona) continue
      if (!visibile(el)) continue
      const bg = fondo(el)
      if (!bg) continue
      const st = getComputedStyle(el)
      let fg = rgb(icona ? (st.stroke !== 'none' ? st.stroke : st.color) : st.color)
      if (!fg) continue
      fg = { ...fg, a: fg.a * opacitaTot(el) }
      const c = contrasto(mescola(fg, bg), bg)
      const grande = parseFloat(st.fontSize) >= 18 || (parseFloat(st.fontSize) >= 14 && Number(st.fontWeight) >= 700)
      // Icone e testo grande: 3. Testo normale: 4,5. Le icone spente della
      // barra in basso (opacità 0,4) sono volute: si segnalano sotto 2.
      const spenta = icona && opacitaTot(el) < 0.5
      const soglia = spenta ? 2 : (icona || grande) ? 3 : 4.5
      if (c < soglia) out.push({ cosa: icona ? '[icona]' : testo.slice(0, 50), contrasto: Math.round(c * 100) / 100, soglia, colore: st.color })
    }
    return out
  })
  if (cartella) await page.screenshot({ path: `${cartella}/${nome}.png` })
  console.log(`\n── ${nome}: ${trovati.length ? trovati.length + ' illeggibili' : 'tutto leggibile'}`)
  for (const t of trovati) console.log(`   ${t.contrasto} < ${t.soglia}  ${t.cosa}  (${t.colore})`)
  return trovati.length
}

const sep = percorso.includes('?') ? '&' : '?'
const res = await page.goto(`${TEST_URL}${percorso}${sep}qr=1`, { waitUntil: 'networkidle', timeout: 60_000 })
console.log('status', res?.status(), TEST_URL + percorso)
await page.waitForTimeout(1200)
let totale = await misura('home')
// La prima misura comprende i banner (cookie, installa): poi si chiudono,
// come farebbe l'ospite, perché coprono la barra in basso.
await page.evaluate(() => { localStorage.setItem('cookie_consent_v2', 'accepted'); localStorage.setItem('pwa_install_dismissed_v2', '1') })
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(800)

const navBtn = nome => page.locator('nav button', { hasText: nome }).first()
if (await navBtn('Esplora').count()) {
  await navBtn('Esplora').click(); await page.waitForTimeout(700)
  const chips = await page.locator('.chip-bar button').allTextContents()
  for (const [i, chip] of chips.entries()) {
    await page.locator('.chip-bar button').nth(i).click(); await page.waitForTimeout(700)
    // Menù a catalogo: si entra nel primo; poi si apre ogni categoria.
    const catalogo = page.locator('.fade-up button:has(svg.lucide-chevron-right)').first()
    if (await catalogo.count()) { await catalogo.click(); await page.waitForTimeout(500) }
    totale += await misura(`esplora-${chip.trim().toLowerCase().replace(/\W+/g, '-')}`)
    const categorie = page.locator('section > button')
    const n = await categorie.count()
    for (let k = 1; k < Math.min(n, 4); k++) {
      await categorie.nth(k).click(); await page.waitForTimeout(400)
      totale += await misura(`esplora-${chip.trim().toLowerCase().replace(/\W+/g, '-')}-cat${k}`)
    }
  }
}
for (const tab of ['Prenota', 'Info', 'Chat']) {
  if (await navBtn(tab).count()) { await navBtn(tab).click(); await page.waitForTimeout(900); totale += await misura(tab.toLowerCase()) }
}

console.log(`\n${totale ? '❌' : '✅'} ${totale} elementi illeggibili${errori.length ? ` · errori nella pagina: ${errori.join(' | ')}` : ''}`)
await browser.close()
process.exit(totale || errori.length ? 1 : 0)
