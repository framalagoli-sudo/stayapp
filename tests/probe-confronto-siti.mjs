// Il passaggio alla tabella unificata deve essere INVISIBILE ai clienti.
//
// Confronta ogni sito servito dalla produzione (che legge dalle tre tabelle) con
// lo stesso servito in locale (che legge da `entita`). Se anche una sola parola
// cambia, il passaggio non è pronto.
//
// Uso: TEST_LOCALE=http://localhost:3412 node probe-confronto-siti.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const LOCALE = process.env.TEST_LOCALE || 'http://localhost:3412'
const PROD = 'https://www.oltrenova.com'
const pref = { struttura:'s', ristorante:'r', attivita:'a' }
// Nessun catch silenzioso: un errore di rete deve vedersi, non travestirsi da differenza.
async function prendi(url, tentativi=3) {
  for (let i=0;i<tentativi;i++) {
    try { const r = await fetch(url,{signal:AbortSignal.timeout(30000)}); return { ok:true, testo: await r.text() } }
    catch (e) { if (i===tentativi-1) return { ok:false, errore:e.message } }
  }
}
const pulisci = h => h.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
console.log('\nPRODUZIONE (tre tabelle) vs LOCALE (tabella unificata)\n')
let diff=0, errori=0
for (const [tab,tipo] of [['properties','struttura'],['ristoranti','ristorante'],['attivita','attivita']]) {
  const { data } = await a.from(tab).select('slug').eq('active',true)
  for (const e of data||[]) {
    const url = `/${pref[tipo]}/${e.slug}`
    const p = await prendi(PROD+url), l = await prendi(LOCALE+url)
    if (!p.ok || !l.ok) { errori++; console.log(`  ⚠ ${url} — rete: ${p.errore||l.errore}`); continue }
    const tp=pulisci(p.testo), tl=pulisci(l.testo)
    if (tp===tl) { console.log(`  ✓ ${url.padEnd(34)} ${String(tp.length).padStart(6)} caratteri identici`); continue }
    diff++
    console.log(`  ✗ ${url.padEnd(34)} DIVERSI (prod ${tp.length} · locale ${tl.length})`)
    const A=tp.split(' '), B=tl.split(' ')
    const soloProd = A.filter(x=>!B.includes(x)).slice(0,6)
    const soloLoc  = B.filter(x=>!A.includes(x)).slice(0,6)
    if (soloProd.length) console.log(`      solo in produzione: ${soloProd.join(' · ')}`)
    if (soloLoc.length)  console.log(`      solo in locale:     ${soloLoc.join(' · ')}`)
  }
}
console.log(errori ? `\n⚠ ${errori} pagine non raggiunte` : '')
console.log(diff ? `\n⛔ ${diff} PAGINE DIVERSE — non pubblicare` : '\n✓ tutte identiche: il passaggio è invisibile ai clienti')
process.exit(diff||errori ? 1 : 0)
