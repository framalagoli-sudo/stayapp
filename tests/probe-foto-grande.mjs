// Le foto delle gallerie del sito si aprono in grande.
//
// Crea un'azienda di prova con una pagina che ha le tre forme di galleria
// (griglia, carosello, galleria dell'attività) e col browser, da computer e da
// telefono: clic, frecce, tasti, dito, chiusura (✕, Esc, tocco fuori), e la
// pagina che sotto non scorre e poi torna a scorrere.
//
// A mano. `$env:TEST_URL='http://localhost:3000'` per il locale.

import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let azienda = null, browser = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)
const foto = n => `${BASE}/newsletter-esempio.svg?zz=${n}`

try {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-FOTO-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  azienda = az.id
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ Studio Foto', slug: `zz-foto-${t}`, active: true, minisito: { active: true }, gallery: [foto('e1'), foto('e2')] }).select().single(), 'entità')
  const immagini = sigla => [1, 2, 3].map(n => ({ id: `${sigla}${n}`, url: foto(`${sigla}${n}`), alt: `ZZ ${sigla} ${n}` }))
  await deve(a.from('pagine').insert({ entity_tipo: 'attivita', entity_id: ent.id, slug: '__home__', titolo: 'Home', status: 'pubblicata', blocks: [
    { id: 'b-hero', type: 'hero', data: { title: 'ZZ Copertina', height: 'compatta' } },
    { id: 'b-griglia', type: 'galleria_immagini', data: { titolo: 'ZZ Griglia', images: immagini('g'), columns: 3 } },
    { id: 'b-caro', type: 'galleria_immagini', data: { titolo: 'ZZ Carosello', images: immagini('c'), layout: 'carousel' } },
    { id: 'b-ent', type: 'gallery', data: { titolo: 'ZZ Galleria' } },
  ] }).select('id').single(), 'pagina')
  const url = `${BASE}/a/${ent.slug}`

  console.log(`\n${url}`)
  const grezzo = await (await fetch(url)).text()
  esito(grezzo.includes('zz=g1') && grezzo.includes('zz=c1') && grezzo.includes('zz=e1'), 'le foto sono nell’HTML, come prima')
  esito(!grezzo.includes('data-foto-aperta'), 'nel corpo grezzo non c’è nessuna foto aperta')

  browser = await chromium.launch()
  for (const [nome, opzioni] of [['computer', { viewport: { width: 1440, height: 900 } }], ['telefono', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
    console.log(`\n${nome}`)
    const ctx = await browser.newContext({ locale: 'it-IT', ...opzioni })
    const page = await ctx.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(url, { waitUntil: 'networkidle' })
    // Il banner dei cookie sta sopra a tutto: lo si chiude come farebbe una persona.
    await page.evaluate(() => { try { localStorage.setItem('cookie_consent_v2', JSON.stringify({ necessary: true, analytics: false, marketing: false, ts: Date.now() })) } catch {} })
    await page.reload({ waitUntil: 'networkidle' })

    const aperta = page.locator('[data-foto-aperta]')
    const mostrata = () => aperta.locator('img').getAttribute('src')
    const conto = () => aperta.locator('[data-foto-conto]').innerText()
    const apri = async sel => { const f = page.locator(sel).first(); await f.scrollIntoViewIfNeeded(); await f.click(); await aperta.waitFor({ timeout: 5000 }) }
    const chiusa = () => aperta.waitFor({ state: 'detached', timeout: 5000 }).then(() => true, () => false)

    esito(await page.locator('[data-foto-grande]').count() === 8, 'tutte le foto delle tre gallerie si possono aprire', String(await page.locator('[data-foto-grande]').count()))

    await apri('img[src*="zz=g2"][data-foto-grande]')
    esito((await mostrata()).includes('zz=g2') && (await conto()).trim() === '2 / 3', 'griglia: si apre la foto toccata, e dice a quale siamo')
    esito(await page.evaluate(() => document.body.style.overflow) === 'hidden', 'sotto, la pagina non scorre')
    await page.keyboard.press('ArrowRight')
    esito((await mostrata()).includes('zz=g3'), 'freccia destra: la successiva')
    await page.keyboard.press('ArrowRight')
    esito((await mostrata()).includes('zz=g1') && (await conto()).trim() === '1 / 3', 'dopo l’ultima si torna alla prima')
    await aperta.locator('button[aria-label="Foto precedente"]').click()
    esito((await mostrata()).includes('zz=g3'), 'il pulsante «precedente» torna indietro')
    esito(!(await mostrata()).includes('zz=c') && !(await mostrata()).includes('zz=e'), 'si resta dentro la stessa galleria')
    if (opzioni.hasTouch) {
      // Il dito: uno strisciare verso sinistra porta alla successiva.
      await aperta.evaluate(el => {
        const tocco = (tipo, x) => { const p = new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 }); el.dispatchEvent(new TouchEvent(tipo, { bubbles: true, touches: tipo === 'touchend' ? [] : [p], changedTouches: [p] })) }
        tocco('touchstart', 300); tocco('touchend', 80)
      })
      await page.waitForFunction(() => document.querySelector('[data-foto-aperta] img')?.src.includes('zz=g1'), null, { timeout: 3000 }).catch(() => {})
      esito((await mostrata()).includes('zz=g1'), 'col dito si passa alla successiva')
    }
    await page.keyboard.press('Escape')
    esito(await chiusa(), 'Esc la chiude')
    esito(await page.evaluate(() => document.body.style.overflow) !== 'hidden', 'e la pagina torna a scorrere')

    await apri('img[src*="zz=c1"][data-foto-grande]')
    esito((await mostrata()).includes('zz=c1'), 'carosello: si apre')
    await aperta.locator('button[aria-label="Chiudi"]').click()
    esito(await chiusa(), 'la ✕ la chiude')

    await apri('img[src*="zz=e2"][data-foto-grande]')
    esito((await mostrata()).includes('zz=e2') && (await conto()).trim() === '2 / 2', 'galleria dell’attività: si apre, con le sue due foto')
    await page.mouse.click(4, 4)
    esito(await chiusa(), 'un tocco fuori dalla foto la chiude')

    if (!opzioni.hasTouch) {
      await page.locator('img[src*="zz=g1"][data-foto-grande]').focus()
      await page.keyboard.press('Enter')
      esito(await aperta.waitFor({ timeout: 3000 }).then(() => true, () => false), 'dalla tastiera: Invio sulla foto la apre')
      await page.keyboard.press('Escape'); await chiusa()
      esito(await page.evaluate(() => document.activeElement?.getAttribute('src')?.includes('zz=g1') || false), 'chiudendo si torna sulla foto da cui si era partiti')
    }
    esito(!errori.length, 'nessun errore nel browser', errori.join(' | '))
    await ctx.close()
  }
} catch (e) {
  rossi++; console.log(`\n✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (browser) await browser.close().catch(() => {})
  if (azienda) await cancellaAziendaDiProva(azienda)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
