import { chromium } from '@playwright/test'
const dir = 'C:/Users/FRANCE~1/AppData/Local/Temp/claude/C--Users-francesco-progetti-hospitality/e263e4b1-058b-42a5-9135-875e7c667ea8/scratchpad'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const errori = []
p.on('pageerror', e => errori.push(e.message))
await p.goto(`http://localhost:${process.env.PORTA}/template-preview/notte`, { waitUntil: 'networkidle', timeout: 180000 })
await p.waitForTimeout(4000)
await p.screenshot({ path: `${dir}/notte.png`, fullPage: true })
console.log('errori JS:', errori.length ? errori.slice(0,3) : 'nessuno')
await b.close(); process.exit(0)
