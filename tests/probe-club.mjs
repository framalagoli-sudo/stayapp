// Il Club, provato da chi scrive (la regia) e da chi legge (il titolare).
//
// ⚠️ I contenuti di prova NON devono comparire ai clienti veri, nemmeno per un
// minuto: valgono solo per due mestieri finti (`zz_club_a`, `zz_club_b`) creati
// qui e tolti alla fine. «Per tutti» si prova sulle regole, senza database.
//
// 1. Le regole senza rete: pulizia di ciò che manda la regia, finestra di
//    vetrina, mestieri, «fra N giorni».
// 2. La regia: solo il super_admin (404 agli altri), crea, modifica, valori
//    ostili, i conteggi.
// 3. Il titolare: vede solo pubblicati, già iniziati e del suo mestiere; i
//    gesti contano solo su ciò che può vedere.
// 4. Nel browser: la carta in Dashboard (computer e telefono), «Leggi tutto»,
//    il testo con un <script> che resta testo, il pulsante; la regia che
//    prepara un'occasione dal calendario.
// 4-bis. I consigli personali: segnali, soglie, segnaposti, chi li vede, anteprima.
// 5. `--vero` (solo in produzione): un contenuto e un consiglio scritti davvero dall'AI.
//
// Uso (a mano):  node probe-club.mjs [cartella-foto] [--vero]   ·  $env:TEST_URL per il locale
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import fs from 'fs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'
import { contenutoPulito, inVetrina, perMestieri, quandoManca, oggiIso, prossimeOccasioni } from '../client-next/lib/club-regole.js'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const args = process.argv.slice(2)
const VERO = args.includes('--vero')
const FOTO = args.find(a => !a.startsWith('--')) || null
if (FOTO) fs.mkdirSync(FOTO, { recursive: true })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const aziende = [], utenti = [], contenuti = [], MESTIERI = ['zz_club_a', 'zz_club_b']
let browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const giorno = n => oggiIso(new Date(Date.now() + n * 864e5))

async function utente(role, aziendaId) {
  const email = `zz-club-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(u.user.id)
  await deve(a.from('profiles').upsert({ id: u.user.id, role, full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' }), 'profilo')
  const { data: s, error: e2 } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  if (e2) throw new Error(`signIn: ${e2.message}`)
  return s.session
}
const api = (s, percorso, opz = {}) => fetch(`${BASE}${percorso}`, { ...opz, headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.access_token}` } : {}) } })
const json = async r => { try { return await r.json() } catch { return {} } }

