// Le opzioni di un evento (migration 148), percorse dalle route come le usano
// il titolare e chi prenota.
//
//   1. il titolare crea un evento con due opzioni (anche con valori ostili):
//      si salvano ripulite, e posti/prezzo dell'evento si calcolano;
//   2. il pubblico vede solo i posti ancora prenotabili, MAI capienza, posti
//      per il telefono o quote (corpo grezzo);
//   3. riepilogo e prenotazione mista: 1 cena + 2 ingressi, totale dal listino;
//   4. richieste ostili rifiutate (prezzo dal browser, opzione inventata,
//      quantità negative, posti senza opzioni);
//   5. un'opzione esaurita si chiude, le altre restano prenotabili;
//   6. lista d'attesa PER OPZIONE (solo quella esaurita);
//   7. «Modifica» sposta le quantità; il posto liberato va al primo in lista
//      per QUELL'opzione, che lo prende dal link;
//   8. il titolare segna al telefono usando i posti per il telefono, e non oltre;
//   9. un'opzione con prenotazioni non si toglie;
//  10. un evento con prenotazioni passa da prezzo unico a opzioni: quelle
//      prenotazioni vanno nella prima opzione.
//
// Azienda «ZZ» cancellata con `cancellaAziendaDiProva`. Le email (lista
// d'attesa, posto offerto) vanno al pozzo di Resend; conferme e avvisi spenti.
// Non prova la cassa di Stripe (nessun conto collegato): il conto con le quote
// lo prova probe-opzioni-regole.mjs.
// Uso: cd tests && node probe-opzioni-evento.mjs   ($env:TEST_URL per il locale)
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
let ko = 0
const ok = (c, t, x) => { console.log(`  ${c ? '✓' : '✗'} ${t}${!c && x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : ''}`); if (!c) ko++ }
const pozzo = n => `delivered+opzioni-${n}-${Date.now()}@resend.dev`

