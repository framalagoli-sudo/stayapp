// Le due operazioni sui contatti che non si disfano: rendere anonimo e unire.
//
// 04/10/2026 — due difetti trovati leggendo, non segnalati da nessuno:
//   · «Anonimizza» puliva solo la scheda: nome, email e telefono restavano nelle
//     prenotazioni e nei moduli. Per chi chiede la cancellazione non bastava;
//   · due schede della stessa persona non si potevano unire.
//
// Cosa prova:
//   1. rendere anonimo toglie i dati OVUNQUE, e solo quelli di quella persona;
//      chi non è dell'azienda non può, e non succede niente;
//   2. unire porta tutto sulla scheda che resta — storia, punti, moduli — senza
//      perdere niente e senza regalare consensi a un recapito che non li aveva;
//   3. nel pannello il doppione viene proposto, e unirlo è un gesto del titolare.
//
// Tutto su aziende ZZ scritte nel database. Nessuna email parte.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-contatti-cura.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const aziende = [], utenti = []
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-cura-${nome.toLowerCase()}-${t}`, active: true }).select().single(), 'entità')
  return az
}
async function accesso(aziendaId, ruolo = 'admin_azienda', permessi = null) {
  const email = `zz-cura-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: ruolo, full_name: 'ZZ', azienda_id: aziendaId, ...(permessi ? { permissions: permessi } : {}) }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return s.session
}
const post = (percorso, sessione, corpo) => fetch(BASE + percorso, { method: 'POST', headers: { 'content-type': 'application/json', ...(sessione ? { Authorization: `Bearer ${sessione.access_token}` } : {}) }, body: JSON.stringify(corpo || {}) })
  .then(async r => ({ stato: r.status, j: await r.json().catch(() => ({})) }))

