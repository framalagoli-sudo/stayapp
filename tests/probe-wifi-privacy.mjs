// Le credenziali del WiFi escono solo dall'app dell'ospite.
//
// Misurato il 25/08/2026 su produzione: la password WiFi di una struttura vera
// viaggiava nel payload di ogni pagina pubblica di quella struttura — sito,
// sotto-pagine, manifest — e nessuna di quelle pagine diceva ai motori di
// ricerca di non indicizzarla. La password del WiFi ospiti non è un segreto di
// stato, ma è un dato del cliente e non deve finire in un indice pubblico.
//
// Uso: TEST_URL=http://localhost:3488 node probe-wifi-privacy.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
let problemi = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) problemi++ }

const { data } = await a.from('entita')
  .select('slug, name, wifi_password, minisito').eq('tipo','struttura').eq('active', true)
const conWifi = (data||[]).filter(e => e.wifi_password?.trim().length >= 6)
console.log(`\n${conWifi.length} strutture attive con una password WiFi\n`)

for (const e of conWifi) {
  const pw = e.wifi_password.trim()
  console.log(`${e.slug} — minisito ${e.minisito?.active ? 'attivo' : 'spento'}`)
  const prendi = async p => (await fetch(BASE + p)).text()

  // 1. dove NON deve stare
  for (const [nome, path] of [
    ['pagina privacy',   `/s/${e.slug}/privacy`],
    ['pagina cookie',    `/s/${e.slug}/cookie`],
    ['manifest PWA',     `/api/manifest/s/${e.slug}`],
  ]) ok(!(await prendi(path)).includes(pw), `${nome}: nessuna password`)

  // Se il minisito è attivo, la pagina pubblica è marketing: niente credenziali.
  if (e.minisito?.active) ok(!(await prendi(`/s/${e.slug}`)).includes(pw), 'minisito pubblico: nessuna password')

  // 2. dove DEVE continuare a stare, o abbiamo rotto la funzione
  ok((await prendi(`/s/${e.slug}?qr=1`)).includes(pw), "app dell'ospite: la password c'è ancora")

  // 3. e l'app non va offerta ai motori di ricerca
  ok(/<meta name="robots" content="noindex/.test(await prendi(`/s/${e.slug}?qr=1`)),
     "app dell'ospite: noindex")
}
console.log('\n' + '─'.repeat(58))
console.log(problemi ? `${problemi} PROBLEMI` : 'LE CREDENZIALI RESTANO NELL\'APP DELL\'OSPITE')
process.exit(problemi ? 1 : 0)
