// I profili di mestiere (fase F2): chi li legge, cosa ci entra, e se l'editor
// salva davvero.
//
//  · 401 senza login, 404 all'admin di un'azienda su ogni metodo;
//  · la tabella, letta direttamente con la sessione di un cliente, è vuota (RLS);
//  · la validazione respinge chiavi di funzione inventate, tipi fuori catalogo,
//    valori non booleani, chiavi di profilo non conformi;
//  · ogni modifica alza la versione;
//  · nel browser: la scheda si apre dal menu, l'anteprima conta le voci,
//    un interruttore acceso e salvato arriva nel database.
// Lavora su un profilo di prova (zz_…), mai sui profili veri, e lo cancella.
//
// Uso: node probe-profili-mestiere.mjs   ($env:TEST_URL per il dev locale)
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marca = Date.now()
const CHIAVE = `zz_${marca}`
let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

let aziendaId = null, browser = null
const utenti = []
async function sessione(ruolo, extra = {}) {
  const email = `zz-prof-${ruolo}-${marca}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(data.user.id)
  await admin.from('profiles').upsert({ id: data.user.id, role: ruolo, full_name: 'Prof', ...extra }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  return s.session
}
const chiama = (percorso, token, metodo = 'GET', corpo) => fetch(`${BASE}${percorso}`, {
  method: metodo,
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
  body: corpo ? JSON.stringify(corpo) : undefined,
})

try {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-PROF-${marca}`, require_2fa: false }).select('id').single()
  aziendaId = az.id
  const cliente = await sessione('admin_azienda', { azienda_id: aziendaId })
  const sup = await sessione('super_admin')
  const { data: unVero } = await admin.from('profili_mestiere').select('id').limit(1).single()

  console.log('\nchi può')
  ok((await chiama('/api/admin/profili')).status === 401, 'senza login → 401')
  for (const [m, p, c] of [['GET', '/api/admin/profili'], ['POST', '/api/admin/profili', { chiave: 'zz_x', nome: 'x', tipo_entita: 'attivita' }],
    ['PATCH', `/api/admin/profili/${unVero.id}`, { nome: 'preso' }], ['DELETE', `/api/admin/profili/${unVero.id}`]]) {
    const r = await chiama(p, cliente.access_token, m, c)
    ok(r.status === 404, `admin di un'azienda, ${m} → ${r.status} (atteso 404)`)
  }
  const { data: ancora } = await admin.from('profili_mestiere').select('nome').eq('id', unVero.id).single()
  ok(ancora && ancora.nome !== 'preso', 'il profilo vero non è stato toccato')
  const diretto = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${cliente.access_token}` } } })
  const { data: letti } = await diretto.from('profili_mestiere').select('id')
  ok(!letti?.length, `letta dal database con la sessione di un cliente: ${letti?.length ?? 0} righe (RLS)`)

  console.log('\ncosa ci entra')
  const T = sup.access_token
  const base = { chiave: CHIAVE, nome: 'ZZ prova', tipo_entita: 'attivita' }
  for (const [descr, corpo] of [
    ['funzione inventata', { ...base, funzioni_azienda: { pannello_segreto: true } }],
    ['valore non booleano', { ...base, funzioni_azienda: { contatti: 'sì' } }],
    ['funzione «sempre» (non si sceglie)', { ...base, funzioni_entita: { sito: true } }],
    ['tipo fuori catalogo', { ...base, tipo_entita: 'hotel' }],
    ['chiave non conforme', { ...base, chiave: 'Zz Prova!' }],
    ['nome troppo lungo', { ...base, nome: 'x'.repeat(61) }],
  ]) {
    const r = await chiama('/api/admin/profili', T, 'POST', corpo)
    ok(r.status === 400, `${descr} → ${r.status} (atteso 400)`)
  }
  const creato = await (await chiama('/api/admin/profili', T, 'POST', { ...base, funzioni_azienda: { contatti: true } })).json()
  ok(creato?.chiave === CHIAVE && creato.versione === 1, `creazione valida → versione ${creato?.versione}`)
  const doppio = await chiama('/api/admin/profili', T, 'POST', base)
  ok(doppio.status === 409, `stessa chiave due volte → ${doppio.status} (atteso 409)`)
  const mod = await (await chiama(`/api/admin/profili/${creato.id}`, T, 'PATCH', { funzioni_azienda: { contatti: true, eventi: false } })).json()
  ok(mod.versione === 2 && mod.funzioni_azienda.contatti && !('eventi' in mod.funzioni_azienda), `modifica → versione ${mod.versione}, «spento» = chiave assente`)

  console.log('\nnel browser')
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(sup) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()) })
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('aside.admin-sidebar nav a', { timeout: 30_000 })
  await page.click('aside.admin-sidebar a[href="/admin/funzioni"]')
  await page.click('button:has-text("Profili di mestiere")', { timeout: 30_000 })
  await page.click(`button:has-text("ZZ prova")`, { timeout: 30_000 })
  const conta = async () => Number((await page.locator('text=/Il menu del titolare: \\d+ voci/').innerText()).match(/(\d+) voci/)[1])
  const prima = await conta()
  // Testo ESATTO: «Eventi» come sottostringa prende «Preventivi» (è successo).
  await page.locator('label').filter({ has: page.getByText('Eventi', { exact: true }) }).locator('input[type=checkbox]').check()
  const dopo = await conta()
  ok(dopo === prima + 1, `accendendo «Eventi» l'anteprima passa da ${prima} a ${dopo} voci`)
  await page.click('button:has-text("Salva il profilo")')
  await page.waitForSelector('text=/Salvato \\(versione/', { timeout: 20_000 })
  const { data: salvato } = await admin.from('profili_mestiere').select('funzioni_azienda, versione').eq('id', creato.id).single()
  ok(salvato.funzioni_azienda.eventi === true && salvato.versione === 3, `salvato dal browser: eventi acceso, versione ${salvato.versione} — nel DB: ${JSON.stringify(salvato.funzioni_azienda)}`)
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ': ' + errori.slice(0, 3).join(' | ') : ''}`)
  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true })

  const via = await chiama(`/api/admin/profili/${creato.id}`, T, 'DELETE')
  const { data: sparito } = await admin.from('profili_mestiere').select('id').eq('id', creato.id).maybeSingle()
  ok(via.status === 200 && !sparito, 'cancellazione del profilo di prova')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  await admin.from('profili_mestiere').delete().like('chiave', 'zz\\_%')
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  if (aziendaId) await admin.from('aziende').delete().eq('id', aziendaId)
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nPROFILI A POSTO')
  process.exit(problemi ? 1 : 0)
}