let aziendaId = null, uid = null
try {
  const tag = Date.now()
  const { data: az, error: e1 } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-OPZIONI-${tag}`, require_2fa: false, moduli: { struttura: true } }).select().single()
  if (e1) throw new Error('azienda: ' + e1.message)
  aziendaId = az.id
  const { data: ent } = await admin.from('entita').insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale ibrido', slug: `zz-opzioni-${tag}`, active: true }).select().single()

  const email = `probe-opzioni-${tag}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  uid = us.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'admin_azienda', azienda_id: az.id, full_name: 'P' }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const H = { 'content-type': 'application/json', authorization: `Bearer ${s.session.access_token}` }
  const titolare = async (metodo, percorso, corpo) => {
    const r = await fetch(BASE + percorso, { method: metodo, headers: H, body: corpo ? JSON.stringify(corpo) : undefined })
    return { status: r.status, j: await r.json().catch(() => ({})) }
  }
  const pubblico = async (percorso, corpo) => {
    const r = await fetch(BASE + percorso, { method: corpo ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined })
    const testo = await r.text()
    let j = {}; try { j = JSON.parse(testo) } catch {}
    return { status: r.status, j, testo }
  }
  const giorni = n => new Date(Date.now() + n * 86400000).toISOString()
  const ospite = n => ({ guest_name: `ZZ Ospite ${n}`, guest_email: pozzo(n), privacy_accettata: true })

  console.log('\n1. IL TITOLARE CREA L’EVENTO CON LE OPZIONI')
  const { status: sc, j: ev } = await titolare('POST', '/api/eventi', {
    title: 'ZZ Cena & live', date_start: giorni(9), entity_tipo: 'struttura', entity_id: ent.id, published: true, active: true,
    prezzo_modo: 'cifra', acconto_percentuale: 20, lista_attesa: true, lista_automatica: true,
    notify_owner_on_booking: false, send_guest_confirmation: false, seats_total: 999, price: 999,
    packages: [
      { id: 'cena', name: 'Cena & spettacolo', price: 30, posti: 4, posti_riservati: 1, acconto_percentuale: 100, description: 'Antipasto, primo, dolce', includes: ['cena', 'x'], segreto: 'non deve restare' },
      { id: 'bar', name: 'Ingresso + drink', price: 15, posti: 10, acconto_percentuale: 0 },
      { id: 'vuota', name: '   ', price: 5 },
    ],
  })
  ok(sc === 201 || sc === 200, `evento creato (${sc})`, ev)
  const { data: e0 } = await admin.from('eventi').select('*').eq('id', ev.id).single()
  ok(e0.packages.length === 2 && !('segreto' in e0.packages[0]) && JSON.stringify(e0.packages[0].includes) === '["cena"]', 'opzioni ripulite: tolta quella senza nome e il campo inventato', e0.packages)
  ok(e0.seats_total === 14 && e0.posti_riservati === 1 && Number(e0.price) === 15, `posti e prezzo calcolati dalle opzioni (14 posti, 1 per telefono, da 15)`, { s: e0.seats_total, r: e0.posti_riservati, p: e0.price })

  console.log('\n2. COSA VEDE IL PUBBLICO')
  const p0 = await pubblico(`/api/guest/eventi/${ev.id}`)
  const cena0 = p0.j.packages?.find(o => o.id === 'cena')
  ok(p0.status === 200 && cena0?.posti_online === 3, 'la cena mostra 3 posti online (4 − 1 per il telefono)', p0.j.packages)
  for (const vietata of ['"posti_riservati"', '"opzioni_prenotate"', '"acconto_percentuale"', '"posti":', '"seats_total"', '"seats_booked"']) {
    ok(!p0.testo.includes(vietata), `nel corpo grezzo non c’è ${vietata}`)
  }

  console.log('\n3. RIEPILOGO E PRENOTAZIONE MISTA')
  const mista = [{ id: 'cena', quantita: 1 }, { id: 'bar', quantita: 2 }]
  const rp = await pubblico(`/api/guest/eventi/${ev.id}/riepilogo`, { scelte: mista })
  ok(rp.status === 200 && rp.j.posti === 3 && rp.j.totale === 60 && rp.j.voci?.length === 2, 'riepilogo: 3 posti, 60 €, una riga per opzione', rp.j)
  const b1 = await pubblico(`/api/guest/eventi/${ev.id}/book`, { ...ospite(1), scelte: mista })
  ok(b1.status === 201 && b1.j.seats === 3 && Number(b1.j.total_amount) === 60 && b1.j.scelte?.length === 2, 'prenotata: 1 cena + 2 ingressi = 60 €', b1.j)
  // Senza conto collegato la cassa non si apre: la prenotazione resta valida e si paga sul posto.
  ok(b1.j.status === 'confirmed' || b1.j.status === 'pending', `stato ${b1.j.status}`)
  const { data: e1b } = await admin.from('eventi').select('opzioni_prenotate, seats_booked').eq('id', ev.id).single()
  ok(e1b.opzioni_prenotate.cena === 1 && e1b.opzioni_prenotate.bar === 2 && e1b.seats_booked === 3, 'posti per opzione ricontati', e1b)

  console.log('\n4. RICHIESTE OSTILI')
  const o1 = await pubblico(`/api/guest/eventi/${ev.id}/book`, { ...ospite(2), scelte: [{ id: 'cena', quantita: 1, prezzo: 0.01 }], total_amount: 1 })
  // Questa passa (è una richiesta valida con campi in più ignorati): il prezzo dev'essere quello del listino.
  ok(o1.status === 201 && Number(o1.j.total_amount) === 30, 'prezzo e totale mandati dal browser ignorati (30 €)', o1.j)
  const o2 = await pubblico(`/api/guest/eventi/${ev.id}/book`, { ...ospite(3), scelte: [{ id: 'inventata', quantita: 1 }] })
  ok(o2.status === 400, 'opzione inventata rifiutata', o2.j)
  const o3 = await pubblico(`/api/guest/eventi/${ev.id}/book`, { ...ospite(4), scelte: [{ id: 'bar', quantita: -5 }] })
  ok(o3.status === 400, 'quantità negativa rifiutata', o3.j)
  const o4 = await pubblico(`/api/guest/eventi/${ev.id}/riepilogo`, { seats: 2 })
  ok(o4.status === 400, 'evento con opzioni: «2 posti» senza dire quali è rifiutato', o4.j)

  console.log('\n5. UN’OPZIONE ESAURITA, LE ALTRE APERTE')
  const s1 = await pubblico(`/api/guest/eventi/${ev.id}/book`, { ...ospite(5), scelte: [{ id: 'cena', quantita: 1 }] })
  ok(s1.status === 201, 'terza cena venduta online (3 su 3)', s1.j)
  const s2 = await pubblico(`/api/guest/eventi/${ev.id}/book`, { ...ospite(6), scelte: [{ id: 'cena', quantita: 1 }] })
  ok(s2.status === 400 && /esaurit/.test(s2.j.error || ''), 'la quarta cena online è rifiutata (l’ultima è del telefono)', s2.j)
  const p1 = await pubblico(`/api/guest/eventi/${ev.id}`)
  ok(p1.j.packages?.find(o => o.id === 'cena')?.posti_online === 0 && p1.j.packages?.find(o => o.id === 'bar')?.posti_online === 8, 'pubblico: cena 0, ingressi 8', p1.j.packages)

  console.log('\n6. LISTA D’ATTESA PER OPZIONE')
  const w1 = await pubblico(`/api/guest/eventi/${ev.id}/lista-attesa`, { ...ospite(7), seats: 1, opzione: 'cena' })
  ok(w1.status === 201, 'in lista per la cena', w1.j)
  const w2 = await pubblico(`/api/guest/eventi/${ev.id}/lista-attesa`, { ...ospite(8), seats: 1, opzione: 'bar' })
  ok(w2.status === 400, 'in lista per gli ingressi no: ci sono posti', w2.j)
  const w3 = await pubblico(`/api/guest/eventi/${ev.id}/lista-attesa`, { ...ospite(9), seats: 1 })
  ok(w3.status === 400, 'senza dire per quale opzione: rifiutato', w3.j)

  console.log('\n7. «MODIFICA» E LA LISTA CHE SI MUOVE')
  const m1 = await titolare('PATCH', `/api/eventi/bookings/${b1.j.id}`, { scelte: [{ id: 'bar', quantita: 3 }] })
  ok(m1.status === 200 && m1.j.seats === 3 && Number(m1.j.total_amount) === 45, 'tolta la cena, 3 ingressi: 45 €', m1.j)
  const { data: attesa } = await admin.from('event_bookings').select('offerta_token, offerta_scade_il').eq('id', w1.j.id).single()
  ok(!!attesa.offerta_scade_il, 'la cena liberata è offerta al primo in lista per la cena', attesa)
  if (attesa.offerta_token) {
    const lo = await pubblico(`/api/guest/eventi/posto?t=${attesa.offerta_token}`)
    ok(lo.j.stato === 'valida' && /Cena/.test(lo.j.cosa || ''), 'il link dice per quale opzione è il posto', lo.j)
    ok(!/ZZ Ospite|resend\.dev/.test(lo.testo), 'il link non mostra nome né email')
    const pr = await pubblico(`/api/guest/eventi/posto`, { t: attesa.offerta_token })
    ok(pr.status === 200, 'preso il posto dal link', pr.j)
    const { data: presa } = await admin.from('event_bookings').select('status, total_amount, scelte').eq('id', w1.j.id).single()
    ok(['confirmed', 'pending'].includes(presa.status) && Number(presa.total_amount) === 30 && presa.scelte?.[0]?.id === 'cena', 'diventata prenotazione: 1 cena, 30 €', presa)
  }

  // Adesso le cene online sono di nuovo 3 su 3: resta solo quella del telefono.
  console.log('\n8. IL TITOLARE SEGNA AL TELEFONO')
  const t1 = await titolare('POST', `/api/eventi/${ev.id}/bookings`, { guest_name: 'ZZ Telefono', scelte: [{ id: 'cena', quantita: 1 }] })
  ok(t1.status === 201 && Number(t1.j.total_amount) === 30, 'segnata la cena tenuta per il telefono', t1.j)
  const t2 = await titolare('POST', `/api/eventi/${ev.id}/bookings`, { guest_name: 'ZZ Troppo', scelte: [{ id: 'cena', quantita: 1 }] })
  ok(t2.status === 400, 'oltre i 4 posti della cena no, nemmeno al titolare', t2.j)

  console.log('\n9. UN’OPZIONE CON PRENOTAZIONI NON SI TOGLIE')
  const rm = await titolare('PATCH', `/api/eventi/${ev.id}`, { packages: [e0.packages[1]] })
  ok(rm.status === 409, 'togliere la cena con posti prenotati: rifiutato', rm.j)

  console.log('\n10. DA PREZZO UNICO A OPZIONI, CON PRENOTAZIONI GIÀ FATTE')
  const { j: ev2 } = await titolare('POST', '/api/eventi', { title: 'ZZ Prezzo unico', date_start: giorni(10), entity_tipo: 'struttura', entity_id: ent.id, published: true, active: true, prezzo_modo: 'cifra', price: 30, seats_total: 20, notify_owner_on_booking: false, send_guest_confirmation: false })
  const t3 = await titolare('POST', `/api/eventi/${ev2.id}/bookings`, { guest_name: 'ZZ Vecchia', seats: 2 })
  ok(t3.status === 201, 'una prenotazione col prezzo unico')
  const cv = await titolare('PATCH', `/api/eventi/${ev2.id}`, { packages: [
    { id: 'prima', name: 'Cena & spettacolo', price: 30, posti: 20 },
    { id: 'seconda', name: 'Ingresso + drink', price: 15, posti: 10 },
  ] })
  ok(cv.status === 200, 'passato a due opzioni', cv.j)
  const { data: vecchia } = await admin.from('event_bookings').select('scelte, package_id').eq('id', t3.j.id).single()
  const { data: e2 } = await admin.from('eventi').select('opzioni_prenotate, seats_total').eq('id', ev2.id).single()
  ok(vecchia.package_id === 'prima' && vecchia.scelte?.[0]?.quantita === 2, 'la prenotazione di prima è nella prima opzione', vecchia)
  ok(e2.opzioni_prenotate.prima === 2 && e2.seats_total === 30, 'e i suoi posti contano lì (2), totale 30', e2)

  console.log('\n11. SENZA LOGIN NON SI SEGNA NIENTE')
  const est = await fetch(`${BASE}/api/eventi/${ev.id}/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ guest_name: 'x', scelte: [{ id: 'bar', quantita: 1 }] }) })
  ok(est.status === 401 || est.status === 404, `senza login non si segna (${est.status})`)
} catch (e) {
  console.log('  ✗ ERRORE: ' + e.message); ko++
} finally {
  try { await cancellaAziendaDiProva(aziendaId) } catch (e) { console.log('pulizia azienda: ' + e.message) }
  if (uid) { try { await admin.auth.admin.deleteUser(uid) } catch {} }
}
console.log(ko ? `\n${ko} DA GUARDARE` : '\n[probe] dati di prova eliminati — tutto verde')
process.exit(ko ? 1 : 0)
