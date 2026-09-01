// Chiude gli account Stripe di prova rimasti.
//
// ⚠️ Nasce da un mio errore: la sonda `probe-acconto` è stata lanciata in
// produzione e ha creato account Stripe **live**. Dal pannello non si
// cancellano — Stripe risponde *«La rimozione degli account con configurazioni
// cliente non è attualmente supportata»* — ma dall'API si **chiudono**, e un
// account chiuso non compare più fra quelli operativi.
//
// Perché non si cancellano: li creiamo con la configurazione `customer` attiva
// (serve se un giorno fattureremo l'abbonamento sullo stesso account). Stripe
// non permette di rimuovere account che ce l'hanno.
//
// ── COME SI USA ─────────────────────────────────────────────────────────────
//
//   1. Prende la chiave da riga di comando, perché quella **live** non sta in
//      nessun file di questo computer: si copia da Stripe → Sviluppatori →
//      Chiavi API, e si incolla qui una volta sola.
//
//   2. **Prima mostra soltanto**, senza toccare niente:
//        node chiudi-account-stripe.mjs sk_live_...
//
//   3. Poi, se l'elenco è quello giusto:
//        node chiudi-account-stripe.mjs sk_live_... --chiudi
//
// ⛔ Tocca **solo** gli account il cui nome comincia per `ZZ` — quelli delle
// prove. Un cliente vero non si chiama così, e la chiusura non si annulla.
import Stripe from 'stripe'

const VERSIONE = '2026-08-26.dahlia'
const chiave = process.argv[2]
const esegui = process.argv.includes('--chiudi')

// ⚠️ Anche le chiavi **con limitazioni** (`rk_`), non solo quelle complete:
// sono la strada giusta per un lavoro come questo — fanno solo ciò che serve —
// e Stripe ormai propone quelle. Accettarne una sola delle due forme voleva
// dire rifiutare proprio la più sicura.
if (!/^(sk|rk)_/.test(chiave || '')) {
  console.error('\nManca la chiave Stripe.\n')
  console.error('  node chiudi-account-stripe.mjs sk_live_...            (mostra e basta)')
  console.error('  node chiudi-account-stripe.mjs sk_live_... --chiudi   (chiude davvero)\n')
  process.exit(2)
}

const stripe = new Stripe(chiave)
const ambiente = /_live_/.test(chiave) ? 'LIVE' : 'sandbox'

console.log(`\nAmbiente: ${ambiente}`)
console.log(esegui ? 'Modalità: CHIUSURA\n' : 'Modalità: solo elenco — non tocco niente\n')

// ⚠️ Il massimo per pagina è **20**, non di più: chiedendone 100 Stripe
// risponde con un errore. Si scorre finché ce ne sono — senza, ne resterebbero
// fuori proprio quelli più vecchi, cioè quelli da ripulire.
const data = []
let pagina = await stripe.v2.core.accounts.list({ limit: 20 }, { apiVersion: VERSIONE })
data.push(...(pagina.data || []))
while (pagina.next_page_url) {
  pagina = await stripe.v2.core.accounts.list({ limit: 20, page: pagina.next_page_url }, { apiVersion: VERSIONE })
    .catch(() => ({ data: [] }))
  if (!pagina.data?.length) break
  data.push(...pagina.data)
}

// ⚠️ Il filtro è stretto di proposito: meglio lasciare fuori un account di
// prova che chiuderne uno di un cliente vero. La chiusura non si annulla.
const daChiudere = (data || []).filter(a => !a.closed && /^ZZ/i.test(a.display_name || ''))
const altri = (data || []).filter(a => !a.closed && !/^ZZ/i.test(a.display_name || ''))

console.log(`Account attivi in totale: ${(data || []).filter(a => !a.closed).length}`)
console.log(`Di prova (nome che inizia per ZZ): ${daChiudere.length}\n`)

for (const a of altri) console.log(`  · ${a.display_name || '(senza nome)'} — ${a.id}   ← NON lo tocco`)
if (altri.length) console.log('')

if (!daChiudere.length) {
  console.log('Nessun account di prova da chiudere.\n')
  process.exit(0)
}

let chiusi = 0, falliti = 0
for (const a of daChiudere) {
  if (!esegui) { console.log(`  · ${a.display_name} — ${a.id}   (da chiudere)`); continue }
  try {
    await stripe.v2.core.accounts.close(a.id,
      { applied_configurations: a.applied_configurations?.length ? a.applied_configurations : ['customer', 'merchant'] },
      { apiVersion: VERSIONE })
    chiusi++
    console.log(`  ✓ chiuso  ${a.display_name} — ${a.id}`)
  } catch (e) {
    falliti++
    console.log(`  ✗ ${a.display_name} — ${a.id}: ${e.message.slice(0, 150)}`)
  }
}

// ⚠️ Non si dice «fatto» se non è stato fatto. Dire che è andata quando è
// fallito tutto fa credere risolto un problema che resta lì — ed è esattamente
// il genere di bugia che questo progetto ha già pagato caro.
if (!esegui) {
  console.log('\nNessuna modifica. Rilancia con --chiudi per chiuderli davvero.\n')
} else if (falliti && !chiusi) {
  console.log(`\n⛔ Nessuno chiuso: tutti e ${falliti} rifiutati da Stripe.\n`)
  console.log('   In LIVE, gli account con le perdite a carico di Stripe e la')
  console.log('   dashboard completa NON si possono chiudere dalla piattaforma:')
  console.log('   hanno un rapporto diretto con Stripe e non ne siamo padroni.')
  console.log('   È la stessa ragione per cui il rischio non è nostro.\n')
  console.log('   Restano visibili, ma sono vuoti e mai attivati: non incassano')
  console.log('   niente. Per farli sparire davvero serve chiedere al supporto Stripe.\n')
} else {
  console.log(`\nChiusi ${chiusi}${falliti ? `, ${falliti} rifiutati` : ''}.\n`)
}
