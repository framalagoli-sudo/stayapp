// Sonda: la registrazione aperta, con la conferma dell'email.
//
// Percorre col browser quello che fa chi si registra, a partire dall'account
// come lo lascia `/api/auth/signup` (non confermato, dati in attesa in
// `app_metadata.registrazione`):
//   1. l'accesso prima della conferma è rifiutato, e la pagina lo dice e offre
//      «Rimandami l'email di conferma» (che risponde sempre uguale);
//   2. il link di conferma apre la pagina, il pulsante conferma, e SOLO ADESSO
//      nascono l'azienda e il profilo da titolare;
//   3. lo stesso link una seconda volta non vale;
// e i casi ostili: completare senza una registrazione in attesa, con dati messi
// in `user_metadata` (che l'utente può scrivere da sé), senza login; la route
// di registrazione chiusa risponde 403; lo Studio contenuti senza azienda non
// chiama l'AI.
//
// La route `/api/auth/signup` vera si prova solo con `--signup` e le
// registrazioni APERTE (`platform_config.signup_enabled`): lo decide Francesco.
//
// L'email dell'account di prova è `delivered@resend.dev` + etichetta, il pozzo
// di Resend: nessuna email arriva a una persona. Tutto si cancella alla fine.
//
// Uso: cd tests && node probe-registrazione.mjs [cartella-foto] [--signup]
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv.slice(2).find(x => !x.startsWith('--')) || null
const CON_SIGNUP = process.argv.includes('--signup')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const t = Date.now().toString(36)
const NOME = `ZZ-REG-${t}`

let rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const post = async (path, body, token) => {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}) })
  return { status: r.status, corpo: await r.text().catch(() => '') }
}

// L'account come lo crea la route di registrazione.
async function accountInAttesa(etichetta, metadati = 'app') {
  const email = `delivered+zz-reg-${etichetta}-${t}@resend.dev`
  const password = randomBytes(18).toString('base64url') + 'Aa1!'
  const reg = { nome_azienda: NOME, fuso_orario: 'Europe/Rome', termini_accettati_il: new Date().toISOString(), termini_versione: '2026-08-31' }
  const { data, error } = await a.auth.admin.createUser({
    email, password, email_confirm: false,
    ...(metadati === 'app' ? { app_metadata: { registrazione: reg } } : { user_metadata: { registrazione: reg } }),
  })
  if (error) throw new Error('utente: ' + error.message)
  return { id: data.user.id, email, password }
}
const aziendaDi = async id => (await a.from('profiles').select('role, azienda_id').eq('id', id).maybeSingle()).data

