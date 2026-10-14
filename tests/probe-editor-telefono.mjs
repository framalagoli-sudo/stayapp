// Sonda: «Modifica sulla pagina», l'editor visuale da telefono.
//
// Crea un sito di prova e lo usa come il titolare da un telefono simulato
// (390×844, tocchi veri):
//  - sul telefono c'è «Modifica sulla pagina» e non «Editor visuale»; sul
//    computer il contrario;
//  - la pagina si vede intera, nessun testo è scrivibile sul posto e il
//    pannello non esce dallo schermo;
//  - un tocco su una sezione apre la sua scheda dal basso; scrivere nella
//    scheda cambia la pagina;
//  - scorrere col dito NON sceglie niente;
//  - sposta su, annulla, «+» sotto la sezione scelta, un blocco dal catalogo
//    che cade proprio lì e si vede, elimina con «Annulla»;
//  - una sezione pronta dalla galleria, «Stile»;
//  - un link del sito toccato dentro l'editor non porta via;
//  - «Salva» scrive nel database quello che si vede.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-editor-telefono.mjs [cartella-foto]
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2] || null
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let az = null, utente = null, browser = null, rossi = 0
const errori = []
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const foto = async (page, nome) => { if (FOTO) await page.screenshot({ path: `${FOTO}/telefono-${nome}.png` }) }

