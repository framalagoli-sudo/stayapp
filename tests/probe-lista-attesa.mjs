// La lista d'attesa, dall'iscrizione alla promozione.
//
// ⛔ Il controllo che conta più di tutti: **chi è in lista NON occupa un posto.**
// Se lo occupasse, la lista riempirebbe l'evento da sola e quando un posto si
// libera non risulterebbe libero — né per chi prenota né per chi è in lista. La
// funzione si smonterebbe da dentro, senza dare errore.
//
// ⚠️ Ambiente tutto finto, indirizzi `@playwright.internal`.
//
// Uso: cd tests && node probe-lista-attesa.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
import { withProbeSession, gotoAdmin } from './probe-auth.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = [], entitaCreate = [], eventiCreati = []

const postaAttesa = async (id, extra = {}) => {
  const r = await fetch(`${L}/api/guest/eventi/${id}/lista-attesa`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'ZZ In Attesa', guest_email: `zz-att-${Date.now()}@playwright.internal`,
      seats: 2, privacy_accettata: true, ...extra,
    }),
  })
  return { status: r.status, body: await r.json() }
}
const prenota = async (id) => {
  const r = await fetch(`${L}/api/guest/eventi/${id}/book`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'ZZ Prenota', guest_email: `zz-p-${Date.now()}@playwright.internal`,
      seats: 2, privacy_accettata: true,
    }),
  })
  return { status: r.status, body: await r.json() }
}
const postiPresi = async (id) =>
  (await admin.from('eventi').select('seats_booked').eq('id', id).maybeSingle()).data?.seats_booked

