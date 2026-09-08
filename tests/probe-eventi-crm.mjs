// Chi prenota un evento finisce fra i contatti dell'azienda?
//
// ⛔ Misurato l'08/09/2026: quattordici persone avevano prenotato un evento
// lasciando nome, email e telefono, e **una sola** era nel CRM — arrivata da
// un'altra strada. Le altre tredici erano perse: nessun modo di invitarle alla
// serata dopo, che è tutto quello che un evento lascia dietro di sé.
//
// ⚠️ Ambiente tutto finto, indirizzi `@playwright.internal`.
//
// Uso: cd tests && node probe-eventi-crm.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = []
const attendi = ms => new Promise(r => setTimeout(r, ms))

const contattoDi = async (aziendaId, email) =>
  (await admin.from('contatti').select('nome, tags, note, telefono, iscritto_newsletter, fonte')
    .eq('azienda_id', aziendaId).eq('email', email.toLowerCase()).maybeSingle()).data

try {
  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-CRM-${t}`, email: `zz-crm-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale', slug: `zz-crm-${t}`, active: true }).select().single()
  const fra = new Date(); fra.setDate(fra.getDate() + 15)
  const nuovoEvento = async (titolo, slug, extra = {}) => {
    const { data, error } = await admin.from('eventi').insert({
      azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura',
      title: titolo, slug, date_start: fra.toISOString(),
      price: 0, seats_total: 2, published: true, active: true, ...extra,
    }).select().single()
    if (error) throw new Error(`evento: ${error.message}`)
    return data
  }
  const evento = await nuovoEvento('ZZ Serata Jazz', `zz-jazz-${t}`)

  const mail = `zz-ospite-${t}@playwright.internal`

  console.log('\n1 · CHI PRENOTA ENTRA FRA I CONTATTI\n')
  const r = await fetch(`${L}/api/guest/eventi/${evento.id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'ZZ Ospite', guest_email: mail, guest_phone: '+39 333 0000000',
      seats: 2, privacy_accettata: true,
    }),
  })
  ok(r.status === 201, `la prenotazione riesce (HTTP ${r.status})`)
  // ⚠️ Il contatto si scrive in `after()`: dopo la risposta. Qui si aspetta,
  // perché misurare subito darebbe «non c'è» su un sistema che funziona.
  await attendi(4000)
  let c = await contattoDi(az.id, mail)
  ok(!!c, `il contatto c'è (${c ? 'sì' : 'NO — è quello che succedeva a tutti'})`)
  ok(c?.tags?.includes('evento'), `col tag «evento» (${JSON.stringify(c?.tags)})`)
  ok(c?.tags?.includes('ZZ Serata Jazz'), 'e col titolo dell’evento, per poter richiamare chi c’era')
  ok(!!c?.telefono, 'con il telefono che aveva lasciato')
  ok(/ha prenotato/i.test(c?.note || ''), `e la nota dice perché: «${(c?.note || '').slice(0, 60)}…»`)

  console.log('\n2 · MA NON LO ISCRIVE ALLA NEWSLETTER\n')
  // ⛔ Lasciare i dati per venire a una cena non è acconsentire a ricevere
  // pubblicità. Sono due consensi diversi e restano diversi.
  ok(c?.iscritto_newsletter === false, `newsletter: ${c?.iscritto_newsletter}`)

  console.log('\n3 · UN SECONDO EVENTO AGGIUNGE, NON SOSTITUISCE\n')
  const evento2 = await nuovoEvento('ZZ Cena Pesce', `zz-pesce-${t}`)
  await fetch(`${L}/api/guest/eventi/${evento2.id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: 'ZZ Ospite', guest_email: mail, seats: 1, privacy_accettata: true }),
  })
  await attendi(4000)
  c = await contattoDi(az.id, mail)
  // ⛔ Chi torna a una seconda serata deve restare cercabile per tutte e due:
  // sostituire i tag cancellerebbe la storia che serve a segmentare.
  ok(c?.tags?.includes('ZZ Serata Jazz') && c?.tags?.includes('ZZ Cena Pesce'),
    `tutti e due gli eventi (${JSON.stringify(c?.tags)})`)
  ok((c?.note || '').split('\n\n').length >= 2, 'e la nota si è accodata invece di sovrascriversi')

  console.log('\n4 · ANCHE CHI RESTA FUORI, IN LISTA D’ATTESA\n')
  // ⛔ È il contatto più prezioso che un evento produce: voleva venire e non è
  // entrato. È la prima persona da chiamare quando si replica la serata.
  const pieno = await nuovoEvento('ZZ Tutto Esaurito', `zz-pieno-${t}`, { seats_total: 1, lista_attesa: true })
  await admin.from('event_bookings').insert({
    event_id: pieno.id, guest_name: 'ZZ Primo', guest_email: `zz-primo-${t}@playwright.internal`,
    seats: 1, status: 'confirmed',
  })
  await admin.from('eventi').update({ seats_booked: 1 }).eq('id', pieno.id)
  const mailAttesa = `zz-attesa-${t}@playwright.internal`
  const ra = await fetch(`${L}/api/guest/eventi/${pieno.id}/lista-attesa`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: 'ZZ In Attesa', guest_email: mailAttesa, seats: 2, privacy_accettata: true }),
  })
  ok(ra.status === 201, `l'iscrizione in lista riesce (HTTP ${ra.status})`)
  await attendi(4000)
  const ca = await contattoDi(az.id, mailAttesa)
  ok(!!ca, 'anche lei è fra i contatti')
  ok(ca?.tags?.includes('lista attesa'), `riconoscibile come lista d'attesa (${JSON.stringify(ca?.tags)})`)

  console.log('\n5 · SENZA CONSENSO NON ENTRA NIENTE, NEMMENO NEL CRM\n')
  const mailNo = `zz-noconsenso-${t}@playwright.internal`
  const rn = await fetch(`${L}/api/guest/eventi/${evento.id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: 'ZZ Niente', guest_email: mailNo, seats: 1 }),
  })
  ok(rn.status === 400, `la prenotazione è rifiutata (HTTP ${rn.status})`)
  await attendi(2500)
  ok(!(await contattoDi(az.id, mailNo)), 'e nel CRM non è finito niente')

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI PRENOTA RESTA, E SI SA PERCHÉ È LÌ')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
