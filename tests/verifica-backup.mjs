// Questo backup ti riporterebbe davvero in piedi?
//
// Un archivio non provato non è un archivio: è una speranza compressa in gzip.
// Il file c'è, pesa, sembra a posto — e questo è esattamente l'aspetto che ha
// anche un backup a metà. Il 24/08/2026 ne salvava 1504 righe su 2908, comprese
// le pagine dei siti dei clienti, e girava così da mesi senza che nessuno se ne
// accorgesse.
//
// Questo script non si fida del file: lo apre, lo legge tabella per tabella e
// confronta con la produzione. Poi guarda dentro i dati che contano davvero —
// se le entità hanno lo slug, se le pagine hanno i blocchi — perché un archivio
// con le righe giuste ma i contenuti vuoti passerebbe qualsiasi conteggio.
//
// COME SI USA
//   1. Scarica l'ultimo backup dal bucket R2 (Cloudflare → R2 → il bucket →
//      il file `backup-AAAA-MM-GG.json.gz` più recente → Download)
//   2. node verifica-backup.mjs C:\percorso\backup-2026-08-25.json.gz
//
// Cosa vuol dire l'esito:
//   VERDE  → da questo file si può ripartire
//   ROSSO  → il file esiste ma NON basta a rimettere in piedi il servizio

