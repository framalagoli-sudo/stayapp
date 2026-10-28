// Sonda: una newsletter che ESCLUDE una o più liste (migration 142).
//
// Garage 22, 28/10/2026: una promo a tutti gli iscritti tranne chi ha già
// prenotato la serata. Si prova che:
//   1. il conto (lo stesso dell'invio) toglie chi è nelle liste escluse,
//      anche insieme a una lista scelta, e anche con l'anteprima non salvata;
//   2. quello che arriva dal client viene ripulito (forma, doppioni, tetto 10);
//   3. una lista di un'ALTRA azienda non toglie né aggiunge niente: non esiste;
//   4. se una lista esclusa sparisce, l'invio si FERMA e la newsletter resta bozza;
//   5. nel pannello, come il titolare: si sceglie, si conta, si salva, si ritrova.
//
// ⚠️ Nessuna email parte: l'unico invio provato è quello che deve essere
// rifiutato prima di toccare il fornitore. Le aziende sono «ZZ-…» e si puliscono.
//
//   node probe-newsletter-escludi.mjs [cartella-foto]
//   $env:TEST_URL='http://localhost:3000' per il dev locale

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes, randomUUID } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2] || null
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const aziende = [], utenti = []
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const chiama = (percorso, metodo, corpo, headers = {}) => fetch(BASE + percorso, {
  method: metodo, headers: { 'content-type': 'application/json', ...headers }, body: corpo === undefined ? undefined : JSON.stringify(corpo),
}).then(async r => { const grezzo = await r.text(); let j = {}; try { j = JSON.parse(grezzo) } catch {} return { stato: r.status, grezzo, j } })

async function azienda(nome) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  az.ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Locale ${nome}`, slug: `zz-nle-${nome.toLowerCase()}-${t}`, active: true }).select().single(), 'entità')
  return az
}
async function accesso(aziendaId) {
  const email = `zz-nle-${utenti.length}-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utenti.push(u.user.id)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return s.session
}
// Contatti iscritti con un indirizzo del dominio finto: non riceveranno mai niente.
async function contatti(az, nomi, extra = {}) {
  const righe = nomi.map(n => ({ azienda_id: az.id, nome: `ZZ ${n}`, email: `zz-nle-${n.toLowerCase()}-${t}@playwright.internal`, iscritto_newsletter: true, pipeline_stage: null, fonte: 'manuale', ...extra }))
  return deve(a.from('contatti').insert(righe).select('id, nome'), 'contatti')
}
// «Ha prenotato» nel registro: è da lì che nasce la lista dell'evento.
const prenotato = (az, persone, eventoId, titolo) => deve(a.from('contatti_attivita').insert(persone.map(p => ({
  azienda_id: az.id, contatto_id: p.id, tipo: 'evento', titolo, origine_id: eventoId, riferimento: randomUUID(),
}))), 'registro')

