// Il cruscotto «Cosa succede» della Dashboard, provato come lo usa il titolare.
//
// 1. Un'azienda di prova con numeri noti — visite, contatti, prenotazioni,
//    incassi divisi fra «questo periodo» e «quello prima», più un evento in
//    arrivo — e la route deve restituire esattamente quei numeri.
// 2. Da fuori: senza accesso 401, staff 403, super_admin senza azienda 400, un
//    titolare che chiede un'altra azienda riceve la sua, un periodo inventato
//    torna a 7 giorni. Il corpo grezzo non contiene nomi né email.
// 3. Un'azienda senza prenotazioni né incassi non vede quei riquadri.
// 3-bis. I consigli («Cosa fare adesso»): le bozze solo al super_admin, quale
//    scatta sull'azienda di prova, quali scatterebbero sui clienti veri (sola
//    lettura), e nel browser l'etichetta, «Non ora» e dove porta il pulsante.
// 4. La Dashboard aperta dal titolare, sul computer e sul telefono: i numeri a
//    schermo, il cambio di periodo, il clic che porta alla pagina giusta.
//
// Uso (a mano):  node probe-cruscotto.mjs [cartella-foto]   ·  $env:TEST_URL per il locale
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import fs from 'fs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2] || null
if (FOTO) fs.mkdirSync(FOTO, { recursive: true })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const aziende = [], utenti = []
let browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const fa = giorni => new Date(Date.now() - giorni * 864e5).toISOString()

