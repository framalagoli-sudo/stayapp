// Il primo accesso di chi si registra da solo: «Che attività hai?»
// (components/admin/PrimaAttivita.jsx, /api/onboarding/prima-attivita).
//
// 1. Le categorie proposte sono le nostre, senza quelle delle sonde, e senza
//    funzioni nel corpo.
// 2. Permessi: senza accesso 401, staff e super_admin 403; una categoria
//    inventata, un nome vuoto o lunghissimo → 400; la prima attività nasce
//    col tipo e la categoria scelti, la seconda → 409.
// 3. Nel browser, come il titolare appena registrato: la Dashboard mostra
//    «Che attività hai?», si sceglie, si scrive il nome, e compaiono i passi di
//    «Inizia qui». Computer e telefono.
//
// Uso (a mano):  node probe-prima-attivita.mjs [cartella-foto]   ·  $env:TEST_URL per il locale
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

async function utente(role, aziendaId) {
  const email = `zz-prima-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  utenti.push(u.user.id)
  await deve(a.from('profiles').upsert({ id: u.user.id, role, full_name: 'ZZ', azienda_id: aziendaId }, { onConflict: 'id' }), 'profilo')
  const { data: s, error: e2 } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  if (e2) throw new Error(`signIn: ${e2.message}`)
  return s.session
}
const chiama = (s, opz = {}) => fetch(`${BASE}/api/onboarding/prima-attivita`, {
  ...opz, headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.access_token}` } : {}) },
})
const crea = (s, corpo) => chiama(s, { method: 'POST', body: JSON.stringify(corpo) })
// Come nasce un'azienda dalla registrazione (/api/auth/signup): nessuna attività, moduli spenti.
const aziendaVuota = async t => {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-PRIMA-${t}`, require_2fa: false, moduli: { struttura: false, ristorante: false, attivita: false } }).select().single(), 'azienda')
  aziende.push(az.id)
  return az
}

try {
  const t = Date.now().toString(36)
  // Un mestiere delle sonde: non deve comparire fra le scelte.
  await deve(a.from('profili_mestiere').upsert({ chiave: 'zz_prima', nome: 'ZZ Prima', tipo_entita: 'attivita', ordine: 999 }, { onConflict: 'chiave' }), 'mestiere di prova')
  const az = await aziendaVuota(t)
  const tit = await utente('admin_azienda', az.id)

  console.log(`\nIL PRIMO ACCESSO — ${BASE}\n`)
  console.log('LE CATEGORIE')
  const { data: vere } = await a.from('profili_mestiere').select('chiave, tipo_entita').not('chiave', 'like', 'zz\\_%')
  const r = await chiama(tit)
  const grezzo = await r.text()
  const d = JSON.parse(grezzo)
  esito(r.status === 200 && d.gia === false && d.categorie?.length === vere.length, `le nostre ${vere.length} categorie`, grezzo.slice(0, 200))
  esito(!grezzo.includes('zz_prima'), 'quelle delle sonde no')
  esito(!/funzioni|tipo_entita/.test(grezzo), 'nel corpo solo nome e descrizione, niente funzioni')

  console.log('\nI PERMESSI E I VALORI')
  esito((await chiama(null)).status === 401, 'senza accesso → 401')
  const staff = await utente('staff', az.id)
  esito((await crea(staff, { nome: 'X', categoria: vere[0].chiave })).status === 403, 'staff → 403')
  const sup = await utente('super_admin', null)
  esito((await crea(sup, { nome: 'X', categoria: vere[0].chiave })).status === 403, 'super_admin → 403 (le sue le crea dall’area Aziende)')
  esito((await crea(tit, { nome: 'X', categoria: 'zz_prima' })).status === 400, 'una categoria delle sonde → 400')
  esito((await crea(tit, { nome: 'X', categoria: "x' or 1=1" })).status === 400, 'una categoria inventata → 400')
  esito((await crea(tit, { nome: '   ', categoria: vere[0].chiave })).status === 400, 'un nome vuoto → 400')
  esito((await crea(tit, { nome: 'x'.repeat(81), categoria: vere[0].chiave })).status === 400, 'un nome di 81 caratteri → 400')
  esito((await a.from('entita').select('id').eq('azienda_id', az.id)).data?.length === 0, 'dopo i rifiuti l’azienda non ha attività')

  console.log('\nLA PRIMA ATTIVITÀ')
  const cat = vere.find(c => c.tipo_entita === 'ristorante') || vere[0]
  const p = await crea(tit, { nome: `ZZ <b>Trattoria</b> ${t}`, categoria: cat.chiave, tipo: 'struttura', azienda_id: '00000000-0000-4000-8000-000000000000' })
  const pj = await p.json()
  const ent = await deve(a.from('entita').select('id, tipo, profilo, name, azienda_id').eq('azienda_id', az.id), 'entità')
  esito(p.status === 201 && ent.length === 1, 'nasce, una sola', JSON.stringify(pj))
  esito(ent[0]?.tipo === cat.tipo_entita && ent[0]?.profilo === cat.chiave, `col tipo della categoria (${cat.tipo_entita}), non quello mandato dal browser`, JSON.stringify(ent[0]))
  esito(ent[0]?.azienda_id === az.id, 'nell’azienda di chi la chiede, non in quella scritta nel corpo')
  esito((await crea(tit, { nome: 'Seconda', categoria: cat.chiave })).status === 409, 'la seconda → 409')
  esito((await (await chiama(tit)).json()).gia === true, 'e le categorie non si propongono più')

  console.log('\nNEL BROWSER, COME UN CLIENTE NUOVO')
  browser = await chromium.launch()
  for (const [larghezza, nome] of [[1280, 'computer'], [390, 'telefono']]) {
    const az2 = await aziendaVuota(`${t}-${nome}`)
    const s2 = await utente('admin_azienda', az2.id)
    const ctx = await browser.newContext({ viewport: { width: larghezza, height: 900 }, locale: 'it-IT' })
    const pagina = await ctx.newPage()
    await pagina.goto(`${BASE}/admin/login`)
    await pagina.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${projectRef}-auth-token`, JSON.stringify(s2)])
    await pagina.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
    const scheda = pagina.locator('[data-prima-attivita]')
    await scheda.waitFor({ timeout: 30000 }).catch(() => {})
    esito(await scheda.isVisible(), `${nome}: la Dashboard chiede «Che attività hai?»`)
    if (await scheda.isVisible()) {
      await pagina.locator('[data-categoria]').first().waitFor({ timeout: 15000 }).catch(() => {})
      esito(await pagina.locator('[data-categoria]').count() === vere.length, `${nome}: ${vere.length} categorie fra cui scegliere`)
      await pagina.locator('#prima-attivita-nome').fill(`ZZ Bottega ${t}`)
      await pagina.getByRole('button', { name: 'Crea la mia attività' }).click()
      await pagina.getByText('Scegli che attività hai.').waitFor({ timeout: 5000 }).catch(() => {})
      esito(await pagina.getByText('Scegli che attività hai.').isVisible(), `${nome}: senza scelta lo dice, non crea`)
      const largo = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      esito(largo <= 1, `${nome}: niente esce di lato`, `${largo}px`)
      if (FOTO) await scheda.screenshot({ path: `${FOTO}/prima-attivita-${nome}.png` })
      await pagina.locator(`[data-categoria="${cat.chiave}"]`).click()
      await pagina.getByRole('button', { name: 'Crea la mia attività' }).click()
      await pagina.getByText('Inizia qui', { exact: true }).waitFor({ timeout: 40000 }).catch(() => {})
      esito(await pagina.getByText('Inizia qui', { exact: true }).isVisible() && await scheda.count() === 0, `${nome}: creata, ora ci sono i passi di «Inizia qui»`)
      const nata = await deve(a.from('entita').select('tipo, profilo').eq('azienda_id', az2.id), 'entità 2')
      esito(nata.length === 1 && nata[0].profilo === cat.chiave, `${nome}: nel database, con la sua categoria`)
      if (FOTO) await pagina.screenshot({ path: `${FOTO}/prima-attivita-dopo-${nome}.png` })
    }
    await ctx.close()
  }
} catch (e) {
  rossi++
  console.log(`\n  ✗ ERRORE: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of aziende) await cancellaAziendaDiProva(id).catch(e => console.log('  pulizia azienda:', e.message))
  for (const id of utenti) await a.auth.admin.deleteUser(id).catch(() => {})
  await a.from('profili_mestiere').delete().eq('chiave', 'zz_prima')
  console.log(`\n${rossi ? `✗ ${rossi} da guardare` : '✓ tutto verde'}`)
  process.exitCode = rossi ? 1 : 0
}
