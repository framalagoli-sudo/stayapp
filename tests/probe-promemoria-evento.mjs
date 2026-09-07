// Il promemoria a chi ha già prenotato un evento.
//
// ⛔ Nato da un difetto vero: il promemoria automatico si programma **quando uno
// prenota**, quindi chi aveva prenotato prima non è in nessuna coda e non ci
// finirà mai. Per la cena del 10 settembre erano 27 persone che non avrebbero
// ricevuto niente — e accendere l'automazione non avrebbe cambiato nulla, anche
// perché le automazioni non erano nemmeno collegate agli eventi.
//
// ⚠️ Ambiente tutto finto: azienda, entità ed evento creati qui, con indirizzi
// `@playwright.internal` — un dominio che non esiste. Una sonda che manda email
// non deve poterle far arrivare a una persona vera.
//
// Uso: cd tests && node probe-promemoria-evento.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = [], entitaCreate = [], eventiCreati = []

// La route è protetta: serve una sessione vera. Si usa la stessa dell'admin.
import { withProbeSession } from './probe-auth.mjs'

try {
  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-PROM-${t}`, email: `zz-prom-${t}@playwright.internal`, require_2fa: false })
    .select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita').insert({
    azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale di prova',
    slug: `zz-prom-${t}`, active: false,
  }).select().single()
  entitaCreate.push(ent.id)

  const fra = new Date(); fra.setDate(fra.getDate() + 3)
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura',
    title: 'ZZ Cena di prova', slug: `zz-cena-${t}`,
    date_start: fra.toISOString(), location: 'Via delle Prove 1',
    price: 25, seats_total: 60, published: false, active: true,
  }).select().single()
  eventiCreati.push(ev.id)

  // Tre come quelli veri: due con email, una presa al telefono senza.
  const persone = [
    { guest_name: 'ZZ Anna', guest_email: `zz-a-${t}@playwright.internal`, seats: 2 },
    { guest_name: 'ZZ Bruno', guest_email: `zz-b-${t}@playwright.internal`, seats: 4 },
    { guest_name: 'ZZ Carla (al telefono)', guest_email: null, guest_phone: '+393401112223', seats: 3 },
  ]
  for (const p of persone) {
    await admin.from('event_bookings').insert({ event_id: ev.id, status: 'confirmed', ...p })
  }
  console.log(`evento di prova: «${ev.title}» — 3 prenotazioni (2 con email, 1 senza)\n`)

  await withProbeSession(async ({ page }) => {
    // ⚠️ Il token sta in localStorage, dove lo mette `probe-auth` — non esiste
    // nessun `window.__supabase`. Si apre una pagina del pannello per avere
    // l'origine giusta, e da lì si chiama la route come farebbe il pannello.
    await page.goto(`${L}/admin`, { waitUntil: 'domcontentloaded' })
    const chiedi = async (metodo) => page.evaluate(async ([url, m]) => {
      const chiave = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))
      const token = JSON.parse(localStorage.getItem(chiave) || '{}').access_token
      const res = await fetch(url, { method: m, headers: { Authorization: `Bearer ${token}` } })
      return { status: res.status, body: await res.json() }
    }, [`${L}/api/eventi/${ev.id}/promemoria`, metodo])

    console.log('1 · QUANTE PERSONE LO RICEVEREBBERO\n')
    const prima = await chiedi('GET')
    ok(prima.status === 200, `la pagina lo può chiedere (HTTP ${prima.status})`)
    ok(prima.body.da_avvisare === 2, `da avvisare: ${prima.body.da_avvisare} (attese 2, quelle con email)`)
    ok(prima.body.senza_email === 1, `senza email: ${prima.body.senza_email} — da avvisare a voce`)
    ok(prima.body.gia_avvisati === 0, `già avvisate: ${prima.body.gia_avvisati}`)

    console.log('\n2 · SI MANDA\n')
    const invio = await chiedi('POST')
    ok(invio.status === 200, `l'invio riesce (HTTP ${invio.status})`)
    ok(invio.body.inviati === 2, `mandato a ${invio.body.inviati} persone (attese 2)`)
    ok(!invio.body.falliti, `nessun fallimento (${invio.body.falliti || 0})`)

    console.log('\n3 · NON SI MANDA DUE VOLTE\n')
    // ⛔ Il titolare non ricorda se l'ha già premuto — non lo ricorda mai. Senza
    // questo, 27 persone riceverebbero due email uguali.
    const dopo = await chiedi('GET')
    ok(dopo.body.da_avvisare === 0, `nessuno resta da avvisare (${dopo.body.da_avvisare})`)
    ok(dopo.body.gia_avvisati === 2, `risultano avvisate in ${dopo.body.gia_avvisati}`)
    const secondo = await chiedi('POST')
    ok(secondo.body.inviati === 0, `il secondo invio non manda niente (${secondo.body.inviati})`)
  }, { width: 1000 })

  console.log('\n4 · LA TRACCIA RESTA NEL DATABASE\n')
  const { data: righe } = await admin.from('event_bookings')
    .select('guest_name, guest_email, promemoria_inviato_il').eq('event_id', ev.id)
  for (const r of righe || []) {
    const atteso = !!r.guest_email
    ok(!!r.promemoria_inviato_il === atteso,
       `${r.guest_name}: ${r.promemoria_inviato_il ? 'avvisata il ' + r.promemoria_inviato_il.slice(0, 16).replace('T', ' ') : 'non avvisata'}${atteso ? '' : ' (giusto: non ha email)'}`)
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL PROMEMORIA PARTE UNA VOLTA SOLA, A CHI SI PUÒ RAGGIUNGERE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
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