import { readFileSync, existsSync, statSync } from 'fs'
import { gunzipSync } from 'zlib'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const percorso = process.argv[2]
if (!percorso) {
  console.error('\nManca il file da verificare.\n')
  console.error('  node verifica-backup.mjs <percorso-del-backup.json.gz>\n')
  console.error('Il file si scarica da Cloudflare → R2 → bucket dei backup.\n')
  process.exit(2)
}
if (!existsSync(percorso)) {
  console.error(`\nNon trovo il file: ${percorso}\n`)
  process.exit(2)
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

// Senza queste, il servizio non torna in piedi: sono i clienti, i loro siti e
// il modo di raggiungerli. Le altre tabelle sono una perdita, non un blocco.
const VITALI = ['aziende', 'profiles', 'entita', 'pagine', 'domini', 'contatti']

let gravi = 0
let avvisi = 0
const grave = t => { console.log(`  ✗ ${t}`); gravi++ }
const avviso = t => { console.log(`  ⚠ ${t}`); avvisi++ }
const bene = t => console.log(`  ✓ ${t}`)

console.log('\n' + '='.repeat(66))
console.log('  VERIFICA DI UN BACKUP — si può ripartire da qui?')
console.log('='.repeat(66))

// ── 1. il file si apre? ──────────────────────────────────────────────────────
console.log('\n[1] Il file si apre e si legge\n')
const dimensione = statSync(percorso).size
let archivio
try {
  archivio = JSON.parse(gunzipSync(readFileSync(percorso)).toString('utf8'))
  bene(`si decomprime e si legge (${(dimensione / 1024).toFixed(0)} KB compressi)`)
} catch (e) {
  grave(`IL FILE NON SI APRE: ${e.message}`)
  console.log('\n  Questo archivio non serve a niente. Verificare gli altri backup nel bucket.')
  process.exit(1)
}

const quando = archivio?._meta?.exported_at
if (quando) {
  const ore = (Date.now() - new Date(quando)) / 3600000
  const testo = `del ${new Date(quando).toLocaleString('it-IT')} (${ore.toFixed(0)} ore fa)`
  ore > 48 ? avviso(`archivio vecchio ${testo} — il cron gira?`) : bene(`archivio recente ${testo}`)
} else {
  avviso('manca la data di esportazione nel file')
}

const tabelle = archivio?.tables
if (!tabelle || typeof tabelle !== 'object') {
  grave('il file non contiene la sezione `tables`: non è un backup valido')
  process.exit(1)
}
bene(`contiene ${Object.keys(tabelle).length} tabelle`)

// ── 2. cosa c'è dentro, confrontato con la produzione ───────────────────────
console.log('\n[2] Confronto riga per riga con la produzione\n')
const righe = []
for (const [nome, contenuto] of Object.entries(tabelle)) {
  if (contenuto && contenuto.error) {
    righe.push({ nome, dentro: null, errore: contenuto.error })
    continue
  }
  righe.push({ nome, dentro: Array.isArray(contenuto) ? contenuto.length : null })
}

for (const r of righe) {
  const { count, error } = await admin.from(r.nome).select('*', { count: 'exact', head: true })
  r.produzione = error ? null : count
}

// Le tabelle vitali per prime, poi quelle con differenze, poi il resto in breve.
const vitali = righe.filter(r => VITALI.includes(r.nome))
const altre = righe.filter(r => !VITALI.includes(r.nome))

console.log('  ── indispensabili per tornare online')
for (const r of vitali) {
  const etichetta = `${r.nome.padEnd(12)} archivio ${String(r.dentro ?? '—').padStart(6)}   produzione ${String(r.produzione ?? '—').padStart(6)}`
  if (r.errore) grave(`${etichetta}   NON ESPORTATA (${r.errore})`)
  else if (r.dentro === null) grave(`${etichetta}   assente dall'archivio`)
  else if (r.produzione === null) avviso(`${etichetta}   non confrontabile`)
  else if (r.dentro === 0 && r.produzione > 0) grave(`${etichetta}   VUOTA nell'archivio ma piena in produzione`)
  else if (r.dentro < r.produzione * 0.9) grave(`${etichetta}   mancano righe`)
  else bene(etichetta)
}

console.log('\n  ── il resto')
const problemiAltre = altre.filter(r =>
  r.errore || r.dentro === null || (r.produzione > 0 && r.dentro === 0) || (r.produzione > 0 && r.dentro < r.produzione * 0.9))
for (const r of problemiAltre) {
  avviso(`${r.nome.padEnd(22)} archivio ${String(r.dentro ?? '—').padStart(6)}   produzione ${String(r.produzione ?? '—').padStart(6)}${r.errore ? '   ' + r.errore : ''}`)
}
if (!problemiAltre.length) bene(`${altre.length} tabelle, tutte allineate alla produzione`)

// Una tabella che esiste in produzione e NON compare affatto nell'archivio è il
// difetto che è già successo: la lista delle tabelle da salvare era ferma.
console.log('\n  ── tabelle della produzione che l\'archivio non nomina proprio')
const NOTE = ['aziende','profiles','entita','pagine','domini','contatti','requests','prenotazioni',
  'preventivi','recensioni','eventi','event_bookings','articoli','newsletters','form_builder',
  'form_submissions','vetrine','vetrina_elementi','prodotti','ordini','gift_cards','loyalty_programs',
  'loyalty_points','piano_editoriale','automazioni','survey_risposte','risorse','messages',
  'whatsapp_account','site_snapshots','landing_seo','collegamenti','page_views','audit_log']
const dimenticate = []
for (const t of NOTE) {
  if (t in tabelle) continue
  const { count } = await admin.from(t).select('*', { count: 'exact', head: true })
  if (count > 0) dimenticate.push(`${t} (${count} righe)`)
}
if (dimenticate.length) { for (const d of dimenticate) grave(`mai esportata: ${d}`) }
else bene('nessuna tabella con dati è stata dimenticata')

// ── 3. dentro i dati, non solo i conteggi ───────────────────────────────────
console.log('\n[3] I dati sono utilizzabili, non solo presenti\n')

const ent = Array.isArray(tabelle.entita) ? tabelle.entita : []
if (!ent.length) grave('nessuna entità nell\'archivio: i siti dei clienti non ripartirebbero')
else {
  const senzaSlug = ent.filter(e => !e.slug).length
  const senzaNome = ent.filter(e => !e.name).length
  senzaSlug ? grave(`${senzaSlug} entità senza slug (l'indirizzo pubblico andrebbe perso)`) : bene(`${ent.length} entità, tutte con il proprio indirizzo`)
  if (senzaNome) grave(`${senzaNome} entità senza nome`)
}

const pag = Array.isArray(tabelle.pagine) ? tabelle.pagine : []
if (pag.length) {
  const vuote = pag.filter(p => !p.blocks || (Array.isArray(p.blocks) && p.blocks.length === 0)).length
  vuote > pag.length / 2
    ? grave(`${vuote} pagine su ${pag.length} senza contenuto: i siti tornerebbero bianchi`)
    : bene(`${pag.length} pagine, ${pag.length - vuote} con i contenuti dentro`)
}

const dom = Array.isArray(tabelle.domini) ? tabelle.domini : []
if (dom.length) bene(`${dom.length} domini: i clienti resterebbero raggiungibili al loro indirizzo`)
else if (dom.length === 0) avviso('nessun dominio nell\'archivio')

const az = Array.isArray(tabelle.aziende) ? tabelle.aziende : []
const prof = Array.isArray(tabelle.profiles) ? tabelle.profiles : []
if (az.length && prof.length) {
  const orfani = prof.filter(p => p.azienda_id && !az.some(a => a.id === p.azienda_id)).length
  orfani ? avviso(`${orfani} utenti puntano a un'azienda che non è nell'archivio`) : bene('utenti e aziende sono coerenti fra loro')
}

// ── esito ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(66))
if (gravi) {
  console.log(`  ROSSO — ${gravi} problemi gravi${avvisi ? `, ${avvisi} avvisi` : ''}`)
  console.log('  Da questo archivio NON si torna in piedi. Va sistemato il backup,')
  console.log('  non rifatta la verifica.')
} else if (avvisi) {
  console.log(`  VERDE con ${avvisi} avvisi`)
  console.log('  Da questo archivio si riparte. Gli avvisi sopra sono perdite')
  console.log('  accettabili, non blocchi — ma vale la pena guardarli.')
} else {
  console.log('  VERDE — da questo archivio si riparte, e non manca niente.')
}
console.log('='.repeat(66) + '\n')
process.exit(gravi ? 1 : 0)