let browser = null
try {
  const mia = await azienda('CURA'), altra = await azienda('VICINA')
  const sMia = await accesso(mia.id), sAltra = await accesso(altra.id)
  const ev = await deve(a.from('eventi').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, title: 'ZZ Serata cura', slug: `zz-cura-${t}`, date_start: new Date(Date.now() + 8 * 864e5).toISOString(), price: 0, published: true, active: true }).select().single(), 'evento')
  const fb = await deve(a.from('form_builder').insert({ azienda_id: mia.id, nome: 'ZZ Modulo cura', attivo: true, campi: [] }).select().single(), 'modulo')

  // ── La persona da rendere anonima, e una che non c'entra ──────────────────
  const pEmail = `zz-paola-${t}@playwright.internal`
  const paola = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Paola Verdi', email: pEmail, telefono: '333 4445566', telefono_e164: '+393334445566', fonte: 'evento', note: 'Preferisce il tavolo in fondo', tags: ['vip'], iscritto_newsletter: true, marketing_consenso_il: new Date().toISOString(), whatsapp_optin: true, whatsapp_optin_il: new Date().toISOString(), pipeline_stage: 'lead' }).select().single(), 'contatto')
  const quinto = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Quinto Neri', email: `zz-quinto-${t}@playwright.internal`, fonte: 'evento', pipeline_stage: null }).select().single(), 'contatto')
  const prenot = righe => deve(a.from('event_bookings').insert(righe.map(r => ({ event_id: ev.id, seats: 2, total_amount: 0, status: 'confirmed', privacy_accettata: true, ...r }))).select('id, guest_name'), 'prenotazioni evento')
  const bk = await prenot([
    { guest_name: 'ZZ Paola Verdi', guest_email: pEmail.toUpperCase(), guest_phone: null, notes: 'celiaca' },
    { guest_name: 'Paola', guest_email: null, guest_phone: '+39 333-444 55 66' },     // solo telefono, scritto diverso
    { guest_name: 'ZZ Quinto Neri', guest_email: `zz-quinto-${t}@playwright.internal`, guest_phone: '347 0000000' },
  ])
  // Una prenotazione deve riferirsi a qualcosa: un'offerta di prova.
  const off = await deve(a.from('offerte').insert({ azienda_id: mia.id, entity_id: mia.ent.id, titolo: 'ZZ Degustazione cura', modo: 'richiesta', impegno: 'prenota', prezzo: 0, attiva: true, pubblicata: true, origine: 'escursione' }).select().single(), 'offerta')
  const pr = await deve(a.from('prenotazioni').insert({ azienda_id: mia.id, entity_id: mia.ent.id, offerta_id: off.id, data: '2026-12-01', cliente_nome: 'ZZ Paola Verdi', cliente_email: pEmail, cliente_telefono: '3334445566', n_persone: 2, stato: 'confermata', note_cliente: 'arrivo tardi' }).select().single(), 'prenotazione')
  const inv = await deve(a.from('form_submissions').insert({ form_id: fb.id, azienda_id: mia.id, contatto_id: paola.id, dati: { nome: 'ZZ Paola Verdi', email: pEmail }, ip: '203.0.113.9' }).select().single(), 'invio')
  await deve(a.from('contatti_attivita').insert({ azienda_id: mia.id, contatto_id: paola.id, tipo: 'evento', titolo: 'ZZ Serata cura', origine_id: ev.id, riferimento: bk[0].id, dettaglio: { posti: 2 } }), 'registro')

  console.log('\n1 · RENDERE ANONIMA UNA PERSONA\n')
  ok((await post(`/api/contatti/${paola.id}/erasure`, null)).stato === 401, 'senza login non si può')
  const estraneo = await post(`/api/contatti/${paola.id}/erasure`, sAltra)
  const intatta = await deve(a.from('contatti').select('nome').eq('id', paola.id).single(), 'lettura')
  ok(estraneo.stato === 404 && intatta.nome === 'ZZ Paola Verdi', `il titolare di un’altra azienda riceve «non trovato», e non succede niente (HTTP ${estraneo.stato})`)
  const r = await post(`/api/contatti/${paola.id}/erasure`, sMia)
  ok(r.stato === 200 && r.j.svuotate?.eventi === 2 && r.j.svuotate?.prenotazioni === 1 && r.j.svuotate?.moduli === 1, `dice dove ha tolto i dati: 2 prenotazioni di eventi, 1 altra prenotazione, 1 modulo (${JSON.stringify(r.j.svuotate)})`)
  const c = await deve(a.from('contatti').select('*').eq('id', paola.id).single(), 'lettura')
  ok(c.nome === 'Anonimo' && c.telefono === null && c.telefono_e164 === null && c.note === null && c.iscritto_newsletter === false && c.whatsapp_optin === false && c.marketing_consenso_il === null && c.pipeline_stage === null && !c.email.includes('paola'), 'la scheda: via nome, recapiti, chiave del telefono, note, consensi')
  const dopo = await deve(a.from('event_bookings').select('id, guest_name, guest_email, guest_phone, notes, seats').eq('event_id', ev.id), 'lettura')
  const sue = dopo.filter(b => [bk[0].id, bk[1].id].includes(b.id)), sua = dopo.find(b => b.id === bk[2].id)
  ok(sue.every(b => b.guest_name === 'Anonimo' && b.guest_email === null && b.guest_phone === null && b.notes === null && b.seats === 2), 'le sue prenotazioni di eventi sono senza nome — anche quella presa col solo telefono — ma i posti restano')
  ok(sua.guest_name === 'ZZ Quinto Neri' && !!sua.guest_email && !!sua.guest_phone, 'la prenotazione di un’altra persona non è stata toccata')
  const p2 = await deve(a.from('prenotazioni').select('cliente_nome, cliente_email, cliente_telefono, note_cliente, n_persone').eq('id', pr.id).single(), 'lettura')
  ok(p2.cliente_nome === 'Anonimo' && !p2.cliente_email && p2.cliente_telefono === null && p2.note_cliente === null && p2.n_persone === 2, 'la prenotazione di una risorsa pure')
  const i2 = await deve(a.from('form_submissions').select('dati, ip').eq('id', inv.id).single(), 'lettura')
  ok(JSON.stringify(i2.dati) === '{}' && i2.ip === null, 'quello che aveva scritto nel modulo, e il suo indirizzo IP, non ci sono più')
  // Il controllo grezzo: in nessuna riga dell'azienda resta la sua email o il suo numero.
  const tutto = JSON.stringify([c, dopo.filter(b => b.id !== bk[2].id), p2, i2])
  ok(!/paola/i.test(tutto) && !/3334445566|333 4445566|333-444/.test(tutto), 'nel corpo grezzo di quelle righe non resta né il nome, né l’email, né il numero')
  const reg = await a.from('contatti_attivita').select('id', { count: 'exact', head: true }).eq('contatto_id', paola.id)
  ok(reg.count === 1, 'il registro resta (non contiene dati di persone): i conteggi della serata non cambiano')

  // ── Due schede della stessa persona ───────────────────────────────────────
  console.log('\n2 · UNIRE DUE SCHEDE\n')
  const aEmail = `zz-rita-${t}@playwright.internal`, bEmail = `zz-rita-lavoro-${t}@playwright.internal`
  const fattoIl = new Date(Date.now() - 864e5).toISOString()
  const ritaA = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Rita Bianchi', email: aEmail, fonte: 'evento', tags: ['evento', 'amica'], note: 'Viene sempre in due', iscritto_newsletter: true, marketing_consenso_il: fattoIl, marketing_consenso_fonte: 'modulo', pipeline_stage: null }).select().single(), 'contatto')
  const ritaB = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Rita Bianchi', email: bEmail, telefono: '347 1112223', telefono_e164: '+393471112223', fonte: 'prenotazione', tags: ['compleanno'], note: 'Allergia alle noci', iscritto_newsletter: true, whatsapp_optin: true, whatsapp_optin_il: fattoIl, whatsapp_optin_fonte: 'modulo di prenotazione', pipeline_stage: 'contattato' }).select().single(), 'contatto')
  const fatto = (cid, x) => deve(a.from('contatti_attivita').insert({ azienda_id: mia.id, contatto_id: cid, ...x }), 'registro')
  await fatto(ritaA.id, { tipo: 'evento', titolo: 'ZZ Serata cura', origine_id: ev.id, riferimento: `ra-1-${t}` })
  await fatto(ritaA.id, { tipo: 'newsletter', titolo: 'Iscrizione alla newsletter', riferimento: 'iscrizione' })
  await fatto(ritaB.id, { tipo: 'prenotazione', titolo: 'ZZ Sala', riferimento: `rb-1-${t}` })
  await fatto(ritaB.id, { tipo: 'newsletter', titolo: 'Iscrizione alla newsletter', riferimento: 'iscrizione' })   // la stessa cosa su tutte e due
  const punti = await deve(a.from('loyalty_points').insert({ azienda_id: mia.id, contatto_id: ritaB.id, punti: 40, tipo: 'manuale' }).select().single(), 'punti')
  const invB = await deve(a.from('form_submissions').insert({ form_id: fb.id, azienda_id: mia.id, contatto_id: ritaB.id, dati: { nome: 'Rita' } }).select().single(), 'invio')
  const diFuori = await deve(a.from('contatti').insert({ azienda_id: altra.id, nome: 'ZZ Rita Bianchi', email: `zz-rita-altrove-${t}@playwright.internal`, fonte: 'evento', pipeline_stage: null }).select().single(), 'contatto')

  ok((await post(`/api/contatti/${ritaA.id}/unisci`, sMia, { altro_id: ritaA.id })).stato === 400, 'una scheda non si unisce a sé stessa')
  const conAltrui = await post(`/api/contatti/${ritaA.id}/unisci`, sMia, { altro_id: diFuori.id })
  const ancora = await a.from('contatti').select('id', { count: 'exact', head: true }).eq('id', diFuori.id)
  ok(conAltrui.stato === 404 && ancora.count === 1, `la scheda di un’altra azienda risulta «non trovata» e resta dov’è (HTTP ${conAltrui.stato})`)
  const sStaff = await accesso(mia.id, 'staff', { eventi: true })
  ok((await post(`/api/contatti/${ritaA.id}/unisci`, sStaff, { altro_id: ritaB.id })).stato === 403, 'un collaboratore senza il permesso «Contatti» non può unire')

  const u = await post(`/api/contatti/${ritaA.id}/unisci`, sMia, { altro_id: ritaB.id })
  ok(u.stato === 200, `le due schede si uniscono (HTTP ${u.stato}${u.j?.error ? ' ' + u.j.error : ''})`)
  const R = await deve(a.from('contatti').select('*').eq('id', ritaA.id).single(), 'lettura')
  const sparita = await a.from('contatti').select('id', { count: 'exact', head: true }).eq('id', ritaB.id)
  ok(sparita.count === 0, 'la seconda scheda non c’è più')
  ok(R.email === aEmail && R.telefono === '347 1112223' && R.telefono_e164 === '+393471112223', 'resta l’email della scheda principale, e prende il telefono che le mancava')
  ok(JSON.stringify([...R.tags].sort()) === JSON.stringify(['amica', 'compleanno', 'evento']), `le etichette si sommano (${JSON.stringify(R.tags)})`)
  ok(/Viene sempre in due/.test(R.note) && /Allergia alle noci/.test(R.note) && R.note.includes(`Altri recapiti: ${bEmail}`), 'le note di tutte e due restano, e la seconda email non si perde')
  ok(R.pipeline_stage === 'contattato', 'la trattativa in corso sull’altra scheda continua')
  ok(R.whatsapp_optin === true && !!R.whatsapp_optin_il, 'il consenso WhatsApp passa: era per quel numero, che è quello che resta')
  ok(R.iscritto_newsletter === true && R.marketing_consenso_fonte === 'modulo', 'il consenso email resta quello della scheda principale, con la sua prova')
  const storia = await deve(a.from('contatti_attivita').select('tipo, riferimento').eq('contatto_id', ritaA.id), 'lettura')
  ok(storia.length === 3 && storia.filter(x => x.tipo === 'newsletter').length === 1 && R.attivita_numero === 3, `la storia è una sola: 3 attività, e la stessa iscrizione non conta due volte (${storia.length}, contatore ${R.attivita_numero})`)
  const pt = await deve(a.from('loyalty_points').select('contatto_id, punti').eq('id', punti.id).maybeSingle(), 'lettura')
  const mv = await deve(a.from('form_submissions').select('contatto_id').eq('id', invB.id).single(), 'lettura')
  ok(pt?.contatto_id === ritaA.id && pt?.punti === 40 && mv.contatto_id === ritaA.id, 'i punti fedeltà e i moduli compilati sono passati alla scheda che resta')

  // Un consenso non passa a un recapito che non l'aveva.
  const x = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Ugo Gialli', email: `zz-ugo-${t}@playwright.internal`, fonte: 'evento', iscritto_newsletter: false, pipeline_stage: null }).select().single(), 'contatto')
  const y = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Ugo Gialli', email: `zz-ugo-altra-${t}@playwright.internal`, fonte: 'form', iscritto_newsletter: true, pipeline_stage: null }).select().single(), 'contatto')
  await post(`/api/contatti/${x.id}/unisci`, sMia, { altro_id: y.id })
  const U = await deve(a.from('contatti').select('iscritto_newsletter, email').eq('id', x.id).single(), 'lettura')
  ok(U.iscritto_newsletter === false, 'un consenso dato per un’altra email non diventa un consenso per questa')

  console.log('\n3 · NEL PANNELLO\n')
  const s1 = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'ZZ Sara Rossi', email: `zz-sara-${t}@playwright.internal`, telefono: '320 5556667', telefono_e164: '+393205556667', fonte: 'evento', pipeline_stage: null }).select().single(), 'contatto')
  const s2 = await deve(a.from('contatti').insert({ azienda_id: mia.id, nome: 'Sara R.', email: `zz-sara-due-${t}@playwright.internal`, telefono: '+39 320 555 6667', telefono_e164: '+393205556667', fonte: 'prenotazione', pipeline_stage: null }).select().single(), 'contatto')
  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sMia) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/contatti`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-tabella-contatti]').waitFor({ timeout: 60000 })
  await page.locator('[data-lista="doppioni"]').click()
  const nomi = await page.locator('[data-tabella-contatti] [data-nome]').allInnerTexts()
  ok(nomi.length === 2 && nomi.includes('ZZ Sara Rossi') && nomi.includes('Sara R.'), `«Possibili doppioni» mostra chi ha lo stesso numero, anche con nomi scritti diversi (${nomi.join(', ')})`)
  await page.locator(`[data-contatto="${s1.id}"]`).click()
  await page.locator('[data-unisci]').waitFor({ timeout: 8000 })
  const proposta = (await page.locator('[data-unisci]').innerText()).replace(/\s+/g, ' ')
  ok(/Potrebbe essere la stessa persona/.test(proposta) && /Sara R\./.test(proposta), 'aprendo la scheda, l’altro contatto viene proposto')
  let domanda = ''
  page.once('dialog', d => { domanda = d.message(); d.accept() })
  await page.locator('[data-unisci]').getByRole('button', { name: 'Unisci a questa scheda' }).click()
  await page.locator('[data-scheda]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
  const rimasta = await a.from('contatti').select('id', { count: 'exact', head: true }).eq('id', s2.id)
  ok(/Non si può annullare/.test(domanda) && rimasta.count === 0, 'unire chiede conferma dicendo che non si annulla, e poi la seconda scheda sparisce')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'ANONIMO VUOL DIRE OVUNQUE, E UNIRE NON PERDE NIENTE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
