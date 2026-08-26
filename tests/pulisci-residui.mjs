// Toglie dal database di produzione le aziende di prova rimaste indietro.
//
// Le sonde creano un'azienda effimera e la cancellano nel `finally`. Quel
// `finally` però non gira sempre: basta troncare l'output con `head` — la pipe
// si chiude, il processo muore su una scrittura e la pulizia resta a metà.
// Stesso esito con un Ctrl-C o con un crash del browser.
//
// Il residuo non è innocuo: le aziende di prova compaiono nel selettore in cima
// al pannello, in mezzo ai clienti veri. Ne sono state trovate tre il 26/08.
//
// Uso:  node pulisci-residui.mjs           → dice cosa toglierebbe
//       node pulisci-residui.mjs --esegui  → lo toglie davvero
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const esegui = process.argv.includes('--esegui')

// Solo i nomi che **le sonde stesse** si danno. Niente ricerche generiche tipo
// «test» o «prova»: `struttura-test` e `prova` sono entità vere di Francesco, e
// uno script che cancella in produzione deve poter colpire solo ciò che ha
// creato uno script.
const PREFISSI = ['ZZ-', 'ci-']

const { data: aziende, error } = await admin.from('aziende').select('id, ragione_sociale, created_at').order('created_at')
if (error) { console.error('Non riesco a leggere le aziende:', error.message); process.exit(1) }

const residui = (aziende || []).filter(a => PREFISSI.some(p => (a.ragione_sociale || '').startsWith(p)))
if (!residui.length) { console.log('\nNessun residuo: il pannello è pulito.\n'); process.exit(0) }

console.log(`\n${residui.length} aziende di prova rimaste in produzione${esegui ? '' : '  (nessuna verrà toccata: manca --esegui)'}\n`)
let tolte = 0, bloccate = 0
for (const a of residui) {
  const { data: ent } = await admin.from('entita').select('id, slug').eq('azienda_id', a.id)
  const { data: pf } = await admin.from('profiles').select('id').eq('azienda_id', a.id)
  console.log(`  ${a.created_at.slice(0, 16)}  ${a.ragione_sociale.padEnd(34)} entità:${ent?.length || 0} profili:${pf?.length || 0}`)
  if (!esegui) continue

  // L'ordine conta: prima quello che pende dall'azienda, poi l'azienda.
  for (const e of ent || []) {
    const { error: er } = await admin.from('entita').delete().eq('id', e.id)
    if (er) console.log(`      ✗ entità ${e.slug}: ${er.message}`)
  }
  for (const p of pf || []) await admin.auth.admin.deleteUser(p.id).catch(() => {})
  const { error: ea } = await admin.from('aziende').delete().eq('id', a.id)
  // Un errore qui si stampa: una pulizia che fallisce in silenzio è il motivo
  // per cui questi residui sono arrivati fino a qui.
  if (ea) { console.log(`      ✗ ${ea.message}`); bloccate++ } else { console.log('      tolta'); tolte++ }
}

console.log('\n' + '-'.repeat(62))
if (!esegui) console.log('  Per toglierle davvero: node pulisci-residui.mjs --esegui\n')
else console.log(`  ${tolte} tolte${bloccate ? `, ${bloccate} bloccate (leggere l'errore qui sopra)` : ''}\n`)
process.exit(bloccate ? 1 : 0)