try {
  const t = Date.now().toString(36)
  const slug = `zz-telefono-${t}`
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-TELEFONO-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale', slug, active: true, minisito: { active: true } }).select().single(), 'entità')
  const blocchi = [
    { id: 'b-hero', type: 'hero', data: { title: 'ZZ Copertina', tagline: 'Sotto', cta1_text: 'ZZ Vai via', cta1_url: 'https://esempio.example/via', height: 'compatta' } },
    { id: 'b-chi', type: 'about', data: { title: 'ZZ Chi siamo', text: 'Un testo di prova abbastanza lungo da occupare un po\' di pagina.' } },
    { id: 'b-faq', type: 'faq', data: { titolo: 'ZZ Domande', items: [{ id: 'f1', question: 'ZZ Prima domanda?', answer: 'Sì.' }, { id: 'f2', question: 'ZZ Seconda domanda?', answer: 'No.' }] } },
  ]
  const home = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: blocchi }).select('id').single(), 'home')

  const email = `zz-telefono-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const sessione = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] }
  browser = await chromium.launch()

  console.log(`\n«MODIFICA SULLA PAGINA» — ${BASE}\n`)

  // Sul computer resta l'editor visuale, e la versione da telefono non c'è.
  {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 }, storageState: sessione })
    const p = await ctx.newPage()
    await p.goto(`${BASE}/admin/pagine/${home.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await p.getByRole('button', { name: 'Editor visuale' }).waitFor({ timeout: 90000 })
    esito(!(await p.locator('[data-apri-telefono]').isVisible()), 'sul computer c’è «Editor visuale» e non «Modifica sulla pagina»')
    await ctx.close()
  }

  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: sessione })
  const page = await ctx.newPage()
  page.on('pageerror', e => errori.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && !(m.location()?.url || '').startsWith('https://challenges.cloudflare.com/')) errori.push('console: ' + m.text().slice(0, 300)) })
  page.on('dialog', d => d.accept())
  const riq = () => page.frameLocator('[data-editor-telefono] iframe')
  const ordine = () => riq().locator('[data-blocco]').evaluateAll(els => els.map(e => e.getAttribute('data-blocco')))
  const aspetta = async (prova, volte = 60) => { for (let i = 0; i < volte; i++) { if (await prova().catch(() => false)) return true; await page.waitForTimeout(150) } return false }

  await page.goto(`${BASE}/admin/pagine/${home.id}`, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {})
  const apri = page.locator('[data-apri-telefono]')
  await apri.waitFor({ timeout: 90000 })
  esito(await apri.isVisible() && !(await page.getByRole('button', { name: 'Editor visuale' }).isVisible()), 'sul telefono c’è «Modifica sulla pagina» e non «Editor visuale»')
  const largoEditor = await page.evaluate(() => document.documentElement.scrollWidth)
  esito(largoEditor <= 390, 'con il pulsante nuovo, la pagina dell’editor non esce dallo schermo', String(largoEditor))
  await apri.tap()
  await page.locator('[data-editor-telefono]').waitFor({ timeout: 30000 })
  const pronta = await aspetta(async () => (await ordine()).length === 3, 200)
  esito(pronta, 'la pagina compare con le sue tre sezioni', JSON.stringify(await ordine().catch(() => [])))
  await page.waitForTimeout(800)
  esito((await riq().locator('[contenteditable]').count()) === 0, 'sulla pagina nessun testo è scrivibile sul posto (si scrive nella scheda)')
  const largo = await page.evaluate(() => document.documentElement.scrollWidth)
  esito(largo <= 390, 'il pannello non esce dallo schermo', String(largo))
  esito(await page.locator('[data-barra-telefono]').isVisible(), 'in basso: «Tocca una sezione», «Aggiungi una sezione», «Stile»')
  await foto(page, '1-aperta')

  // Scorrere col dito non sceglie niente.
  {
    const box = await page.locator('[data-editor-telefono] iframe').boundingBox()
    const cdp = await ctx.newCDPSession(page)
    const x = box.x + box.width / 2, y0 = box.y + box.height * 0.7
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - k * 30 }] }); await page.waitForTimeout(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)
    const scorsa = await riq().locator('html').evaluate(() => window.scrollY)
    esito(scorsa > 0 && !(await page.locator('[data-foglio]').isVisible()), 'trascinando il dito la pagina scorre e nessuna sezione viene scelta', `scrollY ${scorsa}`)
    await riq().locator('html').evaluate(() => window.scrollTo(0, 0))
  }

  // Un tocco su un link del sito non porta via.
  {
    const prima = await page.locator('[data-editor-telefono] iframe').evaluate(f => f.contentWindow.location.href)
    await riq().getByText('ZZ Vai via').first().tap()
    await page.waitForTimeout(1200)
    const dopo = await page.locator('[data-editor-telefono] iframe').evaluate(f => f.contentWindow.location.href)
    esito(prima === dopo, 'toccare il pulsante del sito dentro l’editor non porta via', dopo)
  }

  // Tocco su una sezione → scheda dal basso → si scrive → la pagina cambia.
  await riq().locator('[data-blocco="b-chi"]').tap({ position: { x: 30, y: 30 } })
  const scheda = page.locator('[data-foglio]')
  esito(await aspetta(() => scheda.isVisible()), 'un tocco su una sezione apre la sua scheda dal basso')
  let titolo = null
  for (const el of await scheda.locator('input').all()) if ((await el.inputValue().catch(() => '')) === 'ZZ Chi siamo') { titolo = el; break }
  esito(!!titolo, 'nella scheda c’è il titolo della sezione toccata')
  if (titolo) {
    await titolo.fill('ZZ Chi siamo dal telefono')
    await titolo.blur()
    esito(await aspetta(async () => (await riq().locator('[data-blocco="b-chi"]').innerText()).includes('ZZ Chi siamo dal telefono')), 'scritto nella scheda, compare sulla pagina')
  }
  await foto(page, '2-scheda')

  // Sposta su, poi annulla.
  await scheda.getByRole('button', { name: 'Sposta su' }).tap()
  esito(await aspetta(async () => JSON.stringify(await ordine()) === JSON.stringify(['b-chi', 'b-hero', 'b-faq'])), '«Sposta su» la porta sopra la copertina')
  await page.getByRole('button', { name: 'Annulla', exact: true }).first().tap()
  esito(await aspetta(async () => JSON.stringify(await ordine()) === JSON.stringify(['b-hero', 'b-chi', 'b-faq'])), '«Annulla» la rimette dov’era')

  // «+» sotto la sezione scelta → catalogo → il blocco cade lì e si vede.
  await riq().locator('[data-blocco="b-chi"]').tap({ position: { x: 30, y: 30 } })
  const piu = riq().locator('[data-blocco="b-chi"] [data-piu-sotto]')
  esito(await aspetta(() => piu.isVisible()), 'sulla sezione scelta compare il «+» per aggiungere sotto')
  await piu.tap()
  esito(await aspetta(() => page.locator('[data-catalogo]').isVisible()), 'il «+» apre l’elenco dei blocchi dal basso')
  esito(await aspetta(async () => (await riq().locator('[data-punto-scelto]').count()) === 1), 'sulla pagina compare il punto segnato, con «Chiedi all’AI»')
  const sottoChi = await riq().locator('[data-blocco], [data-punto-scelto]').evaluateAll(els => els.map(e => e.getAttribute('data-blocco') || 'PUNTO'))
  esito(JSON.stringify(sottoChi) === JSON.stringify(['b-hero', 'b-chi', 'PUNTO', 'b-faq']), 'il punto è proprio sotto la sezione scelta', JSON.stringify(sottoChi))
  await foto(page, '3-catalogo')
  await page.locator('[data-catalogo] [data-tessera="titolo"]').tap()
  let nuovo = null
  esito(await aspetta(async () => { const o = await ordine(); nuovo = o[2]; return o.length === 4 && o[1] === 'b-chi' && o[3] === 'b-faq' }), 'il blocco scelto cade fra le due sezioni')
  if (nuovo) {
    const testo = (await riq().locator(`[data-blocco="${nuovo}"]`).innerText()).trim()
    esito(testo.length > 5 && !(await riq().locator(`[data-blocco="${nuovo}"] .ev-vuoto`).count()), 'e si vede: nasce già scritto', testo.slice(0, 60))
    esito(await aspetta(() => scheda.isVisible()), 'e la sua scheda è già aperta')
  }

  // Elimina, con «Annulla» a portata.
  await scheda.locator('[data-elimina]').tap()
  esito(await aspetta(async () => (await ordine()).length === 3), '«Elimina» toglie la sezione senza chiedere')
  esito(await page.locator('[data-avviso]').getByRole('button', { name: 'Annulla' }).isVisible(), 'e lascia l’avviso con «Annulla»')
  await page.locator('[data-avviso]').getByRole('button', { name: 'Annulla' }).tap()
  esito(await aspetta(async () => (await ordine()).length === 4), '«Annulla» la rimette')

  // Una sezione pronta dalla galleria, in fondo.
  if (await scheda.isVisible()) await scheda.getByRole('button', { name: 'Chiudi' }).first().tap()
  await page.locator('[data-aggiungi-sezione]').tap()
  await page.locator('[data-sezioni-pronte]').tap()
  const galleria = page.locator('[data-galleria-sezioni]')
  esito(await aspetta(() => galleria.isVisible()), '«Scegli una sezione pronta» apre la galleria sopra l’editor')
  await page.waitForTimeout(1500)
  await foto(page, '4-galleria')
  const larghezzaGalleria = await galleria.evaluate(el => el.scrollWidth)
  esito(larghezzaGalleria <= 390, 'la galleria sta nello schermo', String(larghezzaGalleria))
  await galleria.locator('[data-gs-sezione]').first().tap()
  esito(await aspetta(async () => (await ordine()).length > 4 && (await ordine())[3] === 'b-faq'), 'la sezione pronta arriva in fondo alla pagina')

  // Stile.
  await page.locator('[data-apri-stile]').tap()
  esito(await aspetta(() => page.locator('[data-foglio] [data-marchio-stile]').isVisible(), 200), '«Stile» apre logo, colori e caratteri dal basso')
  await foto(page, '5-stile')
  await page.locator('[data-foglio]').getByRole('button', { name: 'Chiudi' }).first().tap()

  // Salva: nel database c'è quello che si vede.
  const visto = await ordine()
  await page.locator('[data-salva]').tap()
  let salvati = null
  esito(await aspetta(async () => { salvati = (await a.from('pagine').select('blocks').eq('id', home.id).single()).data?.blocks; return JSON.stringify(salvati?.map(b => b.id)) === JSON.stringify(visto) }, 100), '«Salva» scrive nel database lo stesso ordine che si vede', JSON.stringify(salvati?.map(b => b.id)))
  esito(salvati?.find(b => b.id === 'b-chi')?.data?.title === 'ZZ Chi siamo dal telefono', 'e il titolo scritto dal telefono')
  const html = await (await fetch(`${BASE}/r/${slug}`, { headers: { 'cache-control': 'no-cache' } })).text()
  esito(html.includes('ZZ Chi siamo dal telefono') && !/data-blocco|ev-telefono/.test(html), 'sul sito c’è il titolo nuovo, e niente dell’editor')

  // Si torna all'elenco.
  await page.getByRole('button', { name: 'Torna all\'elenco dei blocchi' }).tap()
  esito(await aspetta(async () => !(await page.locator('[data-editor-telefono]').count())), '«←» torna all’elenco dei blocchi')

  esito(!errori.length, 'nessun errore nel browser', errori.slice(0, 3).join(' | '))
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message.slice(0, 400)}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
