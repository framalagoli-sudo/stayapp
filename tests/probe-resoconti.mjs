// I resoconti per email ai titolari (lib/resoconti.js), provati senza mandare
// niente a nessuno: l'unico invio possibile è «Mandala a me», che qui non si
// preme (il super_admin di prova ha un indirizzo finto, e un rimbalzo pesa
// sulla reputazione del dominio).
//
// 1. Un'azienda di prova con numeri noti, la settimana scorsa e quella prima:
//    l'anteprima deve dire quei numeri, nell'oggetto e nel corpo, e il corpo
//    grezzo non deve contenere nomi né email dei contatti. Un nome con dentro
//    del codice esce come testo.
// 2. Permessi: anteprima, prova e simulazione solo al super_admin (404 agli
//    altri, anche al titolare); valori inventati → 400; l'interruttore accetta
//    solo un vero sì o no.
// 3. Ogni quanto: lo sceglie il super_admin per azienda (predefinito «ogni
//    mese»), solo dal catalogo; titolare e staff 404, e il titolare non la
//    cambia nemmeno dalla scheda dell'azienda.
// 4. La simulazione «chi lo riceverebbe»: tutti i titolari dell'azienda, non lo
//    staff, non un account bloccato; «ogni mese» non c'è nella settimana e
//    viceversa, «mai» non c'è da nessuna parte.
// 5. L'interruttore e il cron: spento, il cron non manda niente.
// 6. Il pannello: la scheda in Impostazioni (anteprima, «chi lo riceverebbe»)
//    e la scelta sotto «Cosa succede» per il super_admin che guarda l'azienda,
//    computer e telefono; il titolare non la vede.
//    ⛔ La sonda non accende mai l'interruttore: anche in locale il database è
//    quello di produzione, e acceso partirebbero email vere ai clienti.
//
// Uso (a mano):  node probe-resoconti.mjs [cartella-foto]   ·  $env:TEST_URL per il locale
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

// Il lunedì di questa settimana a Roma: i periodi del resoconto settimanale si
// contano da lì.
function lunediRoma() {
  const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
  const d = new Date(`${oggi}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
// Un istante dentro la settimana scorsa (1) o quella prima (2), al giorno 1..6 dopo il suo lunedì.
const nella = (settimaneFa, giorno) => {
  const d = new Date(`${lunediRoma()}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7 * settimaneFa + giorno)
  return d.toISOString()
}

async function utente(role, aziendaId) {
  const email = `zz-resoconti-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(u.user.id)
  await deve(a.from('profiles').upsert({ id: u.user.id, role, full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' }), 'profilo')
  const { data: s, error: e2 } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  if (e2) throw new Error(`signIn: ${e2.message}`)
  return { ...s.session, id: u.user.id }
}
const chiama = (s, percorso, opz = {}) => fetch(`${BASE}${percorso}`, {
  ...opz, headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.access_token}` } : {}) },
})
const scegli = (s, aziendaId, scelta) => chiama(s, '/api/resoconti', { method: 'PATCH', body: JSON.stringify({ azienda_id: aziendaId, scelta }) })