async function utente(role, aziendaId) {
  const email = `zz-cruscotto-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(u.user.id)
  await deve(a.from('profiles').upsert({ id: u.user.id, role, full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' }), 'profilo')
  const { data: s, error: e2 } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  if (e2) throw new Error(`signIn: ${e2.message}`)
  return s.session
}
const chiama = (s, q = '') => fetch(`${BASE}/api/cruscotto${q}`, { headers: s ? { Authorization: `Bearer ${s.access_token}` } : {} })

try {
  const t = Date.now().toString(36)
  // ── Azienda piena: numeri noti ──
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-CRUSCOTTO-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Cruscotto', slug: `zz-cruscotto-${t}`, active: true, minisito: { active: true } }).select().single(), 'entità')
  // Visite: 5 negli ultimi 7 giorni, 3 nei 7 prima, 4 fra 14 e 30 giorni fa.
  const visite = [1, 2, 3, 4, 6].map(fa).concat([8, 10, 13].map(fa)).concat([16, 20, 25, 29].map(fa))
  await deve(a.from('page_views').insert(visite.map(v => ({ entity_tipo: 'ristorante', entity_id: ent.id, viewed_at: v }))), 'visite')
  // Contatti: 2 nuovi, 1 prima; 1 dei tre può ricevere promozioni.
  const NOME_SEGRETO = `Zz Segreto ${t}`, EMAIL_SEGRETA = `zz-segreto-${t}@playwright.internal`
  await deve(a.from('contatti').insert([
    { azienda_id: az.id, nome: NOME_SEGRETO, email: EMAIL_SEGRETA, created_at: fa(1), pipeline_stage: null, iscritto_newsletter: true },
    { azienda_id: az.id, nome: 'Zz Due', email: `zz-due-${t}@playwright.internal`, created_at: fa(3), pipeline_stage: null },
    { azienda_id: az.id, nome: 'Zz Tre', email: `zz-tre-${t}@playwright.internal`, created_at: fa(9), pipeline_stage: null },
    // Quattro iscritti vecchi: non contano fra i nuovi, ma portano a 5 chi si
    // può invitare — la soglia del consiglio «evento da spingere».
    ...[1, 2, 3, 4].map(i => ({ azienda_id: az.id, nome: `Zz Vecchio ${i}`, email: `zz-vecchio-${i}-${t}@playwright.internal`, created_at: fa(40), pipeline_stage: null, iscritto_newsletter: true })),
  ]), 'contatti')
  // Un evento fra 5 giorni, 60 posti; prenotazioni: 3 valide ora (una annullata
  // e una in lista d'attesa non contano), 1 prima. Due pagate: 30 € ora, 20 € prima.
  const ev = await deve(a.from('eventi').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: 'ZZ Serata del cruscotto', slug: `zz-cruscotto-${t}`,
    date_start: new Date(Date.now() + 5 * 864e5).toISOString(), price: 10, seats_total: 60, published: true, active: true }).select().single(), 'evento')
  const pren = (giorni, extra = {}) => ({ event_id: ev.id, seats: 2, total_amount: 0, status: 'confirmed', privacy_accettata: true,
    guest_name: NOME_SEGRETO, guest_email: EMAIL_SEGRETA, created_at: fa(giorni), updated_at: fa(giorni),
    pagamento_stato: 'non_richiesto', importo_online: null, ...extra })
  await deve(a.from('event_bookings').insert([
    pren(1, { total_amount: 30, pagamento_stato: 'pagato', importo_online: 30, updated_at: fa(1) }),
    pren(2), pren(4),
    pren(2, { status: 'cancelled' }), pren(3, { status: 'waitlist' }),
    pren(10, { total_amount: 20, pagamento_stato: 'pagato', importo_online: 20, updated_at: fa(10) }),
  ]), 'prenotazioni')
  await deve(a.from('eventi').update({ seats_booked: 8 }).eq('id', ev.id), 'posti prenotati')

  // ── Azienda vuota: nessuna prenotazione, nessun incasso ──
  const vuota = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-CRUSCOTTO-VUOTA-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda vuota')
  aziende.push(vuota.id)
  await deve(a.from('entita').insert({ azienda_id: vuota.id, tipo: 'ristorante', name: 'ZZ Vuota', slug: `zz-cruscotto-vuota-${t}`, active: true }), 'entità vuota')

  console.log(`\nIL CRUSCOTTO — ${BASE}\n`)
  const tit = await utente('admin_azienda', az.id)

  console.log('I NUMERI')
  {
    const d = await (await chiama(tit, '?giorni=7')).json()
    esito(d.visite?.ora === 5 && d.visite?.prima === 3, `visite 7 giorni: 5, prima 3`, JSON.stringify(d.visite))
    esito(d.contatti?.ora === 2 && d.contatti?.prima === 1 && d.contatti?.invitabili === 5, 'contatti: 2 nuovi, 1 prima, 5 invitabili', JSON.stringify(d.contatti))
    esito(d.prenotazioni?.ora === 3 && d.prenotazioni?.prima === 1, 'prenotazioni: 3 (senza annullate e lista d’attesa), 1 prima', JSON.stringify(d.prenotazioni))
    esito(d.incassi?.ora === 30 && d.incassi?.prima === 20, 'incassato: 30 €, prima 20 €', JSON.stringify(d.incassi))
    esito(d.prossimoEvento?.titolo === 'ZZ Serata del cruscotto' && d.prossimoEvento?.prenotati === 8 && d.prossimoEvento?.capienza === 60, 'prossimo evento con 8 posti su 60', JSON.stringify(d.prossimoEvento))
    const d30 = await (await chiama(tit, '?giorni=30')).json()
    esito(d30.giorni === 30 && d30.visite?.ora === 12, '30 giorni: 12 visite', JSON.stringify(d30.visite))
    const strano = await (await chiama(tit, '?giorni=36500')).json()
    esito(strano.giorni === 7, 'un periodo inventato torna a 7 giorni')
  }

  console.log('\nDA FUORI')
  esito((await chiama(null)).status === 401, 'senza accesso → 401')
  const staff = await utente('staff', az.id)
  esito((await chiama(staff)).status === 403, 'staff → 403')
  const sup = await utente('super_admin', null)
  esito((await chiama(sup)).status === 400, 'super_admin senza azienda → 400')
  esito((await chiama(sup, '?azienda_id=1%27%20or%201%3D1')).status === 400, 'super_admin con azienda inventata → 400')
  esito((await (await chiama(sup, `?azienda_id=${az.id}`)).json()).visite?.ora === 5, 'super_admin con l’azienda → i suoi numeri')

  console.log('\nI CONSIGLI')
  const consigli = (s, q = '') => fetch(`${BASE}/api/consigli${q}`, { headers: s ? { Authorization: `Bearer ${s.access_token}` } : {} })
  esito((await consigli(null)).status === 401, 'senza accesso → 401')
  esito((await consigli(staff)).status === 403, 'staff → 403')
  esito((await consigli(sup)).status === 400, 'super_admin senza azienda → 400')
  const diSup = (await (await consigli(sup, `?azienda_id=${az.id}`)).json()).consigli || []
  const spingere = diSup.find(c => c.chiave === 'evento-da-spingere')
  esito(!!spingere && spingere.titolo.includes('52 posti liberi') && spingere.azione?.link === '/admin/newsletter',
    'all’evento fra 5 giorni con 8 posti su 60 scatta «evento da spingere»', JSON.stringify(diSup.map(c => c.chiave)))
  const diTit = (await (await consigli(tit, `?azienda_id=${vuota.id}`)).json()).consigli || []
  esito(diTit.every(c => !c.bozza) && JSON.stringify(diTit.map(c => c.chiave)) === JSON.stringify(diSup.filter(c => !c.bozza).map(c => c.chiave)),
    'il titolare riceve solo i consigli approvati, e della sua azienda', JSON.stringify(diTit.map(c => c.chiave)))
  // Sui clienti veri, in sola lettura: quali bozze scatterebbero oggi.
  const { data: vere } = await a.from('aziende').select('id, ragione_sociale').not('ragione_sociale', 'ilike', 'ZZ%').order('ragione_sociale')
  for (const v of vere || []) {
    const c = (await (await consigli(sup, `?azienda_id=${v.id}`)).json()).consigli || []
    console.log(`     · ${v.ragione_sociale}: ${c.length ? c.map(x => `${x.bozza ? '[bozza] ' : ''}${x.titolo}`).join(' | ') : 'nessun consiglio'}`)
  }

  // Nel browser, da super_admin che guarda l'azienda di prova: la bozza si vede
  // con la sua etichetta, «Non ora» la toglie, il pulsante porta dove dice.
  {
    browser = await chromium.launch()
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sup) }] }] } })
    await ctx.addInitScript(id => { try { sessionStorage.setItem('sa_azienda_id', id) } catch {} }, az.id)
    const p = await ctx.newPage()
    const errori = []; p.on('pageerror', e => errori.push(e.message.slice(0, 200)))
    await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    const scheda = p.locator('[data-consiglio="evento-da-spingere"]')
    await scheda.waitFor({ timeout: 90000 }).catch(() => {})
    esito(await scheda.locator('[data-bozza]').isVisible().catch(() => false), 'la bozza compare con l’etichetta «la vedi solo tu»')
    if (FOTO) await p.locator('[data-consigli]').screenshot({ path: `${FOTO}/consigli-telefono.png` }).catch(() => {})
    await scheda.locator('[data-non-ora]').click().catch(() => {})
    esito(!(await scheda.isVisible()), '«Non ora» lo toglie')
    await p.reload({ waitUntil: 'domcontentloaded' })
    await p.locator('[data-cruscotto] [data-valore]').first().waitFor({ timeout: 90000 }).catch(() => {})
    await p.waitForTimeout(1500)
    esito(!(await scheda.isVisible()), '…e resta tolto ricaricando la pagina')
    await p.evaluate(id => localStorage.removeItem(`consigli_pausa_${id}`), az.id)
    await p.reload({ waitUntil: 'domcontentloaded' })
    await scheda.waitFor({ timeout: 90000 }).catch(() => {})
    await scheda.locator('[data-azione]').click().catch(() => {})
    await p.waitForURL(u => u.pathname === '/admin/newsletter', { timeout: 30000 }).catch(() => {})
    esito(new URL(p.url()).pathname === '/admin/newsletter', 'il pulsante porta alle newsletter')
    esito(!errori.length, 'nessun errore nella pagina', errori.join(' | '))
    await ctx.close()
  }

  // Il super_admin di prova non resta in giro un secondo più del necessario.
  await a.auth.admin.deleteUser(utenti.splice(utenti.indexOf(sup.user.id), 1)[0])
  const titVuota = await utente('admin_azienda', vuota.id)
  const r = await chiama(titVuota, `?azienda_id=${az.id}`)
  const grezzo = await r.text()
  const corpo = JSON.parse(grezzo)
  esito(corpo.visite?.ora === 0 && !corpo.prossimoEvento, 'un titolare che chiede un’altra azienda riceve la sua')
  esito(corpo.prenotazioni === null && corpo.incassi === null, 'senza prenotazioni né incassi quei numeri non ci sono')
  const pieno = await (await chiama(tit)).text()
  esito(!pieno.includes(NOME_SEGRETO) && !pieno.includes(EMAIL_SEGRETA) && !/@/.test(pieno), 'nel corpo grezzo nessun nome né email')

  console.log('\nLA DASHBOARD')
  const sessione = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(tit) }] }] }
  for (const [nome, opz] of [['computer', { viewport: { width: 1366, height: 900 } }], ['telefono', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = await browser.newContext({ locale: 'it-IT', storageState: sessione, ...opz })
    const p = await ctx.newPage()
    const errori = []; p.on('pageerror', e => errori.push(e.message.slice(0, 200)))
    await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await p.locator('[data-riquadro="visite"] [data-valore]').waitFor({ timeout: 90000 })
    const valore = k => p.locator(`[data-riquadro="${k}"] [data-valore]`).innerText()
    esito(await valore('visite') === '5' && await valore('contatti') === '2' && await valore('prenotazioni') === '3', `${nome}: visite 5, contatti 2, prenotazioni 3`)
    esito((await valore('incassi')).replace(/\s/g, ' ').includes('30,00'), `${nome}: incassato 30,00 €`)
    esito(await p.locator('[data-prossimo-evento]').innerText().then(s => s.includes('8 posti prenotati su 60')), `${nome}: prossimo evento con i posti`)
    const largo = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    esito(largo <= 0, `${nome}: niente esce di lato`, `${largo}px`)
    if (FOTO) await p.locator('[data-cruscotto]').screenshot({ path: `${FOTO}/cruscotto-${nome}.png` })
    await p.locator('[data-periodo="30"]').click()
    await p.waitForFunction(() => document.querySelector('[data-riquadro="visite"] [data-valore]')?.textContent === '12', null, { timeout: 30000 }).catch(() => {})
    esito(await valore('visite') === '12', `${nome}: con 30 giorni le visite diventano 12`)
    await p.locator('[data-riquadro="contatti"]').click()
    await p.waitForURL(u => u.pathname === '/admin/contatti', { timeout: 30000 }).catch(() => {})
    esito(new URL(p.url()).pathname === '/admin/contatti', `${nome}: il riquadro dei contatti porta ai contatti`)
    esito(!errori.length, `${nome}: nessun errore nella pagina`, errori.join(' | '))
    await ctx.close()
  }
} catch (e) {
  console.error('ERRORE:', e.message); rossi++
} finally {
  if (browser) await browser.close()
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) {
    const { data: ent } = await a.from('entita').select('id').eq('azienda_id', id)
    if (ent?.length) await a.from('page_views').delete().in('entity_id', ent.map(e => e.id))
    await cancellaAziendaDiProva(id).catch(e => console.error('pulizia:', e.message))
  }
  console.log('\n[probe] aziende e accessi di prova eliminati')
  console.log(rossi ? `\n${rossi} PROBLEMI` : '\nIL CRUSCOTTO DICE I NUMERI GIUSTI, SOLO A CHI SONO')
  process.exit(rossi ? 1 : 0)
}
