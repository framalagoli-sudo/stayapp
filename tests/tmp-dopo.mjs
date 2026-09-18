import { chromium } from '@playwright/test'
const dir = 'C:/Users/FRANCE~1/AppData/Local/Temp/claude/C--Users-francesco-progetti-hospitality/e263e4b1-058b-42a5-9135-875e7c667ea8/scratchpad'
const porta = process.env.PORTA || '3000'
const b = await chromium.launch()
for (const [n, path] of [['garage22', '/r/garage22'], ['inlingua', '/a/inlingua-terni']]) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
  const errori = []
  p.on('pageerror', e => errori.push(e.message))
  try {
    await p.goto(`http://localhost:${porta}${path}`, { waitUntil: 'networkidle', timeout: 150000 })
    await p.waitForTimeout(3500)
    await p.screenshot({ path: `${dir}/dopo-${n}.png`, fullPage: true })
    const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor + ' / testo ' + getComputedStyle(document.body).color)
    console.log(n, '→', await p.title(), '| body:', fondo, '| errori JS:', errori.length ? errori.slice(0,2) : 'nessuno')
  } catch (e) { console.log(n, 'errore:', e.message) }
}
await b.close(); process.exit(0)
