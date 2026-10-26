// Sonda: l'ospite annulla da solo un evento, e la lista d'attesa si muove da
// sola (26/10/2026, migration 141).
//
// Prova le regole decise da Francesco — termine scelto evento per evento, 24
// ore se non dice altro; un'ora per prendere il posto, mezz'ora se l'evento è
// oggi; interruttore per evento — il caso ostile (token inventati, prendere due
// volte, offerta scaduta, oltre il termine) e il percorso col browser: la
// pagina «Annulla», la pagina «Prendi il posto», l'editor e il pannello.
//
// Crea un'azienda «ZZ» senza email (nessun avviso al titolare parte); gli ospiti
// scrivono a `delivered+…@resend.dev`, il pozzo di Resend. Tutto si cancella.
// A mano: cd tests && $env:TEST_URL='http://localhost:3000'; node probe-annullamento-lista.mjs [cartella-foto]
// ⚠️ Fa 7 prenotazioni e 5 iscrizioni in lista dal tuo indirizzo (limite 10/ora ciascuna).
import { admin, TEST_URL, withProbeSession, cancellaAziendaDiProva } from './probe-auth.mjs'

const FOTO = process.argv[2] || null
let rossi = 0
const ok = (c, cosa, nota = '') => { if (!c) rossi++; console.log(`  ${c ? '✓' : '✗'} ${cosa}${!c && nota ? `  — ${nota}` : ''}`) }
const t = Date.now()
const ORA = 3600_000
const post = (p, corpo) => fetch(`${TEST_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
const get = p => fetch(`${TEST_URL}${p}`)
const riga = async id => (await admin.from('event_bookings').select('*').eq('id', id).single()).data
const evento = async id => (await admin.from('eventi').select('seats_booked').eq('id', id).single()).data

let az = null, ent = null
let n = 0
const email = () => `delivered+zz-annulla-${t}-${++n}@resend.dev`

async function nuovoEvento(campi) {
  const { data, error } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura', title: `ZZ Serata ${++n}`, slug: `zz-annulla-${t}-${n}`,
    price: 0, published: true, active: true, lista_attesa: true, lista_automatica: true, annullabile: true, annullabile_ore: 24,
    date_start: new Date(Date.now() + 3 * 24 * ORA).toISOString(), ...campi,
  }).select().single()
  if (error) throw new Error(`evento: ${error.message}`)
  return data
}
async function prenota(ev, seats = 1) {
  const r = await post(`/api/guest/eventi/${ev.id}/book`, { guest_name: 'ZZ Ospite', guest_email: email(), seats, privacy_accettata: true })
  const d = await r.json()
  return { status: r.status, d }
}
async function inLista(ev, seats = 1) {
  const r = await post(`/api/guest/eventi/${ev.id}/lista-attesa`, { guest_name: 'ZZ Attesa', guest_email: email(), seats, privacy_accettata: true })
  const d = await r.json()
  return { status: r.status, d }
}

try {
  console.log(`\nANNULLAMENTO E LISTA D'ATTESA AUTOMATICA — ${TEST_URL}\n`)
  ;({ data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-ANNULLA-${t}`, require_2fa: false, email: null }).select().single())
  ;({ data: ent } = await admin.from('entita').insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale Annulla', slug: `zz-annulla-${t}`, active: true, email: null, phone: '+39 333 0000000' }).select().single())

  console.log('1 · ANNULLARE LIBERA IL POSTO, E LA LISTA LO RICEVE\n')
  const e1 = await nuovoEvento({ seats_total: 2 })
  const a = await prenota(e1, 2)
  ok(a.status === 201 && a.d.status === 'confirmed', 'prenotazione di 2 posti: l’evento è pieno', `${a.status} ${JSON.stringify(a.d).slice(0, 120)}`)
  const b = await inLista(e1); const c = await inLista(e1)
  ok(b.status === 201 && c.status === 201, 'due persone in lista d’attesa')
  const A = await riga(a.d.id)

  for (const [cosa, tok] of [['token non UUID', 'abc'], ['token inventato', '00000000-0000-4000-8000-000000000000'], ['niente token', '']]) {
    const d = await (await get(`/api/guest/eventi/annulla?t=${tok}`)).json()
    ok(d.stato === 'non_valido', `annulla, ${cosa}: «non valido»`, JSON.stringify(d))
    const r = await post('/api/guest/eventi/annulla', { t: tok })
    ok(r.status === 404, `annulla, ${cosa}: non annulla niente`, `risposta ${r.status}`)
  }
  const grezzo = await (await get(`/api/guest/eventi/annulla?t=${A.annulla_token}`)).text()
  const info = JSON.parse(grezzo)
  ok(info.stato === 'annullabile', 'aprire il link: «si può annullare»', grezzo.slice(0, 160))
  ok(!grezzo.includes(A.guest_email) && !grezzo.includes('@'), 'aprire il link non mostra email (corpo grezzo)')
  ok((await riga(a.d.id)).status === 'confirmed', 'aprire il link NON annulla: serve il pulsante')

  const r1 = await post('/api/guest/eventi/annulla', { t: A.annulla_token })
  ok(r1.status === 200, 'annullare col pulsante', `risposta ${r1.status}`)
  const A2 = await riga(a.d.id)
  ok(A2.status === 'cancelled' && !!A2.annullata_dall_ospite_il, 'la prenotazione è annullata, e si sa che l’ha fatto l’ospite')
  const B = await riga(b.d.id), C = await riga(c.d.id)
  const minutiB = (new Date(B.offerta_scade_il) - Date.now()) / 60_000
  ok(!!B.offerta_token && minutiB > 55 && minutiB <= 60, `il primo in lista ha un posto offerto per un’ora (${minutiB.toFixed(0)} min)`)
  ok(!!C.offerta_token, 'anche il secondo: si sono liberati due posti')
  ok((await evento(e1.id)).seats_booked === 2, 'i posti offerti sono TENUTI: l’evento risulta ancora pieno')
  const d1 = await prenota(e1, 1)
  ok(d1.status === 400, 'chi prenota adesso non può prendere un posto offerto a chi era in lista', `risposta ${d1.status}`)
  ok((await post('/api/guest/eventi/annulla', { t: A.annulla_token })).status === 409, 'annullare due volte: rifiutato')

  console.log('\n2 · PRENDERE IL POSTO, RINUNCIARE, SCADERE\n')
  const gb = await (await get(`/api/guest/eventi/posto?t=${B.offerta_token}`)).text()
  ok(JSON.parse(gb).stato === 'valida' && !gb.includes('@'), 'aprire l’invito: «valido», senza email (corpo grezzo)', gb.slice(0, 160))
  for (const [cosa, tok] of [['token inventato', '00000000-0000-4000-8000-000000000000'], ['token non UUID', 'x']]) {
    ok((await post('/api/guest/eventi/posto', { t: tok })).status === 404, `prendere, ${cosa}: rifiutato`)
  }
  const pb = await post('/api/guest/eventi/posto', { t: B.offerta_token })
  const pbd = await pb.json()
  ok(pb.status === 200 && pbd.confermata, 'prendere il posto: confermato', `${pb.status} ${JSON.stringify(pbd)}`)
  const B2 = await riga(b.d.id)
  ok(B2.status === 'confirmed' && !B2.offerta_scade_il, 'la persona è confermata e l’offerta è chiusa')
  ok((await post('/api/guest/eventi/posto', { t: B.offerta_token })).status === 409, 'prendere due volte: rifiutato')
  ok(JSON.parse(await (await get(`/api/guest/eventi/posto?t=${B.offerta_token}`)).text()).stato === 'presa', 'riaprire l’invito dice «il posto è già tuo»')
  const rc = await post('/api/guest/eventi/posto', { t: C.offerta_token, azione: 'rinuncia' })
  ok(rc.status === 200 && (await riga(c.d.id)).status === 'cancelled', 'rinunciare: il posto torna libero')
  ok((await evento(e1.id)).seats_booked === 1, 'dopo la rinuncia resta un posto libero')
  const d2 = await prenota(e1, 1)
  ok(d2.status === 201, 'e chi prenota adesso lo prende', `risposta ${d2.status}`)

  const { data: G } = await admin.from('event_bookings').insert({
    event_id: e1.id, guest_name: 'ZZ Scaduta', guest_email: email(), seats: 1, status: 'waitlist',
    offerta_token: crypto.randomUUID(), offerta_scade_il: new Date(Date.now() - 60_000).toISOString(),
  }).select().single()
  ok(JSON.parse(await (await get(`/api/guest/eventi/posto?t=${G.offerta_token}`)).text()).stato === 'scaduta', 'un invito scaduto dice «scaduto»')
  ok((await post('/api/guest/eventi/posto', { t: G.offerta_token })).status === 410, 'e non si prende più')

  console.log('\n3 · IL TERMINE, E L’INTERRUTTORE\n')
  const e2 = await nuovoEvento({ seats_total: 5, date_start: new Date(Date.now() + 10 * ORA).toISOString(), annullabile_ore: 24 })
  const p2 = await prenota(e2)
  const tok2 = (await riga(p2.d.id)).annulla_token
  const i2 = await (await get(`/api/guest/eventi/annulla?t=${tok2}`)).json()
  ok(i2.stato === 'oltre_termine' && i2.contatto?.telefono, 'a 10 ore con termine di 24: «il termine è passato», con il telefono del locale', JSON.stringify(i2).slice(0, 200))
  ok((await post('/api/guest/eventi/annulla', { t: tok2 })).status === 409, 'e il pulsante non annulla')
  const e3 = await nuovoEvento({ seats_total: 5, annullabile: false })
  const p3 = await prenota(e3)
  const i3 = await (await get(`/api/guest/eventi/annulla?t=${(await riga(p3.d.id)).annulla_token}`)).json()
  ok(i3.stato === 'non_annullabile', 'con l’annullamento spento: «contatta chi organizza»', i3.stato)

  const e4 = await nuovoEvento({ seats_total: 1, date_start: new Date(Date.now() + 5 * ORA).toISOString(), annullabile_ore: 0 })
  const p4 = await prenota(e4); const w4 = await inLista(e4)
  await post('/api/guest/eventi/annulla', { t: (await riga(p4.d.id)).annulla_token })
  const W4 = await riga(w4.d.id)
  const min4 = (new Date(W4.offerta_scade_il) - Date.now()) / 60_000
  ok(min4 > 25 && min4 <= 30, `evento di oggi: mezz’ora per prendere il posto (${min4.toFixed(0)} min)`)

  const e5 = await nuovoEvento({ seats_total: 1, lista_automatica: false })
  const p5 = await prenota(e5); const w5 = await inLista(e5)
  await post('/api/guest/eventi/annulla', { t: (await riga(p5.d.id)).annulla_token })
  ok(!(await riga(w5.d.id)).offerta_token, 'con la lista automatica spenta nessuno riceve un invito')
  ok((await evento(e5.id)).seats_booked === 0, 'e il posto resta libero per chi prenota')

  const pubblico = await (await get(`/api/guest/eventi/${e1.id}`)).text()
  ok(/"annullabile":true/.test(pubblico) && /"annullabile_ore":24/.test(pubblico), 'la pagina pubblica riceve il termine')
  ok(!/lista_automatica|annulla_token|offerta_token/.test(pubblico), 'e non riceve né l’interruttore né i token (corpo grezzo)')

  console.log('\n4 · COL BROWSER: ANNULLARE, PRENDERE IL POSTO, EDITOR, PANNELLO\n')
  const e6 = await nuovoEvento({ seats_total: 1 })
  await withProbeSession(async ({ page, browser }) => {
    const tel = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'it-IT' })
    // La frase sta sotto il pulsante di prenotazione: si guarda finché l'evento
    // ha posti, cioè PRIMA di riempirlo.
    await tel.goto(`${TEST_URL}/eventi/${e6.slug}`, { waitUntil: 'networkidle' })
    ok(/annullare gratuitamente fino al/i.test(await tel.locator('[data-termine-annullamento]').innerText().catch(() => '')), 'la pagina dell’evento dice fino a quando si annulla')
    // A termine passato (e2: fra 10 ore, termine 24) la frase non compare.
    await tel.goto(`${TEST_URL}/eventi/${e2.slug}`, { waitUntil: 'networkidle' })
    ok((await tel.locator('[data-termine-annullamento]').count()) === 0, 'a termine passato la pagina non promette niente')
    const p6 = await prenota(e6); const w6 = await inLista(e6)
    const tok6 = (await riga(p6.d.id)).annulla_token
    await tel.goto(`${TEST_URL}/annulla-evento?t=${tok6}`, { waitUntil: 'networkidle' })
    await tel.getByRole('button', { name: /annulla la prenotazione/i }).click()
    ok(await tel.getByText('Prenotazione annullata').waitFor({ timeout: 15000 }).then(() => true, () => false), 'dalla pagina, un clic: «Prenotazione annullata»')
    if (FOTO) await tel.screenshot({ path: `${FOTO}/annulla-telefono.png`, fullPage: true })
    const W6 = await riga(w6.d.id)
    ok(!!W6.offerta_token, 'chi era in lista ha ricevuto l’invito')
    await tel.goto(`${TEST_URL}/posto-evento?t=${W6.offerta_token}`, { waitUntil: 'networkidle' })
    if (FOTO) await tel.screenshot({ path: `${FOTO}/posto-telefono.png`, fullPage: true })
    const larghezza = await tel.evaluate(() => document.documentElement.scrollWidth)
    ok(larghezza <= 390, `la pagina dell’invito sta nel telefono (${larghezza}px)`)
    await tel.getByRole('button', { name: /^prendi il posto/i }).click()
    ok(await tel.getByText('Il posto è tuo').waitFor({ timeout: 15000 }).then(() => true, () => false), 'dall’invito, un clic: «Il posto è tuo»')
    ok((await riga(w6.d.id)).status === 'confirmed', 'e nel database è confermato')

    await page.goto(`${TEST_URL}/admin/eventi/${e6.id}`, { waitUntil: 'networkidle' })
    // ⚠️ Si aspettano i DATI dell'evento, non una scritta: gli interruttori ci
    // sono anche nel modulo vuoto, prima che l'evento arrivi.
    await page.waitForFunction(t => [...document.querySelectorAll('input')].some(i => i.value === t), e6.title, { timeout: 30000 })
    // In sviluppo l'editor rilegge l'evento una seconda volta (StrictMode, nota
    // 70): si aspetta che abbia finito, o la seconda lettura cancella quello
    // che si è appena scritto.
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500)
    ok(await page.getByText('Quando si libera un posto, offrilo al primo in lista').isVisible(), 'l’editor ha i due interruttori')
    await page.locator('input[type=number][max="720"]').fill('6')
    await page.getByRole('button', { name: 'Salva modifiche' }).click()
    // Si aspetta la fine del salvataggio, non un tempo fisso.
    await page.getByRole('button', { name: 'Salvataggio…' }).waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})
    await page.getByRole('button', { name: 'Salva modifiche' }).waitFor({ timeout: 30000 })
    const { data: salvato } = await admin.from('eventi').select('annullabile_ore').eq('id', e6.id).single()
    ok(salvato.annullabile_ore === 6, 'dall’editor il termine si salva (6 ore)', String(salvato.annullabile_ore))
    if (FOTO) await page.screenshot({ path: `${FOTO}/editor.png`, fullPage: true })

    await page.goto(`${TEST_URL}/admin/eventi/${e1.id}/prenotazioni`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Modifica', exact: true }).first().waitFor({ timeout: 30000 })
    // Il gruppo delle annullate nasce chiuso: si apre come farebbe il titolare.
    await page.getByText('Non andate a buon fine').first().click()
    await page.locator('[data-annullata-ospite]').first().waitFor({ timeout: 10000 }).catch(() => {})
    ok((await page.locator('[data-annullata-ospite]').count()) > 0, 'il pannello dice «annullata dall’ospite»')
    if (FOTO) await page.screenshot({ path: `${FOTO}/pannello.png`, fullPage: true })
  })
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  try { await admin.from('rate_limits').delete().like('key', 'evento-%') } catch {}
  try { if (az) await cancellaAziendaDiProva(az.id) } catch {}
}
console.log(`\n[probe] ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
process.exit(rossi ? 1 : 0)
