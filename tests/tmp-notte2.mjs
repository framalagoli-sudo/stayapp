import { chromium } from '@playwright/test'
const dir = 'C:/Users/FRANCE~1/AppData/Local/Temp/claude/C--Users-francesco-progetti-hospitality/e263e4b1-058b-42a5-9135-875e7c667ea8/scratchpad'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
await p.goto(`http://localhost:${process.env.PORTA}/template-preview/notte`, { waitUntil: 'networkidle', timeout: 180000 })
await p.waitForTimeout(3000)
const h = await p.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < h; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(350) }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800)
await p.screenshot({ path: `${dir}/notte2.png`, fullPage: true })
// contrasto: quanti testi hanno colore quasi uguale allo sfondo?
const sospetti = await p.evaluate(() => {
  const out = []
  document.querySelectorAll('h1,h2,h3,h4,p,span,li,a,div').forEach(el => {
    if (!el.innerText || el.children.length) return
    const s = getComputedStyle(el)
    const lum = c => { const m = c.match(/\d+/g); if (!m) return null; const [r,g,bl] = m.map(Number); return (0.2126*r+0.7152*g+0.0722*bl)/255 }
    let bg = null, n = el
    while (n && !bg) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) bg = c; n = n.parentElement }
    const lt = lum(s.color), lb = bg ? lum(bg) : null
    if (lt != null && lb != null && Math.abs(lt - lb) < 0.16) out.push(el.innerText.slice(0, 40) + ' | testo ' + s.color + ' su ' + bg)
  })
  return out.slice(0, 12)
})
console.log('testi a basso contrasto:', sospetti.length ? sospetti : 'nessuno')
await b.close(); process.exit(0)
