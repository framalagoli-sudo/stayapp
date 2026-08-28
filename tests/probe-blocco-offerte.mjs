// Il blocco «Offerte» sul sito, e i due blocchi che sparivano in silenzio.
//
// Prima le offerte comparivano solo travestite da attività o escursione, e i
// blocchi «Widget prenotazione» e «Offerte» non avevano nessuna configurazione:
// si trascinavano nella pagina, non chiedevano niente, e se non c'era materiale
// sparivano senza dirlo. Sembrava che non funzionassero.
//
// ⚠️ Questo blocco finisce nell'HTML pubblico: si controlla anche che **non**
// esca quello che non deve — quante ne ha vendute, le sue regole di lavoro.
//
// Uso: node probe-blocco-offerte.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const L = process.env.TEST_LOCALE || TEST_URL
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null, en = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-BO-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const slug = `zz-bo-${Date.now()}`
  const { data: e } = await admin.from('entita').insert({
    azienda_id: az, tipo: 'attivita', slug, name: 'ZZ Vetrina', active: true,
    minisito: { active: true },
  }).select().single(); en = e.id

  const nuova = (props) => admin.from('offerte').insert({
    azienda_id: az, entity_id: en, modo: 'richiesta', impegno: 'chiedi',
    attiva: true, pubblicata: true, ...props,
  }).select().single()

  await nuova({ titolo: 'ZZ Corso di cucina', categoria: 'Corsi', prezzo: 80, descrizione: 'ZZ impari a fare la pasta' })
  await nuova({ titolo: 'ZZ Gita in barca', categoria: 'Escursioni', prezzo: 45, luogo: 'ZZ Porto vecchio' })
  await nuova({ titolo: 'ZZ Esaurita', categoria: 'Corsi', prezzo: 20, posti_totali: 2, posti_occupati: 2 })
  const { data: bozza } = await nuova({ titolo: 'ZZ Non pubblicata', categoria: 'Corsi', prezzo: 10 })
  await admin.from('offerte').update({ pubblicata: false }).eq('id', bozza.id)
  // Un'offerta con dei dati che NON devono uscire.
  await nuova({ titolo: 'ZZ Con segreti', categoria: 'Corsi', prezzo: 15, avvisa_titolare: true, anticipo_ore: 48, chiusure: [{ data_inizio: '2026-12-24', data_fine: '2026-12-26' }] })

  // Una pagina con il blocco offerte, senza filtro.
  await admin.from('pagine').insert({
    entity_tipo: 'attivita', entity_id: en, slug: '__home__', titolo: 'Home', status: 'pubblicata',
    blocks: [{ id: 'b1', type: 'offerte', data: { titolo_sezione: 'ZZ Le nostre proposte' } }],
  })

  console.log('\nLE OFFERTE COMPAIONO SUL SITO\n')
  const html = await (await fetch(`${L}/a/${slug}`)).text()

  ok(html.includes('ZZ Le nostre proposte'), 'il titolo della sezione c\'è')
  ok(html.includes('ZZ Corso di cucina') && html.includes('ZZ Gita in barca'), 'le offerte pubblicate ci sono')
  ok(html.includes('ZZ impari a fare la pasta'), 'con la descrizione')
  ok(html.includes('Corsi') && html.includes('Escursioni'), 'e la categoria')
  ok(!html.includes('ZZ Non pubblicata'), 'una bozza non compare')
  ok(html.includes('Esaurito'), 'quella senza posti dice «Esaurito»')

  console.log('\n  e quello che NON deve uscire:\n')
  // ⚠️ Si guarda l'HTML grezzo, non i campi che ci aspettiamo: un campo nuovo
  // che non avevamo previsto si vede solo così.
  ok(!/posti_occupati/.test(html), 'quante ne ha vendute non esce')
  ok(!/avvisa_titolare|conferma_ospite/.test(html), 'come lavora il cliente non esce')
  ok(!/anticipo_ore|cancellazione_ore/.test(html), 'le sue regole di lavoro non escono')
  ok(!/2026-12-24/.test(html), 'le chiusure non escono: dicono quando è via')
  ok(!/origine_id|prodotto_id/.test(html), 'nessun riferimento interno delle offerte')
  // ⚠️  serve solo a noi per dividere attività ed escursioni: è una
  // classificazione nostra e nell'HTML pubblico è rumore.
  ok(!/\\origine\\/.test(html), 'e nemmeno come le abbiamo classificate')

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  LE OFFERTE SI VEDONO, E SOLO QUELLO CHE DEVE VEDERSI')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (en) { await admin.from('pagine').delete().eq('entity_id', en); await admin.from('offerte').delete().eq('entity_id', en); await admin.from('entita').delete().eq('id', en) }
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