try {
  console.log(`\nIL CLUB — ${BASE}\n`)

  console.log('LE REGOLE, SENZA RETE')
  esito(contenutoPulito({ tipo: 'boh', titolo: 'x' }).errore, 'un tipo inventato è rifiutato')
  esito(contenutoPulito({ tipo: 'strategia', titolo: '  ' }).errore, 'senza titolo è rifiutato')
  esito(contenutoPulito({ tipo: 'occasione', titolo: 'x' }).errore, 'un’occasione senza giorno è rifiutata')
  {
    const { contenuto } = contenutoPulito({ tipo: 'strategia', titolo: 'x', azione: 'javascript:alert(1)', mestieri: ['ok_1', "x'); drop", 'OK'], stato: 'cancellato', creato_da: 'qualcuno', id: 'altro' })
    esito(contenuto.azione === null && JSON.stringify(contenuto.mestieri) === '["ok_1"]' && contenuto.stato === 'bozza' && !('creato_da' in contenuto) && !('id' in contenuto),
      'pulsante, mestieri, stato e campi estranei ripuliti', JSON.stringify(contenuto))
  }
  esito(inVetrina({ visibile_dal: giorno(-1), visibile_al: null }) && !inVetrina({ visibile_dal: giorno(1) }) && !inVetrina({ visibile_dal: giorno(-5), visibile_al: giorno(-1) }), 'la finestra di vetrina')
  esito(perMestieri({ mestieri: null }, []) && perMestieri({ mestieri: ['a'] }, ['a', 'b']) && !perMestieri({ mestieri: ['a'] }, ['b']), '«per tutti» vale per tutti, un mestiere solo per chi lo fa')
  esito(quandoManca(giorno(10)) === 'fra 10 giorni' && quandoManca(giorno(1)) === 'domani' && quandoManca(giorno(0)) === 'oggi' && quandoManca(giorno(-1)) === null, '«fra 10 giorni», «domani», «oggi»')
  esito(prossimeOccasioni().every(o => o.data >= oggiIso()) && prossimeOccasioni().length === 6, 'le prossime occasioni del calendario')

  // ── Due mestieri finti, due aziende ──
  const t = Date.now().toString(36)
  await deve(a.from('profili_mestiere').upsert(MESTIERI.map((chiave, i) => ({ chiave, nome: `ZZ Club ${i ? 'B' : 'A'}`, tipo_entita: 'ristorante', ordine: 999 })), { onConflict: 'chiave' }), 'mestieri di prova')
  const nuovaAzienda = async (nome, profilo) => {
    const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-CLUB-${nome}-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
    aziende.push(az.id)
    await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ Club ${nome}`, slug: `zz-club-${nome.toLowerCase()}-${t}`, active: true, profilo }), 'entità')
    return az
  }
  const azA = await nuovaAzienda('A', 'zz_club_a')
  const azB = await nuovaAzienda('B', 'zz_club_b')
  const sup = await utente('super_admin', null)
  const titA = await utente('admin_azienda', azA.id)
  const titB = await utente('admin_azienda', azB.id)
  const staff = await utente('staff', azA.id)

  console.log('\nLA REGIA')
  esito((await api(titA, '/api/club/regia')).status === 404, 'un titolare → 404')
  esito((await api(titA, '/api/club/regia', { method: 'POST', body: JSON.stringify({ tipo: 'strategia', titolo: 'ZZ intruso', stato: 'pubblicato' }) })).status === 404, 'un titolare non può scrivere')
  esito((await api(null, '/api/club/regia')).status === 401, 'senza accesso → 401')
  const crea = async c => {
    const r = await api(sup, '/api/club/regia', { method: 'POST', body: JSON.stringify(c) })
    const d = await json(r)
    if (d.id) contenuti.push(d.id)
    return { r, d }
  }
  const SCRIPT = '<script>window.__clubBucato=1</script>'
  const occ = await crea({ tipo: 'occasione', titolo: `ZZ Occasione ${t}`, testo: `Primo paragrafo <b>forte</b>.\n\nSecondo paragrafo ${SCRIPT}.`, mestieri: MESTIERI, data_occasione: giorno(10), visibile_dal: giorno(0), visibile_al: giorno(10), azione: 'newsletter', stato: 'pubblicato' })
  esito(occ.r.status === 200 && !!occ.d.id, 'crea un’occasione pubblicata per i due mestieri')
  const strat = await crea({ tipo: 'strategia', titolo: `ZZ Strategia solo A ${t}`, testo: 'Solo per il mestiere A.', mestieri: ['zz_club_a'], azione: 'eventi', stato: 'pubblicato' })
  const bozza = await crea({ tipo: 'focus', titolo: `ZZ Bozza ${t}`, mestieri: MESTIERI, stato: 'bozza' })
  const futuro = await crea({ tipo: 'focus', titolo: `ZZ Futuro ${t}`, mestieri: MESTIERI, visibile_dal: giorno(3), stato: 'pubblicato' })
  esito([strat, bozza, futuro].every(x => x.d.id), 'crea una strategia, una bozza e un focus che parte fra 3 giorni')
  esito((await crea({ tipo: 'occasione', titolo: 'ZZ senza giorno', mestieri: MESTIERI })).r.status === 400, 'un’occasione senza giorno → 400')
  const ostile = await crea({ tipo: 'strategia', titolo: `ZZ Ostile ${t}`, mestieri: MESTIERI, azione: 'https://phishing.example', stato: 'bozza' })
  const { data: rigaOstile } = await a.from('club_contenuti').select('azione').eq('id', ostile.d.id).single()
  esito(rigaOstile?.azione === null, 'un indirizzo al posto del pulsante non entra')
  const mod = await api(sup, `/api/club/regia/${bozza.d.id}`, { method: 'PATCH', body: JSON.stringify({ tipo: 'focus', titolo: `ZZ Bozza cambiata ${t}`, mestieri: MESTIERI, stato: 'bozza' }) })
  esito(mod.status === 200, 'modifica una bozza')
  esito((await api(sup, `/api/club/regia/${randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')}`, { method: 'PATCH', body: JSON.stringify({ tipo: 'focus', titolo: 'x' }) })).status === 404, 'modificare un id che non esiste → 404')

  console.log('\nIL TITOLARE')
  esito((await api(staff, '/api/club')).status === 403, 'staff → 403')
  const clubA = await json(await api(titA, '/api/club'))
  const titoliA = (clubA.archivio || []).map(c => c.titolo)
  esito(titoliA.includes(`ZZ Occasione ${t}`) && titoliA.includes(`ZZ Strategia solo A ${t}`), 'A vede l’occasione e la strategia del suo mestiere')
  esito(!titoliA.some(x => x.includes('Bozza') || x.includes('Futuro') || x.includes('Ostile')), 'A non vede bozze né ciò che parte domani')
  esito(clubA.oggi?.[0]?.titolo === `ZZ Occasione ${t}` && clubA.oggi[0].quando === 'fra 10 giorni' && clubA.oggi[0].azione?.link === '/admin/newsletter',
    'in «Oggi per te» l’occasione è prima, «fra 10 giorni», col pulsante delle newsletter', JSON.stringify(clubA.oggi?.[0]))
  const grezzoA = JSON.stringify(clubA)
  esito(!/creato_da|stato|visibile_al|mestieri/.test(grezzoA), 'al cliente non arrivano stato, autore né destinatari')
  const clubB = await json(await api(titB, '/api/club'))
  const titoliB = (clubB.archivio || []).map(c => c.titolo)
  esito(titoliB.includes(`ZZ Occasione ${t}`) && !titoliB.includes(`ZZ Strategia solo A ${t}`), 'B vede l’occasione ma non la strategia del mestiere A')
  const gesto = (s, id, g) => api(s, `/api/club/${id}/gesto`, { method: 'POST', body: JSON.stringify({ gesto: g }) })
  esito((await json(await gesto(titA, strat.d.id, 'visto'))).contato === true, 'A che vede la sua strategia conta')
  esito((await json(await gesto(titB, strat.d.id, 'visto'))).contato === false, 'B che finge di aver visto la strategia di A non conta')
  esito((await json(await gesto(titA, bozza.d.id, 'clic'))).contato === false, 'un gesto su una bozza non conta')
  esito((await gesto(titA, strat.d.id, 'boh')).status === 400, 'un gesto inventato → 400')
  await gesto(titA, strat.d.id, 'visto')
  const regia = await json(await api(sup, '/api/club/regia'))
  const conteggio = regia.contenuti?.find(c => c.id === strat.d.id)?.letture
  esito(conteggio?.visto === 1 && conteggio?.clic === 0, 'la regia conta un’azienda una volta sola', JSON.stringify(conteggio))

  console.log('\nI CONSIGLI PERSONALI')
  esito((await api(titA, '/api/club/regia/consigli')).status === 404, 'un titolare → 404')
  const cat = await json(await api(sup, '/api/club/regia/consigli'))
  esito(cat.segnali?.some(s => s.chiave === 'iscritti_senza_newsletter') && !JSON.stringify(cat.segnali).includes('scatta'), 'il catalogo dei segnali arriva senza le funzioni')
  const nuovoConsiglio = c => api(sup, '/api/club/regia/consigli', { method: 'POST', body: JSON.stringify(c) })
  esito((await nuovoConsiglio({ segnale: 'boh', titolo: 'x' })).status === 400, 'un segnale inventato → 400')
  esito((await nuovoConsiglio({ segnale: 'calendario_vuoto', titolo: 'ZZ {persone} persone' })).status === 400, 'un segnaposto che il segnale non conosce → 400')
  // A ha 2 eventi passati e nessuno in programma → «calendario vuoto» scatta.
  const entA = (await a.from('entita').select('id').eq('azienda_id', azA.id).single()).data
  await deve(a.from('eventi').insert([1, 2].map(i => ({ azienda_id: azA.id, entity_tipo: 'ristorante', entity_id: entA.id, title: `ZZ passato ${i}`, slug: `zz-club-passato-${i}-${t}`,
    date_start: new Date(Date.now() - (10 + i) * 864e5).toISOString(), price: 0, published: true, active: true }))), 'eventi passati')
  const cv = await json(await nuovoConsiglio({ segnale: 'calendario_vuoto', parametri: { min_passati: 99999 }, mestieri: ['zz_club_a'],
    titolo: 'ZZ Calendario vuoto dopo {eventi_passati} eventi', perche: 'Prova.', azione: 'eventi', stato: 'attivo' }))
  const { data: rigaCv } = await a.from('club_consigli').select('parametri').eq('id', cv.id).single()
  esito(rigaCv?.parametri?.min_passati === 100, 'una soglia fuori misura torna nei limiti del segnale', JSON.stringify(rigaCv?.parametri))
  await api(sup, `/api/club/regia/consigli/${cv.id}`, { method: 'PATCH', body: JSON.stringify({ segnale: 'calendario_vuoto', parametri: { min_passati: 2 }, mestieri: ['zz_club_a'],
    titolo: 'ZZ Calendario vuoto dopo {eventi_passati} eventi', perche: 'Prova.', azione: 'eventi', stato: 'attivo' }) })
  const consA = (await json(await api(titA, '/api/consigli'))).consigli || []
  const mio = consA.find(c => c.chiave === cv.id)
  esito(mio?.titolo === 'ZZ Calendario vuoto dopo 2 eventi' && mio.azione?.link === '/admin/eventi' && mio.bozza === false, 'il titolare A vede il consiglio attivo, coi suoi numeri', JSON.stringify(consA))
  const consB = (await json(await api(titB, '/api/consigli'))).consigli || []
  esito(!consB.some(c => c.chiave === cv.id), 'il titolare B (altro mestiere) non lo vede')
  const bz = await json(await nuovoConsiglio({ segnale: 'calendario_vuoto', parametri: { min_passati: 2 }, mestieri: ['zz_club_a'], titolo: 'ZZ Bozza consiglio', stato: 'bozza' }))
  esito(!((await json(await api(titA, '/api/consigli'))).consigli || []).some(c => c.chiave === bz.id), 'una bozza il titolare non la vede')
  const ant = await json(await api(sup, '/api/club/regia/consigli/anteprima', { method: 'POST', body: JSON.stringify({ segnale: 'iscritti_senza_newsletter', parametri: { min_persone: 1, giorni: 7 }, titolo: '{persone} persone, {da_quando}' }) }))
  esito(typeof ant.aziende === 'number' && Array.isArray(ant.scatta) && ant.scatta.every(x => x.azienda && !/ZZ-CLUB/.test(x.azienda)), `l’anteprima guarda i clienti veri (${ant.scatta?.length} su ${ant.aziende}) e non quelli di prova`)
  esito((await api(titA, '/api/club/regia/consigli/anteprima', { method: 'POST', body: '{}' })).status === 404, 'l’anteprima a un titolare → 404')

  console.log('\nNEL BROWSER')
  browser = await chromium.launch()
  const sessione = s => ({ cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s) }] }] })
  for (const [nome, opz] of [['computer', { viewport: { width: 1366, height: 900 } }], ['telefono', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = await browser.newContext({ locale: 'it-IT', storageState: sessione(titA), ...opz })
    const p = await ctx.newPage()
    const errori = []; p.on('pageerror', e => errori.push(e.message.slice(0, 200)))
    await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    const carta = p.locator(`[data-club-contenuto="${occ.d.id}"]`)
    await carta.waitFor({ timeout: 90000 }).catch(() => {})
    esito(await carta.isVisible().catch(() => false) && (await carta.innerText()).toLowerCase().includes('fra 10 giorni'), `${nome}: la carta «Oggi per te» c’è, con «fra 10 giorni»`)
    const largo = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    esito(largo <= 0, `${nome}: niente esce di lato`, `${largo}px`)
    if (FOTO) await p.locator('[data-club-oggi]').screenshot({ path: `${FOTO}/club-oggi-${nome}.png` }).catch(() => {})
    await carta.locator('[data-leggi]').click()
    await p.waitForURL(u => u.pathname === '/admin/club', { timeout: 30000 }).catch(() => {})
    const testo = p.locator(`[data-club-voce="${occ.d.id}"] [data-club-testo]`)
    await testo.waitFor({ timeout: 60000 }).catch(() => {})
    const scritto = await testo.innerText().catch(() => '')
    esito(scritto.includes('Secondo paragrafo') && scritto.includes('<script>') && await testo.locator('b').count() === 1, `${nome}: «Leggi tutto» apre il testo, il grassetto c’è e lo <script> resta testo`)
    esito(!(await p.evaluate(() => window.__clubBucato)), `${nome}: lo script non è stato eseguito`)
    if (FOTO) await p.screenshot({ path: `${FOTO}/club-pagina-${nome}.png`, fullPage: true }).catch(() => {})
    await p.locator(`[data-club-voce="${occ.d.id}"] [data-azione]`).click()
    await p.waitForURL(u => u.pathname === '/admin/newsletter', { timeout: 30000 }).catch(() => {})
    esito(new URL(p.url()).pathname === '/admin/newsletter', `${nome}: il pulsante porta alle newsletter`)
    esito(!errori.length, `${nome}: nessun errore nella pagina`, errori.join(' | '))
    await ctx.close()
  }
  {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1366, height: 900 }, storageState: sessione(sup) })
    const p = await ctx.newPage()
    const errori = []; p.on('pageerror', e => errori.push(e.message.slice(0, 200)))
    await p.goto(`${BASE}/admin/club`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await p.locator('[data-scheda="regia"]').click({ timeout: 90000 })
    const primaOcc = p.locator('[data-occasione]').first()
    await primaOcc.waitFor({ timeout: 60000 })
    await primaOcc.click()
    const giornoOcc = await p.locator('[data-campo="data_occasione"]').inputValue()
    esito(/^\d{4}-\d{2}-\d{2}$/.test(giornoOcc) && (await p.locator('[data-idea]').inputValue()).length > 5, 'la regia prepara un’occasione dal calendario: giorno e idea già scritti')
    await p.locator('[data-campo="titolo"]').fill(`ZZ Dal calendario ${t}`)
    // Resta una bozza dei soli mestieri finti: nessun cliente vero la vede.
    for (const m of ['ZZ Club A']) await p.getByRole('button', { name: m, exact: true }).click()
    await p.locator('[data-salva-bozza]').click()
    const voce = p.locator('[data-regia-voce]', { hasText: `ZZ Dal calendario ${t}` })
    await voce.waitFor({ timeout: 30000 }).catch(() => {})
    esito(await voce.isVisible().catch(() => false) && (await voce.innerText()).toLowerCase().includes('bozza'), 'salvata come bozza, compare nell’elenco')
    const { data: nuova } = await a.from('club_contenuti').select('id, mestieri, stato').eq('titolo', `ZZ Dal calendario ${t}`).maybeSingle()
    if (nuova) contenuti.push(nuova.id)
    esito(nuova?.stato === 'bozza' && JSON.stringify(nuova?.mestieri) === '["zz_club_a"]', 'nel database: bozza, solo per il mestiere scelto')
    if (FOTO) await p.screenshot({ path: `${FOTO}/club-regia.png`, fullPage: true }).catch(() => {})
    // I consigli personali: un consiglio nuovo, le soglie del segnale, l'anteprima.
    await p.locator('[data-scheda="consigli"]').click()
    await p.locator('[data-nuovo-consiglio]').click({ timeout: 60000 })
    await p.locator('[data-campo="segnale"]').selectOption('iscritti_senza_newsletter')
    esito(await p.locator('[data-parametro="min_persone"]').inputValue() === '10', 'scelto il segnale, le soglie arrivano coi valori predefiniti')
    await p.locator('[data-campo="titolo"]').fill('ZZ {persone} persone aspettano, {da_quando}')
    await p.locator('[data-anteprima]').click()
    await p.locator('[data-esito-anteprima]').waitFor({ timeout: 90000 }).catch(() => {})
    esito(/scatterebbe/.test(await p.locator('[data-esito-anteprima]').innerText().catch(() => '')), '«Su chi scatterebbe oggi?» risponde')
    if (FOTO) await p.screenshot({ path: `${FOTO}/club-consigli.png`, fullPage: true }).catch(() => {})
    esito(!errori.length, 'regia: nessun errore nella pagina', errori.join(' | '))
    await ctx.close()
  }

  if (VERO) {
    console.log('\nL’AI VERA')
    const r = await api(sup, '/api/club/regia/bozza', { method: 'POST', body: JSON.stringify({ tipo: 'occasione', idea: 'Halloween per un locale: una serata a tema, come annunciarla e a chi scrivere', mestieri: ['Locale con eventi'], data_occasione: giorno(17) }) })
    const d = await json(r)
    console.log(`     titolo: ${d.titolo}\n     testo: ${String(d.testo || '').slice(0, 300)}…\n     pulsante: ${d.azione}`)
    esito(r.status === 200 && d.titolo && d.testo?.length > 100, 'la bozza arriva con titolo e testo')
    esito(!/\d+\s?%/.test(d.testo || ''), 'nessuna percentuale inventata')
    const rc = await api(sup, '/api/club/regia/consigli/bozza', { method: 'POST', body: JSON.stringify({ segnale: 'iscritti_senza_newsletter' }) })
    const dc = await json(rc)
    console.log(`     consiglio: ${dc.titolo}\n     perché: ${dc.perche}\n     pulsante: ${dc.azione}${dc.avviso ? `\n     avviso: ${dc.avviso}` : ''}`)
    esito(rc.status === 200 && dc.titolo && dc.perche && !dc.avviso, 'il consiglio arriva con titolo e perché, e segnaposti che il segnale conosce')
  }
} catch (e) {
  console.error('ERRORE:', e.message); rossi++
} finally {
  if (browser) await browser.close()
  if (contenuti.length) await a.from('club_contenuti').delete().in('id', contenuti)
  await a.from('club_contenuti').delete().like('titolo', 'ZZ %')
  await a.from('club_consigli').delete().like('titolo', 'ZZ %')
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id).catch(e => console.error('pulizia:', e.message))
  await a.from('profili_mestiere').delete().in('chiave', MESTIERI)
  console.log('\n[probe] contenuti, aziende, mestieri e accessi di prova eliminati')
  console.log(rossi ? `\n${rossi} PROBLEMI` : '\nIL CLUB PARLA A CHI DEVE, E SOLO LA REGIA SCRIVE')
  process.exit(rossi ? 1 : 0)
}
