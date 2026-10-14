// Sonda: l'editor visuale delle pagine — la pagina vera al centro, i blocchi
// che ci si trascinano dentro, le sezioni che si scelgono con un clic.
//
// Crea un sito di prova (una home con due blocchi e una pagina vuota) e lo usa
// come il titolare, col browser:
//  - si entra dall'editor, la pagina compare e le sezioni sono sceglibili;
//  - un clic su una sezione apre la sua scheda, e scrivere cambia la pagina;
//  - un blocco trascinato dalla colonna cade nel punto scelto, e si VEDE:
//    nasce già scritto, non come una fascia vuota;
//  - i testi si scrivono direttamente sulla pagina, anche in fretta, e
//    arrivano nella scheda e nel database;
//  - sposta su/giù, duplica, elimina, trascina dalla maniglia (anche verso
//    un punto fuori vista: la pagina scorre da sola), annulla;
//  - «Salva» scrive nel database lo stesso ordine che si vede, senza ricaricare;
//  - una pagina ancora vuota riceve il suo primo blocco;
//  - valori ostili (un tipo inventato, un id di un'altra pagina, un messaggio
//    che non viene dal riquadro) non cambiano niente;
//  - dentro l'editor un link del sito non porta via;
//  - la pagina pubblica, aperta da sola, non ha niente dell'editor.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-editor-visuale.mjs [cartella-foto]
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
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const foto = async (page, nome) => { if (FOTO) await page.screenshot({ path: `${FOTO}/visuale-${nome}.png` }) }

