// Screenshot di una pagina admin (per giudicare a video invece di dedurre).
// Uso: cd tests && node probe-shot.mjs /admin/audit-log out.png [--width 1280]

import { withProbeSession, gotoAdmin } from './probe-auth.mjs'

const path = process.argv[2]
const out = process.argv[3] || 'shot.png'
const widthArg = process.argv.indexOf('--width')
const WIDTH = widthArg > -1 ? Number(process.argv[widthArg + 1]) : 1280

await withProbeSession(async ({ page }) => {
  await gotoAdmin(page, path)
  await page.screenshot({ path: out, fullPage: false })
  console.log(`screenshot: ${out}`)
}, { width: WIDTH })
