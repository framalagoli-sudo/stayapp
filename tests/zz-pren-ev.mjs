import { withProbeSession, gotoAdmin } from './probe-auth.mjs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// L'evento vero su cui c'è la campagna, per vedere i conti giusti.
const { data: ev } = await admin.from('eventi')
  .select('id, title, seats_total, seats_booked').ilike('title', '%Chiara e Daniele%').maybeSingle()
console.log(`evento: «${ev.title}» — ${ev.seats_booked}/${ev.seats_total} secondo il database\n`)

let creata = null
await withProbeSession(async ({ page }) => {
  const errori = []
  page.on('pageerror', e => errori.push(e.message))
  page.on('response', async r => {
    if (r.url().includes('/bookings') && !r.ok()) console.log('API', r.status(), await r.text().catch(() => ''))
  })

  await gotoAdmin(page, `/admin/eventi/${ev.id}/prenotazioni`)
  await page.waitForTimeout(7000)

  const t = await page.locator('body').innerText()
  const righe = t.split('\n').map(r => r.trim()).filter(Boolean)
  const i = righe.findIndex(r => /Posti presi/.test(r))
  console.log('I RIQUADRI IN CIMA:')
  console.log('  ' + righe.slice(i, i + 9).join(' | '))

  console.log('\nSEGNO UNA PRENOTAZIONE AL TELEFONO')
  await page.locator('button', { hasText: 'Segna prenotazione' }).first().click()
  await page.waitForTimeout(900)
  await page.locator('input[placeholder*="Nome di chi"]').fill('ZZ Prova Telefono')
  await page.locator('input[placeholder="Telefono"]').fill('3331112223')
  await page.locator('input[type="number"]').last().fill('2')
  await page.locator('button', { hasText: /^Segna$/ }).click()
  await page.waitForTimeout(4000)

  const dopo = await page.locator('body').innerText()
  console.log('  compare nell’elenco:', dopo.includes('ZZ Prova Telefono'))
  const righe2 = dopo.split('\n').map(r => r.trim()).filter(Boolean)
  const j = righe2.findIndex(r => /Posti presi/.test(r))
  console.log('  i riquadri dopo:', righe2.slice(j, j + 4).join(' | '))
  console.log('  errori JS:', errori.length ? errori.join(' | ') : 'nessuno')
  await page.screenshot({ path: 'zz-pren.png', fullPage: false })
}, { width: 1100 })

// Pulizia: la prova non resta addosso a un evento vero.
const { data: zz } = await admin.from('event_bookings').select('id').eq('guest_name', 'ZZ Prova Telefono')
for (const b of zz || []) { await admin.from('event_bookings').delete().eq('id', b.id); creata = true }
if (creata) {
  const { data: tutte } = await admin.from('event_bookings').select('seats, status').eq('event_id', ev.id)
  const somma = (tutte || []).filter(b => b.status !== 'cancelled').reduce((n, b) => n + (b.seats || 1), 0)
  await admin.from('eventi').update({ seats_booked: somma }).eq('id', ev.id)
  console.log(`\n[probe] prova rimossa, posti riportati a ${somma}`)
}
