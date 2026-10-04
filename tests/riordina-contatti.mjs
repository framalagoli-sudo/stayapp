// Mette in ordine i contatti che c'erano prima delle regole del 04/10/2026.
//
// Due cose, decise con Francesco:
//
//   1. LE NOTE SCRITTE DAL SISTEMA SI TOLGONO. Ogni prenotazione aggiungeva alle
//      note una riga («[03/10/2026] Ha prenotato «…» — 2 posti»): la stessa
//      storia che ora sta nel registro (`contatti_attivita`), mescolata a quello
//      che scrive il titolare. «Le note ci servono? Serve l'origine del contatto
//      e categorizzarlo in una lista.»
//      ⚠️ Si tolgono SOLO i paragrafi che il sistema ha scritto da sé. I messaggi
//      che una persona ha scritto dal modulo del sito restano: sono parole sue, e
//      stanno solo lì. Anche quello che ha scritto il titolare resta.
//
//   2. CHI HA SOLO PRENOTATO O COMPRATO ESCE DALLE TRATTATIVE. Tutti nascevano
//      «Nuovo lead»: 114 contatti su 116. Resta in trattativa chi ha chiesto
//      qualcosa (dal sito, su WhatsApp, un preventivo), chi è stato
//      aggiunto a mano e chiunque sia già stato spostato dal primo stadio.
//      Gli altri si possono sempre rimettere dalla loro scheda.
//
// ⚠️ SIMULA soltanto. Scrive solo con `--esegui`. Si può rilanciare.
//
// Uso: cd tests && node riordina-contatti.mjs            (simula)
//      cd tests && node riordina-contatti.mjs --esegui   (scrive)
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test', quiet: true })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ESEGUI = process.argv.includes('--esegui')

async function tutte(tabella, colonne) {
  const out = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await a.from(tabella).select(colonne).order('created_at').range(da, da + 999)
    if (error) throw new Error(`${tabella}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

// Un paragrafo scritto dal sistema: una data fra quadre (in cifre o col mese a
// parole, com'era prima) e una delle tre frasi che le route scrivevano.
const AUTOMATICA = /^\[[^\]\n]{6,22}\] (Ha prenotato «|In lista d['’]attesa per «|Prenotazione (escursione|attività): )/
// Chi apre una trattativa: gli stessi tipi di `lib/crm.js`.
const APRE = new Set(['richiesta', 'whatsapp', 'preventivo'])

const aziende = await tutte('aziende', 'id, ragione_sociale, created_at')
const nome = Object.fromEntries(aziende.map(z => [z.id, z.ragione_sociale]))
const diProva = new Set(aziende.filter(z => (z.ragione_sociale || '').startsWith('ZZ-')).map(z => z.id))
const contatti = (await tutte('contatti', 'id, azienda_id, fonte, note, pipeline_stage, created_at')).filter(c => !diProva.has(c.azienda_id))
const chiede = new Set((await tutte('contatti_attivita', 'contatto_id, tipo, created_at')).filter(r => APRE.has(r.tipo)).map(r => r.contatto_id))

const note = [], stadi = []
const per = {}
const segna = (az, cosa) => { const k = nome[az] || '?'; (per[k] ||= {}); per[k][cosa] = (per[k][cosa] || 0) + 1 }

for (const c of contatti) {
  if (c.note) {
    const paragrafi = c.note.split(/\n\n+/)
    const restano = paragrafi.filter(p => !AUTOMATICA.test(p.trim()))
    if (restano.length !== paragrafi.length) {
      note.push({ id: c.id, azienda_id: c.azienda_id, nuova: restano.join('\n\n').trim() || null, tolti: paragrafi.length - restano.length, resta: restano.length })
      segna(c.azienda_id, restano.length ? 'note: tolte le righe automatiche, resta il resto' : 'note: svuotate (erano solo righe automatiche)')
    }
  }
  if (c.pipeline_stage === 'lead' && !chiede.has(c.id) && (c.fonte || 'manuale') !== 'manuale') {
    stadi.push(c)
    segna(c.azienda_id, 'escono dalle trattative')
  } else if (c.pipeline_stage) segna(c.azienda_id, `restano in trattativa (${c.pipeline_stage})`)
}

console.log(`\n${ESEGUI ? 'ESEGUO' : 'SIMULAZIONE — non scrivo niente'}\n`)
console.log(`contatti: ${contatti.length}`)
console.log(`note da ripulire: ${note.length} (${note.filter(n => !n.resta).length} si svuotano, ${note.filter(n => n.resta).length} tengono il resto) · paragrafi automatici tolti: ${note.reduce((s, n) => s + n.tolti, 0)}`)
console.log(`escono dalle trattative: ${stadi.length} · restano: ${contatti.filter(c => c.pipeline_stage).length - stadi.length}\n`)
for (const [k, v] of Object.entries(per).sort()) {
  console.log(`━━ ${k}`)
  for (const [cosa, n] of Object.entries(v).sort()) console.log(`   ${String(n).padStart(4)}  ${cosa}`)
}
const miste = note.filter(n => n.resta)
if (miste.length) {
  console.log('\nnote che NON si svuotano — cosa resta (senza indirizzi):')
  for (const n of miste) console.log(`   · ${(nome[n.azienda_id] || '?').slice(0, 20)}: «${n.nuova.replace(/\s+/g, ' ').replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 120)}»`)
}

if (!ESEGUI) { console.log('\nPer scrivere davvero: node riordina-contatti.mjs --esegui'); process.exit(0) }

let errori = 0
for (const n of note) { const { error } = await a.from('contatti').update({ note: n.nuova }).eq('id', n.id); if (error) { errori++; console.error('nota:', error.message) } }
for (const c of stadi) { const { error } = await a.from('contatti').update({ pipeline_stage: null }).eq('id', c.id).eq('pipeline_stage', 'lead'); if (error) { errori++; console.error('stadio:', error.message) } }
console.log(`\nFATTO: ${note.length} note ripulite, ${stadi.length} contatti fuori dalle trattative, ${errori} errori`)
process.exit(errori ? 1 : 0)