const utenti = [], aziende = []
let browser = null
try {
  // ── 0. La route di registrazione ────────────────────────────────────────────
  const { data: cfg } = await a.from('platform_config').select('signup_enabled').eq('id', 1).single()
  console.log(`\n0. /api/auth/signup (registrazioni ${cfg?.signup_enabled ? 'APERTE' : 'chiuse'})\n`)
  if (!cfg?.signup_enabled) {
    const r = await post('/api/auth/signup', { nome_azienda: NOME, email: `delivered+zz-reg-chiusa-${t}@resend.dev`, password: 'Prova123!Aa', accetta_termini: true })
    esito(r.status === 403, 'registrazioni chiuse → 403, nessun account creato', `${r.status} ${r.corpo.slice(0, 80)}`)
  } else if (CON_SIGNUP) {
    const email = `delivered+zz-reg-route-${t}@resend.dev`
    const r = await post('/api/auth/signup', { nome_azienda: NOME, email, password: 'Prova123!Aa' + t, accetta_termini: true, fuso_orario: 'Europe/Rome' })
    esito(r.status === 201 && /conferma/.test(r.corpo), 'registrazione → 201 «controlla la posta»', `${r.status} ${r.corpo.slice(0, 80)}`)
    const { data: lista } = await a.auth.admin.listUsers({ perPage: 1000 })
    const u = lista.users.find(x => x.email === email)
    if (u) utenti.push(u.id)
    esito(!!u && !u.email_confirmed_at && u.app_metadata?.registrazione?.nome_azienda === NOME, 'account creato NON confermato, dati in attesa in app_metadata')
    esito(u && !(await aziendaDi(u.id))?.azienda_id, 'nessuna azienda prima della conferma')
    const di_nuovo = await post('/api/auth/signup', { nome_azienda: NOME, email, password: 'Altra123!Aa', accetta_termini: true })
    esito(di_nuovo.status === 201 && di_nuovo.corpo === r.corpo, 'stesso indirizzo una seconda volta → stessa risposta (non rivela chi è registrato)', di_nuovo.corpo.slice(0, 80))
    const trappola = await post('/api/auth/signup', { nome_azienda: NOME, email: `delivered+zz-reg-hp-${t}@resend.dev`, password: 'Prova123!Aa', accetta_termini: true, sito_web: 'http://spam' })
    const { data: l2 } = await a.auth.admin.listUsers({ perPage: 1000 })
    esito(trappola.status === 201 && !l2.users.some(x => x.email.includes(`zz-reg-hp-${t}`)), 'campo trappola compilato → risposta normale, nessun account')
    const senzaTermini = await post('/api/auth/signup', { nome_azienda: NOME, email: `delivered+zz-reg-nt-${t}@resend.dev`, password: 'Prova123!Aa' })
    esito(senzaTermini.status === 400, 'senza accettare i Termini → 400')
  } else console.log('  (registrazioni aperte: la route vera si prova con --signup)')

  // ── 1. Accesso prima della conferma ─────────────────────────────────────────
  console.log('\n1. accesso prima della conferma\n')
  const U = await accountInAttesa('flusso'); utenti.push(U.id)
  browser = await chromium.launch()
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  // Gli errori del browser: una pagina bianca non dà errore da nessun'altra parte.
  const erroriBrowser = []
  page.on('pageerror', e => erroriBrowser.push(e.message))
  page.on('console', m => { if (m.type() === 'error') erroriBrowser.push(m.text()); else if (m.type() === 'warning' && process.env.AVVISI) console.log('     [avviso browser]', m.text().slice(0, 300)) })
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', U.email)
  await page.fill('input[type=password]', U.password)
  await page.click('button[type=submit]')
  await page.getByText('Non hai ancora confermato').waitFor({ timeout: 15000 }).catch(() => {})
  esito(await page.getByText('Non hai ancora confermato').isVisible(), 'la pagina dice che l’indirizzo non è confermato')
  const pulsante = page.getByRole('button', { name: /Rimandami/ })
  esito(await pulsante.isVisible(), 'offre «Rimandami l’email di conferma»')
  await pulsante.click()
  await page.getByText('ti abbiamo rimandato').waitFor({ timeout: 15000 }).catch(() => {})
  esito(await page.getByText('ti abbiamo rimandato').isVisible(), 'dopo il clic: «ti abbiamo rimandato l’email»')
  if (FOTO) await page.screenshot({ path: `${FOTO}/registrazione-1-accesso.png`, fullPage: true })

  // Il rinvio risponde sempre allo stesso modo, e non manda niente a chi non ha la password.
  const giusta = await post('/api/auth/conferma-email', { email: U.email, password: U.password })
  const sbagliata = await post('/api/auth/conferma-email', { email: U.email, password: 'Sbagliata123!' })
  const inventata = await post('/api/auth/conferma-email', { email: `nessuno-${t}@playwright.internal`, password: 'x' })
  esito(giusta.corpo === sbagliata.corpo && sbagliata.corpo === inventata.corpo && giusta.status === 200, 'il rinvio risponde uguale a password giusta, sbagliata e indirizzo inventato')
  const { data: lista0 } = await a.auth.admin.listUsers({ perPage: 1000 })
  esito(!lista0.users.some(x => x.email === `nessuno-${t}@playwright.internal`), 'il rinvio per un indirizzo inventato NON crea un account')

  // ── 2. Il link di conferma ──────────────────────────────────────────────────
  console.log('\n2. il link di conferma\n')
  const { data: link } = await a.auth.admin.generateLink({ type: 'magiclink', email: U.email })
  const url = `${BASE}/admin/conferma-email?token_hash=${encodeURIComponent(link.properties.hashed_token)}`
  await page.goto(url, { waitUntil: 'networkidle' })
  esito(!(await aziendaDi(U.id))?.azienda_id, 'aprire la pagina non conferma niente da sola (serve il pulsante)')
  if (FOTO) await page.screenshot({ path: `${FOTO}/registrazione-2-conferma.png`, fullPage: true })
  await page.getByRole('button', { name: /Conferma e entra/ }).click()
  await page.waitForURL(u => !u.pathname.startsWith('/admin/conferma-email'), { timeout: 20000 }).catch(() => {})
  // La guardia del pannello può rimandare ancora (2FA obbligatorio → Sicurezza):
  // si aspetta che la pagina d'arrivo sia DISEGNATA, non solo l'indirizzo.
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForFunction(() => document.body.innerText.trim().length > 40, null, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(8000)
  const dove = new URL(page.url()).pathname
  const testo = (await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')).replace(/\s+/g, ' ')
  esito(['/admin/onboarding', '/admin/security'].includes(dove) && testo.length > 40, `dopo la conferma si entra e la pagina è disegnata (${dove})`, testo.slice(0, 100))
  console.log(`     la persona legge: «${testo.slice(0, 140)}…»`)
  const gravi = erroriBrowser.filter(x => !/favicon|Download the React DevTools|[HMR]|Fast Refresh/i.test(x))
  esito(!gravi.length, 'nessun errore nel browser durante il percorso', gravi.slice(0, 3).join(' | ').slice(0, 400))
  if (FOTO) await page.screenshot({ path: `${FOTO}/registrazione-3-dentro.png`, fullPage: true })
  const p = await aziendaDi(U.id)
  if (p?.azienda_id) aziende.push(p.azienda_id)
  const { data: az } = p?.azienda_id ? await a.from('aziende').select('ragione_sociale, email, termini_versione, subscription_status').eq('id', p.azienda_id).single() : { data: null }
  esito(p?.role === 'admin_azienda' && az?.ragione_sociale === NOME && az?.email === U.email && az?.termini_versione === '2026-08-31',
    'nata l’azienda col nome, l’email e la prova dei Termini; profilo da titolare', JSON.stringify({ p, az }))
  const { data: dopo } = await a.auth.admin.getUserById(U.id)
  esito(!!dopo.user.email_confirmed_at && !dopo.user.app_metadata?.registrazione, 'indirizzo confermato, registrazione in attesa tolta')

  // ── 3. Lo stesso link due volte, completare due volte ───────────────────────
  console.log('\n3. ripetere\n')
  const v2 = await anon().auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  esito(!!v2.error, 'lo stesso link una seconda volta non vale')
  const s = await anon().auth.signInWithPassword({ email: U.email, password: U.password })
  const ancora = await post('/api/auth/completa-registrazione', {}, s.data.session?.access_token)
  const { count } = await a.from('aziende').select('id', { count: 'exact', head: true }).eq('ragione_sociale', NOME)
  esito(ancora.status === 200 && /niente|gia_fatta/.test(ancora.corpo) && count === 1, 'completare di nuovo non crea una seconda azienda', `${ancora.corpo} · aziende ${count}`)

  // ── 4. Casi ostili ──────────────────────────────────────────────────────────
  console.log('\n4. casi ostili\n')
  esito((await post('/api/auth/completa-registrazione', {})).status === 401, 'completare senza login → 401')
  // I dati in user_metadata li può scrivere l'utente stesso: non devono valere.
  const H = await accountInAttesa('ostile', 'user'); utenti.push(H.id)
  await a.auth.admin.updateUserById(H.id, { email_confirm: true })
  const sh = await anon().auth.signInWithPassword({ email: H.email, password: H.password })
  const finto = await post('/api/auth/completa-registrazione', {}, sh.data.session?.access_token)
  esito(/niente/.test(finto.corpo) && !(await aziendaDi(H.id))?.azienda_id, 'registrazione messa in user_metadata (scrivibile dall’utente) → nessuna azienda', finto.corpo)
  // Un account senza azienda non usa l'AI «della piattaforma».
  const ai = await post('/api/content-studio/caption', { topic: 'prova' }, sh.data.session?.access_token)
  esito(ai.status === 400 || ai.status === 403, `Studio contenuti senza azienda → ${ai.status}, nessuna chiamata all’AI`, ai.corpo.slice(0, 80))
} catch (e) {
  rossi++; console.error('ERRORE:', e.message)
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id).catch(e => console.error('pulizia azienda:', e.message))
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exitCode = rossi ? 1 : 0
}
