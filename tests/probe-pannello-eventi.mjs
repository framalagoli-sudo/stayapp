// La pagina delle prenotazioni di un evento, aperta con un browser vero.
//
// ⛔ È codice di browser: `next build` non lo esegue e una GET non lo rende.
// Il difetto del 08/09 — un commento JSX dentro `&& ( … )` — l'ha preso il
// build, ma un identificatore fuori scope no.
//
// Le due cose chieste da Francesco:
//   · «è un marasma con i bottoni sotto a ogni prenotato, il mio cliente non
//     capisce nulla» → una sola azione evidente per riga, col nome di quello
//     che succede alla persona, e sopra la spiegazione delle etichette;
//   · «l'invio dovrebbe essere un pannello con un testo da personalizzare e la
//     lista dei prenotati da checkare (e l'opzione seleziona tutti)».
//
// ⚠️ Evento finto. Nessuna email parte verso persone vere: gli indirizzi sono
// `@playwright.internal` e non si preme mai «Manda».
//
// Uso: cd tests && node probe-pannello-eventi.mjs
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
    .insert({ ragione_sociale: `ZZ-PANEV-${t}`, email: `zz-pe-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale', slug: `zz-pe-${t}`, active: true }).select().single()
  const fra = new Date(); fra.setDate(fra.getDate() + 15)
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura',
    title: 'ZZ Serata', slug: `zz-pe-${t}`, date_start: fra.toISOString(),
    price: 0, seats_total: 4, published: true, active: true, lista_attesa: true,
  }).select().single()

  // Una per stato, più una senza email: sono i casi che la pagina deve saper
  // raccontare tutti insieme.
  const righe = [
    { guest_name: 'ZZ Confermata', guest_email: `zz-c-${t}@playwright.internal`, seats: 1, status: 'confirmed' },
    { guest_name: 'ZZ Attesa',     guest_email: `zz-p-${t}@playwright.internal`, seats: 1, status: 'pending' },
    { guest_name: 'ZZ InLista',    guest_email: `zz-w-${t}@playwright.internal`, seats: 1, status: 'waitlist' },
    { guest_name: 'ZZ Telefono',   guest_email: null,                            seats: 1, status: 'confirmed' },
  ]
  for (const r of righe) {
    const { error } = await admin.from('event_bookings').insert({ event_id: ev.id, ...r })
    if (error) throw new Error(`prenotazione ${r.guest_name}: ${error.message}`)
  }

  await withProbeSession(async ({ page }) => {
    await page.goto(`${L}/admin/eventi/${ev.id}/prenotazioni`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    const testo = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    const t1 = await testo()

    console.log('\n1 · LE ETICHETTE SONO SPIEGATE\n')
    // ⚠️ Le pastiglie colorate c'erano da sempre e nessuno aveva mai scritto
    // cosa vogliono dire. «In attesa» non dice se quella persona verrà.
    ok(/ha il posto e verrà/i.test(t1), 'cosa vuol dire «confermata»')
    ok(/non è ancora suo/i.test(t1), 'cosa vuol dire «in attesa»')
    ok(/Non ne occupa uno/i.test(t1), 'e che chi è in lista non occupa un posto')

    console.log('\n2 · UNA SOLA AZIONE EVIDENTE PER RIGA\n')
    // ⛔ Prima erano tre pulsanti colorati uguali con la freccia.
    ok(!/→ In attesa|→ Annullata/i.test(t1), `spariti i «→ Stato» (${/→ /.test(t1) ? 'ce ne sono ancora' : 'nessuno'})`)
    ok(/Ha disdetto/i.test(t1), 'su una confermata: «Ha disdetto»')
    ok(/Fai entrare/i.test(t1), 'su chi è in lista: «Fai entrare», non «Conferma»')
    ok((await page.getByRole('button', { name: 'Conferma', exact: true }).count()) > 0,
       'e su chi è in attesa: «Conferma»')

    console.log('\n3 · IL PANNELLO DEGLI INVII\n')
    await page.getByRole('button', { name: /Scrivi a chi ha prenotato/i }).click()
    await page.waitForTimeout(900)
    const t2 = await testo()
    ok(/Il messaggio/i.test(t2), 'c’è il campo del testo')
    ok((await page.locator('textarea').count()) > 0, 'ed è modificabile')
    ok(/Seleziona tutti/i.test(t2), 'c’è «Seleziona tutti»')

    const spunte = page.locator('input[type="checkbox"]')
    // Tre raggiungibili (chi non ha email non è spuntabile) + «seleziona tutti».
    ok((await spunte.count()) === 4, `una spunta per persona raggiungibile + tutti (${await spunte.count()})`)
    // ⛔ Chi ha prenotato al telefono senza email non si può avvisare, e va
    // detto: sparire in silenzio fa credere che il sistema l'abbia contato.
    ok(/a voce/i.test(t2), 'e chi non ha lasciato l’email è nominato, da avvisare a voce')

    console.log('\n4 · «SELEZIONA TUTTI» FA QUELLO CHE DICE\n')
    await page.getByRole('checkbox').first().uncheck()
    await page.waitForTimeout(400)
    ok(/Scegli chi avvisare/i.test(await testo()), 'togliendo tutti, il pulsante non manda più')
    await page.getByRole('checkbox').first().check()
    await page.waitForTimeout(400)
    ok(/Manda a 3/i.test(await testo()), 'rimettendoli, dice a quante persone manderà')
  }, { width: 1200 })

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'SI CAPISCE COSA FA OGNI COSA')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
