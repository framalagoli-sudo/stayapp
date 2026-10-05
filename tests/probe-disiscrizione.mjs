// Disiscriversi dalle email promozionali: funziona, e resta scritto.
//
// 05/10/2026, da una domanda di Francesco («la mail per legge va fatta con il
// link di disiscrizione?»). Il link c'era e funzionava. Mancavano:
//   · il pulsante «Annulla iscrizione» dei programmi di posta (una POST al
//     nostro indirizzo, che sull'apex riceveva un 308 e non sarebbe arrivata);
//   · la traccia: quando una persona si toglieva non restava né data né modo.
//
// Cosa prova, soprattutto col caso ostile:
//   1. il pulsante e il link tolgono la persona, e scrivono quando e come;
//   2. la prova del sì resta; chiamare due volte non cambia né data né conto;
//   3. un codice inventato non toglie nessuno e non racconta niente;
//   4. il conto delle disiscrizioni di una newsletter ALTRUI non si gonfia;
//   5. tolta a mano dal titolare lascia traccia; un nuovo sì la chiude;
//   6. (solo in produzione) un invio vero viene accettato con le intestazioni
//      del pulsante — verso la casella di prova del fornitore, non una persona.
//
// Aziende ZZ. Si pulisce da sola.
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-disiscrizione.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const inProduzione = /oltrenova\.com/.test(BASE)
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const aziende = [], utenti = []
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const chiama = (metodo, percorso, corpo, headers = {}) => fetch(BASE + percorso, { method: metodo, redirect: 'manual', headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...headers }, body: corpo ? JSON.stringify(corpo) : undefined })
  .then(async r => { const grezzo = await r.text(); let j = {}; try { j = JSON.parse(grezzo) } catch {} return { stato: r.status, grezzo, j } })

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-dis-${nome.toLowerCase()}-${t}`, active: true }).select().single(), 'entità')
  return az
}
async function accesso(aziendaId) {
  const email = `zz-dis-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return s.session
}

