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
    price: 0, seats_total: 5, published: true, active: true, lista_attesa: true,
  }).select().single()

  // Una per stato, più una senza email: sono i casi che la pagina deve saper
  // raccontare tutti insieme.
  const righe = [
    { guest_name: 'ZZ Confermata', guest_email: `zz-c-${t}@playwright.internal`, seats: 1, status: 'confirmed' },
    { guest_name: 'ZZ Attesa',     guest_email: `zz-p-${t}@playwright.internal`, seats: 1, status: 'pending' },
    { guest_name: 'ZZ InLista',    guest_email: `zz-w-${t}@playwright.internal`, seats: 1, status: 'waitlist' },
    { guest_name: 'ZZ Telefono',   guest_email: null,                            seats: 1, status: 'confirmed' },
    // L'evento ha 4 posti e con queste è PIENO (le annullate e la lista non contano).
    { guest_name: 'ZZ Pagata',     guest_email: `zz-g-${t}@playwright.internal`, seats: 1, status: 'confirmed', pagamento_stato: 'pagato', pagamento_id: `cs_test_probe_${t}` },
    { guest_name: 'ZZ AllaCassa',  guest_email: null,                            seats: 1, status: 'pending', pagamento_stato: 'non_pagato' },
    { guest_name: 'ZZ Annullata',  guest_email: null,                            seats: 1, status: 'cancelled' },
  ]
  for (const r of righe) {
    const { error } = await admin.from('event_bookings').insert({ event_id: ev.id, ...r })
    if (error) throw new Error(`prenotazione ${r.guest_name}: ${error.message}`)
  }
  // Le righe sono scritte a mano: il contatore dei posti va allineato a mano.
  await admin.from('eventi').update({ seats_booked: 5 }).eq('id', ev.id)

  await withProbeSession(async ({ page }) => {
    await page.goto(`${L}/admin/eventi/${ev.id}/prenotazioni`, { waitUntil: 'networkidle' })
    // In locale la pagina può metterci più di un paio di secondi a compilarsi:
    // si aspetta che l'elenco ci sia, non un tempo fisso.
    await page.getByRole('button', { name: 'Modifica', exact: true }).first().waitFor({ timeout: 30000 })
    await page.waitForTimeout(500)
    const testo = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    const t1 = await testo()
    // FOTO=<cartella> salva la pagina com'è a schermo, per guardarla.
    if (process.env.FOTO) await page.screenshot({ path: `${process.env.FOTO}/pannello-eventi.png`, fullPage: true })

    console.log('\n1 · LE ETICHETTE SONO SPIEGATE\n')
    // ⚠️ Le pastiglie colorate c'erano da sempre e nessuno aveva mai scritto
    // cosa vogliono dire. «In attesa» non dice se quella persona verrà.
    ok(/ha il posto e verrà/i.test(t1), 'cosa vuol dire «confermata»')
    ok(/non è ancora suo/i.test(t1), 'cosa vuol dire «in attesa»')
    ok(/Non ne occupa uno/i.test(t1), 'e che chi è in lista non occupa un posto')

    console.log('\n2 · UNA SOLA AZIONE EVIDENTE PER RIGA\n')
    // ⛔ Prima erano tre pulsanti colorati uguali con la freccia.
    ok(!/→ In attesa|→ Annullata/i.test(t1), `spariti i «→ Stato» (${/→ /.test(t1) ? 'ce ne sono ancora' : 'nessuno'})`)
    // ⛔ «Ha disdetto», «Fai entrare», «Rimetti dentro» non si capivano
    // (Francesco, 04/10/2026): verbo + oggetto, e sotto cosa succede.
    const pulsante = nome => page.getByRole('button', { name: nome, exact: true })
    ok((await page.getByRole('button', { name: /^(Ha disdetto|Fai entrare|Rimetti dentro|correggi|elimina)$/i }).count()) === 0, 'spariti i pulsanti coi nomi che non si capivano')
    ok((await pulsante('Annulla prenotazione').count()) > 0, 'su una confermata: «Annulla prenotazione»')
    ok((await pulsante('Assegna un posto').count()) === 1, 'su chi è in lista: «Assegna un posto»')
    ok((await pulsante('Conferma prenotazione').count()) === 1, 'su chi è in attesa: «Conferma prenotazione»')
    ok((await pulsante('Conferma: paga sul posto').count()) === 1, 'su chi attende il pagamento: «Conferma: paga sul posto»')
    ok((await pulsante('Ripristina prenotazione').count()) === 1, 'su un’annullata: «Ripristina prenotazione»')
    ok((await pulsante('Modifica').count()) > 0 && (await pulsante('Elimina definitivamente').count()) > 0, '«Modifica» ed «Elimina definitivamente»')
    ok(/non riceve nessun avviso/i.test(t1), 'sotto «Annulla» c’è scritto che l’ospite NON viene avvisato')
    ok(/Assegna un posto: diventa una prenotazione confermata\. L’ospite riceve l’email di conferma/i.test(t1), 'sotto «Assegna un posto» c’è scritto che parte la conferma')

    console.log('\n2b · I GESTI FANNO QUELLO CHE DICONO\n')
    const stato = nome => admin.from('event_bookings').select('status, pagamento_stato').eq('event_id', ev.id).eq('guest_name', nome).single().then(r => r.data)
    const riga = nome => page.locator('div', { has: page.getByText(nome, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Modifica', exact: true }) }).last()
    // Annullare una prenotazione PAGATA chiede prima, e dice del rimborso.
    let domanda = ''
    page.once('dialog', d => { domanda = d.message(); d.dismiss() })
    await riga('ZZ Pagata').getByRole('button', { name: 'Annulla prenotazione', exact: true }).click()
    await page.waitForTimeout(800)
    ok(/rimborso NON parte da solo/i.test(domanda) && (await stato('ZZ Pagata')).status === 'confirmed', 'annullare una pagata avverte del rimborso, e dicendo no non succede niente')
    // Ripristinare un'annullata su un evento PIENO viene rifiutato, e lo si dice.
    let avviso = ''
    page.once('dialog', d => { avviso = d.message(); d.accept() })
    await riga('ZZ Annullata').getByRole('button', { name: 'Ripristina prenotazione', exact: true }).click()
    await page.waitForTimeout(1500)
    ok(/Non c'è spazio/i.test(avviso) && (await stato('ZZ Annullata')).status === 'cancelled', `ripristinare su un evento pieno è rifiutato con un messaggio («${avviso.slice(0, 60)}»)`)
    // Confermare chi attende il pagamento = paga sul posto.
    await riga('ZZ AllaCassa').getByRole('button', { name: 'Conferma: paga sul posto', exact: true }).click()
    await page.waitForTimeout(1500)
    const cassa = await stato('ZZ AllaCassa')
    ok(cassa.status === 'confirmed' && cassa.pagamento_stato === 'non_richiesto', `«Conferma: paga sul posto» la conferma senza pagamento online (${cassa.status}/${cassa.pagamento_stato})`)

    console.log('\n3 · IL PANNELLO DEGLI INVII\n')
    await page.getByRole('button', { name: /Scrivi a chi ha prenotato/i }).click()
    await page.waitForTimeout(900)
    // L'elenco si rilegge dopo ogni cambio di stato: gli si dà il tempo di arrivare.
    await page.getByText(/ZZ Telefono, ZZ AllaCassa/).waitFor({ timeout: 10000 }).catch(() => {})
    const t2 = await testo()
    ok(/Il messaggio/i.test(t2), 'c’è il campo del testo')
    ok((await page.locator('textarea').count()) > 0, 'ed è modificabile')
    ok(/Seleziona tutti/i.test(t2), 'c’è «Seleziona tutti»')

    const spunte = page.locator('input[type="checkbox"]')
    // Si scrive solo a chi è CONFERMATO e ha lasciato un'email (due qui) + «seleziona tutti».
    ok((await spunte.count()) === 3, `una spunta per persona raggiungibile + tutti (${await spunte.count()})`)
    // ⛔ Chi ha prenotato al telefono senza email non si può avvisare, e va
    // detto: sparire in silenzio fa credere che il sistema l'abbia contato.
    ok(/a voce/i.test(t2), 'e chi non ha lasciato l’email è nominato, da avvisare a voce')
    // ⛔ L'elenco di chi avvisare restava quello del caricamento della pagina:
    // chi veniva confermato un attimo prima non c'era.
    ok(/ZZ AllaCassa/.test(t2.slice(t2.indexOf('Seleziona tutti'), t2.indexOf('Manda a'))), 'chi è stato appena confermato compare fra le persone da avvisare')

    console.log('\n4 · «SELEZIONA TUTTI» FA QUELLO CHE DICE\n')
    await page.getByRole('checkbox').first().uncheck()
    await page.waitForTimeout(400)
    ok(/Scegli chi avvisare/i.test(await testo()), 'togliendo tutti, il pulsante non manda più')
    await page.getByRole('checkbox').first().check()
    await page.waitForTimeout(400)
    ok(/Manda a 2/i.test(await testo()), 'rimettendoli, dice a quante persone manderà')
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