try {
  const t = Date.now().toString(36)
  const NOME_SEGRETO = `Zz Segreto ${t}`, EMAIL_SEGRETA = `zz-segreto-${t}@playwright.internal`
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-RESOCONTI-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  aziende.push(az.id)
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: `ZZ <b>Osteria</b> ${t}`, slug: `zz-resoconti-${t}`, active: false }).select().single(), 'entità')
  // Settimana scorsa: 4 visite, 2 contatti. Quella prima: 2 visite, 1 contatto.
  await deve(a.from('page_views').insert([1, 2, 3, 4].map(g => nella(1, g)).concat([2, 5].map(g => nella(2, g)))
    .map(v => ({ entity_tipo: 'ristorante', entity_id: ent.id, viewed_at: v }))), 'visite')
  await deve(a.from('contatti').insert([
    { azienda_id: az.id, nome: NOME_SEGRETO, email: EMAIL_SEGRETA, created_at: nella(1, 2), pipeline_stage: null, iscritto_newsletter: true },
    { azienda_id: az.id, nome: 'Zz Due', email: `zz-due-${t}@playwright.internal`, created_at: nella(1, 3), pipeline_stage: null },
    { azienda_id: az.id, nome: 'Zz Tre', email: `zz-tre-${t}@playwright.internal`, created_at: nella(2, 3), pipeline_stage: null },
  ]), 'contatti')

  console.log(`\nI RESOCONTI PER EMAIL — ${BASE}\n`)
  const sup = await utente('super_admin', null)
  const tit = await utente('admin_azienda', az.id)
  const staff = await utente('staff', az.id)

  console.log("L'ANTEPRIMA")
  {
    const r = await chiama(sup, `/api/resoconti/anteprima?azienda_id=${az.id}&tipo=settimanale`)
    const grezzo = await r.text()
    esito(r.status === 200, 'super_admin → 200', grezzo.slice(0, 200))
    const d = JSON.parse(grezzo)
    esito(/: 4 visite, 2 contatti nuovi$/.test(d.oggetto || ''), `oggetto coi numeri della settimana scorsa: «${d.oggetto}»`)
    esito(/>4<\/div>/.test(d.html) && /la settimana prima: 2/.test(d.html), 'nel corpo: 4 visite, «la settimana prima: 2»')
    esito(!grezzo.includes(NOME_SEGRETO) && !grezzo.includes(EMAIL_SEGRETA) && !grezzo.includes('Zz Due'), 'il corpo grezzo non contiene nomi né email dei contatti')
    esito(d.html.includes('ZZ &lt;b&gt;Osteria&lt;/b&gt;') && !d.html.includes('<b>Osteria</b>'), 'il nome con dentro del codice esce come testo')
    esito(d.saltato === false, 'una settimana con novità partirebbe')
    esito(/ogni settimana perché amministri/.test(d.html) && /info@oltrenova\.com/.test(d.html), 'il piede dice la cadenza e a chi scrivere per cambiarla')
    const m = await (await chiama(sup, `/api/resoconti/anteprima?azienda_id=${az.id}&tipo=mensile`)).json()
    esito(/com'è andata$/.test(m.oggetto || '') && /Il tuo mese:/.test(m.html), `il mese: «${m.oggetto}»`)
  }

  console.log('\nI PERMESSI')
  for (const [chi, s, atteso] of [['senza accesso', null, 401], ['titolare', tit, 404], ['staff', staff, 404]]) {
    esito((await chiama(s, `/api/resoconti/anteprima?azienda_id=${az.id}&tipo=settimanale`)).status === atteso, `anteprima, ${chi} → ${atteso}`)
    esito((await chiama(s, '/api/resoconti/anteprima', { method: 'POST', body: JSON.stringify({ azienda_id: az.id, tipo: 'settimanale' }) })).status === atteso, `«Mandala a me», ${chi} → ${atteso}`)
    esito((await chiama(s, '/api/resoconti/destinatari')).status === atteso, `simulazione, ${chi} → ${atteso}`)
    esito((await chiama(s, `/api/resoconti?azienda_id=${az.id}`)).status === atteso, `leggere ogni quanto, ${chi} → ${atteso}`)
    esito((await scegli(s, az.id, 'nessuno')).status === atteso, `cambiare ogni quanto, ${chi} → ${atteso}`)
  }
  esito((await chiama(sup, `/api/resoconti/anteprima?azienda_id=1%27or%201=1&tipo=settimanale`)).status === 400, 'azienda inventata → 400')
  esito((await chiama(sup, `/api/resoconti/anteprima?azienda_id=${az.id}&tipo=annuale`)).status === 400, 'tipo inventato → 400')
  esito((await chiama(sup, '/api/resoconti/anteprima', { method: 'POST', body: JSON.stringify({ azienda_id: az.id, tipo: '<x>' }) })).status === 400, 'prova con tipo inventato → 400 (nessun invio)')
  esito((await chiama(sup, '/api/resoconti/destinatari?azienda_id=zz')).status === 400, 'simulazione con azienda inventata → 400')
  {
    const r = await chiama(sup, '/api/auth/platform-config', { method: 'PATCH', body: JSON.stringify({ resoconti_attivi: 'si' }) })
    const cfg = await deve(a.from('platform_config').select('resoconti_attivi').eq('id', 1).single(), 'config')
    esito(r.status === 400 && cfg.resoconti_attivi === false, 'interruttore: una stringa al posto di sì/no → 400, resta spento')
    esito((await chiama(tit, '/api/auth/platform-config', { method: 'PATCH', body: JSON.stringify({ resoconti_attivi: true }) })).status === 403, 'interruttore: il titolare non lo tocca → 403')
  }

  console.log('\nOGNI QUANTO (LO SCEGLIE OLTRENOVA)')
  {
    const g = await (await chiama(sup, `/api/resoconti?azienda_id=${az.id}`)).json()
    esito(g.scelta === 'mensile' && g.attivi === false, 'predefinito «ogni mese», interruttore spento', JSON.stringify(g))
    esito((await scegli(sup, az.id, 'entrambi')).status === 400, 'scelta fuori catalogo → 400')
    esito((await scegli(sup, 'x', 'mensile')).status === 400, 'azienda inventata → 400')
    esito((await scegli(sup, '00000000-0000-4000-8000-000000000000', 'mensile')).status === 404, 'azienda che non esiste → 404')
    await chiama(tit, `/api/aziende/${az.id}`, { method: 'PATCH', body: JSON.stringify({ resoconti: 'nessuno' }) })
    const dopo = await deve(a.from('aziende').select('resoconti').eq('id', az.id).single(), 'azienda')
    esito(dopo.resoconti === 'mensile', 'il titolare non la cambia nemmeno dalla scheda dell’azienda')
  }

  console.log('\nCHI LO RICEVEREBBE')
  {
    await utente('admin_azienda', az.id)                    // secondo titolare
    const bloccato = await utente('admin_azienda', az.id)
    await a.auth.admin.updateUserById(bloccato.id, { ban_duration: '24h' })
    const simula = async () => (await chiama(sup, `/api/resoconti/destinatari?azienda_id=${az.id}`)).json()
    let d = await simula()
    esito(!d.settimanale?.elenco?.length && d.mensile?.elenco?.[0]?.persone === 2, 'ogni mese: 2 titolari nel mese (non lo staff, non il bloccato), niente nella settimana', JSON.stringify(d))
    esito((await scegli(sup, az.id, 'settimanale')).status === 200, 'scelto «ogni settimana»')
    d = await simula()
    esito(d.settimanale?.elenco?.[0]?.persone === 2 && !d.mensile?.elenco?.length, 'ogni settimana: 2 nella settimana, niente nel mese', JSON.stringify(d))
    await scegli(sup, az.id, 'nessuno')
    d = await simula()
    esito(!d.settimanale?.elenco?.length && !d.mensile?.elenco?.length, '«mai»: nessuno', JSON.stringify(d))
    await scegli(sup, az.id, 'mensile')
    const tutte = await (await chiama(sup, '/api/resoconti/destinatari')).json()
    esito(!JSON.stringify(tutte).includes('ZZ-RESOCONTI'), 'la simulazione di tutte le aziende salta quelle di prova')
    esito(!JSON.stringify(tutte).includes('@'), 'la simulazione non contiene indirizzi email')
    console.log('    (aziende vere — settimana:', JSON.stringify(tutte.settimanale?.elenco), '· mese:', JSON.stringify(tutte.mensile?.elenco), ')')
  }

  console.log("\nL'INTERRUTTORE E IL CRON")
  {
    const cfg = await deve(a.from('platform_config').select('resoconti_attivi').eq('id', 1).single(), 'config')
    esito(cfg.resoconti_attivi === false, 'i resoconti sono spenti')
    esito((await fetch(`${BASE}/api/cron/resoconti`)).status === 401, 'il cron senza la parola d’ordine → 401')
    const inviati = await deve(a.from('resoconti_inviati').select('id'), 'registro')
    esito(inviati.length === 0, 'il registro degli invii è vuoto')
  }

  console.log('\nIL PANNELLO')
  browser = await chromium.launch()
  for (const [larghezza, nome] of [[1280, 'computer'], [390, 'telefono']]) {
    const ctx = await browser.newContext({ viewport: { width: larghezza, height: 900 }, locale: 'it-IT' })
    const pagina = await ctx.newPage()
    const sessione = async s => {
      await pagina.goto(`${BASE}/admin/login`)
      await pagina.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${projectRef}-auth-token`, JSON.stringify(s)])
    }
    await sessione(sup)
    await pagina.goto(`${BASE}/admin/impostazioni`, { waitUntil: 'networkidle' })
    const scheda = pagina.getByText('Resoconti per email ai titolari')
    await scheda.waitFor({ timeout: 20000 }).catch(() => {})
    esito(await scheda.isVisible(), `${nome}: la scheda in Impostazioni`)
    await pagina.locator('[data-chi-riceve]').waitFor({ timeout: 30000 }).catch(() => {})
    esito(await pagina.locator('[data-chi-riceve]').isVisible(), `${nome}: «Chi lo riceverebbe»`)
    const frame = pagina.frameLocator('iframe[title="Anteprima del resoconto"]')
    await frame.locator('h2').waitFor({ timeout: 30000 }).catch(() => {})
    esito(/La tua settimana/.test(await frame.locator('h2').textContent({ timeout: 2000 }).catch(() => '')), `${nome}: l'anteprima disegnata`)
    const largo = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    esito(largo <= 1, `${nome}: Impostazioni non esce di lato`, `${largo}px`)
    if (FOTO) await pagina.screenshot({ path: `${FOTO}/resoconti-impostazioni-${nome}.png`, fullPage: true })

    // Il super_admin che guarda l'azienda: la scelta sotto «Cosa succede», e si salva.
    await pagina.evaluate(id => sessionStorage.setItem('sa_azienda_id', id), az.id)
    await pagina.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
    const scelta = pagina.locator('#scelta-resoconti')
    await scelta.waitFor({ timeout: 30000 }).catch(() => {})
    esito(await scelta.isVisible() && await scelta.inputValue() === 'mensile', `${nome}: il super_admin vede «Ogni mese» sotto Cosa succede`)
    if (await scelta.isVisible()) {
      await scelta.selectOption('settimanale')
      await pagina.locator('[data-resoconti]').getByText('Salvato', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {})
      const az2 = await deve(a.from('aziende').select('resoconti').eq('id', az.id).single(), 'azienda')
      esito(az2.resoconti === 'settimanale', `${nome}: scelto dal cruscotto, salvato sull'azienda`)
      await a.from('aziende').update({ resoconti: 'mensile' }).eq('id', az.id)
    }
    const largo2 = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    esito(largo2 <= 1, `${nome}: la Dashboard non esce di lato`, `${largo2}px`)
    if (FOTO) await pagina.locator('[data-cruscotto]').screenshot({ path: `${FOTO}/resoconti-dashboard-${nome}.png` }).catch(() => {})

    await sessione(tit)
    await pagina.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
    await pagina.locator('[data-cruscotto]').waitFor({ timeout: 20000 }).catch(() => {})
    await pagina.waitForTimeout(1500)
    esito(await pagina.locator('[data-resoconti]').count() === 0, `${nome}: il titolare non vede la scelta`)
    await ctx.close()
  }
} catch (e) {
  rossi++
  console.log(`\n  ✗ ERRORE: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id).catch(e => console.log('  pulizia azienda:', e.message))
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  console.log(`\n${rossi ? `✗ ${rossi} da guardare` : '✓ tutto verde'}`)
  process.exitCode = rossi ? 1 : 0
}
