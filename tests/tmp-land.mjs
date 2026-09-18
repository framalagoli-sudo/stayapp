import { chromium } from '@playwright/test'
const dir = 'C:/Users/FRANCE~1/AppData/Local/Temp/claude/C--Users-francesco-progetti-hospitality/e263e4b1-058b-42a5-9135-875e7c667ea8/scratchpad'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
await p.goto(process.env.URL, { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2500)
await p.screenshot({ path: `${dir}/landing-${process.env.NOME}.png` })
const h1 = await p.locator('h1').first().boundingBox()
console.log(process.env.NOME, 'h1:', JSON.stringify(h1), '| quanti h1:', await p.locator('h1').count())
await b.close(); process.exit(0)
