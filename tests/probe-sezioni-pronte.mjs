// Sonda: la galleria delle sezioni pronte.
//
// Come il titolare, col browser:
//  1. dall'elenco di sempre si apre la galleria: ogni sezione ha la sua
//     anteprima disegnata davvero, nei colori del sito;
//  2. TUTTE le sezioni si inseriscono una per una, si salva, e la pagina
//     pubblica le disegna tutte — da computer e da telefono, senza errori;
//  3. dall'editor visuale, col «+», la sezione arriva nel punto scelto con il
//     suo stile; Esc chiude la galleria e non l'editor.
//
// A mano. Uso: cd tests && node probe-sezioni-pronte.mjs [cartella-foto]
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
const ROSSO = '#b3001b'

try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-PRONTE-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const slug = `zz-pronte-${t}`
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ Studio Pronte', slug, active: true, minisito: { active: true },
    address: 'Via Roma 1, 05100 Terni', phone: '0744 000000', theme: { primaryColor: ROSSO, fontHeading: 'playfair', fontBody: 'inter' } }).select().single(), 'entità')
  const tutte = await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: 'zz-tutte', titolo: 'ZZ Tutte', status: 'pubblicata', blocks: [{ id: 'b0', type: 'about', data: { title: 'ZZ Prima', text: '' } }] }).select('id').single(), 'pagina')
  const visuale = await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: 'zz-visuale', titolo: 'ZZ Visuale', status: 'pubblicata', blocks: [
    { id: 'v1', type: 'about', data: { title: 'ZZ Sopra', text: '' } }, { id: 'v2', type: 'about', data: { title: 'ZZ Sotto', text: '' } }] }).select('id').single(), 'pagina visuale')

  const email = `zz-pronte-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })

  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|maps\.google|google\.com\/maps/.test(m.text()) && !(m.location()?.url || '').startsWith('https://challenges.cloudflare.com/')) errori.push('console: ' + m.text().slice(0, 240)) })
  const aspetta = async (prova, ms = 15000) => { for (let i = 0; i < ms / 150; i++) { if (await prova().catch(() => false)) return true; await page.waitForTimeout(150) } return false }
  const galleria = page.locator('[data-galleria-sezioni]')

  console.log(`\nLA GALLERIA, DALL’ELENCO DI SEMPRE — ${BASE}\n`)
  await page.goto(`${BASE}/admin/pagine/${tutte.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  const apri = page.getByRole('button', { name: 'Inserisci sezione pronta' })
  await apri.waitFor({ timeout: 120000 })
  // In sviluppo la pagina viene letta due volte: si aspetta che abbia finito.
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800)
  await apri.click()
  await galleria.waitFor({ timeout: 20000 })
  const categorie = await galleria.locator('[data-gs-categoria]').evaluateAll(els => els.map(e => e.getAttribute('data-gs-categoria')))
  esito(categorie.length >= 6, 'la galleria si apre, con le sue categorie', String(categorie.length))

  const chiavi = [], mute = []
  for (const c of categorie) {
    await galleria.locator(`[data-gs-categoria="${c}"]`).click()
    await page.waitForTimeout(700)
    const schede = await galleria.locator('[data-gs-sezione]').evaluateAll(els => els.map(e => {
      const ante = e.querySelector('.gs-anteprima')
      return { chiave: e.getAttribute('data-gs-sezione'), alta: ante?.parentElement.offsetHeight || 0, testo: (ante?.innerText || '').trim().length, sezioni: ante?.querySelectorAll('section').length || 0 }
    }))
    for (const x of schede) { chiavi.push(x.chiave); if (x.alta < 60 || !x.sezioni || x.testo < 10) mute.push(`${x.chiave} (${x.alta}px, ${x.sezioni} sezioni)`) }
    if (FOTO) await page.screenshot({ path: `${FOTO}/pronte-${c}.png` })
  }
  esito(chiavi.length >= 18 && new Set(chiavi).size === chiavi.length, `${chiavi.length} sezioni, ognuna in una categoria sola`)
  esito(mute.length === 0, 'ogni sezione ha la sua anteprima disegnata davvero, con dentro i suoi testi', mute.join(' · '))
  // I colori sono quelli del sito: l'invito al centro è una fascia del colore principale.
  await galleria.locator('[data-gs-categoria="inviti"]').click()
  const fascia = await galleria.locator('[data-gs-sezione="cta"] .gs-anteprima section').first().evaluate(e => getComputedStyle(e).backgroundColor + ' ' + getComputedStyle(e).backgroundImage).catch(() => '')
  esito(fascia.includes('179, 0, 27'), 'le anteprime sono nei colori di questo sito', fascia.slice(0, 120))
  // Dentro un'anteprima non si naviga e non si scrive.
  esito(await galleria.locator('.gs-anteprima').first().evaluate(e => e.inert === true), 'dentro un’anteprima niente si può premere né scrivere')
  await page.keyboard.press('Escape')
  esito(await aspetta(async () => await galleria.count() === 0, 4000), 'Esc chiude la galleria')

  console.log('\nTUTTE LE SEZIONI, UNA PER UNA\n')
  const nelDb = async id => (await a.from('pagine').select('blocks').eq('id', id).single()).data.blocks
  for (const k of chiavi) {
    await apri.click()
    await galleria.waitFor({ timeout: 10000 })
    for (const c of categorie) {
      if (await galleria.locator(`[data-gs-sezione="${k}"]`).count()) break
      await galleria.locator(`[data-gs-categoria="${c}"]`).click()
    }
    await galleria.locator(`[data-gs-sezione="${k}"]`).click()
    await aspetta(async () => await galleria.count() === 0, 6000)
  }
  await page.getByRole('button', { name: 'Salva', exact: true }).first().click()
  esito(await aspetta(async () => (await nelDb(tutte.id)).length > chiavi.length), 'inserite tutte e salvate')
  const blocchi = await nelDb(tutte.id)
  const ids = blocchi.flatMap(b => [b.id, ...['items', 'slides'].flatMap(l => (b.data?.[l] || []).map(x => x.id))])
  esito(ids.every(x => typeof x === 'string' && x) && new Set(ids).size === ids.length, 'ogni blocco e ogni elemento ha un id suo', `${ids.length} id, ${new Set(ids).size} diversi`)
  const frase = blocchi.find(b => b.type === 'citazione'), confronto = blocchi.find(b => b.type === 'tabella')
  esito(frase?.style?.bg === 'dark' && frase.style.glow === 'primary' && confronto?.data.evidenzia === 2 && confronto.data.items.length === 4, 'una sezione porta anche il suo stile (la frase su fondo scuro) e la sua forma (la colonna in risalto)', JSON.stringify(frase?.style))
  esito(blocchi.every(b => !JSON.stringify(b.data).match(/"(button_url|cta1_url|cta_url|url)":"[^"]/)), 'nessun pulsante nasce con una destinazione inventata')
  const prezzi = blocchi.filter(b => b.type === 'listino').flatMap(b => b.data.items.map(v => v.price))
  esito(prezzi.length > 0 && prezzi.every(p => !/\d/.test(p)), 'nessun prezzo che sembri vero', JSON.stringify(prezzi))

  for (const [nome, opzioni] of [['computer', { viewport: { width: 1440, height: 900 } }], ['telefono', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
    const c2 = await browser.newContext({ locale: 'it-IT', ...opzioni })
    const p2 = await c2.newPage()
    const err2 = []
    p2.on('pageerror', e => err2.push(e.message))
    // Non `networkidle`: in produzione il controllo anti-abuso del modulo e la mappa tengono la rete occupata.
    const risposta = await p2.goto(`${BASE}/a/${slug}/p/zz-tutte`, { waitUntil: 'load', timeout: 60000 })
    await p2.waitForTimeout(2500)
    const misure = await p2.evaluate(() => ({ sezioni: document.querySelectorAll('section, figure').length, largo: document.documentElement.scrollWidth, schermo: window.innerWidth, testo: document.body.innerText }))
    esito(risposta.status() === 200 && misure.sezioni >= chiavi.length - 3, `${nome}: la pagina pubblica le disegna`, `${risposta.status()} · ${misure.sezioni} sezioni su ${chiavi.length}`)
    esito(misure.largo <= misure.schermo + 1, `${nome}: la pagina non scorre di lato`, JSON.stringify({ largo: misure.largo, schermo: misure.schermo }))
    esito(misure.testo.includes('Scrivi qui la frase che riassume come lavori') && misure.testo.includes('Via Roma 1'), `${nome}: ci sono la frase in grande e i recapiti veri dell’attività`)
    esito(!err2.length, `${nome}: nessun errore nel browser`, err2.join(' | '))
    if (FOTO) await p2.screenshot({ path: `${FOTO}/pronte-sito-${nome}.png`, fullPage: true })
    await c2.close()
  }

  console.log('\nDALL’EDITOR VISUALE, NEL PUNTO SCELTO\n')
  await page.goto(`${BASE}/admin/pagine/${visuale.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByRole('button', { name: 'Editor visuale' }).click({ timeout: 120000 })
  const riq = page.frameLocator('[data-editor-visuale] iframe')
  await riq.locator('[data-blocco="v2"]').waitFor({ timeout: 120000 })
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800)
  // Il «+» fra le due sezioni: compare passando sul confine.
  const sez = riq.locator('[data-blocco="v2"]')
  await sez.evaluate(e => e.scrollIntoView({ block: 'center' }))
  await sez.hover({ position: { x: 30, y: 60 } })
  await sez.locator('> .ev-piu').first().click()
  await page.locator('[data-inserisci-qui]').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: 'Inserisci una sezione pronta' }).click({ timeout: 10000 })
  await galleria.waitFor({ timeout: 10000 })
  await page.keyboard.press('Escape')
  esito(await aspetta(async () => await galleria.count() === 0, 4000) && await page.locator('[data-editor-visuale]').count() === 1, 'Esc chiude la galleria, non l’editor')
  await page.getByRole('button', { name: 'Inserisci una sezione pronta' }).click()
  await galleria.locator('[data-gs-categoria="presentazione"]').click()
  await galleria.locator('[data-gs-sezione="manifesto"]').click()
  const ordine = () => riq.locator('[data-blocco]').evaluateAll(els => els.map(e => e.getAttribute('data-nome')))
  esito(await aspetta(async () => (await ordine()).length === 3), 'la sezione scelta arriva sulla pagina')
  const nomi = await ordine()
  esito(nomi[1] === 'Citazione' || nomi[2] === 'Citazione', 'e sta dove è stato messo il «+», non in cima', nomi.join(' · '))
  const scura = await riq.locator('[data-blocco] section', { hasText: 'Scrivi qui la frase che riassume' }).first().evaluate(e => getComputedStyle(e).backgroundColor + ' ' + getComputedStyle(e).backgroundImage).catch(() => '')
  esito(scura.includes('20, 20, 31'), 'con il suo fondo scuro', scura.slice(0, 100))
  if (FOTO) await page.screenshot({ path: `${FOTO}/pronte-visuale.png` })
  esito(!errori.length, 'nessun errore nel browser del pannello', errori.slice(0, 4).join(' | '))
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
