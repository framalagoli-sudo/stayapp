// PERFORMANCE — quanto ci mettono davvero le pagine dei clienti.
//
// Per un prodotto che è soprattutto un costruttore di siti, la velocità delle
// pagine pubbliche NON è un dettaglio tecnico: è il prodotto. Una pagina lenta
// perde visitatori prima ancora di essere letta, e Google la penalizza.
//
// Misura il tempo fino al primo byte (quanto ci mette il server a rispondere) e
// il peso dell'HTML, su pagine VERE di produzione. Tre giri per pagina: il primo
// paga l'avvio a freddo della funzione, gli altri dicono la verità.
//
// Uso: node probe-velocita.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'

// Soglie: sotto 800 ms è buono, sopra 2,5 s il visitatore comincia ad andarsene.
const BUONO = 800, LENTO = 2500

async function misura(percorso) {
  const tempi = []
  let byte = 0, stato = 0
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now()
    try {
      const r = await fetch(BASE + percorso, { signal: AbortSignal.timeout(30000) })
      const testo = await r.text()
      tempi.push(Date.now() - t0)
      byte = testo.length; stato = r.status
    } catch { tempi.push(null) }
  }
  const validi = tempi.filter(Boolean)
  return { stato, byte, primo: tempi[0], migliore: validi.length ? Math.min(...validi) : null }
}

const giudizio = ms => ms === null ? '?' : ms < BUONO ? '✓ buono' : ms < LENTO ? '~ accettabile' : '✗ LENTO'

console.log(`\nVelocità delle pagine su ${BASE}`)
console.log('(primo = a freddo, incluso l\'avvio della funzione · migliore = a caldo, il tempo vero)\n')

const pagine = []
for (const [tipo, tab, pref] of [['struttura','properties','s'], ['ristorante','ristoranti','r'], ['attivita','attivita','a']]) {
  const { data } = await admin.from(tab).select('slug, name').eq('active', true).limit(1).maybeSingle()
  if (data) pagine.push([`sito ${tipo}`, `/${pref}/${data.slug}`])
}
pagine.push(['landing OltreNova', '/'])
pagine.push(['blog', '/blog'])

// Una sotto-pagina vera, che è il caso più pesante: blocchi + SSR.
const { data: pag } = await admin.from('pagine').select('slug, entity_tipo, entity_id').eq('status','pubblicata').neq('slug','__home__').limit(1).maybeSingle()
if (pag) {
  const tab = { struttura:'properties', ristorante:'ristoranti', attivita:'attivita' }[pag.entity_tipo]
  const pref = { struttura:'s', ristorante:'r', attivita:'a' }[pag.entity_tipo]
  const { data: e } = await admin.from(tab).select('slug').eq('id', pag.entity_id).maybeSingle()
  if (e) pagine.push([`sotto-pagina`, `/${pref}/${e.slug}/p/${pag.slug}`])
}

const lenti = []
for (const [nome, percorso] of pagine) {
  const m = await misura(percorso)
  const kb = Math.round(m.byte / 1024)
  console.log(`  ${nome.padEnd(20)} ${String(m.migliore ?? '—').padStart(5)} ms  ${String(kb).padStart(4)} KB   ${giudizio(m.migliore)}${m.primo > LENTO && m.migliore < BUONO ? `   (a freddo ${m.primo} ms)` : ''}`)
  if (m.migliore !== null && m.migliore >= LENTO) lenti.push(nome)
  if (kb > 500) lenti.push(`${nome} (pagina pesante: ${kb} KB)`)
}

// Le API che le pagine chiamano mentre l'utente guarda.
console.log('\nAPI chiamate dalle pagine:')
// regola-ok: legge soltanto — misura quanto ci mettono le pagine vere a rispondere. Nessuna scrittura, nessuna notifica.
const { data: e0 } = await admin.from('properties').select('id, slug').eq('active', true).limit(1).maybeSingle()
if (e0) {
  for (const [nome, p] of [
    ['scheda entità', `/api/guest/${e0.slug}`],
    ['eventi', `/api/guest/eventi?entity_tipo=struttura&entity_id=${e0.id}`],
    ['blog pubblico', `/api/blog/public?limit=6`],
  ]) {
    const m = await misura(p)
    console.log(`  ${nome.padEnd(20)} ${String(m.migliore ?? '—').padStart(5)} ms   ${giudizio(m.migliore)}`)
    if (m.migliore !== null && m.migliore >= LENTO) lenti.push(nome)
  }
}

console.log('\n' + '═'.repeat(64))
if (lenti.length) {
  console.log('DA GUARDARE:')
  lenti.forEach(l => console.log('  ✗ ' + l))
} else {
  console.log('Nessuna pagina sopra la soglia. Tempi buoni.')
}
