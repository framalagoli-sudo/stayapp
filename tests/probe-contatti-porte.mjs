// Chiunque lasci i suoi dati entra fra i contatti, da qualunque porta — una volta sola.
//
// Misurato il 04/10/2026: otto porte creavano contatti ognuna a modo suo, tre
// non ne creavano affatto (risorse, offerte, negozio), e una persona si
// riconosceva solo dall'email — chi lascia soltanto un numero entrava due
// volte o per niente. Parole di Francesco: «devono entrare tutti in contatti:
// la forza di OltreNova deve essere questa».
//
// Questa sonda PERCORRE le porte come un visitatore e come un titolare, e poi
// guarda cosa c'è nei contatti e nel registro (`contatti_attivita`).
//
// Non provate qui: il negozio (serve un catalogo) e WhatsApp (serve la firma di
// Meta, che in locale non c'è).
//
// Tutto su un'azienda ZZ, indirizzi `@playwright.internal`. Si pulisce da sola.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-contatti-porte.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const pausa = ms => new Promise(r => setTimeout(r, ms))
const manda = (percorso, corpo, headers = {}) => fetch(BASE + percorso, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(corpo) })
  .then(async r => ({ stato: r.status, j: await r.json().catch(() => ({})) }))
let aziendaId = null, utente = null

