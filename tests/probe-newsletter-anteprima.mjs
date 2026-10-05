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
//   4. su telefono non si rompe: si alterna con il pulsante.
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
let az = null, utente = null, browser = null
try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-ANTEPRIMA-${t}`, partita_iva: '01234567890', citta: 'Terni', require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Locale Anteprima', slug: `zz-ant-${t}`, active: true, theme: { primaryColor: '#b4530a' } }).select().single(), 'entità')
  const nl = await deve(a.from('newsletters').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, status: 'draft', template_id: 'semplice',
    subject: 'Ciao {{nome}}, venerdì si suona', preheader: 'Posti limitati', content: { heading: 'ZZ Titolo iniziale', text: 'Ti aspettiamo.', image_url: '', cta_text: 'Prenota', cta_url: 'https://example.com' } }).select().single(), 'newsletter')
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
  await page.getByRole('button', { name: 'Nascondi anteprima' }).click()
  ok(await riquadro.count() === 0 && await page.getByRole('button', { name: 'Anteprima', exact: true }).count() === 1, 'chi non la vuole la nasconde, e la ritrova')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ' — ' + errori[0] : ''}`)
  await ctx.close()

  console.log('\n3 · SU TELEFONO\n')
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
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
