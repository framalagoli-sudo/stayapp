// Sonda: «Marchio e stile» e il riordino di logo, intestazione e piede.
//
// Come il titolare, col browser:
//  1. la pagina «Marchio e stile» (logo, copertina, colori, caratteri) per i
//     tre tipi di entità; un'accoppiata scelta arriva fino ai titoli del sito;
//  2. chi cerca il logo in «Dati dell'attività» trova la porta, non un vuoto;
//  3. «Logo in cima all'app» sta sotto «App del QR»; frase e social stanno con
//     intestazione e piede — e salvando da un posto non si perde quello
//     salvato dall'altro (tutti scrivono nello stesso `minisito`);
//  4. dall'editor visuale, «Stile» cambia i caratteri e la pagina accanto li mostra.
//
// A mano. Uso: cd tests && node probe-marchio-stile.mjs [cartella-foto]
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
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-MARCHIO-${t}`, require_2fa: false, moduli: { struttura: true, ristorante: true, attivita: true } }).select().single(), 'azienda')
  const nuova = (tipo, nome) => deve(a.from('entita').insert({ azienda_id: az.id, tipo, name: nome, slug: `zz-marchio-${tipo.slice(0, 3)}-${t}`, active: true, minisito: { active: true }, theme: { primaryColor: '#b3001b', fontHeading: 'playfair', fontBody: 'inter' } }).select().single(), tipo)
  const rist = await nuova('ristorante', 'ZZ Trattoria Marchio')
  const strut = await nuova('struttura', 'ZZ Albergo Marchio')
  const att = await nuova('attivita', 'ZZ Studio Marchio')
  const home = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: rist.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [
    { id: 'h', type: 'hero', data: { layout: 'tipo', title: 'ZZ Benvenuti', tagline: 'ZZ Riga', bg_image_url: '', overlay_opacity: 0.5, cta1_text: '', cta1_url: '', cta2_text: '', cta2_url: '', height: 'medium' } },
    { id: 'c', type: 'about', data: { title: 'ZZ Chi siamo', text: 'ZZ Un paragrafo di testo.' } },
  ] }).select('id').single(), 'home')
  await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: rist.id, slug: 'zz-interna', titolo: 'ZZ Interna', status: 'pubblicata', blocks: [{ id: 'i', type: 'about', data: { title: 'ZZ Interna', text: '' } }] }).select('id').single(), 'pagina interna')
  const sito = `${BASE}/r/${rist.slug}`
  const nelDb = async () => (await a.from('entita').select('theme, minisito').eq('id', rist.id).single()).data

  const prima = await (await fetch(sito)).text()
  esito(!prima.includes('.lbr-radice h1'), 'con un carattere di sempre il sito non riceve nessuna regola in più sui titoli')

  const email = `zz-marchio-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })

  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  page.on('dialog', d => d.accept())
  const aspetta = async (prova, ms = 15000) => { for (let i = 0; i < ms / 150; i++) { if (await prova().catch(() => false)) return true; await page.waitForTimeout(150) } return false }
  const vai = async (percorso, attesa) => { await page.goto(`${BASE}${percorso}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.locator(attesa).first().waitFor({ timeout: 120000 }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(600) }
  const pannello = page.locator('[data-marchio-stile]')
  const salvato = () => aspetta(async () => (await pannello.locator('[data-ms-stato]').innerText({ timeout: 1000 })).includes('Salvato'))

  console.log(`\n«MARCHIO E STILE» — ${BASE}\n`)
  await vai(`/admin/ristoranti/${rist.id}/theme`, '[data-marchio-stile]')
  const testo = await pannello.innerText()
  esito(['Logo', 'Foto di copertina', 'Colori', 'Caratteri', 'Angoli'].every(x => testo.includes(x)), 'logo, copertina, colori, caratteri e angoli sono nella stessa pagina')
  const voci = await page.locator('nav a, aside a').allInnerTexts().catch(() => [])
  esito(voci.some(v => v.trim() === 'Marchio e stile') && !voci.some(v => v.trim() === 'Aspetto'), 'nel menu la voce si chiama «Marchio e stile»', voci.filter(v => /Marchio|Aspetto/.test(v)).join(' · '))
  esito(await pannello.locator('[data-accoppiata]').count() === 18, 'diciotto accoppiate di caratteri', String(await pannello.locator('[data-accoppiata]').count()))
  esito((await pannello.locator('[data-accoppiata="locandina"]').innerText()).toLowerCase().includes('zz trattoria marchio'), 'ognuna si vede col nome dell’attività, non con «Aa»')
  if (FOTO) await page.screenshot({ path: `${FOTO}/marchio-pagina.png`, fullPage: true })

  await pannello.locator('[data-accoppiata="locandina"]').click()
  esito(await salvato() && (await nelDb()).theme.fontHeading === 'bebas' && (await nelDb()).theme.fontBody === 'work-sans', 'scelta «Locandina»: si salva da sola')
  const titolo = await page.locator('[data-ms-titolo]').evaluate(e => ({ m: getComputedStyle(e).textTransform, f: getComputedStyle(e).fontFamily }))
  esito(titolo.m === 'uppercase' && titolo.f.includes('Bebas'), 'l’anteprima accanto mostra subito il titolo in Bebas, maiuscolo', JSON.stringify(titolo))
  await pannello.locator('[data-ms-colore="primaryColor"]').fill('#0f766e')
  esito(await aspetta(async () => (await nelDb()).theme.primaryColor === '#0f766e'), 'il colore principale si salva quando ci si ferma')
  await pannello.locator('[data-ms-logo="large"]').click()
  esito(await aspetta(async () => (await nelDb()).minisito.logo_size === 'large'), 'la misura del logo si salva')
  esito((await nelDb()).theme.fontHeading === 'bebas' && (await nelDb()).minisito.active === true, 'e quello che c’era prima resta (caratteri, sito attivo)')

  // L'icona del sito: si carica qui, diventa un PNG quadrato, ed esce su tutte le pagine.
  esito(!/rel="icon"[^>]*supabase/.test(prima), 'senza un’icona caricata il sito non ne dichiara una sua')
  const PUNTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNgQAYAAA4AAQ6Q3HcAAAAASUVORK5CYII=', 'base64')
  await pannello.locator('[data-ms-icona] input[type="file"]').setInputFiles({ name: 'icona.png', mimeType: 'image/png', buffer: PUNTO })
  esito(await aspetta(async () => /\.png(\?|$)/.test((await nelDb()).minisito.icona_url || ''), 30000), 'l’icona caricata si salva', JSON.stringify((await nelDb()).minisito.icona_url))
  const icona = (await nelDb()).minisito.icona_url
  const file = icona ? Buffer.from(await (await fetch(icona)).arrayBuffer()) : Buffer.alloc(0)
  esito(file.length > 24 && file.subarray(1, 4).toString() === 'PNG' && file.readUInt32BE(16) === 256 && file.readUInt32BE(20) === 256, 'ed è un PNG quadrato da 256 pixel, qualunque forma avesse l’originale', file.length > 24 ? `${file.readUInt32BE(16)}x${file.readUInt32BE(20)}` : 'vuoto')
  esito((await nelDb()).minisito.logo_size === 'large', 'senza cancellare la misura del logo')
  for (const [nome, indirizzo] of [['home', sito], ['una pagina interna', `${sito}/p/zz-interna`], ['la privacy', `${sito}/privacy`]]) {
    const html = await (await fetch(indirizzo)).text()
    const nomeFile = icona ? icona.split('?')[0].split('/').pop() : '—'
    esito((html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]*>/g) || []).some(l => l.includes(nomeFile)), `${nome}: la pagina dichiara l’icona del sito`)
  }

  // Fino al sito.
  const p2 = await (await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 } })).newPage()
  await p2.goto(sito, { waitUntil: 'load', timeout: 60000 }); await p2.waitForTimeout(3000)
  const sulSito = await p2.evaluate(() => { const st = el => { const c = getComputedStyle(el); return `${c.fontFamily.split(',')[0]} ${c.fontWeight} ${c.textTransform}` }; return { h1: st(document.querySelector('h1')), h2: st(document.querySelector('h2')), p: getComputedStyle(document.querySelector('.lbr-radice p')).fontFamily.split(',')[0], caricato: [...document.fonts].some(f => f.family.includes('Bebas') && f.status === 'loaded') } })
  esito(/Bebas/.test(sulSito.h1) && /400 uppercase/.test(sulSito.h1) && /400 uppercase/.test(sulSito.h2) && /Work Sans/.test(sulSito.p) && sulSito.caricato, 'sul sito i titoli sono in Bebas, maiuscoli e al peso giusto; il testo in Work Sans', JSON.stringify(sulSito))
  if (FOTO) await p2.screenshot({ path: `${FOTO}/marchio-sito.png` })
  await p2.context().close()

  for (const [tipo, percorso] of [['struttura', `/admin/struttura/${strut.id}/theme`], ['attivita', `/admin/attivita/${att.id}/theme`]]) {
    await vai(percorso, '[data-marchio-stile]')
    esito(await pannello.locator('[data-accoppiata]').count() === 18 && (await pannello.innerText()).includes('Logo'), `${tipo}: stessa pagina, stesso pannello`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await vai(`/admin/ristoranti/${rist.id}/theme`, '[data-marchio-stile]')
  const largo = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, schermo: window.innerWidth }))
  esito(largo.pagina <= largo.schermo + 1, 'da telefono la pagina non esce dallo schermo', JSON.stringify(largo))
  if (FOTO) await page.screenshot({ path: `${FOTO}/marchio-telefono.png` })
  await page.setViewportSize({ width: 1440, height: 900 })

  console.log('\nCHI CERCA DOVE STAVA PRIMA\n')
  await vai(`/admin/ristoranti/${rist.id}/info`, '[data-rimando-marchio]')
  const info = await page.locator('main, body').first().innerText()
  esito(!/Logo e copertina|Dimensione logo|Logo nell'app ospite/.test(info), '«Dati dell’attività» non ha più logo e copertina')
  await page.locator('[data-rimando-marchio]').click()
  esito(await aspetta(async () => page.url().endsWith(`/admin/ristoranti/${rist.id}/theme`) && await pannello.count() === 1), 'e la porta che c’è al loro posto apre «Marchio e stile»', page.url())
  await vai(`/admin/struttura/${strut.id}/gallery`, '[data-rimando-marchio]')
  esito(!/Logo struttura|Dimensione logo/.test(await page.locator('body').innerText()), 'nella Galleria della struttura il doppione non c’è più')

  console.log('\nL’APP DEL QR, INTESTAZIONE E PIEDE\n')
  await vai(`/admin/ristoranti/${rist.id}/moduli`, '[data-logo-app]')
  await page.locator('[data-logo-app] button', { hasText: 'Quello normale' }).click()
  esito(await aspetta(async () => (await nelDb()).minisito.app_logo === 'light'), '«Logo in cima all’app» sta sotto «App del QR», e si salva')
  await vai(`/admin/ristoranti/${rist.id}/sito?tab=layout`, '[data-sito-social]')
  esito((await page.locator('body').innerText()).includes('Intestazione e piede'), 'la scheda si chiama per quello che contiene')
  await page.locator('[data-sito-frase]').fill('ZZ La frase sotto il nome')
  await page.locator('[data-sito-social-campo="instagram"]').fill('https://instagram.com/zzmarchio')
  await page.locator('[data-sito-social-salva]').click()
  esito(await aspetta(async () => (await nelDb()).minisito.tagline === 'ZZ La frase sotto il nome' && (await nelDb()).minisito.social?.instagram === 'https://instagram.com/zzmarchio'), 'frase e social si salvano da qui')
  const m = (await nelDb()).minisito
  esito(m.logo_size === 'large' && m.app_logo === 'light' && m.active === true, 'e non hanno cancellato la misura del logo né la scelta per l’app', JSON.stringify({ logo_size: m.logo_size, app_logo: m.app_logo, active: m.active }))
  await vai(`/admin/ristoranti/${rist.id}/sito?tab=impostazioni`, 'text=Titolo SEO')
  const seo = await page.locator('body').innerText()
  esito(seo.includes('SEO e tracciamento') && !seo.includes('Tagline') && !seo.includes('TripAdvisor') && seo.includes('Meta Pixel'), 'nella scheda SEO restano SEO e tracciamento, senza i social')

  console.log('\nUNA PAROLA IN EVIDENZA NEL TITOLO\n')
  await vai(`/admin/pagine/${home.id}`, 'button:has-text("Editor visuale")')
  await page.locator('button:has(svg.lucide-chevron-down)').first().click()
  const evid = page.locator('[data-evidenzia]').first()
  await evid.waitFor({ timeout: 20000 })
  const titoloIn = await page.evaluateHandle(() => [...document.querySelectorAll('input[type="text"]')].find(i => i.value === 'ZZ Benvenuti'))
  await evid.click()
  esito(await page.locator('[data-evidenzia-come]').count() === 1, 'senza una selezione il pulsante dice come fare, e non cambia niente')
  await titoloIn.evaluate(i => { i.focus(); i.setSelectionRange(3, 12) })
  await evid.click()
  esito(await aspetta(async () => await titoloIn.evaluate(i => i.value) === 'ZZ <mark>Benvenuti</mark>', 5000), 'selezionata la parola, il pulsante la mette in evidenza', await titoloIn.evaluate(i => i.value))
  await page.getByRole('button', { name: 'Salva', exact: true }).first().click()
  esito(await aspetta(async () => ((await a.from('pagine').select('blocks').eq('id', home.id).single()).data.blocks[0].data.title) === 'ZZ <mark>Benvenuti</mark>'), 'salvato')
  const conEvidenza = await (await fetch(sito)).text()
  esito(/<h1[^>]*>ZZ <mark>Benvenuti<\/mark><\/h1>/.test(conEvidenza), 'sul sito la parola è evidenziata dentro il titolo')

  console.log('\nDALL’EDITOR VISUALE\n')
  await vai(`/admin/pagine/${home.id}`, 'button:has-text("Editor visuale")')
  await page.getByRole('button', { name: 'Editor visuale' }).click()
  const riq = page.frameLocator('[data-editor-visuale] iframe')
  await riq.locator('[data-blocco="h"]').waitFor({ timeout: 120000 })
  await page.locator('[data-apri-stile]').click()
  const lato = page.locator('[data-pannello-stile]')
  await lato.locator('[data-accoppiata="editoriale"]').waitFor({ timeout: 20000 })
  esito((await lato.innerText()).includes('tutto il sito'), '«Stile» apre il pannello accanto alla pagina, e dice che vale per tutto il sito')
  await lato.locator('[data-accoppiata="editoriale"]').click()
  esito(await aspetta(async () => (await riq.locator('h1').first().evaluate(e => getComputedStyle(e).fontFamily)).includes('Fraunces'), 30000), 'scelta «Editoriale»: la pagina accanto si aggiorna e il titolo è in Fraunces')
  esito((await nelDb()).theme.fontHeading === 'fraunces' && (await nelDb()).theme.primaryColor === '#0f766e', 'salvato, e il colore scelto prima è rimasto')
  if (FOTO) await page.screenshot({ path: `${FOTO}/marchio-editor.png` })
  esito(!errori.length, 'nessun errore nel browser', errori.slice(0, 4).join(' | '))
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