let browser = null
try {
  const mia = await azienda('ESCLUDI'), altra = await azienda('ACCANTO')
  const sMia = await accesso(mia.id), sAltra = await accesso(altra.id)
  const H = { Authorization: `Bearer ${sMia.access_token}` }, HA = { Authorization: `Bearer ${sAltra.access_token}` }

  // MIA: sei iscritti. Anna e Bruno hanno prenotato la serata, Carla ha l'etichetta VIP,
  // Dario ha prenotato ma non è iscritto (non conta mai). ALTRA ha una serata sua.
  const [anna, bruno, carla, ...resto] = await contatti(mia, ['Anna', 'Bruno', 'Carla', 'Elena', 'Fabio', 'Gino'])
  await deve(a.from('contatti').update({ tags: ['VIP'] }).eq('id', carla.id), 'etichetta')
  const [dario] = await contatti(mia, ['Dario'], { iscritto_newsletter: false })
  const serata = randomUUID(), serataAltrui = randomUUID()
  await prenotato(mia, [anna, bruno, dario], serata, 'ZZ Serata di domani')
  const [estraneo] = await contatti(altra, ['Estraneo'])
  await prenotato(altra, [estraneo], serataAltrui, 'ZZ Serata altrui')
  const K_SERATA = `evento|${serata}`, K_VIP = 'etichetta|VIP', K_ALTRUI = `evento|${serataAltrui}`

  const nl = await chiama('/api/newsletter', 'POST', { azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id }, H)
  if (nl.stato >= 300 || !nl.j.id) throw new Error(`newsletter non creata: ${nl.stato} ${nl.grezzo.slice(0, 200)}`)
  const id = nl.j.id
  const conta = (qs = '', h = H) => chiama(`/api/newsletter/${id}/destinatari${qs}`, 'GET', undefined, h)
  const salva = corpo => chiama(`/api/newsletter/${id}`, 'PATCH', { entity_tipo: 'ristorante', entity_id: mia.ent.id, ...corpo }, H)
  const salvato = async () => (await deve(a.from('newsletters').select('escludi, lista, status').eq('id', id).single(), 'lettura'))

  console.log('\n1 · IL CONTO TOGLIE CHI È ESCLUSO\n')
  let c = await conta()
  ok(c.stato === 200 && c.j.quanti === 6 && c.j.esclusi === null, `a tutti gli iscritti: 6 (${c.j.quanti}), nessuna esclusione`)
  ok(!/@/.test(c.grezzo), 'nel corpo grezzo del conto non c’è nessun indirizzo')

  let r = await salva({ escludi: [{ chiave: K_SERATA, titolo: 'ZZ Serata di domani' }] })
  c = await conta()
  ok(r.stato === 200 && c.j.quanti === 4 && c.j.esclusi?.persone === 2 && /ZZ Serata di domani/.test(c.j.esclusi.titoli.join()),
    `escludendo la serata: 4, tolti Anna e Bruno (${c.j.quanti}, tolti ${c.j.esclusi?.persone}) — Dario non conta, non è iscritto`)

  await salva({ escludi: [{ chiave: K_SERATA }, { chiave: K_VIP }] })
  c = await conta()
  ok(c.j.quanti === 3 && c.j.esclusi?.persone === 3, `escludendo serata e VIP: 3 (${c.j.quanti})`)

  await salva({ lista: { chiave: K_VIP, titolo: 'VIP' }, escludi: [{ chiave: K_SERATA }] })
  c = await conta()
  ok(c.j.quanti === 1 && c.j.lista?.titolo && c.j.esclusi?.persone === 0, `lista VIP meno la serata: 1, Carla (${c.j.quanti})`)

  // Chi prenota fra la bozza e l'invio viene escluso lo stesso: la lista si ricalcola.
  await salva({ lista: null, escludi: [{ chiave: K_SERATA }] })
  await prenotato(mia, [resto[0]], serata, 'ZZ Serata di domani')
  c = await conta()
  ok(c.j.quanti === 3 && c.j.esclusi?.persone === 3, `Elena prenota dopo la bozza ed è esclusa anche lei: 3 (${c.j.quanti})`)

  console.log('\n2 · L’ANTEPRIMA DELLA SCELTA NON SALVATA\n')
  c = await conta(`?anteprima=1&escludi=${encodeURIComponent(K_VIP)}`)
  ok(c.j.quanti === 5 && c.j.esclusi?.persone === 1, `anteprima «escludi VIP»: 5 (${c.j.quanti})`)
  c = await conta(`?anteprima=1&lista=${encodeURIComponent(K_VIP)}&escludi=${encodeURIComponent(K_SERATA)}&escludi=${encodeURIComponent(K_VIP)}`)
  ok(c.j.quanti === 0, `anteprima con la stessa lista scelta ed esclusa: nessuno (${c.j.quanti})`)
  ok(JSON.stringify((await salvato()).escludi) === JSON.stringify([{ chiave: K_SERATA, titolo: '' }]), 'e quello salvato non cambia')

  console.log('\n3 · QUELLO CHE ARRIVA DAL CLIENT\n')
  r = await salva({ escludi: { chiave: K_SERATA } })
  ok(r.stato === 200 && (await salvato()).escludi === null, 'un oggetto al posto di un elenco: nessuna esclusione')
  r = await salva({ escludi: Array.from({ length: 50 }, (_, i) => ({ chiave: `etichetta|x${i}`, titolo: 'x', id_altro: 'no', persone: [1, 2] })) })
  let s = await salvato()
  ok(r.stato === 200 && s.escludi.length === 10 && s.escludi.every(e => Object.keys(e).sort().join() === 'chiave,titolo'), `50 liste → 10, e solo chiave e titolo (${s.escludi?.length})`)
  r = await salva({ escludi: [{ chiave: K_SERATA }, { chiave: K_SERATA }, { chiave: 'tutti' }, { chiave: '   ' }, null, 'stringa', { chiave: 'x'.repeat(5000) }] })
  s = await salvato()
  ok(s.escludi.length === 2 && s.escludi[0].chiave === K_SERATA && s.escludi[1].chiave.length === 300, `doppioni, «tutti», vuoti e non-oggetti tolti, chiave lunga tagliata (${s.escludi.map(e => e.chiave.length).join(',')})`)
  c = await conta()
  ok(c.j.quanti === 0 && /non esiste più/.test(c.j.problema || ''), 'una chiave inventata non viene ignorata: il conto dice che la lista non esiste')

  console.log('\n4 · LISTE DI UN’ALTRA AZIENDA\n')
  await salva({ escludi: [{ chiave: K_ALTRUI, titolo: 'ZZ Serata altrui' }] })
  c = await conta()
  ok(c.j.quanti === 0 && /non esiste più/.test(c.j.problema || '') && !/Estraneo/.test(c.grezzo), 'la serata di un’altra azienda qui non esiste, e non esce niente di suo')
  c = await conta(`?anteprima=1&escludi=${encodeURIComponent(K_ALTRUI)}`)
  ok(/non esiste più/.test(c.j.problema || ''), 'nemmeno in anteprima')
  ok((await conta('', HA)).stato === 404 && (await conta('', {})).stato === 401, 'il conto di questa newsletter non lo legge un’altra azienda (404), né chi non ha fatto login (401)')
  r = await chiama(`/api/newsletter/${id}`, 'PATCH', { escludi: [] }, HA)
  ok(r.stato === 404 && JSON.stringify((await salvato()).escludi) === JSON.stringify([{ chiave: K_ALTRUI, titolo: 'ZZ Serata altrui' }]), `un’altra azienda non cambia le esclusioni (${r.stato})`)

  console.log('\n5 · SE LA LISTA ESCLUSA SPARISCE, NON PARTE\n')
  const rifiutata = await chiama('/api/newsletter', 'POST', { azienda_id: mia.id, entity_tipo: 'ristorante', entity_id: mia.ent.id }, H)
  const idR = rifiutata.j.id
  await chiama(`/api/newsletter/${idR}`, 'PATCH', { entity_tipo: 'ristorante', entity_id: mia.ent.id, subject: 'ZZ promo', escludi: [{ chiave: K_SERATA, titolo: 'ZZ Serata di domani' }] }, H)
  // La serata perde tutte le prenotazioni: la lista non c'è più.
  await deve(a.from('contatti_attivita').delete().eq('azienda_id', mia.id).eq('origine_id', serata), 'svuota')
  c = await chiama(`/api/newsletter/${idR}/destinatari`, 'GET', undefined, H)
  ok(c.j.quanti === 0 && /La lista da escludere «ZZ Serata di domani» non esiste più/.test(c.j.problema || ''), `il pannello lo dice: «${c.j.problema}»`)
  const invio = await chiama(`/api/newsletter/${idR}/send`, 'POST', {}, H)
  const dopo = await deve(a.from('newsletters').select('status, sent_at, recipients_count').eq('id', idR).single(), 'lettura')
  ok(invio.stato >= 400 && /non esiste più/.test(invio.j.error || '') && dopo.status === 'draft' && !dopo.sent_at, `l’invio si ferma (${invio.stato}) e resta bozza: non parte «a tutti»`)

  console.log('\n6 · NEL PANNELLO, COME IL TITOLARE\n')
  await prenotato(mia, [anna, bruno], serata, 'ZZ Serata di domani')
  await deve(a.from('newsletters').update({ escludi: null, lista: null }).eq('id', id), 'azzera')
  browser = await chromium.launch()
  for (const [larghezza, altezza] of [[1360, 1000], [390, 844]]) {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: larghezza, height: altezza },
      storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sMia) }] }] } })
    const page = await ctx.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(`${BASE}/admin/newsletter/${id}`, { waitUntil: 'networkidle' })
    const conto = page.locator('[data-conto-destinatari]')
    await page.locator('[data-aggiungi-esclusione]').waitFor({ timeout: 60000 })
    await page.locator('[data-conto-destinatari="6"]').waitFor({ timeout: 20000 }).catch(() => {})
    ok(await conto.getAttribute('data-conto-destinatari') === '6', `[${larghezza}px] all’apertura: a tutti, 6`)
    const opzioni = await page.locator('[data-aggiungi-esclusione] option').allTextContents()
    ok(opzioni.some(o => /ZZ Serata di domani/.test(o)) && !opzioni.some(o => /altrui/i.test(o)), `[${larghezza}px] fra le liste da escludere c’è la serata, e nessuna lista di altri`)
    await page.locator('[data-aggiungi-esclusione]').selectOption({ label: opzioni.find(o => /ZZ Serata di domani/.test(o)) })
    await page.locator('[data-conto-destinatari="4"]').waitFor({ timeout: 20000 }).catch(() => {})
    const frase = (await conto.innerText()).replace(/\s+/g, ' ')
    ok(await conto.getAttribute('data-conto-destinatari') === '4' && /2 escluse perché sono in .*ZZ Serata di domani/.test(frase),
      `[${larghezza}px] scelta la serata il conto scende a 4 e dice perché: «${frase}»`)
    ok(await page.locator(`[data-esclusa="${K_SERATA}"]`).count() === 1, `[${larghezza}px] la serata compare fra le esclusioni`)
    const largo = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(largo <= 1, `[${larghezza}px] la pagina non esce dallo schermo (${largo}px)`)
    if (FOTO) await page.locator('[data-destinatari]').screenshot({ path: `${FOTO}/newsletter-escludi-${larghezza}.png` })
    await page.getByRole('button', { name: /Salva bozza/ }).click()
    await page.getByText('Salvata').first().waitFor({ timeout: 15000 }).catch(() => {})
    const dopoSalva = await salvato()
    ok(dopoSalva.escludi?.length === 1 && dopoSalva.escludi[0].chiave === K_SERATA, `[${larghezza}px] «Salva bozza» la scrive nel database`)
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator(`[data-esclusa="${K_SERATA}"]`).waitFor({ timeout: 30000 }).catch(() => {})
    ok(await page.locator(`[data-esclusa="${K_SERATA}"]`).count() === 1, `[${larghezza}px] riaprendo la pagina la ritrovo`)
    await page.getByRole('button', { name: /Non escludere più/ }).click()
    await page.locator('[data-conto-destinatari="6"]').waitFor({ timeout: 20000 }).catch(() => {})
    ok(await conto.getAttribute('data-conto-destinatari') === '6', `[${larghezza}px] togliendola il conto torna a 6`)
    await page.getByRole('button', { name: /Salva bozza/ }).click()
    await page.waitForTimeout(1500)
    ok((await salvato()).escludi === null, `[${larghezza}px] e salvata senza esclusioni torna com’era`)
    ok(errori.length === 0, `[${larghezza}px] nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
    await ctx.close()
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI È ESCLUSO NON LA RICEVE, E SE LA LISTA SPARISCE NON PARTE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of utenti) { try { await a.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { try { await cancellaAziendaDiProva(id) } catch (e) { console.error('pulizia:', e.message) } }
}
process.exit(problemi ? 1 : 0)
