// La guida del pannello, aperta come la apre un titolare (nota 93).
//
//   · «Come funziona» c'è sulle pagine che hanno la scheda, e non sulle altre;
//   · si apre di lato, col titolo giusto, sta nello schermo (computer e
//     telefono), si chiude con Esc;
//   · la pagina Aiuto mostra le schede e non dice più le cose false di prima.
//
// Crea un'azienda «ZZ» e la pulisce con `cancellaAziendaDiProva`.
// Uso: node probe-guida.mjs [cartella-foto]   ($env:TEST_URL per il locale)

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { chromium } from 'playwright'
import { admin, cancellaAziendaDiProva } from './probe-auth.mjs'

const { SUPABASE_URL, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const FOTO = process.argv[2]
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null
try {
  const { data: a, error } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-Guida-${Date.now()}`, require_2fa: false }).select().single()
  if (error) throw error
  az = a.id
  await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-guida-${Date.now()}`, name: 'ZZ Guida', active: true })
  const email = `probe-guida-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: us.user.id, role: 'admin_azienda', azienda_id: az, full_name: 'P' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]

  console.log('\nLA GUIDA DEL PANNELLO\n')
  const b = await chromium.launch()
  for (const larg of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width: larg, height: 900 },
      storageState: { cookies: [], origins: [{ origin: new URL(TEST_URL).origin, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(s.session) }] }] } })
    const p = await ctx.newPage()
    const errori = []
    p.on('pageerror', x => errori.push(x.message))

    for (const [percorso, titolo] of [['/admin/prenotazioni', 'Prenotazioni'], ['/admin/booking', 'Calendario e risorse'], ['/admin/booking/risorse', 'Calendario e risorse']]) {
      await p.goto(`${TEST_URL}${percorso}`, { waitUntil: 'domcontentloaded' })
      const apri = p.locator('[data-guida-apri]')
      const c = await apri.waitFor({ timeout: 60000 }).then(() => true).catch(() => false)
      ok(c, `${larg}px ${percorso}: c'è «Come funziona»`)
      if (!c) continue
      await apri.click()
      const pannello = p.locator('[data-guida-pannello]')
      await pannello.waitFor({ timeout: 10000 })
      ok((await p.locator('#titolo-guida').innerText()) === titolo, `${larg}px ${percorso}: si apre la scheda «${titolo}»`)
      const fuori = await pannello.evaluate(el => el.getBoundingClientRect().right > window.innerWidth + 1 || el.scrollWidth > el.clientWidth + 1)
      ok(!fuori, `${larg}px ${percorso}: il riquadro sta nello schermo`)
      if (FOTO && percorso === '/admin/prenotazioni') await p.screenshot({ path: `${FOTO}/guida-${larg}.png` })
      await p.keyboard.press('Escape')
      ok(await pannello.count() === 0, `${larg}px ${percorso}: Esc lo chiude`)
    }

    // Una pagina senza scheda non promette una guida che non c'è.
    await p.goto(`${TEST_URL}/admin/contatti`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(4000)
    ok(await p.locator('[data-guida-apri]').count() === 0, `${larg}px /admin/contatti: niente «Come funziona» (scheda non ancora scritta)`)

    // La pagina Aiuto
    await p.goto(`${TEST_URL}/admin/help`, { waitUntil: 'domcontentloaded' })
    await p.locator('[data-guida-voce="booking"]').waitFor({ timeout: 60000 }).catch(() => {})
    ok(await p.locator('[data-guida-voce="booking"]').count() === 1 && await p.locator('[data-guida-voce="prenotazioni"]').count() === 1, `${larg}px Aiuto: le due schede ci sono`)
    const testo = await p.locator('body').innerText()
    ok(!/Scegli "Slot" \(durata fissa|Booking → Prenotazioni/.test(testo), `${larg}px Aiuto: le vecchie risposte false non ci sono più`)
    await p.locator('[data-guida-voce="booking"] button').first().click()
    ok(await p.getByText('Prezzi diversi in certi giorni', { exact: false }).count() > 0, `${larg}px Aiuto: la scheda si apre`)
    if (FOTO) await p.screenshot({ path: `${FOTO}/aiuto-${larg}.png`, fullPage: false })
    ok(!errori.length, `${larg}px: nessun errore nella pagina${errori.length ? ': ' + errori[0] : ''}`)
    await ctx.close()
  }
  await b.close()
} catch (e) {
  console.error('  ✗ errore:', e.message); ko++
} finally {
  if (az) { try { await cancellaAziendaDiProva(az) } catch (e) { console.error('pulizia', e.message) } }
  console.log(ko ? `\n[probe] ${ko} problemi` : '\n[probe] azienda di prova eliminata — tutto verde')
  process.exit(ko ? 1 : 0)
}
