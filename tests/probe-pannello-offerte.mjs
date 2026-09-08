// Il pannello delle offerte, aperto con un browser vero.
//
// ⛔ È codice di browser: `next build` non lo esegue e una GET non lo rende. Un
// identificatore fuori scope o una condizione sbagliata si vedrebbero solo qui
// — è già successo con `AEsploraPage`.
//
// Le due cose che deve dimostrare:
//   · a giornate compare «Quel prezzo è… per ogni giorno / per tutto il
//     periodo», che è la domanda da cui dipendeva un conto sbagliato di cinque
//     volte, e NON compaiono le ore — il titolare del Furgone le aveva
//     compilate (09:00–11:00 su un noleggio a giornate) perché gliele
//     mostravamo. Un campo fuori posto non viene ignorato: viene riempito.
//   · l'anteprima dice quanto pagherà chi prenota, PRIMA di salvare.
//
// ⚠️ Risorse finte. Il pannello di un cliente vero non si apre per fare una
// misura.
//
// Uso: cd tests && node probe-pannello-offerte.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
import { withProbeSession } from './probe-auth.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = []

try {
  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-PAN-${t}`, email: `zz-pn-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ Noleggi', slug: `zz-pn-${t}`, active: true }).select().single()

  const crea = async (nome, modalita, extra = {}) => {
    const { data, error } = await admin.from('risorse').insert({
      azienda_id: az.id, entity_tipo: 'attivita', entity_id: ent.id,
      nome, modalita, quantita: 1, prezzo: 100, attiva: true, ...extra,
    }).select().single()
    if (error) throw new Error(`risorsa ${nome}: ${error.message}`)
    return data
  }
  const aGiornate = await crea('ZZ Furgone', 'giornaliero', { disponibilita: { conta_giorno_uscita: true } })
  const aSlot     = await crea('ZZ Campo', 'slot', { durata_minuti: 60, disponibilita: { lun: [{ start: '09:00', end: '18:00' }] } })

  await withProbeSession(async ({ page }) => {
    // ⚠️ Il pulsante «Offerte» c'è su ogni riga: un `.first()` apre sempre la
    // prima risorsa dell'elenco, qualunque nome gli si chieda. Alla prima corsa
    // ha riaperto il Furgone mentre la sonda credeva di guardare il campo da
    // padel, e ha dichiarato due difetti che non esistevano. Qui si risale alla
    // riga per il nome, e poi si **verifica** su quale pannello si è finiti: una
    // misura fatta sull'oggetto sbagliato è peggio di una misura mancante.
    const apriOfferte = async (nomeRisorsa) => {
      await page.goto(`${L}/admin/booking/risorse`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      // La riga della risorsa è il div che contiene sia il suo nome sia il
      // pulsante; da lì si prende il pulsante di QUELLA riga.
      await page.locator('div')
        .filter({ hasText: nomeRisorsa })
        .filter({ has: page.getByRole('button', { name: 'Offerte' }) })
        .last()
        .getByRole('button', { name: 'Offerte' }).click()
      await page.waitForTimeout(900)
      const titolo = (await page.locator('h1').first().innerText()).trim()
      if (!titolo.includes(nomeRisorsa)) throw new Error(`aperto «${titolo}» invece di «${nomeRisorsa}»`)
      await page.getByRole('button', { name: /Nuova offerta/i }).first().click()
      await page.waitForTimeout(600)
      return (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    }

    console.log('\n1 · A GIORNATE: LA DOMANDA CHE MANCAVA\n')
    const g = await apriOfferte('ZZ Furgone')
    ok(/Quel prezzo è/i.test(g), 'c’è «Quel prezzo è…»')
    ok(/per tutto il periodo/i.test(g), 'con l’opzione «per tutto il periodo»')
    ok(/Solo da almeno/i.test(g), 'e la durata minima')
    // ⛔ Il campo che il titolare del Furgone aveva riempito senza che volesse
    // dire niente.
    ok(!/Ore dalle/i.test(g), `le ore NON ci sono (${/Ore dalle/i.test(g) ? 'ci sono ancora' : 'tolte'})`)

    console.log('\n2 · L’ANTEPRIMA DICE QUANTO SI PAGHERÀ\n')
    // ⛔ «Prezzo speciale: 850» non dice quanto pagherà chi prenota. L'errore
    // sul prezzo si deve vedere PRIMA di pubblicarlo.
    const campoPrezzo = page.locator('input[type="number"]').first()
    await campoPrezzo.fill('70')
    await page.waitForTimeout(700)
    const conPrezzo = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    ok(/pagherà/i.test(conPrezzo), 'l’anteprima compare appena c’è un prezzo')
    ok(/di listino/i.test(conPrezzo), 'e mostra accanto il prezzo pieno')

    console.log('\n3 · A SLOT ORARI RESTA COM’ERA\n')
    // ⚠️ Il caso da non rompere: per un campo da padel le ore servono, e la
    // domanda sul periodo non ha senso.
    const s = await apriOfferte('ZZ Campo')
    ok(/Ore dalle/i.test(s), 'le ore ci sono')
    ok(!/Quel prezzo è/i.test(s), 'e la domanda sul periodo non compare')
  }, { width: 1200 })

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL PANNELLO CHIEDE QUELLO CHE SERVE, DOVE SERVE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
