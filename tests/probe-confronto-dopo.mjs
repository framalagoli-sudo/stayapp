// Le pagine sono rimaste identiche dopo aver spostato la lettura?
//
// `probe-confronto-prima.mjs` fotografa il testo visibile di ogni pagina
// pubblica. Questa rifà le stesse fotografie e le confronta. Se anche una sola
// parola cambia, il passaggio non è pronto — è il metodo che ha reso invisibile
// l'unificazione delle entità, dove i 13 siti erano identici carattere per
// carattere.
//
// Uso: TEST_URL=http://localhost:3488 node probe-confronto-dopo.mjs
import { readFileSync } from 'fs'
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const impronta = h => h.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
const prima = JSON.parse(readFileSync('.foto-prima.json', 'utf8'))

console.log(`\nPRIMA (produzione) vs DOPO (${BASE})\n`)
let diverse = 0, errori = 0, uguali = 0
for (const [url, p] of Object.entries(prima)) {
  let dopo
  try { dopo = impronta(await (await fetch(BASE + url, { signal: AbortSignal.timeout(30000) })).text()) }
  catch (e) { errori++; console.log(`  ⚠ ${url} — rete: ${e.message}`); continue }
  if (dopo === p.testo) { uguali++; continue }
  diverse++
  console.log(`  ✗ ${url}`)
  console.log(`     prima ${p.testo.length} caratteri, dopo ${dopo.length}`)
  // Dove cambia, esattamente: senza questo si sa solo «è diverso».
  let i = 0
  while (i < Math.min(p.testo.length, dopo.length) && p.testo[i] === dopo[i]) i++
  console.log(`     differisce dal carattere ${i}:`)
  console.log(`       prima: …${p.testo.slice(Math.max(0,i-60), i+80)}…`)
  console.log(`       dopo:  …${dopo.slice(Math.max(0,i-60), i+80)}…`)
}
console.log('\n' + '-'.repeat(62))
// ⚠️ Nessun confronto riuscito NON è un successo: è una sonda che non ha
// misurato niente. Dire «invisibile» dopo zero confronti è il modo peggiore di
// sbagliarsi — si crede di aver verificato, e non si è verificato nulla.
if (uguali === 0) {
  console.log(`  NON HO POTUTO CONFRONTARE NIENTE (${errori} pagine irraggiungibili).`)
  console.log(`  Il server risponde? Questo esito NON dice che il passaggio è a posto.`)
  process.exit(2)
}
if (errori) console.log(`  ⚠ ${errori} pagine non raggiunte: restano non verificate`)
console.log(diverse ? `  ${diverse} PAGINE CAMBIATE su ${uguali + diverse} confrontate`
                    : `  ${uguali} pagine identiche: il passaggio è invisibile`)
process.exit(diverse || errori ? 1 : 0)
