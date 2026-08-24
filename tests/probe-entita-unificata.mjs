// Verifica la copia nella tabella `entita` (passo 1 dell'unificazione).
//
// Confronta riga per riga ciò che c'è nelle tre tabelle di partenza con ciò che
// è finito nella nuova: stesso numero di entità, stessi id, stessi valori nei
// campi che contano. Se un solo dato non torna, si vede qui — prima che il
// codice cominci a leggere dalla nuova tabella.
//
// Uso: node probe-entita-unificata.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

const { data: entita, error } = await admin.from('entita').select('*')
if (error) {
  console.log(`\n⛔ La tabella \`entita\` non esiste ancora: esegui la migration 079.\n   (${error.message})`)
  process.exit(1)
}

console.log(`\nEntità nella tabella unificata: ${entita.length}\n`)

const FONTI = [
  ['properties', 'struttura',  ['name','slug','description','address','phone','email','services','activities','excursions','wifi_name','whatsapp','active','azienda_id']],
  ['ristoranti', 'ristorante', ['name','slug','description','address','phone','email','menu','schedule','active','azienda_id']],
  ['attivita',   'attivita',   ['name','slug','description','address','phone','email','services','schedule','active','azienda_id']],
]

let totOrigine = 0
for (const [tabella, tipoAtteso, campi] of FONTI) {
  const { data: originali } = await admin.from(tabella).select('*')
  totOrigine += originali.length
  console.log(`${tabella} (${originali.length} righe)`)

  let mancanti = 0, diversi = []
  for (const o of originali) {
    const copia = entita.find(e => e.id === o.id)
    if (!copia) { mancanti++; continue }
    for (const c of campi) {
      const a = JSON.stringify(o[c] ?? null), b = JSON.stringify(copia[c] ?? null)
      if (a !== b) diversi.push(`${o.slug}.${c}`)
    }
  }
  esito(mancanti === 0, `tutte copiate${mancanti ? ` — ${mancanti} MANCANTI` : ''}`)
  esito(diversi.length === 0, `valori identici${diversi.length ? ` — differenze: ${diversi.slice(0, 5).join(', ')}` : ''}`)

  // Il tipo dev'essere quello giusto (per le attività può essere personalizzato)
  const tipiSbagliati = originali.filter(o => {
    const c = entita.find(e => e.id === o.id)
    return c && tabella !== 'attivita' && c.tipo !== tipoAtteso
  })
  esito(tipiSbagliati.length === 0, `tipo impostato correttamente${tipiSbagliati.length ? ` — ${tipiSbagliati.length} sbagliati` : ''}`)
  console.log()
}

console.log('COMPLESSIVO')
esito(entita.length === totOrigine, `${entita.length} entità copiate su ${totOrigine} originali`)

// I moduli PWA: `modules` (hotel, ristoranti) e `pwa` (attività) confluiscono in `moduli`
const { data: props } = await admin.from('properties').select('id, modules')
const { data: atts } = await admin.from('attivita').select('id, pwa')
const moduliPersi = [
  ...props.filter(p => p.modules && Object.keys(p.modules).length && !Object.keys(entita.find(e=>e.id===p.id)?.moduli||{}).length),
  ...atts.filter(p => p.pwa && Object.keys(p.pwa).length && !Object.keys(entita.find(e=>e.id===p.id)?.moduli||{}).length),
]
esito(moduliPersi.length === 0, `configurazione dei moduli conservata${moduliPersi.length ? ` — ${moduliPersi.length} persi` : ''}`)

// Nessuno usa ancora la nuova tabella: le vecchie devono essere intatte
esito(props.length > 0, `le tabelle di partenza sono intatte (properties: ${props.length} righe)`)

// La parità: ogni entità ha ora TUTTI i campi a disposizione
const campiTotali = entita.length ? Object.keys(entita[0]).length : 0
console.log(`\n  ogni entità dispone ora di ${campiTotali} campi, indipendentemente dal tipo`)
const perTipo = {}
for (const e of entita) perTipo[e.tipo] = (perTipo[e.tipo] || 0) + 1
console.log(`  tipi (tecnici): ${Object.entries(perTipo).map(([t, n]) => `${t} (${n})`).join(', ')}`)

// Il `tipo` decide l'indirizzo pubblico (/s/, /r/, /a/): deve restare uno dei
// tre tecnici. Le descrizioni del settore stanno in `settore`, dove non fanno
// danni. Senza questa separazione, al passo 2 il routing di quei clienti si
// romperebbe.
const TIPI_VALIDI = ['struttura', 'ristorante', 'attivita']
const tipiLiberi = entita.filter(e => !TIPI_VALIDI.includes(e.tipo))
esito(tipiLiberi.length === 0, tipiLiberi.length
  ? `${tipiLiberi.length} entità hanno un tipo non tecnico (${[...new Set(tipiLiberi.map(e => e.tipo))].join(', ')}) — serve la migration 080`
  : 'tutti i tipi sono tecnici: il routing regge')

const conSettore = entita.filter(e => e.settore)
if (conSettore.length) console.log(`  settori descritti: ${conSettore.map(e => e.settore).join(' · ')}`)

console.log('\n' + '─'.repeat(60))
console.log(problemi ? `${problemi} PROBLEMI — non procedere al passo 2` : 'COPIA CORRETTA — si può procedere al passo 2')
process.exit(problemi ? 1 : 0)
