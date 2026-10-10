// Sonda: il blocco «Slider eventi» — e gli eventi stampati già nell'HTML.
//
// Crea un sito di prova con cinque eventi, una home con lo slider e una pagina
// «eventi» con l'elenco. Poi guarda come lo guarda un visitatore:
//  - gli eventi sono nel CORPO GREZZO della pagina (non arrivano solo dal browser);
//  - su computer e su telefono si vede il numero di schede scelto;
//  - frecce, dito e tempo fanno scorrere; una scheda apre il suo evento;
//  - il pulsante porta dove è stato detto, e senza destinazione non c'è;
//  - valori ostili (forma, indirizzo del pulsante) tornano al predefinito.
// Poi le altre cose nate insieme: la scheda «solo locandina», la forma delle
// locandine nell'elenco, il titolo principale (H1) delle pagine senza copertina.
// Infine apre l'editor come il titolare: l'anteprima mostra le modifiche PRIMA
// di salvare, le impostazioni si salvano, e «Pubblica» pubblica davvero.
//
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-slider-eventi.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let az = null, utente = null, browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }

try {
  const t = Date.now().toString(36)
  const slug = `zz-slider-${t}`
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-SLIDER-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale', slug, active: true, minisito: { active: true } }).select().single(), 'entità')
  for (let n = 1; n <= 5; n++) {
    await deve(a.from('eventi').insert({
      azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: `ZZSerata${n}`, slug: `zz-serata-${n}-${t}`,
      date_start: new Date(Date.now() + (n + 5) * 86400000).toISOString(), cover_url: `${BASE}/newsletter-esempio.svg`,
      published: true, active: true, notify_owner_on_booking: false,
    }).select('id').single(), `evento ${n}`)
  }
  const slider = (extra = {}) => ({ id: 'b2', type: 'eventi_slider', data: { titolo: 'ZZ In programma', formato: 'verticale', per_view_mobile: 1, per_view_desktop: 3, autoplay: true, interval: 2, cta_label: '', cta_url: `/r/${slug}/p/eventi`, ...extra } })
  const hero = { id: 'b1', type: 'hero', data: { title: 'ZZ Locale', height: 'compatta' } }
  const home = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [hero, slider()] }).select('id').single(), 'home')
  // Il carosello scritto a mano usa lo stesso motore dello slider: va riprovato insieme.
  await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: 'carosello', titolo: 'Carosello', status: 'pubblicata', blocks: [{ id: 'c1', type: 'carosello', data: {
    titolo: 'ZZ Carosello', per_view: 3, autoplay: false, show_arrows: true, show_dots: true,
    items: [1, 2, 3, 4, 5].map(n => ({ id: `i${n}`, title: `ZZScheda${n}`, text: 'testo', image_url: `${BASE}/newsletter-esempio.svg` })),
  } }] }).select('id').single(), 'pagina carosello')
  const pagEventi = await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: 'eventi', titolo: 'Eventi', status: 'pubblicata', nel_menu: true, blocks: [{ id: 'e1', type: 'eventi', data: {} }] }).select('id').single(), 'pagina eventi')
  const impostaSlider = extra => deve(a.from('pagine').update({ blocks: [hero, slider(extra)] }).eq('id', home.id).select('id'), 'blocco')

  console.log('\nNEL CORPO GREZZO (quello che legge un motore di ricerca)\n')
  for (const [nome, url, attesi] of [['home con lo slider', `/r/${slug}`, 5], ['pagina «eventi» con l’elenco', `/r/${slug}/p/eventi`, 5], ['home in inglese', `/en/r/${slug}`, 5]]) {
    const r = await fetch(BASE + url, { headers: { 'cache-control': 'no-cache' } }); const html = await r.text()
    const trovati = [1, 2, 3, 4, 5].filter(n => html.includes(`ZZSerata${n}`)).length
    esito(r.status === 200 && trovati === attesi, `${nome}: ${trovati} eventi su ${attesi} nell’HTML`, r.status !== 200 ? `risponde ${r.status}` : '')
  }

  browser = await chromium.launch()
  // Quante schede stanno dentro la finestra dello slider, e dove sta la prima.
  const misura = page => page.evaluate(() => {
    const schede = [...document.querySelectorAll('a[href*="/eventi/zz-serata-"]')]
    const finestra = schede[0]?.closest('[data-scorrimento]')?.getBoundingClientRect()
    if (!finestra) return { schede: schede.length, visibili: 0 }
    const dentro = schede.filter(s => { const r = s.getBoundingClientRect(); return r.left >= finestra.left - 2 && r.right <= finestra.right + 2 })
    const img = schede[0].querySelector('img')?.getBoundingClientRect()
    const bottone = [...document.querySelectorAll('a')].find(x => /tutti gli eventi|ZZ Tutti|ZZ Vedi|See all events/i.test(x.innerText))
    return {
      schede: schede.length, visibili: dentro.length, prima: dentro[0]?.innerText.split('\n')[0] || null,
      rapporto: img ? Math.round(img.width / img.height * 100) / 100 : null,
      bottone: bottone ? { testo: bottone.innerText, href: bottone.getAttribute('href') } : null,
      sborda: document.documentElement.scrollWidth > window.innerWidth,
    }
  })
  const apri = async (larghezza, url = `/r/${slug}`, locale = 'it-IT') => {
    const ctx = await browser.newContext({ locale, viewport: { width: larghezza, height: 900 }, hasTouch: larghezza < 600 })
    const page = await ctx.newPage()
    page.errori = []; page.on('pageerror', e => page.errori.push(e.message))
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.locator('a[href*="/eventi/zz-serata-1-"]').first().waitFor({ state: 'attached', timeout: 60000 })
    // Le schede sono già nell'HTML: frecce e conti arrivano quando il browser ha finito.
    await page.locator('[data-scorrimento="pronto"]').first().waitFor({ state: 'attached', timeout: 60000 }).catch(() => {})
    return page
  }

  console.log('\nSU COMPUTER\n')
  let page = await apri(1280)
  let m = await misura(page)
  esito(m.schede === 5 && m.visibili === 3, `cinque schede, tre per volta`, `schede ${m.schede}, visibili ${m.visibili}`)
  esito(m.rapporto === 0.8, 'la locandina è verticale (4:5)', `rapporto ${m.rapporto}`)
  esito(m.bottone?.testo === 'Scopri tutti gli eventi' && m.bottone.href === `/r/${slug}/p/eventi`, 'il pulsante ha il testo predefinito e porta alla pagina scelta', JSON.stringify(m.bottone))
  esito(!m.sborda, 'niente esce dallo schermo')
  await page.mouse.move(640, 500) // sopra lo slider: l'avanzamento da solo si ferma
  await page.getByRole('button', { name: 'Successiva' }).click()
  await page.waitForTimeout(900)
  esito((await misura(page)).prima === 'ZZSerata2', 'la freccia fa avanzare di una scheda')
  await page.mouse.move(5, 5)
  await page.waitForFunction(() => {
    const s = [...document.querySelectorAll('a[href*="/eventi/zz-serata-"]')]; const f = s[0].closest('[data-scorrimento]').getBoundingClientRect()
    return s.find(x => x.getBoundingClientRect().left >= f.left - 2)?.innerText.startsWith('ZZSerata3')
  }, null, { timeout: 8000 }).then(() => esito(true, 'da solo avanza dopo il tempo scelto (2 secondi)')).catch(() => esito(false, 'da solo avanza dopo il tempo scelto (2 secondi)'))
  await page.locator('a[href*="/eventi/zz-serata-3-"]').click()
  await page.waitForURL(/\/eventi\/zz-serata-3-/, { timeout: 30000 }).then(() => esito(true, 'una scheda apre il suo evento')).catch(() => esito(false, 'una scheda apre il suo evento', page.url()))
  esito(page.errori.length === 0, 'nessun errore nel browser', page.errori.slice(0, 2).join(' | '))
  await page.context().close()

  page = await apri(1280, `/r/${slug}`)
  await page.locator('a', { hasText: 'Scopri tutti gli eventi' }).click()
  await page.waitForURL(/\/p\/eventi/, { timeout: 30000 }).catch(() => {})
  await page.getByText('ZZSerata5').first().waitFor({ timeout: 30000 }).catch(() => {})
  esito(/\/p\/eventi/.test(page.url()) && await page.locator('a[href*="/eventi/zz-serata-"]').count() === 5, 'il pulsante apre la pagina con tutti e cinque gli eventi', page.url())
  await page.context().close()

  console.log('\nIL CAROSELLO (stesso motore)\n')
  for (const [larghezza, attese] of [[1280, 3], [800, 2], [390, 1]]) {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: larghezza, height: 900 } })
    const pc = await ctx.newPage(); const err = []; pc.on('pageerror', e => err.push(e.message))
    await pc.goto(`${BASE}/r/${slug}/p/carosello`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await pc.locator('[data-scorrimento="pronto"]').first().waitFor({ state: 'attached', timeout: 60000 }).catch(() => {})
    const conta = () => pc.evaluate(() => {
      const f = document.querySelector('[data-scorrimento]').getBoundingClientRect()
      const dentro = [...document.querySelectorAll('[data-scorrimento] h3')].filter(h => { const r = h.getBoundingClientRect(); return r.left >= f.left && r.right <= f.right })
      return { visibili: dentro.length, prima: dentro[0]?.innerText, puntini: document.querySelectorAll('button[aria-label^="Vai a "]').length }
    })
    const prima = await conta()
    // Su telefono le frecce non ci sono: si avanza col dito, o da un puntino.
    await pc.getByRole('button', { name: larghezza < 640 ? 'Vai a 2' : 'Successiva' }).click(); await pc.waitForTimeout(900)
    const dopo = await conta()
    esito(prima.visibili === attese && prima.puntini === 5 - attese + 1 && dopo.prima === 'ZZScheda2' && !err.length, `a ${larghezza}px: ${attese} per volta, puntini giusti, e si avanza`, JSON.stringify({ prima, dopo, err: err[0] }))
    await ctx.close()
  }

  console.log('\nSU TELEFONO\n')
  page = await apri(390)
  m = await misura(page)
  esito(m.schede === 5 && m.visibili === 1 && !m.sborda, 'una scheda per volta, niente fuori schermo', `visibili ${m.visibili}`)
  esito(!(await page.getByRole('button', { name: 'Successiva' }).isVisible().catch(() => false)), 'su telefono le frecce non ci sono (si scorre col dito)')
  esito(await page.locator('button[aria-label^="Vai a "]').count() === 5, 'i puntini sì')
  // Il dito vero, mandato al browser come lo manda uno schermo: da destra a sinistra.
  const cdp = await page.context().newCDPSession(page)
  const riq = await page.locator('[data-scorrimento]').boundingBox()
  const y = riq.y + 150, x0 = riq.x + riq.width - 40
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] })
  for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - k * 22, y }] }); await page.waitForTimeout(16) }
  const aMeta = await page.evaluate(() => Math.round(document.querySelector('[data-scorrimento]').scrollLeft))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  esito(aMeta > 60, 'la fila segue il dito mentre lo si trascina', `a metà gesto si è spostata di ${aMeta}px`)
  await page.waitForFunction(() => {
    const f = document.querySelector('[data-scorrimento]').getBoundingClientRect()
    const primo = [...document.querySelectorAll('a[href*="/eventi/zz-serata-"]')].find(x => { const r = x.getBoundingClientRect(); return r.left >= f.left - 2 && r.right <= f.right + 2 })
    return primo?.innerText.startsWith('ZZSerata2')
  }, null, { timeout: 6000 }).then(() => esito(true, 'alzato il dito si aggancia alla scheda dopo')).catch(() => esito(false, 'alzato il dito si aggancia alla scheda dopo'))
  // Si aspetta l'esito, non un tempo: lo scorrimento finisce quando finisce.
  await page.waitForFunction(() => document.querySelector('button[aria-label="Vai a 2"]')?.getBoundingClientRect().width > 12, null, { timeout: 6000 })
    .then(() => esito(true, 'e il puntino acceso è il secondo')).catch(() => esito(false, 'e il puntino acceso è il secondo'))
  esito(page.errori.length === 0, 'nessun errore nel browser', page.errori.slice(0, 2).join(' | '))
  await page.context().close()

  console.log('\nALTRE SCELTE, E VALORI OSTILI\n')
  await impostaSlider({ per_view_mobile: 2, per_view_desktop: 4, formato: '1/1;background:url(//x)', cta_label: 'ZZ Tutti', cta_url: 'javascript:alert(1)', autoplay: false, limit: 4 })
  page = await apri(390)
  m = await misura(page)
  esito(m.schede === 4 && m.visibili === 2, 'telefono: due per volta, e quattro eventi in tutto (il limite)', `schede ${m.schede}, visibili ${m.visibili}`)
  esito(m.rapporto === 0.8, 'una forma inventata torna al verticale', `rapporto ${m.rapporto}`)
  esito(m.bottone?.testo === 'ZZ Tutti' && !/javascript/i.test(m.bottone.href || ''), 'il testo è quello scritto; un indirizzo «javascript:» non passa', JSON.stringify(m.bottone))
  // I due valori viaggiano come DATI del blocco (testo inerte): quello che
  // non deve succedere è che diventino un attributo href o uno stile.
  const attivi = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e =>
    (e.getAttribute('href') || '').trim().toLowerCase().startsWith('javascript:') || (e.getAttribute('style') || '').includes('//x')).length)
  const corpo = await (await fetch(`${BASE}/r/${slug}`)).text()
  esito(attivi === 0 && !/href="javascript:/i.test(corpo) && !/style="[^"]*\/\/x/.test(corpo), 'nessun attributo li porta, né nella pagina né nel corpo grezzo', `elementi ${attivi}`)
  await page.context().close()
  page = await apri(1280)
  esito((await misura(page)).visibili === 4, 'computer: quattro per volta')
  await page.context().close()

  await impostaSlider({ cta_url: '', per_view_desktop: 4, limit: 2 })
  page = await apri(1280)
  m = await misura(page)
  esito(m.schede === 2 && m.visibili === 2 && !m.bottone, 'senza destinazione il pulsante non c’è; due eventi soli stanno al centro senza frecce', JSON.stringify(m))
  esito(await page.getByRole('button', { name: 'Successiva' }).count() === 0, 'niente frecce quando non c’è da scorrere')
  await page.context().close()

  console.log('\nSOLO LA LOCANDINA\n')
  await impostaSlider({ scheda: 'locandina', autoplay: false })
  page = await apri(1280)
  const sola = await page.evaluate(() => { const s = document.querySelector('a[href*="/eventi/zz-serata-1-"]'); return { testo: s.innerText.trim(), alt: s.querySelector('img')?.alt || '', nome: s.getAttribute('aria-label') || '' } })
  esito(sola.testo === '' && sola.alt.startsWith('ZZSerata1') && sola.nome.startsWith('ZZSerata1'), 'nessun testo sotto, ma il titolo resta per chi non vede la foto', JSON.stringify(sola))
  await page.locator('a[href*="/eventi/zz-serata-2-"]').click()
  await page.waitForURL(/\/eventi\/zz-serata-2-/, { timeout: 30000 }).then(() => esito(true, 'la locandina apre il suo evento')).catch(() => esito(false, 'la locandina apre il suo evento', page.url()))
  await page.context().close()

  console.log('\nL’ELENCO: LA FORMA DELLE LOCANDINE\n')
  const formaElenco = async () => {
    const pe = await apri(1280, `/r/${slug}/p/eventi`).catch(() => null); if (!pe) return null
    const r = await pe.evaluate(() => { const i = document.querySelector('a[href*="/eventi/zz-serata-1-"] img').getBoundingClientRect(); return { alta: Math.round(i.height), rapporto: Math.round(i.width / i.height * 100) / 100 } })
    await pe.context().close(); return r
  }
  let fe = await formaElenco()
  esito(fe?.alta === 180, 'senza scelta resta la fascia di sempre (180px)', JSON.stringify(fe))
  await deve(a.from('pagine').update({ blocks: [{ id: 'e1', type: 'eventi', data: { formato: 'verticale' } }] }).eq('id', pagEventi.id).select('id'), 'forma elenco')
  fe = await formaElenco()
  esito(fe?.rapporto === 0.8, 'scelta «verticale»: la locandina si vede intera (4:5)', JSON.stringify(fe))
  await deve(a.from('pagine').update({ blocks: [{ id: 'e1', type: 'eventi', data: { formato: 'x;height:9999px' } }] }).eq('id', pagEventi.id).select('id'), 'forma ostile')
  fe = await formaElenco()
  esito(fe?.alta === 180, 'una forma inventata torna alla fascia', JSON.stringify(fe))

  console.log('\nIL TITOLO PRINCIPALE (H1)\n')
  for (const [nome, url, atteso] of [['home con la copertina', `/r/${slug}`, 'ZZ Locale'], ['pagina «eventi» senza copertina', `/r/${slug}/p/eventi`, 'Prossimi eventi']]) {
    const html = await (await fetch(BASE + url)).text()
    const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(x => x[1].replace(/<[^>]+>/g, '').trim())
    esito(h1.length === 1 && h1[0] === atteso, `${nome}: un solo H1, nel corpo grezzo`, JSON.stringify(h1))
  }

  console.log('\nIL TITOLARE LO REGOLA DALL’EDITOR\n')
  await impostaSlider({})
  const email = `zz-slider-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1440, height: 950 },
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] } })
  page = await ctx.newPage()
  const errori = []; page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/pagine/${home.id}`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Slider eventi').first().waitFor({ timeout: 60000 })
  await page.getByText('Slider eventi').first().click()
  await page.getByText('Forma delle locandine').waitFor({ timeout: 15000 }).then(() => esito(true, 'il blocco si apre e mostra le sue impostazioni')).catch(() => esito(false, 'il blocco si apre e mostra le sue impostazioni'))
  // L'anteprima mostra la modifica PRIMA di salvare.
  await page.getByRole('button', { name: /Anteprima/ }).first().click()
  const riquadro = page.frameLocator('iframe[title="Anteprima desktop"]')
  await riquadro.getByText('ZZ In programma').first().waitFor({ timeout: 60000 }).catch(() => {})
  await page.locator('div', { has: page.locator('> label:text-is("Titolo sezione (vuoto = predefinito)")') }).locator('input').first().fill('ZZ Dal vivo')
  await riquadro.getByText('ZZ Dal vivo').first().waitFor({ timeout: 15000 }).then(() => esito(true, 'l’anteprima mostra la modifica senza salvare')).catch(() => esito(false, 'l’anteprima mostra la modifica senza salvare'))
  const nonSalvato = (await deve(a.from('pagine').select('blocks').eq('id', home.id).single(), 'rilettura')).blocks.find(b => b.type === 'eventi_slider').data.titolo
  esito(nonSalvato === 'ZZ In programma', 'e nel database non è cambiato niente finché non si salva', nonSalvato)
  await page.getByTitle('Chiudi').click()
  const computer = page.locator('div', { has: page.locator('> label:text-is("Schede per volta — computer")') }).locator('select')
  await computer.selectOption('4')
  await page.getByText('Quadrato', { exact: true }).click()
  await page.getByPlaceholder('Scopri tutti gli eventi').fill('ZZ Vedi il programma')
  const salvato = page.waitForResponse(r => r.request().method() !== 'GET' && /\/api\/pagine\//.test(r.url()), { timeout: 45000 })
  await page.getByRole('button', { name: 'Salva', exact: true }).click()
  esito((await salvato).status() === 200, 'il salvataggio riesce')
  const dopo = (await deve(a.from('pagine').select('blocks').eq('id', home.id).single(), 'rilettura')).blocks.find(b => b.type === 'eventi_slider').data
  esito(dopo.per_view_desktop === 4 && dopo.formato === 'quadrato' && dopo.cta_label === 'ZZ Vedi il programma' && dopo.titolo === 'ZZ Dal vivo', 'nel database ci sono le scelte fatte', JSON.stringify(dopo))
  // Una bozza dice cosa comporta, e «Pubblica» pubblica.
  await deve(a.from('pagine').update({ status: 'bozza' }).eq('id', pagEventi.id).select('id'), 'bozza')
  page.on('dialog', d => d.accept())
  await page.goto(`${BASE}/admin/pagine/${pagEventi.id}`, { waitUntil: 'domcontentloaded' })
  const stato = page.locator('[data-stato-pagina]')
  await stato.waitFor({ timeout: 60000 })
  esito(/nel menu non compare finché non la pubblichi/.test(await stato.innerText()), 'la bozza dice che nel menu non compare')
  let risposta = page.waitForResponse(r => r.request().method() !== 'GET' && /\/api\/pagine\//.test(r.url()), { timeout: 45000 })
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click()
  const statoDi = async () => (await deve(a.from('pagine').select('status').eq('id', pagEventi.id).single(), 'stato')).status
  esito((await risposta).status() === 200 && await statoDi() === 'pubblicata', '«Pubblica» pubblica davvero, in un gesto')
  await page.locator('[data-stato-pagina="pubblicata"]').waitFor({ timeout: 15000 }).then(() => esito(true, 'e l’editor lo dice: pubblicata, online e nel menu')).catch(() => esito(false, 'e l’editor lo dice'))
  risposta = page.waitForResponse(r => r.request().method() !== 'GET' && /\/api\/pagine\//.test(r.url()), { timeout: 45000 })
  await page.getByRole('button', { name: 'Riporta in bozza' }).click()
  esito((await risposta).status() === 200 && await statoDi() === 'bozza', '«Riporta in bozza» chiede conferma e la toglie dal sito')
  await deve(a.from('pagine').update({ status: 'pubblicata' }).eq('id', pagEventi.id).select('id'), 'ripubblica')
  esito(errori.length === 0, 'nessun errore nel browser', errori.slice(0, 2).join(' | '))
  await ctx.close()
  page = await apri(1280)
  m = await misura(page)
  esito(m.visibili === 4 && m.rapporto === 1 && m.bottone?.testo === 'ZZ Vedi il programma', 'e sul sito si vedono: quattro schede quadrate e il pulsante col suo testo', JSON.stringify(m))
  await page.context().close()

  console.log('\n' + '─'.repeat(64))
  console.log(rossi ? `${rossi} COSE NON TORNANO` : 'LO SLIDER DEGLI EVENTI FA QUELLO CHE DICE')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); rossi++
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log('[probe] pulito')
  process.exit(rossi ? 1 : 0)
}
