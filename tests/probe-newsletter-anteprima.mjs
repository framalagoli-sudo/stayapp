// L'anteprima della newsletter: si vede subito, ed è l'email vera.
//
// 05/10/2026, Francesco aprendo le newsletter per la prima volta: «non possiamo
// mettere un'anteprima in tempo reale di come verrà la mail? non si capisce
// niente». L'anteprima c'era, ma nascosta dietro un pulsante e disegnata da una
// copia a parte: senza logo, con un altro piede. Ora è accesa e la disegna lo
// stesso costruttore dell'invio.
//
// Cosa prova, col browser:
//   1. aprendo una bozza l'anteprima c'è già, col colore e i dati dell'azienda;
//   2. scrivendo, cambia da sola (titolo, oggetto, {{nome}});
//   3. quello che si scrive non diventa codice nell'anteprima (caso ostile);
//   4. su telefono non si rompe: si alterna con il pulsante;
//   5. «A chi la mandi»: le liste dei Contatti coi loro numeri, sempre a vista;
//      il campo dei tag non c'è più; la route delle liste dà solo titoli e
//      conteggi, e solo della propria azienda;
//   6. i modelli si vedono: quattro miniature dell'email vera; cambiando
//      modello resta ciò che il nuovo sa mostrare, e il resto si chiede.
//
// Nessuna email parte. Azienda ZZ, si pulisce da sola.
// Uso: cd tests && TEST_URL=http://localhost:3000 node probe-newsletter-anteprima.mjs [cartella-foto]
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const foto = process.argv[2]
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const t = Date.now()

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
let az = null, altra = null, utente = null, browser = null
try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-ANTEPRIMA-${t}`, partita_iva: '01234567890', citta: 'Terni', require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale Anteprima', slug: `zz-ant-${t}`, active: true, theme: { primaryColor: '#b4530a' } }).select().single(), 'entità')
  const nl = await deve(a.from('newsletters').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, status: 'draft', template_id: 'semplice',
    subject: 'Ciao {{nome}}, venerdì si suona', preheader: 'Posti limitati', content: { heading: 'ZZ Titolo iniziale', text: 'Ti aspettiamo.', image_url: '', cta_text: 'Prenota', cta_url: 'https://example.com' } }).select().single(), 'newsletter')
  // Tre contatti: due iscritti, e un'etichetta («ZZ Amici») su due di loro, di cui uno solo iscritto.
  const persona = (nome, mail, iscritto, tags = []) => deve(a.from('contatti').insert({ azienda_id: az.id, nome, email: mail, fonte: 'manuale', pipeline_stage: null, iscritto_newsletter: iscritto, tags }).select().single(), 'contatto')
  await persona('ZZ Anna Segreta', `zz-anna-${t}@playwright.internal`, true, ['ZZ Amici'])
  await persona('ZZ Bruno Segreto', `zz-bruno-${t}@playwright.internal`, false, ['ZZ Amici'])
  await persona('ZZ Carla Segreta', `zz-carla-${t}@playwright.internal`, true)
  const vuota = await deve(a.from('newsletters').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, status: 'draft', template_id: 'semplice', subject: '', content: {} }).select().single(), 'newsletter vuota')
  altra = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-ANTEPRIMA-VICINA-${t}`, require_2fa: false }).select().single(), 'azienda vicina')
  const email = `zz-ant-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const stato = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${projectRef}-auth-token`, value: JSON.stringify(s.session) }] }] }

  browser = await chromium.launch()
  console.log('\n1 · SU COMPUTER\n')
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1360, height: 900 }, storageState: stato })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  await page.goto(`${BASE}/admin/newsletter/${nl.id}`, { waitUntil: 'domcontentloaded' })
  const riquadro = page.locator('[data-anteprima-newsletter]')
  await riquadro.waitFor({ timeout: 60000 })
  const email_ = page.frameLocator('[data-anteprima-newsletter] iframe')
  await email_.getByText('ZZ Titolo iniziale').waitFor({ timeout: 15000 }).catch(() => {})
  ok(await email_.getByText('ZZ Titolo iniziale').count() === 1, 'aprendo la bozza l’anteprima c’è già, senza premere niente')
  const corpo = await email_.locator('body').innerText()
  ok(/ZZ Locale Anteprima/.test(corpo) && /Annulla iscrizione/.test(corpo) && /P\.IVA 01234567890/.test(corpo), 'è l’email vera: nome del locale, «Annulla iscrizione» e dati legali dell’azienda')
  const bottone = await email_.getByText('Prenota', { exact: true }).evaluate(el => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return '' }).catch(() => '')
  ok(bottone === 'rgb(180, 83, 10)', `il pulsante ha il colore del locale (${bottone})`)
  const posta = (await page.locator('[data-riga-posta]').innerText()).replace(/\s+/g, ' ')
  ok(/ZZ Locale Anteprima/.test(posta) && /Ciao Mario, venerdì si suona/.test(posta) && /Posti limitati/.test(posta), `sopra si legge com’è nella casella di posta: «${posta.replace('Nella casella di posta ', '')}»`)
  const fuori = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(fuori <= 0, `la pagina non sfora di lato (${fuori}px)`)
  if (foto) await page.screenshot({ path: `${foto}/newsletter-anteprima-computer.png` })

  console.log('\n2 · SCRIVENDO\n')
  // Il campo si riconosce dal valore, che poi cambia: gli si mette un segno prima di scriverci.
  await page.locator('input[value="ZZ Titolo iniziale"]').evaluate(el => el.setAttribute('data-zz-titolo', '1'))
  const titolo = page.locator('[data-zz-titolo]')
  await titolo.fill('Venerdì jazz dal vivo')
  await email_.getByText('Venerdì jazz dal vivo').waitFor({ timeout: 8000 }).catch(() => {})
  ok(await email_.getByText('Venerdì jazz dal vivo').count() === 1 && await email_.getByText('ZZ Titolo iniziale').count() === 0, 'cambiando il titolo l’anteprima cambia da sola')
  await page.locator('[data-vista="telefono"]').click()
  const largo = await page.locator('[data-anteprima-newsletter] iframe').evaluate(el => el.getBoundingClientRect().width)
  ok(Math.round(largo) === 390, `«Telefono» la stringe alla larghezza di un telefono (${Math.round(largo)}px)`)
  const stretta = await email_.locator('body').evaluate(b => b.scrollWidth - b.clientWidth)
  ok(stretta <= 0, `e l’email ci sta senza scorrere di lato (${stretta}px)`)
  if (foto) await page.screenshot({ path: `${foto}/newsletter-anteprima-telefono.png` })
  await page.locator('[data-vista="computer"]').click()
  await titolo.fill('<img src=x onerror="window.top.__colpito=1"><script>window.top.__colpito=1</script>Ciao {{nome}}')
  await email_.getByText('Ciao Mario').waitFor({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(600)
  ok(await page.evaluate(() => window.__colpito) !== 1 && await email_.locator('img[src="x"], script').count() === 0 && /<img src=x/.test(await email_.locator('body').innerText()),
    'codice scritto nel titolo resta testo: non diventa né immagine né script')
  // L'indirizzo dell'immagine finiva grezzo dentro l'attributo: con una virgoletta si usciva dall'attributo.
  await page.getByPlaceholder('URL immagine (opzionale)').first().fill('https://example.com/a.jpg" onerror="window.top.__colpito=1" data-zz="1')
  await email_.locator('img').first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {})
  ok(await email_.locator('img[data-zz], img[onerror]').count() === 0 && await email_.locator('img').count() >= 1, 'una virgoletta nell’indirizzo dell’immagine non esce dall’attributo')

  console.log('\n3 · A CHI LA MANDI\n')
  const H = { Authorization: `Bearer ${s.session.access_token}` }
  const grezzo = async (percorso, headers) => { const r = await fetch(BASE + percorso, { headers }); return { stato: r.status, testo: await r.text() } }
  const mie = await grezzo('/api/newsletter/liste', H)
  const j = JSON.parse(mie.testo)
  const amici = j.liste?.find(l => l.chiave === 'etichetta|ZZ Amici')
  ok(mie.stato === 200 && j.tutti.persone === 3 && j.tutti.raggiungibili === 2 && amici?.persone === 2 && amici?.raggiungibili === 1, `la route conta: 2 iscritti su 3 contatti, e 1 su 2 nella lista «ZZ Amici» (${JSON.stringify(j.tutti)} · ${JSON.stringify(amici)})`)
  ok(!/Segret|@playwright|zz-anna|zz-bruno/i.test(mie.testo) && j.liste.every(l => Object.keys(l).sort().join() === 'chiave,gruppo,persone,raggiungibili,titolo'), 'escono solo titoli e numeri: nessun nome, nessun indirizzo')
  ok((await grezzo('/api/newsletter/liste')).stato === 401, 'senza login non risponde')
  const altrui = await grezzo(`/api/newsletter/liste?azienda_id=${altra.id}`, H)
  ok(altrui.stato === 200 && JSON.parse(altrui.testo).tutti.persone === 3, 'chiedendo le liste di un’altra azienda si ricevono comunque le proprie')
  ok(await page.getByText('Filtra destinatari per tag').count() === 0 && await page.getByPlaceholder(/Tag \(Invio per aggiungere\)/).count() === 0, 'il campo dei tag non c’è più')
  const conto = page.locator('[data-conto-destinatari]')
  await page.locator('[data-conto-destinatari="2"]').waitFor({ timeout: 15000 }).catch(() => {})
  ok(/riceveranno 2 persone.*su 3 contatti.*L’altra non ha dato il consenso/.test((await conto.innerText()).replace(/\s+/g, ' ')), `il conto è a vista senza premere niente: «${(await conto.innerText()).replace(/\s+/g, ' ').trim()}»`)
  await page.locator('[data-scegli-lista]').selectOption('etichetta|ZZ Amici')
  ok(/riceverà 1 persona su 2 di questa lista/.test((await conto.innerText()).replace(/\s+/g, ' ')), `scegliendo una lista il conto cambia subito: «${(await conto.innerText()).replace(/\s+/g, ' ').trim()}»`)
  await page.getByRole('button', { name: 'Salva bozza' }).click()
  let salvata = null
  for (let i = 0; i < 20 && !salvata?.lista; i++) { salvata = (await a.from('newsletters').select('lista, tag_filter').eq('id', nl.id).single()).data; if (!salvata?.lista) await page.waitForTimeout(500) }
  ok(salvata?.lista?.chiave === 'etichetta|ZZ Amici' && Object.keys(salvata.lista).sort().join() === 'chiave,titolo' && salvata.tag_filter === null, `salvando resta la lista scelta: chiave e titolo, non le persone (${JSON.stringify(salvata?.lista)})`)
  const ordine = await page.evaluate(() => [...document.querySelectorAll('div')].map(d => d.textContent.trim()).filter(x => ['A chi la mandi', 'Modello', 'Oggetto', 'Contenuto', 'Quando parte'].includes(x)))
  ok([...new Set(ordine)].join(' → ') === 'A chi la mandi → Modello → Oggetto → Contenuto → Quando parte', `l’ordine è quello in cui si ragiona (${[...new Set(ordine)].join(' → ')})`)

  console.log('\n4 · I MODELLI SI VEDONO\n')
  const mini = page.locator('[data-modello]')
  await page.frameLocator('[data-modello="evento"] iframe').getByText('Il nome della serata').waitFor({ timeout: 15000 }).catch(() => {})
  const viste = []
  for (const [id, frase] of [['semplice', 'Una novità per te'], ['promozione', 'Solo per questa settimana'], ['notizie', 'Le novità del mese'], ['evento', 'Il nome della serata']]) {
    const dentro = page.frameLocator(`[data-modello="${id}"] iframe`)
    const c = await dentro.locator('body').innerText().catch(() => '')
    const largo = await page.locator(`[data-modello="${id}"] iframe`).evaluate(el => el.getBoundingClientRect().width).catch(() => 0)
    viste.push(c.includes(frase) && c.includes('ZZ Locale Anteprima') && largo > 120 && largo < 400)
  }
  ok(await mini.count() === 4 && viste.every(Boolean), `quattro miniature, ognuna è l’email vera del suo modello col nome del locale (${viste.map(v => v ? 'sì' : 'no').join(' ')})`)
  ok(await page.locator('[data-modello="semplice"]').getAttribute('aria-pressed') === 'true', 'quello in uso è segnato')
  if (foto) await page.locator('[data-modello="semplice"]').scrollIntoViewIfNeeded().then(() => page.screenshot({ path: `${foto}/newsletter-modelli.png` }))
  await titolo.fill('Venerdì jazz')
  let chiesto = ''
  page.once('dialog', d => { chiesto = d.message(); d.dismiss() })
  await page.locator('[data-modello="notizie"]').click()
  await page.waitForTimeout(400)
  ok(/non ha: .*testo/.test(chiesto) && await page.locator('[data-modello="semplice"]').getAttribute('aria-pressed') === 'true', `se cambiando modello si perde qualcosa lo chiede, e dicendo no non cambia niente («${chiesto.split('\n')[0]}»)`)
  await page.locator('[data-modello="evento"]').click()
  await email_.getByText('Venerdì jazz').waitFor({ timeout: 8000 }).catch(() => {})
  ok(await page.locator('[data-modello="evento"]').getAttribute('aria-pressed') === 'true' && await email_.getByText('Venerdì jazz').count() === 1 && await email_.getByText('Prenota', { exact: true }).count() === 1, 'verso un modello che ha gli stessi campi si passa senza domande, e titolo e pulsante restano')

  await page.goto(`${BASE}/admin/newsletter/${vuota.id}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-esempio]').waitFor({ timeout: 60000 }).catch(() => {})
  ok(await email_.getByText('Una novità per te').count() === 1 && await page.locator('[data-esempio]').count() === 1, 'una bozza vuota mostra l’esempio del modello, e dice che è un esempio')
  ok(/Manca l’oggetto/.test(await page.locator('[data-riga-posta]').innerText()), 'e avvisa che manca l’oggetto')
  await page.getByPlaceholder('URL immagine (opzionale)').first().locator('xpath=following::input[1]').fill('Il mio titolo vero')
  await email_.getByText('Il mio titolo vero').waitFor({ timeout: 8000 }).catch(() => {})
  ok(await email_.getByText('Una novità per te').count() === 0 && await email_.getByText('Il mio titolo vero').count() === 1 && await page.locator('[data-esempio]').count() === 0, 'appena si scrive, l’esempio lascia il posto a quello che si è scritto')
  await page.getByRole('button', { name: 'Nascondi anteprima' }).click()
  ok(await riquadro.count() === 0 && await page.getByRole('button', { name: 'Anteprima', exact: true }).count() === 1, 'chi non la vuole la nasconde, e la ritrova')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n5 · SU TELEFONO\n')
  const ctxT = await browser.newContext({ locale: 'it-IT', viewport: { width: 390, height: 844 }, storageState: stato })
  const pt = await ctxT.newPage()
  const erroriT = []
  pt.on('pageerror', e => erroriT.push(e.message))
  await pt.goto(`${BASE}/admin/newsletter/${nl.id}`, { waitUntil: 'domcontentloaded' })
  await pt.getByRole('button', { name: 'Anteprima', exact: true }).waitFor({ timeout: 60000 })
  ok(await pt.locator('[data-anteprima-newsletter]').count() === 0 && await pt.locator('input[value="Ciao {{nome}}, venerdì si suona"]').isVisible(), 'si apre sui campi da scrivere: due colonne non ci starebbero')
  await pt.getByRole('button', { name: 'Anteprima', exact: true }).click()
  await pt.locator('[data-anteprima-newsletter]').waitFor({ timeout: 8000 })
  const fuoriT = await pt.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(fuoriT <= 0 && await pt.getByRole('button', { name: 'Torna a scrivere' }).count() === 1, `col pulsante si passa all’anteprima a tutta larghezza, e si torna indietro (sforo ${fuoriT}px)`)
  if (foto) await pt.screenshot({ path: `${foto}/newsletter-anteprima-390.png` })
  ok(erroriT.length === 0, `nessun errore nel browser${erroriT.length ? ' — ' + erroriT[0] : ''}`)
  await ctxT.close()

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CHI SCRIVE VEDE COME ARRIVA')
} catch (e) {
  console.error('ERRORE:', e.message.split('\n')[0]); problemi++
} finally {
  if (browser) await browser.close().catch(() => {})
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  if (altra) await cancellaAziendaDiProva(altra.id)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
