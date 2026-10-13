// Sonda: i cinque blocchi del 13/10 — Titolo, Citazione, Schede a linguette,
// Tabella, Popup.
//
//  1. IL CORPO GREZZO della pagina pubblica: cosa c'è nell'HTML (i testi di
//     tutte le linguette, la tabella) e cosa no (il popup, il codice scritto
//     dentro un testo).
//  2. COL BROWSER, da computer e da telefono: le linguette si scelgono, la
//     tabella larga scorre dentro il suo riquadro e la pagina no, il popup
//     aspetta il banner dei cookie, si chiude, e non si ripresenta.
//  3. I VALORI OSTILI: forme sbagliate, tempi inventati, `javascript:`.
//  4. IL PANNELLO, come il titolare: la tabella si costruisce dall'elenco di
//     sempre e si salva con la forma giusta.
//
// A mano. Uso: cd tests && node probe-blocchi-nuovi.mjs [cartella-foto]
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv.slice(2).find(x => !x.startsWith('--')) || null
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let az = null, utente = null, browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-BLOCCHI-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const slug = `zz-blocchi-${t}`
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ Palestra Blocchi', slug, active: true, minisito: { active: true } }).select().single(), 'entità')
  const riga = (id, ...celle) => ({ id, celle })
  await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: 'zz-altra', titolo: 'ZZ Altra', status: 'pubblicata', blocks: [{ id: 'x', type: 'about', data: { title: 'ZZ Arrivo', text: '' } }] }).select('id').single(), 'pagina d’arrivo')
  await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [
    { id: 'b-tit', type: 'titolo', data: { title: 'ZZ I nostri corsi', subtitle: 'ZZ Una riga sotto il titolo.', size: 'large' } },
    { id: 'b-cit', type: 'citazione', data: { text: 'ZZ Allenarsi è un appuntamento con sé stessi. <script>alert(1)</script>', author: 'ZZ Maria Bianchi', role: 'ZZ Fondatrice' } },
    { id: 'b-lin', type: 'linguette', data: { titolo: 'ZZ Le sale', items: [
      { id: 'l1', title: 'ZZ Sala pesi', text: 'ZZ Testo della sala pesi.' },
      { id: 'l2', title: 'ZZ Sala corsi', text: 'ZZ Testo della sala corsi.' },
      { id: 'l0', title: '', text: 'ZZ Senza nome non compare.' },
      { id: 'l3', title: 'ZZ Piscina', text: 'ZZ Testo della piscina.' },
    ] } },
    { id: 'b-tab', type: 'tabella', data: { titolo: 'ZZ Abbonamenti', intestazioni: ['', 'ZZ Base', 'ZZ Plus', 'ZZ Oro', 'ZZ Platino', 'ZZ Famiglia'], evidenzia: 2, nota: 'ZZ Prezzi al mese.', items: [
      riga('r1', 'ZZ Sala pesi', '✓', '✓', '✓', '✓', '✓', 'ZZ settima cella'),
      riga('r2', 'ZZ Corsi', '✗', '✓', '✓', '✓', '✓'),
      riga('r3', '', '', '', '', '', ''),
      riga('r4', 'ZZ Prezzo', '29 €', '39 €', '49 €', '59 €', '79 €'),
    ] } },
    { id: 'b-pop', type: 'popup', data: { title: 'ZZ Open day sabato', text: 'ZZ Vieni a provare la palestra.', image_url: '', button_text: 'ZZ Scopri', button_url: `/a/${slug}/p/zz-altra`, dopo: 3, giorni: 7 } },
  ] }).select('id').single(), 'home')
  // I valori ostili: forme sbagliate ovunque, e un pulsante che prova a eseguire codice.
  await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: 'zz-ostile', titolo: 'ZZ Ostile', status: 'pubblicata', blocks: [
    { id: 'o-tit', type: 'titolo', data: { title: 'ZZ Ostile', size: '"><script>alert(2)</script>' } },
    { id: 'o-lin', type: 'linguette', data: { titolo: 7, items: [null, 'x', { title: 'ZZ Unica', text: null }] } },
    { id: 'o-tab', type: 'tabella', data: { intestazioni: 'non un elenco', evidenzia: 99, items: [null, { celle: 'x' }, { celle: [3, null, 'ZZ Cella buona', { x: 1 }] }] } },
    { id: 'o-tab2', type: 'tabella', data: { items: 'x' } },
    { id: 'o-cit', type: 'citazione', data: { text: '' } },
    { id: 'o-pop', type: 'popup', data: { title: 'ZZ Popup ostile', button_text: 'ZZ Premi', button_url: 'javascript:alert(3)', dopo: '0); alert(4', giorni: -3 } },
  ] }).select('id').single(), 'pagina ostile')
  const tabellaVuota = await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: 'zz-tabella', titolo: 'ZZ Tabella', status: 'pubblicata', blocks: [
    { id: 'e-tab', type: 'tabella', data: { titolo: '', intestazioni: ['', '', ''], items: [], nota: '', evidenzia: 0 } },
  ] }).select('id').single(), 'pagina della tabella')
  const url = `${BASE}/a/${slug}`

  console.log(`\nIL CORPO GREZZO — ${url}\n`)
  const grezzo = await (await fetch(url)).text()
  esito(/<h1[^>]*>ZZ I nostri corsi<\/h1>/.test(grezzo), 'senza copertina, il blocco «Titolo» in cima è l’H1 della pagina')
  esito((grezzo.match(/<h1[\s>]/g) || []).length === 1, 'e di H1 ce n’è uno solo', String((grezzo.match(/<h1[\s>]/g) || []).length))
  esito(grezzo.includes('ZZ Allenarsi') && !grezzo.includes('<script>alert(1)</script>'), 'il codice scritto dentro una citazione esce come testo, non come codice')
  esito(['ZZ Testo della sala pesi.', 'ZZ Testo della sala corsi.', 'ZZ Testo della piscina.'].every(x => grezzo.includes(x)), 'i testi di TUTTE le linguette sono nell’HTML (un motore di ricerca li legge)')
  // I dati dei blocchi viaggiano anche nel pacchetto per il browser: «non esce» si guarda negli elementi disegnati.
  esito(!grezzo.includes('>ZZ Senza nome non compare'), 'una linguetta senza nome non è disegnata')
  esito(grezzo.includes('<table') && grezzo.includes('>ZZ Platino<') && grezzo.includes('>79 €<') && !grezzo.includes('>ZZ settima cella<'), 'la tabella è nell’HTML, con al massimo sei colonne')
  esito(!grezzo.includes('data-popup') && !grezzo.includes('ZZ Open day sabato</'), 'il popup non è disegnato nella pagina che esce dal server')

  // In inglese (solo in produzione: in locale la chiave dell'AI non c'è) la forma resta quella.
  if (!/localhost/.test(BASE)) {
    const en = await (await fetch(`${BASE}/en/a/${slug}`)).text()
    const conta = x => (en.match(x) || []).length
    esito(conta(/role="tab"/g) === 3 && conta(/<th scope="col"/g) === 6 && conta(/<th scope="row"/g) === 3 && en.includes('>79 €<') && conta(/<h1[\s>]/g) === 1,
      'in inglese linguette e tabella hanno la stessa forma: tre linguette, sei colonne, tre righe', `${conta(/role="tab"/g)} · ${conta(/<th scope="col"/g)} · ${conta(/<th scope="row"/g)}`)
  }

  browser = await chromium.launch()
  for (const [nome, opzioni] of process.argv.includes('--pannello') ? [] : [['computer', { viewport: { width: 1440, height: 900 } }], ['telefono', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
    console.log(`\n${nome.toUpperCase()}\n`)
    const ctx = await browser.newContext({ locale: 'it-IT', ...opzioni })
    const page = await ctx.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    page.on('dialog', d => { errori.push('si è aperto un dialogo: ' + d.message()); d.dismiss() })
    const aspetta = async (prova, ms = 12000) => { for (let i = 0; i < ms / 150; i++) { if (await prova().catch(() => false)) return true; await page.waitForTimeout(150) } return false }
    const popup = page.locator('[data-popup-aperto]')
    await page.goto(url, { waitUntil: 'networkidle' })

    // Il popup e il banner dei cookie: prima il banner.
    await page.locator('[data-cookie-banner]').waitFor({ timeout: 15000 })
    await page.waitForTimeout(5500)
    esito(await popup.count() === 0, 'finché il banner dei cookie aspetta una risposta, il popup non compare')
    await page.locator('[data-cookie-banner] button').last().click()
    esito(await aspetta(() => popup.isVisible(), 6000), 'risposto al banner, il popup compare')
    const testo = await popup.innerText().catch(() => '')
    esito(testo.includes('ZZ Open day sabato') && testo.includes('ZZ Vieni a provare') && testo.includes('ZZ Scopri'), 'con titolo, messaggio e pulsante', testo.slice(0, 120))
    esito(await popup.locator('a').getAttribute('href').catch(() => '') === `/a/${slug}/p/zz-altra`, 'il pulsante porta alla pagina scelta')
    const riquadro = await popup.locator('[data-popup]').boundingBox()
    esito(!!riquadro && riquadro.x >= 0 && riquadro.x + riquadro.width <= opzioni.viewport.width + 0.5 && riquadro.y >= 0, 'il riquadro sta tutto dentro lo schermo', JSON.stringify(riquadro))
    esito(await page.evaluate(() => document.body.style.overflow) === 'hidden' && await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Chiudi', 'sotto la pagina non scorre, e il fuoco è sulla ✕')
    if (FOTO) await page.screenshot({ path: `${FOTO}/blocchi-${nome}-popup.png` })
    await page.keyboard.press('Escape')
    esito(await aspetta(async () => await popup.count() === 0, 4000), 'Esc lo chiude')
    esito(await page.evaluate(() => document.body.style.overflow) !== 'hidden', 'e la pagina torna a scorrere')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(5500)
    esito(await popup.count() === 0, 'ricaricando, a chi l’ha già visto non si ripresenta')
    // Chi non l'ha ancora visto lo chiude con la ✕ e toccando fuori.
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('popup_visto_')) localStorage.removeItem(k) })
    await page.reload({ waitUntil: 'networkidle' })
    esito(await aspetta(() => popup.isVisible(), 8000), 'tolto il ricordo, ricompare')
    await popup.locator('button[aria-label="Chiudi"]').click()
    esito(await aspetta(async () => await popup.count() === 0, 4000), 'la ✕ lo chiude')
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('popup_visto_')) localStorage.removeItem(k) })
    await page.reload({ waitUntil: 'networkidle' })
    await aspetta(() => popup.isVisible(), 8000)
    await page.mouse.click(5, 5)
    esito(await aspetta(async () => await popup.count() === 0, 4000), 'un tocco fuori dal riquadro lo chiude')

    // Le linguette.
    const lin = page.locator('.lbr-linguette')
    await lin.scrollIntoViewIfNeeded()
    const visibili = async () => (await page.locator('[role="tabpanel"]').evaluateAll(els => els.filter(e => e.offsetParent !== null).map(e => e.textContent.trim())))
    esito((await lin.locator('[role="tab"]').count()) === 3 && JSON.stringify(await visibili()) === '["ZZ Testo della sala pesi."]', 'tre linguette, e a schermo il contenuto della prima', JSON.stringify(await visibili()))
    await lin.locator('[role="tab"]', { hasText: 'ZZ Piscina' }).click()
    esito(JSON.stringify(await visibili()) === '["ZZ Testo della piscina."]' && await lin.locator('[role="tab"][aria-selected="true"]').innerText() === 'ZZ Piscina', 'un tocco su una linguetta mostra il suo contenuto')
    if (!opzioni.hasTouch) {
      await page.keyboard.press('ArrowLeft')
      esito(JSON.stringify(await visibili()) === '["ZZ Testo della sala corsi."]' && await page.evaluate(() => document.activeElement?.textContent) === 'ZZ Sala corsi', 'dalla tastiera, la freccia passa alla linguetta accanto')
    }

    // La tabella.
    const tab = page.locator('.lbr-tabella')
    await tab.scrollIntoViewIfNeeded()
    const forma = await tab.evaluate(el => ({
      colonne: el.querySelectorAll('thead th').length, righe: el.querySelectorAll('tbody tr').length, segni: el.querySelectorAll('tbody svg').length,
      risalto: [...el.querySelectorAll('tbody tr:first-child > *')].map(c => getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)'),
      scorre: el.scrollWidth > el.clientWidth + 1,
    }))
    esito(forma.colonne === 6 && forma.righe === 3, 'sei colonne e tre righe: quella tutta vuota non c’è', JSON.stringify(forma))
    esito(forma.segni === 10, '«✓» e «✗» scritti da soli in una cella sono diventati i segni', String(forma.segni))
    esito(JSON.stringify(forma.risalto) === '[false,false,true,false,false,false]', 'la colonna scelta è in risalto, le altre no', JSON.stringify(forma.risalto))
    const pagina = await page.evaluate(() => ({ largo: document.documentElement.scrollWidth, schermo: window.innerWidth }))
    esito(pagina.largo <= pagina.schermo + 1, 'la pagina non scorre di lato', JSON.stringify(pagina))
    if (opzioni.hasTouch) esito(forma.scorre, 'su telefono la tabella larga scorre dentro il suo riquadro')
    if (FOTO) await page.screenshot({ path: `${FOTO}/blocchi-${nome}-pagina.png`, fullPage: true })

    // I valori ostili.
    await page.goto(`${url}/p/zz-ostile`, { waitUntil: 'networkidle' })
    const ostile = await page.locator('body').innerText()
    esito(ostile.includes('ZZ Ostile') && ostile.includes('ZZ Unica') && ostile.includes('ZZ Cella buona'), 'con le forme sbagliate la pagina si disegna lo stesso, con quello che è buono')
    esito(await aspetta(() => popup.isVisible(), 9000), 'un tempo inventato torna al predefinito: il popup compare comunque')
    esito(await popup.locator('a').getAttribute('href').catch(() => '') === '#', 'un pulsante con `javascript:` non porta da nessuna parte', await popup.locator('a').getAttribute('href').catch(() => 'assente'))
    await popup.locator('a').click().catch(() => {})
    await page.waitForTimeout(400)
    esito(!errori.length, 'nessun errore e nessun codice eseguito nel browser', errori.join(' | '))
    await ctx.close()
  }

  console.log('\nIL PANNELLO, COME IL TITOLARE\n')
  const email = `zz-blocchi-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  const aspetta = async (prova, ms = 15000) => { for (let i = 0; i < ms / 150; i++) { if (await prova().catch(() => false)) return true; await page.waitForTimeout(150) } return false }
  await page.goto(`${BASE}/admin/pagine/${tabellaVuota.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.locator('button:has(svg.lucide-chevron-down)').first().click({ timeout: 120000 })
  const ed = page.locator('[data-tabella-editor]')
  await ed.waitFor({ timeout: 20000 })
  // In sviluppo la pagina viene letta due volte: si aspetta che abbia finito, o la seconda lettura passa sopra ai clic.
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(800)
  esito(await ed.locator('[data-tabella-testa]').count() === 3 && await ed.locator('[data-tabella-riga]').count() === 0, 'la tabella nuova ha tre colonne e nessuna riga')
  await ed.locator('[data-tabella-colonna-piu]').click()
  await ed.locator('[data-tabella-testa="3"]').waitFor({ timeout: 10000 })
  await ed.locator('[data-tabella-riga-piu]').click()
  await ed.locator('[data-tabella-riga]').first().waitFor({ timeout: 10000 })
  await ed.locator('[data-tabella-riga-piu]').click()
  await aspetta(async () => await ed.locator('[data-tabella-riga]').count() === 2, 10000)
  await ed.locator('[data-tabella-testa="1"]').pressSequentially('ZZ Lunedì', { delay: 20 })
  await ed.locator('[data-tabella-testa="3"]').pressSequentially('ZZ Giovedì', { delay: 20 })
  const prima = ed.locator('[data-tabella-riga]').first().locator('input')
  await prima.nth(0).pressSequentially('ZZ Yoga', { delay: 20 })
  await prima.nth(3).pressSequentially('18:00', { delay: 20 })
  esito(await ed.locator('[data-tabella-testa="1"]').inputValue() === 'ZZ Lunedì' && await prima.nth(0).inputValue() === 'ZZ Yoga', 'scrivendo nelle caselle il testo resta dov’è, lettera per lettera', `${await ed.locator('[data-tabella-testa="1"]').inputValue()} · ${await prima.nth(0).inputValue()}`)
  await ed.locator('select').selectOption('3')
  // Togliendo la seconda colonna, quella in risalto resta la stessa (ora è la terza).
  await ed.locator('button[aria-label="Togli la colonna 3"]').click()
  if (FOTO) await page.screenshot({ path: `${FOTO}/blocchi-pannello-tabella.png` })
  await page.getByRole('button', { name: 'Salva', exact: true }).first().click()
  const salvata = async () => (await a.from('pagine').select('blocks').eq('id', tabellaVuota.id).single()).data.blocks[0].data
  esito(await aspetta(async () => (await salvata()).items.length === 2), '«Salva» scrive la tabella nel database')
  const d = await salvata()
  esito(JSON.stringify(d.intestazioni) === '["","ZZ Lunedì","ZZ Giovedì"]' && d.items.every(r => typeof r.id === 'string' && r.celle.length === 3) && JSON.stringify(d.items[0].celle) === '["ZZ Yoga","","18:00"]' && d.evidenzia === 2,
    'con la forma giusta: ogni riga ha tante caselle quante le colonne, e la colonna in risalto ha seguito la sua', JSON.stringify(d).slice(0, 300))
  const html = await (await fetch(`${url}/p/zz-tabella`)).text()
  esito(html.includes('ZZ Giovedì') && html.includes('ZZ Yoga') && html.includes('18:00'), 'e sul sito la tabella si legge')
  esito(!errori.length, 'nessun errore nel browser', errori.join(' | '))
  await ctx.close()
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
