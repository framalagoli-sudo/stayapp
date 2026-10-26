// Sonda: la porta delle richieste dall'app del QR (`POST /api/requests`) non si
// può usare per riempire di email la casella di un titolare (26/10/2026).
//
// Prima accettava qualunque `property_id`, qualunque tipo e messaggi di
// qualunque lunghezza, senza limite: a ogni invio partiva un'email al titolare
// di quell'entità. Qui si prova il caso ostile e il percorso vero dell'ospite.
//
// Crea un'azienda «ZZ» con una struttura SENZA email (nessuna email parte) e la
// cancella sempre. A mano: cd tests && $env:TEST_URL='http://localhost:3000'; node probe-richieste-ospite.mjs
// ⚠️ Usa 21 invii dal tuo indirizzo: il limite per indirizzo vale un'ora.
import { chromium } from '@playwright/test'
import { admin, TEST_URL, cancellaAziendaDiProva } from './probe-auth.mjs'

let rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const invia = (corpo) => fetch(`${TEST_URL}/api/requests`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
})

const t = Date.now()
let az = null, ent = null, browser = null
try {
  console.log(`\nRICHIESTE DALL'APP DEL QR — ${TEST_URL}\n`)
  ;({ data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-RICHIESTE-${t}`, require_2fa: false, moduli: { struttura: true } }).select().single())
  ;({ data: ent } = await admin.from('entita').insert({
    azienda_id: az.id, tipo: 'struttura', name: 'Hotel ZZ Richieste', slug: `zz-richieste-${t}`, active: true,
    email: null, moduli: { reception: true },
  }).select().single())
  if (!ent) throw new Error('entità di prova non creata')
  const valida = { property_id: ent.id, type: 'reception', room: '12', message: 'Sonda: asciugamani in più' }

  // Il caso ostile: ognuno deve essere rifiutato prima di scrivere qualcosa.
  const ostili = [
    ['id non valido',                { ...valida, property_id: 'abc' }],
    ['id inventato',                 { ...valida, property_id: '00000000-0000-4000-8000-000000000000' }],
    ['tipo fuori catalogo',          { ...valida, type: '<b>Il tuo account scade</b>' }],
    ['messaggio da 3000 caratteri',  { ...valida, message: 'x'.repeat(3000) }],
    ['camera non testuale',          { ...valida, room: { a: 1 } }],
    ['messaggio non testuale',       { ...valida, message: ['a'] }],
  ]
  for (const [cosa, corpo] of ostili) {
    const r = await invia(corpo)
    esito(r.status === 400, `rifiutato: ${cosa}`, `risposta ${r.status}`)
  }
  const { count: dopoOstili } = await admin.from('requests').select('id', { count: 'exact', head: true }).eq('property_id', ent.id)
  esito(dopoOstili === 0, 'nessuna riga scritta dagli invii ostili', `${dopoOstili} righe`)

  // L'invio buono passa, e la risposta dice solo ciò che serve all'app.
  const r = await invia(valida)
  const corpo = await r.json()
  esito(r.status === 201, 'una richiesta vera passa', `risposta ${r.status} ${JSON.stringify(corpo)}`)
  const chiavi = Object.keys(corpo).sort().join(',')
  esito(chiavi === 'created_at,id,status', 'la risposta contiene solo id, stato e data', chiavi)

  // Il percorso dell'ospite: l'app del QR, scheda «Richiesta», invio.
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'it-IT' })
  await page.goto(`${TEST_URL}/s/${ent.slug}?qr=1`, { waitUntil: 'networkidle' })
  // Come un ospite: prima risponde al banner dei cookie, che copre la barra in basso.
  await page.locator('[data-cookie-banner] button').last().click()
  await page.getByText('Richiesta', { exact: true }).first().click()
  await page.locator('textarea').fill('Sonda dal browser: un cuscino in più')
  await page.getByRole('button', { name: /invia/i }).click()
  const inviata = await page.getByText('Richiesta inviata!').waitFor({ timeout: 15000 }).then(() => true, () => false)
  esito(inviata, 'dall\'app del QR la richiesta arriva («Richiesta inviata!»)')

  // Il limite per indirizzo: 20 all'ora. Due già usate, ne servono altre 18 per arrivarci.
  let ultimo = 0
  for (let i = 0; i < 19; i++) ultimo = (await invia({ ...valida, message: `Sonda limite ${i}` })).status
  esito(ultimo === 429, 'oltre il limite per indirizzo la porta risponde 429', `ultima risposta ${ultimo}`)
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  try { if (browser) await browser.close() } catch {}
  try { if (ent) await admin.from('requests').delete().eq('property_id', ent.id) } catch {}
  try { await admin.from('rate_limits').delete().like('key', 'guest-request%') } catch {}
  try { if (az) await cancellaAziendaDiProva(az.id) } catch {}
}
console.log(`\n[probe] ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
process.exit(rossi ? 1 : 0)