try {
  const { error: eCol } = await admin.from('eventi').select('lista_attesa').limit(1)
  if (eCol) {
    console.log('\n⛔ Manca la colonna `lista_attesa`.')
    console.log('   Esegui `supabase/migrations/111_lista_attesa_eventi.sql` e rilancia.\n')
    process.exitCode = 2
    throw new Error('migration 111 mancante')
  }

  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-LISTA-${t}`, email: `zz-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale', slug: `zz-la-${t}`, active: true }).select().single()
  entitaCreate.push(ent.id)
  const fra = new Date(); fra.setDate(fra.getDate() + 12)
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura',
    title: 'ZZ Serata piena', slug: `zz-piena-${t}`, date_start: fra.toISOString(),
    price: 0, seats_total: 2, published: true, active: true, lista_attesa: true,
    // ⛔ Il titolare deve averla accesa, altrimenti la promozione è muta: la
    // colonna nasce `false` (migration 067) e senza questa riga la sonda
    // misurava il flag spento invece della promozione — cioè un'altra cosa.
    send_guest_confirmation: true,
  }).select().single()
  eventiCreati.push(ev.id)

  console.log('\n1 · CON POSTI LIBERI NON SI ENTRA IN LISTA\n')
  // Iscriversi mentre si può prenotare lascerebbe una persona ad aspettare una
  // chiamata che nessuno ha motivo di fare.
  const presto = await postaAttesa(ev.id)
  ok(presto.status === 400, `rifiutata (HTTP ${presto.status})`)
  ok(presto.body.posti_liberi === true, `e dice perché: «${presto.body.error}»`)

  console.log('\n2 · SI RIEMPIE\n')
  const p1 = await prenota(ev.id)
  ok(p1.status === 201, `2 posti presi (HTTP ${p1.status})`)
  ok(await postiPresi(ev.id) === 2, `l'evento risulta pieno (${await postiPresi(ev.id)}/2)`)

  console.log('\n3 · ORA SI ENTRA IN LISTA — E NON SI OCCUPA UN POSTO\n')
  const a1 = await postaAttesa(ev.id, { guest_name: 'ZZ Attesa Uno', guest_email: `zz-a1-${t}@playwright.internal` })
  ok(a1.status === 201, `l'iscrizione riesce (HTTP ${a1.status})`)
  const dopoLista = await postiPresi(ev.id)
  // ⛔ Il controllo che regge tutta la funzione.
  ok(dopoLista === 2, `i posti presi restano 2, non 4 (${dopoLista})`)

  console.log('\n4 · DUE VOLTE LA STESSA PERSONA NON RADDOPPIA\n')
  const a2 = await postaAttesa(ev.id, { guest_name: 'ZZ Attesa Uno', guest_email: `zz-a1-${t}@playwright.internal` })
  ok(a2.body.gia_in_lista === true, 'la seconda iscrizione dice che è già in lista')
  const { count } = await admin.from('event_bookings')
    .select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('status', 'waitlist')
  ok(count === 1, `una sola riga in lista (${count})`)

  console.log('\n5 · SI LIBERA UN POSTO E IL TITOLARE PROMUOVE\n')
  // Qualcuno rinuncia: due posti tornano liberi.
  const { data: pren } = await admin.from('event_bookings')
    .select('id').eq('event_id', ev.id).eq('status', 'confirmed').limit(1).maybeSingle()
  await admin.from('event_bookings').update({ status: 'cancelled' }).eq('id', pren.id)
  await fetch(`${L}/api/guest/eventi/${ev.id}`)  // sveglia la lettura
  const { data: tutte } = await admin.from('event_bookings').select('seats, status').eq('event_id', ev.id)
  const somma = (tutte || []).filter(b => !['cancelled', 'waitlist'].includes(b.status)).reduce((n, b) => n + (b.seats || 1), 0)
  await admin.from('eventi').update({ seats_booked: somma }).eq('id', ev.id)
  ok(await postiPresi(ev.id) === 0, 'i posti tornano liberi dopo la rinuncia')

  const { data: inLista } = await admin.from('event_bookings')
    .select('id, guest_email').eq('event_id', ev.id).eq('status', 'waitlist').maybeSingle()

  await withProbeSession(async ({ page }) => {
    await page.goto(`${L}/admin`, { waitUntil: 'domcontentloaded' })
    const esito = await page.evaluate(async ([url]) => {
      const k = Object.keys(localStorage).find(x => /^sb-.*-auth-token$/.test(x))
      const token = JSON.parse(localStorage.getItem(k) || '{}').access_token
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      return { status: r.status, body: await r.json() }
    }, [`${L}/api/eventi/bookings/${inLista.id}`])
    ok(esito.status === 200, `la promozione riesce (HTTP ${esito.status})${esito.status !== 200 ? ' — ' + (esito.body.error || '') : ''}`)
  }, { width: 1000 })

  const { data: promossa } = await admin.from('event_bookings')
    .select('status, conferma_inviata_il').eq('id', inLista.id).maybeSingle()
  ok(promossa?.status === 'confirmed', `ora è una prenotazione vera (${promossa?.status})`)
  // ⛔ Senza questo resterebbe ad aspettare una chiamata già arrivata.
  ok(!!promossa?.conferma_inviata_il, 'e le è stata mandata la conferma')
  ok(await postiPresi(ev.id) === 2, `e adesso occupa i posti (${await postiPresi(ev.id)}/2)`)

  console.log('\n6 · SE LA LISTA È SPENTA, NON SI ENTRA\n')
  await admin.from('eventi').update({ lista_attesa: false }).eq('id', ev.id)
  const spenta = await postaAttesa(ev.id, { guest_email: `zz-sp-${t}@playwright.internal` })
  ok(spenta.status === 400, `rifiutata (HTTP ${spenta.status}) — «${spenta.body.error}»`)

  console.log('\n7 · SENZA CONSENSO NON SI RACCOGLIE NIENTE\n')
  await admin.from('eventi').update({ lista_attesa: true, prenotazioni_chiuse: true }).eq('id', ev.id)
  const senza = await fetch(`${L}/api/guest/eventi/${ev.id}/lista-attesa`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_name: 'ZZ', guest_email: `zz-nc-${t}@playwright.internal`, seats: 1 }),
  })
  ok(senza.status === 400, `rifiutata senza consenso (HTTP ${senza.status})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI È IN LISTA ASPETTA, NON OCCUPA — E QUANDO ENTRA LO SA')
} catch (e) {
  if (e.message !== 'migration 111 mancante') { console.error('ERRORE:', e.message); problemi++ }
} finally {
  for (const id of eventiCreati) {
    await admin.from('event_bookings').delete().eq('event_id', id)
    await admin.from('eventi').delete().eq('id', id)
  }
  for (const id of entitaCreate) await admin.from('entita').delete().eq('id', id)
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
