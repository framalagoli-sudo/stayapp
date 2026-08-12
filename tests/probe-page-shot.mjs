// Screenshot di una pagina pubblica (nessuna auth).
// Uso: cd tests && node probe-page-shot.mjs /s/slug?qr=1 out.png [width] [height]

import { chromium } from '@playwright/test'
import { TEST_URL } from './probe-auth.mjs'

const path = process.argv[2]
const out = process.argv[3] || 'page.png'
const width = Number(process.argv[4] || 390)
const height = Number(process.argv[5] || 844)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height } })
page.on('console', m => { if (m.type() === 'error') console.log('[console error]', m.text().slice(0, 200)) })
page.on('pageerror', e => console.log('[page error]', String(e).slice(0, 200)))

const res = await page.goto(TEST_URL + path, { waitUntil: 'domcontentloaded', timeout: 30_000 })
console.log('status:', res?.status())
await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
await page.waitForTimeout(1500)
await page.screenshot({ path: out })
console.log('screenshot:', out)
await browser.close()
