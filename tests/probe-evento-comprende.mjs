// «Cosa comprende il prezzo» di un evento (migration 146), percorso come lo
// percorrono il titolare e chi prenota.
//
//   1. il titolare lo scrive dall'editor e si salva ripulito (una riga, ≤160);
//   2. sulla pagina dell'evento si legge sotto il prezzo, già nell'HTML del
//      server, da computer e da telefono; un evento senza non mostra niente;
//   3. nel riepilogo prima della cassa: «Comprende: …», col pacchetto scelto;
//   4. nell'app del QR;
//   5. un testo ostile resta testo.
//
// ⚠️ Nessuna prenotazione parte: `/book` e `/riepilogo` sono intercettate nel
// browser. Crea un'azienda ZZ e la cancella con `cancellaAziendaDiProva`.
// Non prova la cassa di Stripe (serve un conto attivo) né /en (la traduzione
// arriva al primo passaggio del traduttore).
// Uso: cd tests && node probe-evento-comprende.mjs [cartella-foto]
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { chromium } from 'playwright'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const FOTO = process.argv[2]
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }
const COMPRENDE = 'Cena (antipasto, primo, dolce) + spettacolo dal vivo'

let aziendaId = null, browser = null
try {
  const tag = Date.now()
  const { data: az, error: e1 } = await admin.from('aziende').insert({
    ragione_sociale: `ZZ-COMPRENDE-${tag}`, require_2fa: false, moduli: { struttura: true },
  }).select().single()
  if (e1) throw new Error('azienda: ' + e1.message)
  aziendaId = az.id
  const slug = `zz-comprende-${tag}`
  const { data: ent, error: e2 } = await admin.from('entita').insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale', slug, active: true }).select().single()
  if (e2) throw new Error('entità: ' + e2.message)
  const base = { azienda_id: az.id, entity_tipo: 'struttura', entity_id: ent.id, prezzo_modo: 'cifra', seats_total: 20,
    acconto_percentuale: 20, published: true, active: true, notify_owner_on_booking: false, send_guest_confirmation: false }
  const giorni = n => new Date(Date.now() + n * 86400000).toISOString()
  const { data: ev } = await admin.from('eventi').insert({ ...base, title: 'ZZ Cena e spettacolo', slug: `zz-cena-${tag}`, date_start: giorni(10), price: 30 }).select().single()
  const { data: pkgEv } = await admin.from('eventi').insert({ ...base, title: 'ZZ Serata a pacchetti', slug: `zz-pkg-${tag}`, date_start: giorni(11), price: 20,
    comprende: 'Spettacolo dal vivo', packages: [{ id: 'p1', name: 'Con cena', description: 'Menù fisso', price: 35, includes: [] }, { id: 'p2', name: 'Solo spettacolo', description: '', price: 15, includes: [] }] }).select().single()
  const { data: senza } = await admin.from('eventi').insert({ ...base, title: 'ZZ Senza riga', slug: `zz-senza-${tag}`, date_start: giorni(12), price: 10 }).select().single()

  // Il titolare
  const email = `probe-comprende-${tag}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: us.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: 'P' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]

  console.log('\n1. IL TITOLARE LO SCRIVE')
  const patch = corpo => fetch(`${BASE}/api/eventi/${ev.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify(corpo) })
  await patch({ comprende: '  Cena\n\n e   spettacolo  ' + 'x'.repeat(300) })
  const { data: r1 } = await admin.from('eventi').select('comprende').eq('id', ev.id).single()
  ok(r1.comprende?.startsWith('Cena e spettacolo x') && r1.comprende.length === 160, `una riga sola e al massimo 160 caratteri (${r1.comprende?.length})`)
  await patch({ comprende: '   ' })
  const { data: r2 } = await admin.from('eventi').select('comprende').eq('id', ev.id).single()
  ok(r2.comprende === null, 'vuoto = niente (null)')

  browser = await chromium.launch()
  const sessione = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(s.session) }] }] }
  for (const larg of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width: larg, height: 900 }, storageState: sessione, locale: 'it-IT' })
    const p = await ctx.newPage()
    const errori = []; p.on('pageerror', x => errori.push(x.message))
    await p.goto(`${BASE}/admin/eventi/${ev.id}`, { waitUntil: 'domcontentloaded' })
    const campo = p.getByPlaceholder('Cena (antipasto, primo, dolce) + spettacolo dal vivo')
    // ⚠️ L'editor mostra il modulo vuoto finché l'evento non è arrivato: scritto
    // prima, il campo viene sovrascritto dai dati. Si aspetta il titolo.
    const c = await p.getByPlaceholder('es. Cena di San Valentino').and(p.locator('input[value="ZZ Cena e spettacolo"]'))
      .waitFor({ timeout: 60000 }).then(() => true).catch(() => false)
    ok(c && await p.getByText('Cosa comprende il prezzo', { exact: true }).isVisible(), `${larg}px editor: c'è il campo «Cosa comprende il prezzo»`)
    if (c) {
      await campo.fill(COMPRENDE)
      const fuori = await campo.evaluate(el => el.getBoundingClientRect().right > window.innerWidth + 1)
      ok(!fuori, `${larg}px editor: il campo sta nello schermo`)
      await p.getByRole('button', { name: /^Salva/ }).first().click()
      await p.waitForTimeout(3000)
      const { data: r } = await admin.from('eventi').select('comprende').eq('id', ev.id).single()
      ok(r.comprende === COMPRENDE, `${larg}px editor: «Salva modifiche» lo scrive nel database («${r.comprende}»)`)
    }
    ok(!errori.length, `${larg}px editor: nessun errore${errori.length ? ': ' + errori[0] : ''}`)
    await ctx.close()
  }

  console.log('\n2. LA PAGINA DELL\'EVENTO')
  const grezzo = await (await fetch(`${BASE}/eventi/${ev.id}`)).text()
  ok(grezzo.includes(COMPRENDE.replace('+', '+')), 'la riga è già nell\'HTML del server (la leggono anche i motori)')
  const grezzoSenza = await (await fetch(`${BASE}/eventi/${senza.id}`)).text()
  ok(!grezzoSenza.includes('data-comprende'), 'un evento senza riga non mostra niente')

  const apri = async (indirizzo, larg) => {
    const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: larg, height: 900 } })
    const page = await ctx.newPage()
    const errori = []; page.on('pageerror', e => errori.push(e.message))
    await page.route('**/api/guest/eventi/*/book', route => route.fulfill({ status: 201, contentType: 'application/json', body: '{"id":"probe"}' }))
    // Il riepilogo compare solo con un conto Stripe che incassa davvero, e un
    // conto finto non lo è: si risponde con conti fissi. Qui si prova la riga
    // «Comprende», non le cifre (quelle le prova probe-evento-riepilogo).
    await page.route('**/api/guest/eventi/*/riepilogo', route => route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ posti: 1, totale: 30, da_pagare: 6, saldo: 24, perc: 20, tutto: false, minuti: 30 }) }))
    await page.goto(indirizzo, { waitUntil: 'networkidle' })
    return { page, ctx, errori }
  }
  const riempi = async page => {
    await page.locator('input[type="email"]').fill(`zz-comp-${Date.now()}@playwright.internal`)
    await page.locator('input[type="email"]').locator('xpath=preceding-sibling::input[1]').fill('ZZ Prova')
    await page.locator('input[type="checkbox"]').first().check()
  }

  for (const larg of [1280, 390]) {
    const { page, ctx, errori } = await apri(`${BASE}/eventi/${ev.id}`, larg)
    const riga = page.locator('[data-comprende]')
    ok(await riga.isVisible() && (await riga.innerText()) === COMPRENDE, `${larg}px: sotto il prezzo si legge «${COMPRENDE}»`)
    const fuori = await riga.evaluate(el => el.getBoundingClientRect().right > window.innerWidth + 1)
    ok(!fuori, `${larg}px: la riga sta nello schermo`)
    await riempi(page)
    await page.getByRole('button', { name: /^Prenota/ }).click()
    const riep = page.locator('[data-riepilogo-comprende]')
    const visto = await riep.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    ok(visto && (await riep.innerText()).replace(/\s+/g, ' ') === `Comprende: ${COMPRENDE}`, `${larg}px riepilogo: «Comprende: …» prima della cassa`)
    if (FOTO) await page.screenshot({ path: `${FOTO}/comprende-riepilogo-${larg}.png`, fullPage: false })
    ok(!errori.length, `${larg}px: nessun errore${errori.length ? ': ' + errori[0] : ''}`)
    await ctx.close()
  }

  console.log('\n3. CON UN PACCHETTO')
  {
    const { page, ctx } = await apri(`${BASE}/eventi/${pkgEv.id}`, 1280)
    ok((await page.locator('[data-comprende]').innerText()) === 'Spettacolo dal vivo', 'la riga generale sotto il prezzo')
    await page.getByText('Con cena', { exact: true }).click()
    await riempi(page)
    await page.getByRole('button', { name: /^Prenota/ }).click()
    const riep = page.locator('[data-riepilogo-comprende]')
    await riep.waitFor({ timeout: 15000 }).catch(() => {})
    ok((await riep.innerText().catch(() => '')).replace(/\s+/g, ' ') === 'Comprende: Con cena — Menù fisso · Spettacolo dal vivo', 'riepilogo: pacchetto scelto + riga generale')
    await ctx.close()
  }

  console.log('\n4. L\'APP DEL QR')
  {
    const { page, ctx, errori } = await apri(`${BASE}/s/${slug}?qr=1`, 390)
    await page.getByText('ZZ Cena e spettacolo').first().waitFor({ timeout: 8000 }).catch(async () => { await page.getByText(/^Eventi$/).first().click() })
    await page.getByText('ZZ Cena e spettacolo').first().click()
    const c = await page.getByText(COMPRENDE, { exact: true }).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    ok(c, 'nell\'app del QR la riga c\'è')
    if (FOTO) await page.screenshot({ path: `${FOTO}/comprende-app.png` })
    ok(!errori.length, `app: nessun errore${errori.length ? ': ' + errori[0] : ''}`)
    await ctx.close()
  }

  console.log('\n5. UN TESTO OSTILE RESTA TESTO')
  await admin.from('eventi').update({ comprende: '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>' }).eq('id', ev.id)
  {
    const { page, ctx } = await apri(`${BASE}/eventi/${ev.id}`, 1280)
    const xss = await page.evaluate(() => window.__xss)
    const img = await page.locator('[data-comprende] img, [data-comprende] script').count()
    ok(!xss && img === 0 && (await page.locator('[data-comprende]').innerText()).includes('<img'), 'si legge come testo, nessun codice eseguito')
    await ctx.close()
  }
} catch (e) {
  console.error('  ✗ errore:', e.message); ko++
} finally {
  if (browser) await browser.close()
  if (aziendaId) { try { await cancellaAziendaDiProva(aziendaId) } catch (e) { console.error('pulizia', e.message) } }
  console.log(ko ? `\n[probe] ${ko} problemi` : '\n[probe] azienda di prova eliminata — tutto verde')
  process.exit(ko ? 1 : 0)
}
