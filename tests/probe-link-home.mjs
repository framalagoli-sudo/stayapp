// Il logo dell'intestazione porta davvero alla home? Su ogni dominio.
//
// Il 26/08/2026 aveva `href=""` su dodici siti su dodici: una stringa vuota
// dentro `href` non vuol dire «la radice», vuol dire «questa stessa pagina».
// Il difetto era vecchio quanto i domini personalizzati e nessuno l'aveva mai
// misurato — si vede solo cliccando, e nessuno clicca il proprio logo.
//
// Uso: node probe-link-home.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const { data: dom } = await a.from('domini').select('dominio').eq('stato', 'attivo')
const b = await chromium.launch()
let ko = 0, senzaNav = 0
console.log('\nIL LOGO PORTA ALLA HOME?\n')
for (const d of dom || []) {
  const p = await b.newPage()
  try {
    await p.goto(`https://${d.dominio}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const r = await p.evaluate(() => {
      const nav = document.querySelector('.snav')
      if (!nav) return { nav: false }
      const logo = nav.querySelector('a')
      return { nav: true, href: logo?.getAttribute('href'), assoluto: logo?.href }
    })
    if (!r.nav) { senzaNav++; console.log(`  ·  ${d.dominio.padEnd(38)} nessuna intestazione`); await p.close(); continue }
    // Vuoto o mancante = non porta da nessuna parte.
    const rotto = !r.href
    if (rotto) ko++
    const dove = r.assoluto ? new URL(r.assoluto).pathname : '—'
    console.log(`  ${rotto ? '✗' : '✓'} ${d.dominio.padEnd(38)} → ${dove}${rotto ? '   NON PORTA DA NESSUNA PARTE' : ''}`)
  } catch (e) {
    console.log(`  ·  ${d.dominio.padEnd(38)} non raggiungibile`)
  }
  await p.close()
}
await b.close()
console.log('\n' + '-'.repeat(62))
console.log(ko ? `${ko} SITI col logo rotto` : `nessun logo rotto${senzaNav ? ` (${senzaNav} senza intestazione)` : ''}`)
process.exit(ko ? 1 : 0)
