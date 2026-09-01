// Toglie di mezzo le aziende di prova rimaste in produzione.
//
// ⚠️ Le sonde girano sul database VERO: quello che creano e non cancellano resta
// lì per sempre. E la pulizia scritta «ricordo gli id che ho creato» non basta —
// se la sonda si ferma a metà, tutto quello che è nato dopo l'ultimo id
// registrato resta orfano. Misurato il 01/09: tre aziende ZZ, con dentro
// prenotazioni, contatti e automazioni.
//
// Qui si cancella per AZIENDA, non per lista: tutto ciò che appartiene a
// un'azienda di prova se ne va con lei, qualunque cosa sia successa.
//
// Uso: cd tests && node pulizia-prove.mjs            (mostra e basta)
//      cd tests && node pulizia-prove.mjs --esegui   (cancella)
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ESEGUI = process.argv.includes('--esegui')

// ⛔ Solo i nomi che le sonde si danno da sole. Mai un criterio più largo: qui
// si cancella sul database di produzione, dove ci sono clienti veri.
const MARCHIO = 'ZZ-'

// L'ordine conta: prima chi punta, poi chi è puntato, o le chiavi esterne
// rifiutano la cancellazione — ed è così che erano rimasti in piedi.
export async function svuotaAzienda(aziendaId) {
  const { data: risorse } = await admin.from('risorse').select('id').eq('azienda_id', aziendaId)
  for (const r of risorse || []) {
    await admin.from('prenotazioni').delete().eq('risorsa_id', r.id)
    await admin.from('risorse_promozioni').delete().eq('risorsa_id', r.id)
  }
  const { data: automazioni } = await admin.from('automazioni').select('id').eq('azienda_id', aziendaId)
  for (const a of automazioni || []) await admin.from('automazioni_log').delete().eq('automazione_id', a.id)

  for (const tabella of ['prenotazioni', 'risorse', 'automazioni', 'contatti', 'eventi', 'recensioni', 'requests']) {
    const { error } = await admin.from(tabella).delete().eq('azienda_id', aziendaId)
    if (error && !/does not exist|column/.test(error.message)) console.error(`  ${tabella}: ${error.message}`)
  }
  const { error } = await admin.from('aziende').delete().eq('id', aziendaId)
  return error?.message || null
}

// ⛔ Da qui in giu si esegue SOLO se lanciato a mano.
//
// Senza questa riga, importare `svuotaAzienda` da una sonda faceva partire
// anche la ricerca qui sotto — e il suo `process.exit(0)`: la sonda si
// spegneva prima di cominciare, senza dire perche. Un file che esporta una
// funzione e insieme fa qualcosa al caricamento e una trappola.
const lanciatoAMano = process.argv[1]?.endsWith('pulizia-prove.mjs')
if (lanciatoAMano) {
const { data: zz } = await admin.from('aziende')
  .select('id, ragione_sociale, created_at').ilike('ragione_sociale', `${MARCHIO}%`)

// ⚠️ Niente `process.exit()`: con il client Supabase ancora aperto, su Windows
// Node esce con un «Assertion failed» che sembra un guasto e non lo è. Si lascia
// finire il programma da solo.
if (!zz?.length) {
  console.log('Nessuna azienda di prova rimasta.')
} else {
  console.log(`${zz.length} aziende di prova${ESEGUI ? '' : ' (nessuna cancellata: manca --esegui)'}\n`)
  for (const a of zz) {
    console.log(`  · ${a.ragione_sociale}  (${a.created_at.slice(0, 16).replace('T', ' ')})`)
    if (ESEGUI) {
      const errore = await svuotaAzienda(a.id)
      console.log(errore ? `      ✗ ${errore}` : '      ✓ eliminata')
    }
  }
}
}