try {
  const { data: az, error: e0 } = await a.from('aziende').insert({ ragione_sociale: `ZZ-PORTE-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single()
  if (e0) throw new Error('azienda: ' + e0.message)
  aziendaId = az.id
  const { data: ent } = await a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale porte', slug: `zz-porte-${t}`, active: true }).select().single()
  const { data: ev } = await a.from('eventi').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: 'ZZ Serata porte', slug: `zz-sp-${t}`,
    date_start: new Date(Date.now() + 9 * 864e5).toISOString(), price: 0, prezzo_modo: 'gratuito', seats_total: 3, lista_attesa: true, published: true, active: true, notify_owner_on_booking: false }).select().single()

  // Il titolare, per le porte del pannello.
  const email = `zz-porte-tit-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ Titolare', azienda_id: az.id }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const H = { Authorization: `Bearer ${s.session.access_token}` }

  const contatti = () => a.from('contatti').select('id, nome, email, telefono, telefono_e164, fonte, note, pipeline_stage, attivita_numero, ultima_attivita_tipo, ultima_attivita_titolo, iscritto_newsletter, whatsapp_optin').eq('azienda_id', az.id).order('created_at').then(r => r.data || [])
  const registro = id => a.from('contatti_attivita').select('tipo, titolo, origine_id, riferimento, dettaglio').eq('contatto_id', id).order('created_at').then(r => r.data || [])
  // Il lavoro dopo la risposta (`after`) non è istantaneo: si aspetta l'esito, non un tempo fisso.
  const finche = async (cond, max = 25) => { for (let i = 0; i < max; i++) { const c = await contatti(); if (cond(c)) return c; await pausa(1000) } return contatti() }
  const di = (c, mail) => c.find(x => x.email === mail)

  console.log('\n1 · EVENTO, DAL SITO\n')
  const anna = `zz-anna-${t}@playwright.internal`
  let r = await manda(`/api/guest/eventi/${ev.id}/book`, { guest_name: 'ZZ Anna', guest_email: anna, guest_phone: '333 111 2233', seats: 2, privacy_accettata: true })
  ok(r.stato === 201, `prenotazione accettata (HTTP ${r.stato})`)
  let c = await finche(l => di(l, anna)?.attivita_numero === 1)
  let A = di(c, anna)
  ok(!!A && A.fonte === 'evento' && A.telefono_e164 === '+393331112233', `è fra i contatti, col numero in forma internazionale (${A?.telefono_e164})`)
  let reg = A ? await registro(A.id) : []
  ok(reg.length === 1 && reg[0].tipo === 'evento' && reg[0].titolo === 'ZZ Serata porte' && reg[0].origine_id === ev.id && reg[0].dettaglio?.posti === 2, `nel registro: l’evento, quale, e quanti posti (${JSON.stringify(reg[0] || {}).slice(0, 110)})`)
  ok(A?.ultima_attivita_titolo === 'ZZ Serata porte' && A?.iscritto_newsletter === false, 'il contatto dice qual è l’ultima cosa che ha fatto, e NON è iscritto a niente')
  // ⛔ Tutti nascevano «Nuovo lead» con una riga nelle note per ogni prenotazione.
  ok(A?.pipeline_stage === null && A?.note === null, `chi prenota non finisce in trattativa, e nelle note non si scrive niente (stadio ${A?.pipeline_stage}, note ${A?.note === null ? 'vuote' : 'SCRITTE'})`)

  console.log('\n2 · LA STESSA PERSONA, SCRITTA DIVERSA\n')
  // Stessa email con le maiuscole: non deve nascere un secondo contatto.
  r = await manda(`/api/guest/eventi/${ev.id}/book`, { guest_name: 'anna', guest_email: anna.toUpperCase(), seats: 1, privacy_accettata: true })
  c = await finche(l => di(l, anna)?.attivita_numero === 2)
  ok(r.stato === 201 && c.length === 1 && di(c, anna)?.attivita_numero === 2 && di(c, anna)?.nome === 'ZZ Anna', `un solo contatto, due attività, e il nome scritto bene non è stato sovrascritto (${c.length} contatti, «${di(c, anna)?.nome}»)`)

  console.log('\n3 · LISTA D’ATTESA\n')
  const bea = `zz-bea-${t}@playwright.internal`
  r = await manda(`/api/guest/eventi/${ev.id}/lista-attesa`, { guest_name: 'ZZ Bea', guest_email: bea, seats: 2, privacy_accettata: true })
  c = await finche(l => di(l, bea)?.attivita_numero === 1)
  reg = di(c, bea) ? await registro(di(c, bea).id) : []
  ok(r.stato < 300 && reg[0]?.tipo === 'lista_attesa', `chi resta fuori entra fra i contatti, segnato come lista d’attesa (HTTP ${r.stato}, ${reg[0]?.tipo})`)

  console.log('\n4 · AL TELEFONO, CON SOLO UN NUMERO\n')
  // L'evento è pieno (3 posti): il titolare ne alza la capienza e segna una telefonata.
  await a.from('eventi').update({ seats_total: 20 }).eq('id', ev.id)
  r = await manda(`/api/eventi/${ev.id}/bookings`, { guest_name: 'ZZ Carlo', guest_phone: '+39 347 5556677', seats: 4 }, H)
  ok(r.stato === 201, `prenotazione segnata dal pannello (HTTP ${r.stato})`)
  c = await finche(l => l.some(x => x.telefono_e164 === '+393475556677' && x.attivita_numero === 1))
  let C = c.find(x => x.telefono_e164 === '+393475556677')
  ok(!!C && C.email === null && C.nome === 'ZZ Carlo', 'chi ha lasciato solo il numero entra fra i contatti, senza email')
  reg = C ? await registro(C.id) : []
  ok(reg[0]?.dettaglio?.canale === 'telefono' && reg[0]?.dettaglio?.posti === 4, 'e il registro dice che è arrivato per telefono')
  // Poi la stessa persona prenota dal sito, col numero scritto in un altro modo e un'email.
  const carlo = `zz-carlo-${t}@playwright.internal`
  r = await manda(`/api/guest/eventi/${ev.id}/book`, { guest_name: 'Carlo', guest_email: carlo, guest_phone: '347-555 66 77', seats: 1, privacy_accettata: true })
  c = await finche(l => l.find(x => x.telefono_e164 === '+393475556677')?.attivita_numero === 2)
  const stessi = c.filter(x => x.telefono_e164 === '+393475556677' || x.email === carlo)
  ok(stessi.length === 1 && stessi[0].email === carlo && stessi[0].attivita_numero === 2, `riconosciuto dal numero: un solo contatto, che ora ha anche l’email (${stessi.length} contatti, ${stessi[0]?.email})`)

  console.log('\n5 · MODULO CONTATTI DEL SITO\n')
  const dan = `zz-dan-${t}@playwright.internal`
  r = await manda('/api/guest/contact', { entity_tipo: 'ristorante', entity_id: ent.id, name: 'ZZ Dan', email: dan, message: 'Vorrei informazioni per una cena aziendale.', privacy_accettata: true, privacy: true })
  c = await finche(l => di(l, dan)?.attivita_numero === 1, 12)
  reg = di(c, dan) ? await registro(di(c, dan).id) : []
  ok(di(c, dan)?.pipeline_stage === 'lead' && /cena aziendale/.test(di(c, dan)?.note || ''), `chi scrive dal sito entra in trattativa, e il suo messaggio resta nelle note (stadio ${di(c, dan)?.pipeline_stage})`)
  ok(r.stato < 300 && reg[0]?.tipo === 'richiesta' && reg[0]?.titolo === 'Messaggio dal sito', `una richiesta dal sito (HTTP ${r.stato}${r.j?.error ? ' ' + r.j.error : ''}, ${reg[0]?.tipo || 'niente nel registro'})`)

  console.log('\n6 · OFFERTA, LASCIANDO SOLO IL TELEFONO\n')
  const { data: off, error: eo } = await a.from('offerte').insert({ azienda_id: az.id, entity_id: ent.id, titolo: 'ZZ Degustazione porte', modo: 'richiesta', impegno: 'prenota', prezzo: 30, posti_totali: 6, attiva: true, pubblicata: true, origine: 'escursione' }).select().single()
  if (eo) ok(false, 'offerta di prova non creata: ' + eo.message)
  else {
    r = await manda('/api/guest/prenota', { offerta_id: off.id, nome: 'ZZ Elsa', contatto: '320 9998877', persone: 2, privacy_accettata: true })
    c = await finche(l => l.find(x => x.telefono_e164 === '+393209998877')?.attivita_numero === 1, 15)
    const E = c.find(x => x.telefono_e164 === '+393209998877')
    reg = E ? await registro(E.id) : []
    ok(r.stato === 201 && reg[0]?.tipo === 'prenotazione' && reg[0]?.titolo === 'ZZ Degustazione porte' && reg[0]?.origine_id === off.id, `chi prenota un’offerta ora entra fra i contatti (HTTP ${r.stato}${r.j?.error ? ' ' + r.j.error : ''}, ${reg[0]?.titolo || 'non c’è'})`)
  }

  console.log('\n7 · RISORSA PRENOTABILE\n')
  const tutto = [['09:00', '18:00']]
  const { data: ri, error: er } = await a.from('risorse').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, nome: 'ZZ Sala porte', modalita: 'slot', durata_minuti: 60, quantita: 1, prezzo: 0, attiva: true, conferma_auto: true,
    disponibilita: { lun: tutto, mar: tutto, mer: tutto, gio: tutto, ven: tutto, sab: tutto, dom: tutto } }).select().single()
  if (er) ok(false, 'risorsa di prova non creata: ' + er.message)
  else {
    const fede = `zz-fede-${t}@playwright.internal`
    r = await manda('/api/booking/public/prenota', { risorsa_id: ri.id, data: new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10), ora_inizio: '10:00', cliente_nome: 'ZZ Fede', cliente_email: fede, n_persone: 1, privacy_accettata: true })
    c = await finche(l => di(l, fede)?.attivita_numero === 1, 15)
    reg = di(c, fede) ? await registro(di(c, fede).id) : []
    ok(r.stato === 201 && reg[0]?.tipo === 'prenotazione' && reg[0]?.titolo === 'ZZ Sala porte' && di(c, fede)?.whatsapp_optin === false, `chi prenota una risorsa ora entra fra i contatti, anche senza consenso WhatsApp (HTTP ${r.stato}${r.j?.error ? ' ' + r.j.error : ''}, ${reg[0]?.titolo || 'non c’è'})`)
  }

  console.log('\n8 · MODULO COSTRUITO DAL CLIENTE\n')
  const { data: fb, error: ef } = await a.from('form_builder').insert({ azienda_id: az.id, nome: 'ZZ Iscrizione porte', attivo: true,
    campi: [{ id: 'nome', tipo: 'text', label: 'Nome', required: true }, { id: 'email', tipo: 'email', label: 'Email', required: true }, { id: 'tel', tipo: 'tel', label: 'Telefono' }] }).select().single()
  if (ef) ok(false, 'modulo di prova non creato: ' + ef.message)
  else {
    const gio = `zz-gio-${t}@playwright.internal`
    r = await manda(`/api/form-builder/public/${fb.token}/submit`, { nome: 'ZZ Gio', email: gio, tel: '0744 123456' })
    c = await finche(l => di(l, gio)?.attivita_numero === 1, 12)
    reg = di(c, gio) ? await registro(di(c, gio).id) : []
    ok(r.stato < 300 && reg[0]?.tipo === 'modulo' && reg[0]?.titolo === 'ZZ Iscrizione porte' && reg[0]?.origine_id === fb.id, `il registro dice quale modulo ha compilato (HTTP ${r.stato}${r.j?.error ? ' ' + r.j.error : ''}, ${reg[0]?.titolo || 'non c’è'})`)
    ok(di(c, gio)?.pipeline_stage === null, 'compilare un modulo non apre una trattativa da solo')
    ok(di(c, gio)?.telefono_e164 === '+390744123456', `e il fisso senza prefisso diventa internazionale (${di(c, gio)?.telefono_e164})`)
  }

  console.log('\n8b · LA VECCHIA PORTA DELL’APP È CHIUSA\n')
  // `/api/guest/book` raccoglieva nome, email e telefono SENZA chiedere il
  // consenso, e nessuna nostra pagina la chiamava più dall'8 maggio. Spenta il
  // 04/10/2026: le app prenotano da `/api/guest/prenota`, che il consenso lo pretende.
  r = await manda('/api/guest/book', { entity_tipo: 'ristorante', entity_id: ent.id, item_type: 'excursion', item_name: 'ZZ Giro in barca', name: 'ZZ Leo', email: `zz-leo-${t}@playwright.internal`, phone: '328 4445566', persons: 3 })
  await pausa(1500)
  ok([404, 405].includes(r.stato) && !(await contatti()).some(x => x.nome === 'ZZ Leo'), `non risponde più e non scrive niente (HTTP ${r.stato})`)

  console.log('\n9 · AGGIUNTO A MANO, E CORRETTO\n')
  r = await manda('/api/contatti', { nome: 'ZZ Ilaria', telefono: '339 0001122' }, H)
  ok(r.stato === 201 && r.j.telefono_e164 === '+393390001122', `il numero scritto a mano prende la sua chiave (${r.j.telefono_e164})`)
  const pr = await fetch(`${BASE}/api/contatti/${r.j.id}`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ telefono: '339 0009999' }) }).then(x => x.json())
  ok(pr.telefono_e164 === '+393390009999', `cambiando il numero cambia anche la chiave (${pr.telefono_e164})`)
  const svuota = await fetch(`${BASE}/api/contatti/${r.j.id}`, { method: 'PATCH', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ telefono: 'non lo so', telefono_e164: '+390000000000' }) }).then(x => x.json())
  ok(svuota.telefono_e164 === null, 'un numero che non è un numero non lascia una chiave, e la chiave non si può scrivere a mano dall’esterno')

  console.log('\n10 · IL REGISTRO NON CONTIENE DATI DI PERSONE\n')
  const { data: tutte } = await a.from('contatti_attivita').select('*').eq('azienda_id', az.id)
  const grezzo = JSON.stringify(tutte)
  ok(tutte.length >= 6, `${tutte.length} righe scritte dalle porte`)
  ok(!/playwright\.internal|ZZ Anna|ZZ Carlo|ZZ Elsa|\+39|3331112233|3475556677/.test(grezzo), 'nessun nome, email o telefono dentro il registro')
  ok(tutte.every(x => x.azienda_id === az.id), 'ogni riga porta la sua azienda')

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'OGNI PORTA PORTA AI CONTATTI, UNA VOLTA SOLA')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (aziendaId) await cancellaAziendaDiProva(aziendaId)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