let browser = null
try {
  const mia = await azienda('DISISCRIZIONE'), altra = await azienda('VICINA')
  const sMia = await accesso(mia.id)
  const H = { Authorization: `Bearer ${sMia.access_token}` }
  const dato = '2026-09-01T10:00:00.000Z'
  const iscritto = (az, nome, email) => deve(a.from('contatti').insert({ azienda_id: az.id, nome, email, fonte: 'manuale', pipeline_stage: null,
    iscritto_newsletter: true, marketing_consenso_il: dato, marketing_consenso_testo: 'Avvisatemi delle prossime serate', marketing_consenso_fonte: 'prenotazione di prova' }).select().single(), 'contatto')
  const rileggi = id => a.from('contatti').select('*').eq('id', id).single().then(r => r.data)
  const bozza = az => deve(a.from('newsletters').insert({ azienda_id: az.id, subject: 'ZZ prova', content: {}, entity_tipo: 'ristorante', entity_id: az.ent.id, status: 'draft' }).select().single(), 'newsletter')
  const conto = id => a.from('newsletters').select('unsubscribes_count, recipients_count, status').eq('id', id).single().then(r => r.data)

  const uno = await iscritto(mia, 'ZZ Col Pulsante', `zz-pulsante-${t}@playwright.internal`)
  const due = await iscritto(mia, 'ZZ Col Link', `zz-link-${t}@playwright.internal`)
  const tre = await iscritto(mia, 'ZZ Resta Iscritto', `zz-resta-${t}@playwright.internal`)
  const nlMia = await bozza(mia), nlAltrui = await bozza(altra)

  console.log('\n1 · IL PULSANTE DEL PROGRAMMA DI POSTA E IL LINK\n')
  const p = await chiama('POST', `/api/guest/unsubscribe?token=${uno.unsubscribe_token}&nl=${nlMia.id}`)
  let c = await rileggi(uno.id)
  ok(p.stato === 200 && c.iscritto_newsletter === false, `la POST del pulsante toglie la persona (HTTP ${p.stato})`)
  ok(!!c.marketing_revoca_il && c.marketing_revoca_fonte === 'pulsante del programma di posta', `resta scritto quando e come («${c.marketing_revoca_fonte}»)`)
  ok(c.marketing_consenso_testo === 'Avvisatemi delle prossime serate' && new Date(c.marketing_consenso_il).getTime() === new Date(dato).getTime(), 'la prova del sì non si cancella: dice cosa era stato accettato')
  ok(!p.grezzo.includes(uno.email) && !p.grezzo.includes('ZZ Col') && Object.keys(p.j).join() === 'ok', `la risposta non dice chi sia la persona (${p.grezzo})`)
  ok((await conto(nlMia.id)).unsubscribes_count === 1, 'la newsletter conta una disiscrizione')

  const primaData = c.marketing_revoca_il
  const ancora = await chiama('GET', `/api/guest/unsubscribe?token=${uno.unsubscribe_token}&nl=${nlMia.id}`)
  c = await rileggi(uno.id)
  ok(ancora.stato === 200 && c.marketing_revoca_il === primaData && c.marketing_revoca_fonte === 'pulsante del programma di posta', 'chiamata una seconda volta risponde «fatto» e non riscrive la data del primo no')
  ok((await conto(nlMia.id)).unsubscribes_count === 1, 'e non conta due volte')

  const g = await chiama('GET', `/api/guest/unsubscribe?token=${due.unsubscribe_token}&nl=${nlAltrui.id}`)
  c = await rileggi(due.id)
  ok(g.stato === 200 && c.iscritto_newsletter === false && c.marketing_revoca_fonte === 'link nell’email', `il link in fondo all’email fa lo stesso («${c.marketing_revoca_fonte}»)`)
  ok((await conto(nlAltrui.id)).unsubscribes_count === 0, 'indicando la newsletter di un’ALTRA azienda il suo conto non si muove')

  console.log('\n2 · IL CASO OSTILE\n')
  for (const [cosa, codice] of [['un codice inventato', '00000000-0000-4000-8000-000000000000'], ['«na»', 'na'], ['un pezzo di query', `${tre.unsubscribe_token}' or '1'='1`], ['un filtro di PostgREST', 'not.is.null'], ['il codice vero con un carattere in più', tre.unsubscribe_token + 'a']]) {
    const r = await chiama('POST', `/api/guest/unsubscribe?token=${encodeURIComponent(codice)}`)
    ok(r.stato === 404 && !/postgres|syntax|uuid|column/i.test(r.grezzo), `${cosa} → non valido, senza raccontare il database (HTTP ${r.stato} ${r.grezzo.slice(0, 60)})`)
  }
  ok((await rileggi(tre.id)).iscritto_newsletter === true, 'e nessuno di questi ha tolto qualcuno')
  const prova = await chiama('POST', '/api/guest/unsubscribe?token=TEST')
  ok(prova.stato === 200 && prova.j.test === true, 'il codice delle email di prova risponde senza toccare nessuno')
  if (inProduzione) {
    const apex = await Promise.resolve().then(() => fetch('https://oltrenova.com/api/guest/unsubscribe?token=TEST', { method: 'POST', redirect: 'manual' })).then(r => r.status)
    ok(apex >= 300 && apex < 400, `sull’apex la POST viene rimandata (HTTP ${apex}): per questo l’indirizzo nell’intestazione è su www`)
  }

  console.log('\n3 · IL TITOLARE, E UN NUOVO SÌ\n')
  const tolta = await chiama('PATCH', `/api/contatti/${tre.id}`, { iscritto_newsletter: false }, H)
  c = await rileggi(tre.id)
  ok(tolta.stato === 200 && c.iscritto_newsletter === false && c.marketing_revoca_fonte === 'tolto dal titolare' && !!c.marketing_revoca_il, `tolta a mano dal titolare lascia traccia (HTTP ${tolta.stato} · «${c.marketing_revoca_fonte}»)`)
  const rimessa = await chiama('PATCH', `/api/contatti/${tre.id}`, { iscritto_newsletter: true }, H)
  c = await rileggi(tre.id)
  ok(rimessa.stato === 200 && c.iscritto_newsletter === true && c.marketing_revoca_il === null && c.marketing_revoca_fonte === null && c.marketing_consenso_fonte === 'inserimento manuale', 'rimessa: il no si chiude e il sì ha la sua data nuova')

  // Chi si era tolto e poi spunta di nuovo la casella prenotando: è un sì nuovo.
  const ev = await deve(a.from('eventi').insert({ azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id, title: 'ZZ Serata ritorno', slug: `zz-rit-${t}`,
    date_start: new Date(Date.now() + 9 * 864e5).toISOString(), price: 0, prezzo_modo: 'gratuito', published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false }).select().single(), 'evento')
  const pren = await chiama('POST', `/api/guest/eventi/${ev.id}/book`, { seats: 1, privacy_accettata: true, promozioni: true, guest_name: 'ZZ Col Link', guest_email: due.email })
  for (let i = 0; i < 25; i++) { c = await rileggi(due.id); if (c.iscritto_newsletter) break; await new Promise(r => setTimeout(r, 1000)) }
  ok(pren.stato < 300 && c.iscritto_newsletter === true && c.marketing_revoca_il === null && /ZZ Serata ritorno/.test(c.marketing_consenso_fonte || ''), `chi si era tolto e spunta di nuovo la casella torna iscritto, col sì nuovo (HTTP ${pren.stato} · ${c.marketing_consenso_fonte})`)

  console.log('\n4 · NELLA SCHEDA DEL CONTATTO\n')
  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sMia) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/contatti`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-tabella-contatti]').waitFor({ timeout: 60000 })
  await page.locator(`[data-contatto="${uno.id}"]`).click()
  await page.locator('[data-scheda]').waitFor({ timeout: 15000 })
  const riga = await page.locator('[data-scheda] [data-revoca]').innerText().catch(() => '')
  ok(/si è tolto il .*pulsante del programma di posta/.test(riga), `la scheda di chi si è tolto lo dice: «${riga.trim()}»`)
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  if (inProduzione) {
    console.log('\n5 · UN INVIO VERO, VERSO LA CASELLA DI PROVA DEL FORNITORE\n')
    // `delivered@resend.dev` è il pozzo di Resend: nessuna persona la legge.
    await a.from('contatti').update({ iscritto_newsletter: false }).eq('azienda_id', mia.id)
    const pozzo = await iscritto(mia, 'ZZ Pozzo', 'delivered@resend.dev')
    const invio = await chiama('POST', `/api/newsletter/${nlMia.id}/send`, {}, H)
    const dopo = await conto(nlMia.id)
    ok(invio.stato === 200 && invio.j.sent === 1 && dopo.recipients_count === 1, `il fornitore accetta l’invio con le intestazioni del pulsante (HTTP ${invio.stato} · inviate ${invio.j.sent ?? invio.j.error})`)
    await a.from('contatti').delete().eq('id', pozzo.id)
  } else {
    console.log('\n  (invio vero saltato: in locale le email sono spente — va provato in produzione)')
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI DICE BASTA VIENE TOLTO, E RESTA SCRITTO')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
