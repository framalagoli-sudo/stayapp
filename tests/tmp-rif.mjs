import { chromium } from '@playwright/test'
const browser = await chromium.launch()
for (const [url, out, w] of [
  ['https://www.inlinguaverona.it/', 'rif-verona.png', 1280],
  ['https://www.oltrenova.com/a/inlingua-terni', 'oggi-terni.png', 1280],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } })
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    const h = await page.evaluate(() => document.body.scrollHeight)
    for (let y = 0; y < Math.min(h, 9000); y += 700) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(200) }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(900)
    await page.screenshot({ path: out, fullPage: true })
    // il registro visivo, misurato
    const stile = await page.evaluate(() => {
      const c = getComputedStyle(document.body)
      const usa = {}
      document.querySelectorAll('h1,h2,h3,p,a,button').forEach(el => {
        const s = getComputedStyle(el)
        const k = s.fontFamily.split(',')[0].replace(/"/g, '')
        usa[k] = (usa[k] || 0) + 1
      })
      const colori = {}
      document.querySelectorAll('*').forEach(el => {
        const b = getComputedStyle(el).backgroundColor
        if (b && !/rgba\(0, 0, 0, 0\)/.test(b)) colori[b] = (colori[b] || 0) + 1
      })
      const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6)
      return { sfondo: c.backgroundColor, font: top(usa), colori: top(colori), h1: document.querySelector('h1')?.innerText?.slice(0, 80) }
    })
    console.log(out, JSON.stringify(stile, null, 1).slice(0, 700))
  } catch (e) { console.log(out, 'ERRORE', e.message.slice(0, 80)) }
  await page.close()
}
await browser.close()