try {
  const t = Date.now().toString(36)
  const slug = `zz-visuale-${t}`
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-VISUALE-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale', slug, active: true, minisito: { active: true },
    address: 'Via Roma 1, 05100 Terni', phone: '0744 123456 <script>alert(1)</script>', email: 'info@zz-locale.example', schedule: 'Lun–Ven 9:00–18:00\nSabato 9:00–13:00' }).select().single(), 'entità')
  const hero = { id: 'b-hero', type: 'hero', data: { title: 'ZZ Copertina', height: 'compatta' } }
  // I due formati in cui un testo può essere salvato: qui un documento (e il
  // database ne riordina le chiavi), nell'altra pagina una stringa, com'era prima.
  const chi = { id: 'b-chi', type: 'about', data: { title: 'ZZ Chi siamo', text: { type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ text: 'Testo di prova', type: 'text', marks: [{ type: 'bold' }] }, { text: ' della sezione.', type: 'text' }] }] } } }
  const home = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [hero, chi] }).select('id').single(), 'home')
  const vuota = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: 'vuota', titolo: 'ZZ Vuota', status: 'bozza', nel_menu: true, blocks: [] }).select('id').single(), 'pagina vuota')
  const altra = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: 'altra', titolo: 'ZZ Altra', status: 'pubblicata', nel_menu: true, blocks: [{ id: 'b-altra', type: 'about', data: { title: 'ZZ Altra pagina', text: 'Un testo scritto nel formato di prima.' } }, { id: 'b-foto', type: 'immagine', data: { image_url: '/newsletter-esempio.svg', alt: 'ZZ foto', caption: '', link_url: 'https://esempio.example/dove', width: 'medium' } },
    { id: 'b-ricco', type: 'about', data: { title: 'ZZ Ricco', text: { type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'Una frase semplice da formattare qui.' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Secondo paragrafo.' }] }] } } },
    { id: 'b-ft', type: 'foto_testo', data: { title: 'ZZ Foto e testo', text: 'Testo accanto.', image_url: '', inverti: false, button_label: '', button_url: 'https://esempio.example/pulsante' } },
    { id: 'b-gal', type: 'galleria_immagini', data: { titolo: '', images: [], columns: 3 } },
    { id: 'b-rec', type: 'recapiti', data: { titolo: 'ZZ Dove siamo', sottotitolo: '', mostra_mappa: true, nascondi: [] } },
    { id: 'b-list', type: 'listino', data: { titolo: 'ZZ Listino', sottotitolo: '', items: [{ id: 'l1', name: 'ZZ Taglio', description: 'Con piega.', price: '25 €' }, { id: 'l2', name: 'ZZ Colore', description: '', price: 'da 40 €' }], nota: 'ZZ Prezzi IVA inclusa', due_colonne: false } }] }).select('id').single(), 'altra pagina')

  console.log('\nLA PAGINA PUBBLICA, APERTA DA SOLA\n')
  for (const url of [`/r/${slug}`, `/r/${slug}?visuale=1`]) {
    const html = await (await fetch(BASE + url, { headers: { 'cache-control': 'no-cache' } })).text()
    esito(html.includes('ZZ Copertina') && !/data-blocco|ev-blocco|ev-barra/.test(html), `${url}: nel corpo grezzo non c'è niente dell'editor`)
  }

  // I due blocchi nuovi, come li legge chi apre il sito (e un motore di ricerca): nel corpo grezzo.
  {
    const html = await (await fetch(`${BASE}/r/${slug}/p/altra`, { headers: { 'cache-control': 'no-cache' } })).text()
    esito(html.includes('ZZ Dove siamo') && html.includes('Via Roma 1, 05100 Terni') && html.includes('info@zz-locale.example') && html.includes('Sabato 9:00') && html.includes('href="tel:0744123456') && html.includes('google.com/maps'),
      '«Contatti e orari» stampa nell’HTML indirizzo, telefono, email, orari e mappa presi dalle Informazioni')
    esito(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;alert(1)'), 'un recapito con dentro del codice esce come testo, non come codice')
    esito(html.includes('ZZ Taglio') && html.includes('25 €') && html.includes('da 40 €') && html.includes('Con piega.') && html.includes('ZZ Prezzi IVA inclusa'), '«Listino prezzi» stampa nell’HTML le voci, i prezzi e la nota')
  }

  const email = `zz-visuale-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 900 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  const page = await ctx.newPage()
  page.on('pageerror', e => errori.push(e.message))
  // Il controllo anti-spam di Cloudflare (blocco «Newsletter», solo in produzione)
  // scrive un suo errore in console dal proprio riquadro: non è codice nostro.
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && !(m.location()?.url || '').startsWith('https://challenges.cloudflare.com/')) errori.push('console: ' + m.text().slice(0, 300) + ' ← ' + (m.location()?.url || '?').slice(0, 120)) })
  page.on('dialog', d => d.accept())

  // Il riquadro e quello che ci si legge dentro.
  const riq = () => page.frameLocator('[data-editor-visuale] iframe')
  const ordine = () => riq().locator('[data-blocco]').evaluateAll(els => els.map(e => e.getAttribute('data-blocco')))
  const aspettaOrdine = async (atteso, cosa) => {
    let visto = []
    for (let i = 0; i < 60; i++) { visto = await ordine().catch(() => []); if (JSON.stringify(visto) === JSON.stringify(atteso)) break; await page.waitForTimeout(150) }
    esito(JSON.stringify(visto) === JSON.stringify(atteso), cosa, JSON.stringify(visto) === JSON.stringify(atteso) ? '' : `atteso ${atteso.join(' · ')} — visto ${visto.join(' · ')}`)
    return visto
  }
  // Trascina una cosa del pannello (o del riquadro) sopra una sezione del riquadro.
  // `dove`: 'sopra' = nella metà alta della sezione, 'sotto' = nella metà bassa.
  const trascina = async (sorgente, idSezione, dove) => {
    await sorgente.scrollIntoViewIfNeeded().catch(() => {})
    const da = await sorgente.boundingBox()
    const meta = async () => {
      const su = await riq().locator(`[data-blocco="${idSezione}"]`).boundingBox()
      return { x: su.x + su.width / 2, y: dove === 'sopra' ? su.y + Math.min(20, su.height * 0.2) : su.y + su.height - Math.min(20, su.height * 0.2) }
    }
    const finestra = await page.locator('[data-editor-visuale] iframe').boundingBox()
    await page.mouse.move(da.x + da.width / 2, da.y + da.height / 2)
    await page.mouse.down()
    await page.mouse.move(da.x + da.width / 2 + 12, da.y + da.height / 2 + 12, { steps: 4 })
    // Se il punto d'arrivo è fuori dalla parte visibile, ci si ferma sul bordo:
    // la pagina scorre da sola finché il punto non entra, come farebbe una persona.
    let p = await meta()
    for (let i = 0; i < 200 && (p.y < finestra.y + 45 || p.y > finestra.y + finestra.height - 45); i++) {
      const bordo = p.y < finestra.y + 45 ? finestra.y + 12 : finestra.y + finestra.height - 12
      await page.mouse.move(p.x + (i % 2), bordo, { steps: 2 })
      await page.waitForTimeout(30)
      p = await meta()
    }
    await page.mouse.move(p.x, p.y, { steps: 14 })
    await page.waitForTimeout(250)
    const linea = await riq().locator('.ev-linea').evaluate(l => getComputedStyle(l).display).catch(() => '?')
    await page.mouse.up()
    return linea
  }

  console.log('\nSI ENTRA DALL’EDITOR\n')
  await page.goto(`${BASE}/admin/pagine/${home.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  const apri = page.getByRole('button', { name: 'Editor visuale' })
  await apri.waitFor({ timeout: 120000 })
  await apri.click()
  await riq().locator('[data-blocco]').first().waitFor({ timeout: 120000 })
  await aspettaOrdine(['b-hero', 'b-chi'], 'la pagina compare e le due sezioni sono sceglibili')
  esito(await page.locator('[data-tessera]').count() > 20, 'a sinistra ci sono i blocchi da trascinare', `${await page.locator('[data-tessera]').count()} tessere`)
  esito(await page.locator('[data-tessera="menu"]').count() === 1, 'un ristorante trova anche il blocco «Menù»')
  esito(await riq().locator('[data-cookie-banner]').isVisible().catch(() => false) === false, 'nel riquadro il banner dei cookie non copre la pagina')
  await foto(page, '1-entrata')

  console.log('\nSCEGLIERE E SCRIVERE\n')
  await riq().locator('[data-blocco="b-chi"]').click({ position: { x: 40, y: 20 } })
  await page.locator('[data-scheda-blocco]').waitFor({ timeout: 15000 })
  // La scelta fa un giro: pagina → pannello → pagina. Si aspetta l'esito, non un tempo.
  const sceltaVista = await riq().locator('[data-blocco="b-chi"].ev-scelto').waitFor({ timeout: 15000 }).then(() => true, () => false)
  esito(sceltaVista, 'un clic sulla sezione la sceglie e apre la sua scheda')
  esito(await riq().locator('[data-blocco="b-chi"] .ev-barra').waitFor({ timeout: 15000 }).then(() => true, () => false), 'sulla sezione scelta compaiono i comandi')
  // Guardare non è modificare: il testo c'è già, in tutti e due i formati in cui può essere salvato.
  await page.waitForTimeout(900)
  esito(await page.locator('[data-editor-visuale]').getByText('Non salvato').count() === 0, 'scegliere una sezione non la segna come modificata')
  const campo = page.locator('[data-scheda-blocco] input').first()
  await campo.fill('ZZ Titolo cambiato')
  await riq().getByText('ZZ Titolo cambiato').first().waitFor({ timeout: 15000 }).then(() => esito(true, 'scrivere nella scheda cambia la pagina senza salvare'), () => esito(false, 'scrivere nella scheda cambia la pagina senza salvare'))
  await page.locator('[data-scheda-blocco] .ProseMirror').click()
  // Battuta in fretta, senza pause: nessuna lettera deve perdersi per strada.
  const frase = ' ZZaggiunta scritta in fretta, tutta di seguito, senza fermarsi mai'
  await page.keyboard.press('Control+End'); await page.keyboard.type(frase)
  const arrivata = await riq().getByText(frase.trim()).first().waitFor({ timeout: 15000 }).then(() => true, () => false)
  esito(arrivata, 'il testo formattato arriva sulla pagina mentre si scrive, senza perdere lettere', arrivata ? '' : (await page.locator('[data-scheda-blocco] .ProseMirror').innerText()).slice(0, 120))
  await foto(page, '2-scheda')

  console.log('\nTRASCINARE UN BLOCCO NELLA PAGINA\n')
  await page.getByRole('button', { name: '← Blocchi' }).click()
  const linea = await trascina(page.locator('[data-tessera="faq"]'), 'b-chi', 'sopra')
  esito(linea === 'block', 'mentre si trascina, una linea dice dove cadrà', `linea: ${linea}`)
  let o = await ordine()
  for (let i = 0; i < 40 && o.length !== 3; i++) { await page.waitForTimeout(150); o = await ordine() }
  const nuovo = o[1]
  esito(o.length === 3 && o[0] === 'b-hero' && o[2] === 'b-chi' && nuovo !== 'b-chi', 'il blocco cade fra le due sezioni, dove è stato lasciato', o.join(' · '))
  esito(await page.locator('[data-scheda-blocco]').count() === 1, 'e si apre subito la sua scheda, per riempirlo')
  await foto(page, '3-trascinato')

  console.log('\nSI VEDE MENTRE SI CREA\n')
  const sez = riq().locator(`[data-blocco="${nuovo}"]`)
  esito(await sez.locator('.ev-vuoto').count() === 0 && await sez.getByText('Scrivi qui la prima domanda').count() === 1, 'il blocco appena caduto è già scritto: sulla pagina si vede com’è fatto')
  await sez.locator('[data-campo]').first().waitFor({ timeout: 15000 }).then(() => esito(true, 'i suoi testi sono scrivibili sul posto'), () => esito(false, 'i suoi testi sono scrivibili sul posto'))
  // Dalla scheda: il titolo della sezione.
  await page.locator('[data-scheda-blocco] input').first().fill('ZZ Domande')
  await sez.getByText('ZZ Domande', { exact: true }).waitFor({ timeout: 15000 }).then(() => esito(true, 'scrivere il titolo nella scheda lo fa comparire sulla pagina'), () => esito(false, 'scrivere il titolo nella scheda lo fa comparire sulla pagina'))
  // Sulla pagina: si clicca il titolo e ci si scrive sopra, in fretta.
  const scrittoSulPosto = 'ZZ Scritto sulla pagina, in fretta e tutto di seguito'
  await sez.getByText('ZZ Domande', { exact: true }).click()
  await page.keyboard.press('Control+A'); await page.keyboard.type(scrittoSulPosto)
  await page.waitForTimeout(600)
  const sulPosto = await sez.locator('[data-campo]').first().innerText()
  esito(sulPosto === scrittoSulPosto, 'cliccando un testo della pagina ci si scrive sopra, senza perdere lettere né il cursore', sulPosto === scrittoSulPosto ? '' : `sulla pagina: «${sulPosto}»`)
  const nellaScheda = await page.locator('[data-scheda-blocco] input').first().inputValue()
  esito(nellaScheda === scrittoSulPosto, 'e la scheda a sinistra lo segue', nellaScheda === scrittoSulPosto ? '' : `nella scheda: «${nellaScheda}»`)
  // Si scrive in mezzo: il cursore deve restare dov'è, non saltare in cima o in fondo.
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft')
  await page.keyboard.type('QUI ')
  await page.waitForTimeout(600)
  const atteso = scrittoSulPosto.slice(0, -8) + 'QUI ' + scrittoSulPosto.slice(-8)
  esito(await sez.locator('[data-campo]').first().innerText() === atteso, 'scrivendo in mezzo a una frase il cursore resta dov’è', await sez.locator('[data-campo]').first().innerText())
  // Si cancella tutto e si riscrive: il testo non deve sparire da sotto le dita.
  await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace')
  await page.waitForTimeout(500)
  await page.keyboard.type('ZZ Riscritto')
  await sez.getByText('ZZ Riscritto', { exact: true }).waitFor({ timeout: 15000 }).then(() => esito(true, 'cancellando tutto si può riscrivere: il testo non sparisce mentre ci si lavora'), () => esito(false, 'cancellando tutto si può riscrivere: il testo non sparisce mentre ci si lavora'))
  // Un elemento della lista: la prima domanda.
  await sez.getByText('Scrivi qui la prima domanda', { exact: true }).click()
  await page.keyboard.press('Control+A'); await page.keyboard.type('ZZ Quanto costa?')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  const elementoScritto = await sez.getByText('ZZ Quanto costa?', { exact: true }).count() === 1 && await page.locator('[data-scheda-blocco] input').evaluateAll(els => els.some(e => e.value === 'ZZ Quanto costa?'))
  esito(elementoScritto, 'anche un elemento della lista si scrive sul posto, e Invio chiude', elementoScritto ? '' : (await sez.innerText()).replace(/\s+/g, ' ').slice(0, 160) + ' | scheda: ' + (await page.locator('[data-scheda-blocco] input').evaluateAll(els => els.map(e => e.value).join(' · '))).slice(0, 160))
  // Un testo formattato: si scrive nel paragrafo, subito dopo la parola in grassetto, e il grassetto resta.
  await riq().locator('[data-blocco="b-chi"] strong').click()
  await page.keyboard.press('Home'); for (let i = 0; i < 'Testo di prova'.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.type(' ZZdentro')
  await page.locator('[data-scheda-blocco] .ProseMirror').filter({ hasText: 'Testo di prova ZZdentro della sezione.' }).waitFor({ timeout: 15000 }).then(() => esito(true, 'si scrive anche dentro un testo formattato, e la scheda lo segue'), () => esito(false, 'si scrive anche dentro un testo formattato, e la scheda lo segue'))
  await page.keyboard.press('Escape')
  await riq().locator(`[data-blocco="${nuovo}"]`).click({ position: { x: 30, y: 12 } })
  await riq().locator(`[data-blocco="${nuovo}"].ev-scelto`).waitFor({ timeout: 15000 })
  // Quello che la pagina non può chiedere: scrivere in un campo che non è fatto di parole.
  await page.frames().find(f => f.url().includes(`/r/${slug}`)).evaluate(id => {
    const d = (percorso, valore) => window.parent.postMessage({ tipo: 'oltrenova:campo-scritto', id, percorso, valore }, window.location.origin)
    d(['items', 0, 'id'], 'OSTILE')
    d(['__proto__', 'inquinato'], 'OSTILE')
    d(['constructor'], 'OSTILE')
    d(['items', 99, 'question'], 'OSTILE')
    d(['campo_nuovo'], 'OSTILE')
    d(['items'], 'OSTILE')
    d(['titolo'], { type: 'doc' })
    d(['titolo'], 'X'.repeat(5000))
    d('titolo', 'OSTILE')
  }, nuovo)
  await page.frames().find(f => f.url().includes(`/r/${slug}`)).evaluate(() => {
    const d = (percorso, valore) => window.parent.postMessage({ tipo: 'oltrenova:campo-scritto', id: 'b-chi', percorso, valore }, window.location.origin)
    d(['text', 'type'], 'OSTILE')
    d(['text', 'content', 0, 'type'], 'OSTILE')
    d(['text', 'content', 0, 'content', 0, 'marks'], 'OSTILE')
    d(['text', 'content', 0, 'content', 0, 'text'], '')
    d(['text', 'content', 0, 'attrs', 'textAlign'], 'OSTILE')
  })
  await page.frames().find(f => f.url().includes(`/r/${slug}`)).evaluate(() => window.parent.postMessage({ tipo: 'oltrenova:campo-scritto', id: 'b-hero', percorso: ['bg_image_url'], valore: 'https://ostile.example/x.png' }, window.location.origin))
  await page.waitForTimeout(700)
  esito(await sez.getByText('ZZ Riscritto', { exact: true }).count() === 1 && await riq().getByText('OSTILE').count() === 0 && await page.evaluate(() => ({}).inquinato === undefined), 'un messaggio che scrive in un identificativo, in un indirizzo o fuori dai campi esistenti non cambia niente')

  console.log('\nI COMANDI SULLA SEZIONE\n')
  await riq().locator('.ev-barra button[title="Sposta giù"]').click()
  await aspettaOrdine(['b-hero', 'b-chi', nuovo], '«Sposta giù» la porta sotto')
  esito(await riq().locator('.ev-barra button[title="Sposta giù"]').isDisabled(), 'sull’ultima sezione «Sposta giù» è spento')
  await riq().locator('.ev-barra button[title="Sposta su"]').click()
  await aspettaOrdine(['b-hero', nuovo, 'b-chi'], '«Sposta su» la riporta sopra')
  await riq().locator('.ev-barra button[title="Duplica"]').click()
  let dopo = await ordine(); for (let i = 0; i < 40 && dopo.length !== 4; i++) { await page.waitForTimeout(150); dopo = await ordine() }
  esito(dopo.length === 4 && dopo[1] === nuovo && dopo[3] === 'b-chi', '«Duplica» ne mette una copia subito sotto', dopo.join(' · '))
  const copia = dopo[2]
  await riq().locator('.ev-barra button[title="Elimina"]').click()
  await aspettaOrdine(['b-hero', nuovo, 'b-chi'], '«Elimina» (dopo la conferma) toglie la sezione scelta')
  esito(copia !== nuovo, 'la copia aveva un suo identificativo')

  // La maniglia: si sceglie l'ultima sezione e la si porta in cima.
  await riq().locator('[data-blocco="b-chi"]').click({ position: { x: 40, y: 20 } })
  await riq().locator('[data-blocco="b-chi"] .ev-barra').waitFor({ timeout: 15000 })
  await trascina(riq().locator('.ev-barra span[draggable]'), 'b-hero', 'sopra')
  await aspettaOrdine(['b-chi', 'b-hero', nuovo], 'trascinando dalla maniglia la sezione va dove la si lascia')
  await page.getByTitle('Annulla (Ctrl+Z)').last().click()
  await aspettaOrdine(['b-hero', nuovo, 'b-chi'], '«Annulla» rimette le cose com’erano')

  console.log('\nVALORI OSTILI\n')
  // Dal riquadro: un tipo che non esiste, un id che non è di questa pagina.
  await page.frames().find(f => f.url().includes(`/r/${slug}`)).evaluate(() => {
    const d = m => window.parent.postMessage(m, window.location.origin)
    d({ tipo: 'oltrenova:blocco-rilasciato', cosa: 'nuovo:inesistente', prima: null })
    d({ tipo: 'oltrenova:blocco-rilasciato', cosa: 'nuovo:__proto__', prima: null })
    d({ tipo: 'oltrenova:blocco-rilasciato', cosa: 'sposta:b-altra', prima: null })
    d({ tipo: 'oltrenova:blocco-azione', id: 'b-altra', azione: 'elimina' })
    d({ tipo: 'oltrenova:blocco-azione', id: 'b-hero', azione: 'formatta-tutto' })
  })
  // Dalla finestra del pannello stesso: non è il riquadro, non si ascolta.
  await page.evaluate(() => window.postMessage({ tipo: 'oltrenova:blocco-azione', id: 'b-hero', azione: 'elimina' }, window.location.origin))
  await page.waitForTimeout(700)
  await aspettaOrdine(['b-hero', nuovo, 'b-chi'], 'tipi inventati, id di altre pagine e messaggi non del riquadro non cambiano niente')
  // Un link del sito, dentro l'editor, non porta via.
  const prima = page.frames().find(f => f.url().includes(`/r/${slug}`)).url()
  const link = riq().locator('a[href*="/privacy"]').first()
  esito(await link.count() === 1, 'nel riquadro c’è un link del sito da provare')
  await link.click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const dopoClic = page.frames().find(f => f.url().includes(`/r/${slug}`))?.url()
  esito(dopoClic === prima, 'un link del sito, dentro l’editor, non porta su un’altra pagina', dopoClic || 'riquadro sparito')

  console.log('\nSALVARE\n')
  await page.frames().find(f => f.url().includes(`/r/${slug}`)).evaluate(() => { window.__nonRicaricata = true })
  await page.locator('[data-editor-visuale]').getByRole('button', { name: 'Salva', exact: true }).click()
  await page.locator('[data-editor-visuale]').getByText('Salvato ✓').waitFor({ timeout: 30000 })
  const salvata = await deve(a.from('pagine').select('blocks').eq('id', home.id).single(), 'rilettura')
  esito(JSON.stringify(salvata.blocks.map(b => b.id)) === JSON.stringify(['b-hero', nuovo, 'b-chi']), 'nel database c’è lo stesso ordine che si vede', salvata.blocks.map(b => b.type).join(' · '))
  esito(salvata.blocks[2].data.title === 'ZZ Titolo cambiato' && salvata.blocks[1].type === 'faq', 'con il testo scritto e il blocco trascinato')
  const doc = salvata.blocks[2].data.text
  esito(doc?.type === 'doc' && doc.content.length === 1 && doc.content[0].type === 'paragraph' && doc.content[0].content[0].text.startsWith('Testo di prova') && doc.content[0].content[0].marks?.[0]?.type === 'bold' && doc.content[0].content.map(x => x.text).join('').startsWith('Testo di prova ZZdentro della sezione.') && doc.content[0].attrs?.textAlign == null,
    'il testo formattato scritto sulla pagina è salvato col suo grassetto, e il documento ha la forma di prima', JSON.stringify(doc).slice(0, 220))
  const faq = salvata.blocks[1].data
  esito(faq.titolo === 'ZZ Riscritto' && faq.items?.[0]?.question === 'ZZ Quanto costa?' && faq.items.length === 2 && faq.items.every(x => typeof x.id === 'string' && x.id !== 'OSTILE') && !('campo_nuovo' in faq) && !salvata.blocks[0].data.bg_image_url,
    'e i testi scritti sulla pagina, senza niente di quello che i messaggi ostili chiedevano', JSON.stringify(faq).slice(0, 200))
  esito(await page.frames().find(f => f.url().includes(`/r/${slug}`)).evaluate(() => window.__nonRicaricata === true), 'salvando la pagina non si ricarica: si resta dove si stava lavorando')
  const pubblica = await (await fetch(`${BASE}/r/${slug}`, { headers: { 'cache-control': 'no-cache' } })).text()
  esito(pubblica.includes('ZZ Titolo cambiato') && !/data-blocco|ev-blocco/.test(pubblica), 'sul sito arriva la modifica, e niente dell’editor')

  console.log('\nGLI ELEMENTI DI UNA LISTA, DALLA PAGINA\n')
  const quadro = () => page.frames().find(f => f.url().includes(`/r/${slug}`))
  const domande = () => sez.locator('[data-campo]').evaluateAll(els => els.filter(e => (e.getAttribute('data-campo') || '').includes('question')).map(e => e.innerText))
  const aspettaDomande = async (atteso, cosa) => {
    let viste = []
    for (let i = 0; i < 60; i++) { viste = await domande().catch(() => []); if (JSON.stringify(viste) === JSON.stringify(atteso)) break; await page.waitForTimeout(150) }
    esito(JSON.stringify(viste) === JSON.stringify(atteso), cosa, JSON.stringify(viste) === JSON.stringify(atteso) ? '' : viste.join(' · '))
  }
  const attrezzo = async (testo, quale) => {
    await page.mouse.move(5, 5)
    await sez.getByText(testo, { exact: true }).first().hover()
    await riq().locator('.ev-attrezzi').waitFor({ state: 'visible', timeout: 15000 })
    if (quale === 'duplica') await foto(page, '3a-attrezzi')
    await riq().locator(`.ev-attrezzi button[data-az="${quale}"]`).click()
  }
  await attrezzo('ZZ Quanto costa?', 'duplica')
  await aspettaDomande(['ZZ Quanto costa?', 'ZZ Quanto costa?', 'Scrivi qui la seconda domanda'], 'passando su una domanda compaiono i comandi, e «copia» ne aggiunge un’altra subito sotto')
  await attrezzo('Scrivi qui la seconda domanda', 'prima')
  await aspettaDomande(['ZZ Quanto costa?', 'Scrivi qui la seconda domanda', 'ZZ Quanto costa?'], '«Sposta prima» la porta su di un posto')
  await attrezzo('Scrivi qui la seconda domanda', 'elimina')
  await aspettaDomande(['ZZ Quanto costa?', 'ZZ Quanto costa?'], '«Togli» la toglie')
  esito(await page.locator('[data-avviso]').getByRole('button', { name: 'Annulla' }).count() === 1, 'e un avviso offre di annullare')
  await page.locator('[data-avviso]').getByRole('button', { name: 'Annulla' }).click()
  await aspettaDomande(['ZZ Quanto costa?', 'Scrivi qui la seconda domanda', 'ZZ Quanto costa?'], '«Annulla» la rimette')
  await quadro().evaluate(id => {
    const d = (lista, indice, azione) => window.parent.postMessage({ tipo: 'oltrenova:elemento-azione', id, lista, indice, azione }, window.location.origin)
    d('__proto__', 0, 'elimina'); d('titolo', 0, 'elimina'); d('items', 99, 'elimina'); d('items', -1, 'duplica'); d('items', '0', 'elimina'); d('items', 0, 'svuota'); d('items', 0, 'prima')
    window.parent.postMessage({ tipo: 'oltrenova:elemento-azione', id: 'b-altra', lista: 'items', indice: 0, azione: 'elimina' }, window.location.origin)
  }, nuovo)
  await page.waitForTimeout(700)
  await aspettaDomande(['ZZ Quanto costa?', 'Scrivi qui la seconda domanda', 'ZZ Quanto costa?'], 'una lista inventata, un posto che non c’è o un comando fuori elenco non cambiano niente')

  console.log('\nIL «+», IL TASTO DESTRO, I TASTI\n')
  // Il «+» sta sul bordo alto della sezione: la si porta a metà schermo, o resta sotto l'intestazione del sito.
  await sez.evaluate(e => e.scrollIntoView({ block: 'center' }))
  await sez.hover({ position: { x: 30, y: 60 } })
  await sez.locator('> .ev-piu').first().click()
  await page.locator('[data-inserisci-qui]').waitFor({ timeout: 15000 }).then(() => esito(true, 'il «+» sopra una sezione chiede a sinistra cosa metterci'), () => esito(false, 'il «+» sopra una sezione chiede a sinistra cosa metterci'))
  await page.locator('[data-tessera="annuncio"]').click()
  o = await ordine(); for (let i = 0; i < 40 && o.length !== 4; i++) { await page.waitForTimeout(150); o = await ordine() }
  const ann = o[1]
  esito(o.length === 4 && o[0] === 'b-hero' && o[2] === nuovo, 'e il blocco scelto compare proprio lì', o.join(' · '))
  // Il tasto destro: il menu della sezione.
  const destro = async (id, voce) => {
    await riq().locator(`[data-blocco="${id}"]`).click({ button: 'right', position: { x: 24, y: 10 } })
    await riq().locator('.ev-menu').waitFor({ state: 'visible', timeout: 15000 })
    if (voce === 'Copia') await foto(page, '3a-menu')
    await riq().locator('.ev-menu button', { hasText: voce }).click()
  }
  let dialoghi = 0; page.on('dialog', () => { dialoghi++ })
  await destro(ann, 'Copia')
  await destro('b-chi', 'Incolla qui sotto')
  o = await ordine(); for (let i = 0; i < 40 && o.length !== 5; i++) { await page.waitForTimeout(150); o = await ordine() }
  const incollato = o[4]
  esito(o.length === 5 && o[3] === 'b-chi' && await riq().locator(`[data-blocco="${incollato}"]`).getByText('Scrivi qui il tuo annuncio').count() === 1, 'col tasto destro si copia una sezione e la si incolla sotto un’altra', o.join(' · '))
  await destro(incollato, 'Elimina')
  await aspettaOrdine(['b-hero', ann, nuovo, 'b-chi'], '«Elimina» dal menu la toglie')
  esito(dialoghi === 0 && await page.locator('[data-avviso]').getByText('eliminata').count() === 1, 'senza una finestra di conferma: resta un avviso con «Annulla»')
  // I tasti, con il fuoco dentro la pagina.
  await riq().locator('[data-blocco="b-chi"]').click({ position: { x: 40, y: 20 } })
  await riq().locator('[data-blocco="b-chi"].ev-scelto').waitFor({ timeout: 15000 })
  await page.keyboard.press('Delete')
  await aspettaOrdine(['b-hero', ann, nuovo], '«Canc» elimina la sezione scelta')
  await page.keyboard.press('Control+z')
  await aspettaOrdine(['b-hero', ann, nuovo, 'b-chi'], 'Ctrl+Z la rimette, anche col fuoco dentro la pagina')
  await riq().locator('[data-blocco="b-chi"]').click({ position: { x: 40, y: 20 } })
  await riq().locator('[data-blocco="b-chi"].ev-scelto').waitFor({ timeout: 15000 })
  await page.keyboard.press('Control+d')
  o = await ordine(); for (let i = 0; i < 40 && o.length !== 5; i++) { await page.waitForTimeout(150); o = await ordine() }
  esito(o.length === 5 && o[3] === 'b-chi' && o[2] === nuovo, 'Ctrl+D la duplica', o.join(' · '))
  await page.keyboard.press('Delete')
  await aspettaOrdine(['b-hero', ann, nuovo, 'b-chi'], 'e «Canc» toglie la copia')
  // Mentre si scrive, «Canc» cancella una lettera e non la sezione.
  await riq().locator(`[data-blocco="${ann}"] [data-campo]`).first().click()
  await page.keyboard.press('End'); await page.keyboard.press('Backspace'); await page.keyboard.press('Home'); await page.keyboard.press('Delete')
  await page.waitForTimeout(500)
  esito((await ordine()).length === 4 && await riq().locator(`[data-blocco="${ann}"]`).getByText('crivi qui il tuo annunci', { exact: true }).count() === 1, 'mentre si scrive, «Canc» e «Backspace» cancellano lettere e non la sezione')
  await page.keyboard.press('Control+s')
  await page.locator('[data-editor-visuale]').getByText('Salvato ✓').waitFor({ timeout: 30000 }).then(() => esito(true, 'Ctrl+S salva, anche mentre si scrive sulla pagina'), () => esito(false, 'Ctrl+S salva, anche mentre si scrive sulla pagina'))
  const dopoTasti = await deve(a.from('pagine').select('blocks').eq('id', home.id).single(), 'rilettura')
  esito(JSON.stringify(dopoTasti.blocks.map(b => b.id)) === JSON.stringify(['b-hero', ann, nuovo, 'b-chi']) && dopoTasti.blocks[1].data.text === 'crivi qui il tuo annunci' && dopoTasti.blocks[2].data.items.length === 3,
    'e nel database c’è quello che si vede', dopoTasti.blocks.map(b => b.type).join(' · '))
  await page.keyboard.press('Escape')

  console.log('\nLA STRUTTURA DELLA PAGINA, LE SCHEDE, IL TABLET\n')
  await riq().locator('[data-blocco="b-chi"]').click({ position: { x: 40, y: 20 } })
  await page.locator('[data-scheda-blocco]').waitFor({ timeout: 15000 })
  // La linguetta della scheda, non il pulsante «Stile» della barra (logo e colori del sito).
  await page.locator('[data-editor-visuale] button:not([data-apri-stile])', { hasText: /^Stile$/ }).click()
  esito(await page.locator('[data-scheda-blocco]').getByText('Spaziatura verticale').count() === 1 && await page.locator('[data-scheda-blocco] input[type="text"]').count() <= 2, 'la scheda ha due linguette: in «Stile» c’è solo lo stile')
  await page.locator('[data-editor-visuale]').getByRole('button', { name: 'Contenuto', exact: true }).click()
  esito(await page.locator('[data-scheda-blocco]').getByText('Spaziatura verticale').count() === 0, 'e in «Contenuto» solo i contenuti')
  await page.getByRole('button', { name: '← Blocchi' }).click()
  await page.getByRole('button', { name: 'Struttura della pagina' }).click()
  const righe = () => page.locator('[data-riga-struttura]').evaluateAll(els => els.map(e => e.getAttribute('data-riga-struttura')))
  esito(JSON.stringify(await righe()) === JSON.stringify(['b-hero', ann, nuovo, 'b-chi']), 'la struttura elenca le sezioni nell’ordine della pagina', (await righe()).join(' · '))
  // Si trascina l'ultima riga sopra la seconda.
  const maniglia = await page.locator('[data-riga-struttura="b-chi"] span[draggable]').boundingBox()
  const meta = await page.locator(`[data-riga-struttura="${ann}"]`).boundingBox()
  await page.mouse.move(maniglia.x + 6, maniglia.y + 6); await page.mouse.down()
  await page.mouse.move(maniglia.x + 16, maniglia.y - 10, { steps: 4 })
  await page.mouse.move(meta.x + 80, meta.y + 6, { steps: 12 }); await page.waitForTimeout(250); await page.mouse.up()
  await aspettaOrdine(['b-hero', 'b-chi', ann, nuovo], 'trascinando una riga della struttura la sezione cambia posto anche sulla pagina')
  await page.locator(`[data-riga-struttura="${nuovo}"]`).getByText('FAQ').click()
  esito(await riq().locator(`[data-blocco="${nuovo}"].ev-scelto`).waitFor({ timeout: 15000 }).then(() => true, () => false) && await page.locator('[data-scheda-blocco]').count() === 1, 'un clic su una riga sceglie la sezione e apre la sua scheda')
  await page.getByTitle('Annulla (Ctrl+Z)').last().click()
  await aspettaOrdine(['b-hero', ann, nuovo, 'b-chi'], 'e «Annulla» rimette l’ordine')
  await foto(page, '3b-struttura')
  await page.getByRole('button', { name: 'Tablet' }).click()
  await page.waitForTimeout(400)
  const tablet = await quadro().evaluate(() => ({ largo: window.innerWidth, stessa: window.__nonRicaricata === true }))
  esito(tablet.largo === 820 && tablet.stessa, 'in «Tablet» la pagina è larga come un tablet, senza ricaricarsi', JSON.stringify(tablet))
  await page.getByRole('button', { name: 'Computer' }).click()
  await foto(page, '3b-come-elementor')

  console.log('\nTELEFONO, E RITORNO ALL’ELENCO\n')
  await page.getByRole('button', { name: 'Telefono' }).click()
  await riq().locator('[data-blocco]').first().waitFor({ timeout: 60000 })
  const largo = await page.locator('[data-editor-visuale] iframe').evaluate(f => f.getBoundingClientRect().width)
  esito(largo > 360 && largo < 400, 'in «Telefono» la pagina è larga come un telefono', `${Math.round(largo)}px`)
  await aspettaOrdine(['b-hero', ann, nuovo, 'b-chi'], 'e mostra le stesse sezioni')
  await foto(page, '4-telefono')
  await page.getByRole('button', { name: '← Torna all\'elenco dei blocchi' }).click()
  esito(await page.locator('[data-editor-visuale]').count() === 0 && await page.getByRole('button', { name: 'Aggiungi blocco' }).isVisible(), 'si torna all’elenco di sempre, con gli stessi blocchi')

  console.log('\nUNA PAGINA ANCORA VUOTA\n')
  await page.goto(`${BASE}/admin/pagine/${vuota.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByRole('button', { name: 'Editor visuale' }).click()
  await riq().locator('.ev-inizio').waitFor({ timeout: 120000 }).then(() => esito(true, 'la pagina vuota mostra dove far cadere il primo blocco'), () => esito(false, 'la pagina vuota mostra dove far cadere il primo blocco'))
  const centro = await page.locator('[data-editor-visuale] iframe').boundingBox()
  const tess = await page.locator('[data-tessera="about"]').boundingBox()
  await page.mouse.move(tess.x + 20, tess.y + 12); await page.mouse.down()
  await page.mouse.move(tess.x + 40, tess.y + 30, { steps: 4 })
  await page.mouse.move(centro.x + centro.width / 2, centro.y + 260, { steps: 14 })
  await page.waitForTimeout(250); await page.mouse.up()
  let primo = []; for (let i = 0; i < 40 && primo.length !== 1; i++) { await page.waitForTimeout(150); primo = await ordine().catch(() => []) }
  esito(primo.length === 1 && await riq().locator('.ev-inizio').count() === 0, 'il primo blocco trascinato ci cade dentro')
  await page.locator('[data-tessera]').count() // la scheda del blocco è aperta: si torna ai blocchi per il clic
  await page.getByRole('button', { name: '← Blocchi' }).click()
  await page.locator('[data-tessera="cta_banner"]').click()
  let due = []; for (let i = 0; i < 40 && due.length !== 2; i++) { await page.waitForTimeout(150); due = await ordine().catch(() => []) }
  esito(due.length === 2 && due[0] === primo[0], 'un clic su un blocco della colonna lo mette in fondo')
  await foto(page, '5-pagina-vuota')

  console.log('\nOGNI BLOCCO CHE SI SCRIVE NASCE GIÀ VISIBILE\n')
  const scritti = ['hero', 'hero_slider', 'foto_testo', 'annuncio', 'newsletter', 'colonne', 'paragrafi', 'highlights', 'steps', 'stats', 'accordion', 'faq', 'listino', 'team', 'carosello', 'promozioni', 'pacchetti', 'titolo', 'citazione', 'linguette', 'tabella', 'popup', 'mosaico', 'scorrevole']
  const muti = []
  for (const tipo of scritti) {
    await page.getByRole('button', { name: '← Blocchi' }).click()
    const quanti = (await ordine()).length
    await page.locator(`[data-tessera="${tipo}"]`).click()
    let ora = []; for (let i = 0; i < 40 && ora.length !== quanti + 1; i++) { await page.waitForTimeout(150); ora = await ordine().catch(() => []) }
    const ultima = riq().locator(`[data-blocco="${ora[ora.length - 1]}"]`)
    const scrivibile = await ultima.locator('[data-campo]').first().waitFor({ timeout: 8000 }).then(() => true, () => false)
    if (ora.length !== quanti + 1 || await ultima.locator('.ev-vuoto').count() || !scrivibile) muti.push(tipo)
  }
  esito(muti.length === 0, `i ${scritti.length} blocchi fatti di testi compaiono appena aggiunti, con i testi scrivibili sul posto`, muti.join(' · '))
  // Chi non può nascere scritto (serve un'immagine, un indirizzo) dice cosa gli manca.
  await page.getByRole('button', { name: '← Blocchi' }).click()
  await page.locator('[data-tessera="pulsante"]').click()
  await riq().getByText('compare quando ha un testo e una destinazione').waitFor({ timeout: 15000 }).then(() => esito(true, 'un blocco che non può ancora comparire dice cosa gli manca'), () => esito(false, 'un blocco che non può ancora comparire dice cosa gli manca'))
  await foto(page, '6-tutti-i-blocchi')

  console.log('\nUN TESTO NEL FORMATO DI PRIMA\n')
  await page.goto(`${BASE}/admin/pagine/${altra.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByRole('button', { name: 'Editor visuale' }).click()
  await riq().locator('[data-blocco="b-altra"]').click({ position: { x: 40, y: 20 }, timeout: 120000 })
  await riq().locator('[data-blocco="b-altra"].ev-scelto').waitFor({ timeout: 15000 })
  await page.locator('[data-scheda-blocco] .ProseMirror').waitFor({ timeout: 15000 })
  await page.waitForTimeout(900)
  esito(await page.locator('[data-editor-visuale]').getByText('Non salvato').count() === 0, 'anche qui, scegliere la sezione non la segna come modificata')

  console.log('\nUNA FOTO SI CAMBIA DALLA PAGINA\n')
  const quadroAltra = () => page.frames().find(f => f.url().includes(`/r/${slug}/p/altra`))
  // Quello che la pagina non può chiedere: «cambia foto» su un campo che non è una foto.
  let sceltaChiesta = 0; page.on('filechooser', () => { sceltaChiesta++ })
  await quadroAltra().evaluate(() => {
    const d = (id, percorso) => window.parent.postMessage({ tipo: 'oltrenova:cambia-foto', id, percorso }, window.location.origin)
    d('b-foto', ['link_url']); d('b-foto', ['alt']); d('b-foto', ['__proto__']); d('b-foto', 'image_url'); d('b-altra', ['image_url']); d('b-hero', ['image_url'])
  })
  await page.waitForTimeout(700)
  esito(sceltaChiesta === 0, 'un messaggio che chiede di cambiare «la foto» di un link o di un testo non apre niente')
  await page.mouse.move(5, 5)
  await riq().locator('[data-blocco="b-foto"] img').hover()
  await riq().locator('.ev-attrezzi button[data-az="foto"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => esito(true, 'passando su una foto compare «Cambia foto»'), () => esito(false, 'passando su una foto compare «Cambia foto»'))
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64')
  const [scelta] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null), riq().locator('.ev-attrezzi button[data-az="foto"]').click()])
  esito(!!scelta, 'e un clic apre la scelta del file')
  if (scelta) {
    await scelta.setFiles({ name: 'zz-foto.png', mimeType: 'image/png', buffer: png })
    const nuova = await riq().locator('[data-blocco="b-foto"] img[src^="https://"]').waitFor({ timeout: 45000 }).then(() => true, () => false)
    esito(nuova, 'la foto caricata prende il posto di quella di prima, sulla pagina', nuova ? '' : await page.locator('[data-avviso]').innerText().catch(() => 'nessun avviso'))
    await page.keyboard.press('Control+s')
    await page.locator('[data-editor-visuale]').getByText('Salvato ✓').waitFor({ timeout: 30000 }).catch(() => {})
    const conFoto = await deve(a.from('pagine').select('blocks').eq('id', altra.id).single(), 'rilettura')
    const f = conFoto.blocks[1].data
    esito(/^https:\/\//.test(f.image_url) && f.link_url === 'https://esempio.example/dove' && f.alt === 'ZZ foto', 'nel database è cambiata solo la foto: il link e il testo sono quelli di prima', JSON.stringify(f).slice(0, 200))
  }

  console.log('\nLA FOTO CHE MANCA SI AGGIUNGE DALLA PAGINA\n')
  const carica = async (sezione, cosa) => {
    await page.mouse.move(5, 5)
    await riq().locator(`[data-blocco="${sezione}"]`).hover({ position: { x: 30, y: 30 } })
    const bottone = riq().locator(`[data-blocco="${sezione}"] .ev-aggiungi-foto button`).first()
    if (!await bottone.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)) { esito(false, cosa, 'il pulsante non compare'); return }
    const [sc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null), bottone.click()])
    if (!sc) { esito(false, cosa, 'non si apre la scelta del file'); return }
    await sc.setFiles({ name: 'zz-foto.png', mimeType: 'image/png', buffer: png })
    const vista = await riq().locator(`[data-blocco="${sezione}"] img[src^="https://"]`).waitFor({ timeout: 45000 }).then(() => true, () => false)
    esito(vista, cosa, vista ? '' : await page.locator('[data-avviso]').innerText().catch(() => 'nessun avviso'))
  }
  await carica('b-ft', 'un blocco senza foto offre «Aggiungi la foto», e la foto caricata compare al suo posto')
  esito(await riq().locator('[data-blocco="b-gal"] .ev-vuoto').count() === 1, 'una galleria vuota si vede, e dice cosa le manca')
  await carica('b-gal', 'e da lì si carica la sua prima foto')
  await quadroAltra().evaluate(() => {
    const d = (id, percorso) => window.parent.postMessage({ tipo: 'oltrenova:cambia-foto', id, percorso }, window.location.origin)
    d('b-gal', ['images', 7]); d('b-gal', ['images', -1]); d('b-ft', ['button_url']); d('b-ft', ['images', 0]); d('b-ft', ['items', 0, 'image_url'])
  })
  await page.waitForTimeout(700)
  esito(sceltaChiesta === 3, 'un posto che non c’è (una foto a metà galleria, il link di un pulsante) non apre niente', `scelte di file aperte: ${sceltaChiesta}`)

  console.log('\nGRASSETTO, LINK E A-CAPO SULLA PAGINA\n')
  const par = riq().locator('[data-blocco="b-ricco"] p').first()
  const seleziona = parola => quadroAltra().evaluate(p => {
    const el = document.activeElement
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n
    while ((n = w.nextNode())) { const i = n.data.indexOf(p); if (i >= 0) { window.getSelection().setBaseAndExtent(n, i, n, i + p.length); return true } }
    return false
  }, parola)
  await par.click()
  const barra = await riq().locator('.ev-formato').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
  esito(barra, 'cliccando un paragrafo compare la barra della formattazione', barra ? '' : await quadroAltra().evaluate(() => { const p = document.querySelector('[data-blocco="b-ricco"] p'); const f = document.querySelector('.ev-formato'); return (p?.outerHTML || 'nessun p').slice(0, 260) + ' | attivo: ' + document.activeElement?.tagName + ' | barra: ' + (f ? f.style.cssText + ' ' + f.className : 'non c’è') }))
  await foto(page, '7-ricco')
  await seleziona('semplice')
  await riq().locator('.ev-formato [data-f="bold"]').click()
  await seleziona('formattare')
  await riq().locator('.ev-formato [data-f="link"]').click()
  await riq().locator('.ev-formato input').fill('esempio.example/dove')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Control+End'); await page.keyboard.press('Enter'); await page.keyboard.type('Riga nuova, scritta in fretta e di seguito')
  await page.locator('[data-scheda-blocco] .ProseMirror strong').filter({ hasText: 'semplice' }).waitFor({ timeout: 15000 }).then(() => esito(true, 'mentre si scrive, la scheda a sinistra segue anche la formattazione'), () => esito(false, 'mentre si scrive, la scheda a sinistra segue anche la formattazione'))
  await page.keyboard.press('Escape')
  await riq().locator('[data-blocco="b-ricco"] p strong').filter({ hasText: 'semplice' }).waitFor({ timeout: 15000 }).catch(() => {})
  const comE = await quadroAltra().evaluate(() => {
    const p = document.querySelectorAll('[data-blocco="b-ricco"] p')
    return { forte: p[0].querySelector('strong')?.textContent, link: p[0].querySelector('a')?.getAttribute('href'), parolaLink: p[0].querySelector('a')?.textContent, acapo: p[0].querySelectorAll('br').length, testo: p[0].textContent, secondo: p[1]?.textContent, centrato: getComputedStyle(p[0]).textAlign, modificabile: p[0].getAttribute('contenteditable') }
  })
  esito(comE.forte === 'semplice' && comE.link === 'https://esempio.example/dove' && comE.parolaLink === 'formattare' && comE.acapo === 1 && comE.testo === 'Una frase semplice da formattare qui.Riga nuova, scritta in fretta e di seguito' && comE.secondo === 'Secondo paragrafo.' && comE.centrato === 'center',
    'usciti dal paragrafo restano il grassetto, il link e l’a-capo; l’altro paragrafo e l’allineamento non cambiano', JSON.stringify(comE))
  await page.keyboard.press('Control+s')
  await page.locator('[data-editor-visuale]').getByText('Salvato ✓').waitFor({ timeout: 30000 }).catch(() => {})
  const attesoRicco = [{ type: 'text', text: 'Una frase ' }, { type: 'text', text: 'semplice', marks: [{ type: 'bold' }] }, { type: 'text', text: ' da ' }, { type: 'text', text: 'formattare', marks: [{ type: 'link', attrs: { href: 'https://esempio.example/dove' } }] }, { type: 'text', text: ' qui.' }, { type: 'hardBreak' }, { type: 'text', text: 'Riga nuova, scritta in fretta e di seguito' }]
  const ordinato = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(c => [c, x[c]])) : x)
  let ricca = (await deve(a.from('pagine').select('blocks').eq('id', altra.id).single(), 'rilettura')).blocks
  esito(ordinato(ricca[2].data.text.content[0].content) === ordinato(attesoRicco) && ricca[2].data.text.content[0].attrs?.textAlign === 'center' && ordinato(ricca[2].data.text.content[1]) === ordinato({ type: 'paragraph', content: [{ type: 'text', text: 'Secondo paragrafo.' }] }) && ricca[2].data.text.content.length === 2,
    'nel database il paragrafo ha esattamente quei pezzi, e il resto del documento è com’era', JSON.stringify(ricca[2].data.text.content[0].content).slice(0, 300))
  esito(/^https:\/\//.test(ricca[3].data.image_url) && ricca[3].data.button_url === 'https://esempio.example/pulsante' && ricca[4].data.images.length === 1 && /^https:\/\//.test(ricca[4].data.images[0].url) && typeof ricca[4].data.images[0].id === 'string',
    'e le foto aggiunte sono al loro posto, senza toccare il link del pulsante', JSON.stringify(ricca[4].data).slice(0, 160))
  // Entrare in un paragrafo e uscirne senza scrivere non è una modifica.
  await riq().locator('[data-blocco="b-ricco"] p').nth(1).click()
  await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(900)
  esito(await page.locator('[data-editor-visuale]').getByText('Non salvato').count() === 0, 'entrare in un paragrafo e uscirne senza scrivere non lo segna come modificato')
  // Quello che la pagina non può chiedere.
  await quadroAltra().evaluate(() => {
    const d = (percorso, contenuto, id = 'b-ricco') => window.parent.postMessage({ tipo: 'oltrenova:paragrafo-scritto', id, percorso, contenuto }, window.location.origin)
    const t = (text, marks) => [marks ? { type: 'text', text, marks } : { type: 'text', text }]
    d(['text', 'content', 1], t('OSTILE', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))
    d(['text', 'content', 1], t('OSTILE', [{ type: 'link', attrs: { href: 'data:text/html,x' } }]))
    d(['text', 'content', 1], [{ type: 'image', attrs: { src: 'https://ostile.example/x.png' } }])
    d(['text', 'content', 1], t('OSTILE', [{ type: 'code' }]))
    d(['text', 'content', 1], [{ type: 'text', text: 'OSTILE', attrs: { onclick: 'x' }, marks: [] , extra: 1 }].map(x => ({ ...x, marks: [{ type: 'bold', attrs: { style: 'x' } }, { type: 'textStyle' }] })))
    d(['text', 'content', 9], t('OSTILE')); d(['text'], t('OSTILE')); d(['text', 'content'], t('OSTILE')); d(['title', 'content', 0], t('OSTILE')); d(['text', 'attrs', 0], t('OSTILE'))
    d(['text', 'content', 1], 'OSTILE'); d(['text', 'content', 1], []); d(['text', 'content', 1], t('OSTILE'), 'b-inesistente')
    window.parent.postMessage({ tipo: 'oltrenova:campo-scritto', id: 'b-ricco', percorso: ['text', 'content', 1, 'content', 0, 'text'], valore: 'OSTILE' }, window.location.origin)
  })
  await page.waitForTimeout(800)
  esito(await riq().getByText('OSTILE').count() === 0 && await page.locator('[data-editor-visuale]').getByText('Non salvato').count() === 0, 'un link «javascript:», un’immagine, un segno inventato o un percorso fuori dal paragrafo non cambiano niente')
  // Un testo nel formato di prima va a capo con Invio.
  await riq().locator('[data-blocco="b-altra"] p').first().click()
  await page.keyboard.press('Control+End'); await page.keyboard.press('Enter'); await page.keyboard.type('ZZ riga due')
  await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(700)
  await page.keyboard.press('Control+s')
  await page.locator('[data-editor-visuale]').getByText('Salvato ✓').waitFor({ timeout: 30000 }).catch(() => {})
  ricca = (await deve(a.from('pagine').select('blocks').eq('id', altra.id).single(), 'rilettura')).blocks
  esito(ricca[0].data.text === 'Un testo scritto nel formato di prima.\nZZ riga due', 'in un testo che sul sito va a capo, Invio va a capo', JSON.stringify(ricca[0].data.text).slice(0, 160))

  console.log('\nINTESTAZIONE E PIEDE, E L’USCITA CON MODIFICHE NON SALVATE\n')
  await riq().locator('footer').first().click({ position: { x: 20, y: 20 } })
  const porta = await page.locator('[data-avviso] a').getAttribute('href', { timeout: 15000 }).catch(() => null)
  esito(!!porta && porta.endsWith(`/admin/ristoranti/${ent.id}/sito?tab=layout`) && await page.locator('[data-avviso]').getByText('Il piede è lo stesso su tutte le pagine').count() === 1, 'un clic sul piede dice dove si cambia e offre la porta per andarci', porta || 'nessun avviso')
  if (porta) {
    const altraScheda = await ctx.newPage()
    await altraScheda.goto(BASE + porta, { waitUntil: 'domcontentloaded', timeout: 120000 })
    esito(await altraScheda.getByRole('heading', { name: 'Intestazione e piede' }).waitFor({ timeout: 120000 }).then(() => true, () => false), 'la porta arriva davvero dove intestazione e piede si cambiano')
    await altraScheda.close()
  }
  await riq().locator('nav.snav').first().click({ position: { x: 8, y: 8 } })
  esito(await page.locator('[data-avviso]').getByText('L\'intestazione è la stessa su tutte le pagine').waitFor({ timeout: 15000 }).then(() => true, () => false), 'e lo stesso per l’intestazione')
  // Con una modifica non salvata, ricaricare la pagina fa chiedere conferma al browser.
  await riq().locator('[data-blocco="b-ricco"] p').nth(1).click()
  await page.keyboard.press('Control+End'); await page.keyboard.type(' ZZ in sospeso'); await page.keyboard.press('Escape')
  await page.locator('[data-editor-visuale]').getByText('Non salvato').waitFor({ timeout: 15000 })
  let chiesto = 0; page.on('dialog', d => { if (d.type() === 'beforeunload') chiesto++ })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {})
  esito(chiesto === 1, 'ricaricando con modifiche non salvate il browser chiede conferma', `richieste: ${chiesto}`)

  console.log('\nCONTATTI E ORARI, LISTINO PREZZI\n')
  await page.goto(`${BASE}/admin/pagine/${altra.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByRole('button', { name: 'Editor visuale' }).click()
  const rec = riq().locator('[data-blocco="b-rec"]')
  await rec.getByText('Via Roma 1, 05100 Terni').waitFor({ timeout: 120000 }).then(() => esito(true, 'nell’editor «Contatti e orari» mostra i recapiti dell’entità'), () => esito(false, 'nell’editor «Contatti e orari» mostra i recapiti dell’entità'))
  await page.waitForTimeout(800)
  const scrivibili = await rec.locator('[data-campo]').evaluateAll(els => els.map(e => e.textContent))
  esito(JSON.stringify(scrivibili) === JSON.stringify(['ZZ Dove siamo']), 'lì si scrive il titolo; indirizzo, telefono e orari no: non sono del blocco', scrivibili.join(' · '))
  await rec.click({ position: { x: 12, y: 12 } })
  await page.locator('[data-recapiti-nota] a').waitFor({ timeout: 15000 })
  const versoInfo = await page.locator('[data-recapiti-nota] a').getAttribute('href')
  esito(versoInfo === `/admin/ristoranti/${ent.id}/info`, 'la scheda dice che i dati stanno nelle Informazioni, e offre la porta', versoInfo)
  {
    const info = await ctx.newPage()
    await info.goto(BASE + versoInfo, { waitUntil: 'domcontentloaded', timeout: 120000 })
    esito(await info.locator('input').evaluateAll(els => els.some(e => e.value === 'Via Roma 1, 05100 Terni')).catch(() => false) || await info.getByText('Orari di apertura').waitFor({ timeout: 120000 }).then(() => info.locator('input').evaluateAll(els => els.some(e => e.value === 'Via Roma 1, 05100 Terni')), () => false), 'la porta arriva dove indirizzo e orari si cambiano davvero')
    await info.close()
  }
  await page.locator('[data-scheda-blocco] label', { hasText: 'Orari' }).locator('input').uncheck()
  await rec.getByText('Sabato 9:00').waitFor({ state: 'detached', timeout: 15000 }).then(() => esito(true, 'spegnendo «Orari» nella scheda la riga sparisce dalla pagina'), () => esito(false, 'spegnendo «Orari» nella scheda la riga sparisce dalla pagina'))
  await page.locator('[data-scheda-blocco] label', { hasText: 'La mappa accanto' }).locator('input').uncheck()
  await rec.locator('iframe').waitFor({ state: 'detached', timeout: 15000 }).then(() => esito(true, 'e spegnendo la mappa resta la sola colonna dei recapiti'), () => esito(false, 'e spegnendo la mappa resta la sola colonna dei recapiti'))
  // Il listino: il prezzo si corregge sulla pagina, e una voce si copia coi comandi.
  const lis = riq().locator('[data-blocco="b-list"]')
  await lis.getByText('25 €', { exact: true }).click()
  await page.keyboard.press('Control+A'); await page.keyboard.type('28 €'); await page.keyboard.press('Enter')
  await page.mouse.move(5, 5)
  await lis.getByText('ZZ Colore', { exact: true }).hover()
  await riq().locator('.ev-attrezzi button[data-az="duplica"]').click({ timeout: 15000 })
  await page.waitForTimeout(600)
  await page.keyboard.press('Control+s')
  await page.locator('[data-editor-visuale]').getByText('Salvato ✓').waitFor({ timeout: 30000 }).catch(() => {})
  const nuovi = (await deve(a.from('pagine').select('blocks').eq('id', altra.id).single(), 'rilettura')).blocks
  const l = nuovi.find(b => b.id === 'b-list').data, r = nuovi.find(b => b.id === 'b-rec').data
  esito(l.items.length === 3 && l.items[0].price === '28 €' && l.items[1].name === 'ZZ Colore' && l.items[2].name === 'ZZ Colore' && l.items[2].id !== l.items[1].id, 'nel listino il prezzo scritto sulla pagina e la voce copiata sono salvati', JSON.stringify(l.items).slice(0, 220))
  esito(JSON.stringify(r.nascondi) === JSON.stringify(['orari']) && r.mostra_mappa === false && !('address' in r) && !('phone' in r), 'nel blocco dei contatti si salvano solo le scelte, mai una copia dei recapiti', JSON.stringify(r))

  console.log('\nERRORI\n')
  esito(errori.length === 0, 'nessun errore nel browser', errori.slice(0, 3).join(' | '))
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message.split('\n').slice(0, 9).join(' ⏎ ')}`)
  if (errori.length) console.log('    errori nel browser fin qui: ' + errori.slice(0, 4).join(' | '))
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
