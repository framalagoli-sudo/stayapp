// Il visitatore prenota un periodo dal sito, non solo dall'API.
//
// Il BookingWidget è codice di browser: né `next build` né una GET con curl
// vedono un identificatore fuori scope o un riepilogo che legge uno slot
// inesistente. Qui si percorre tutto il giro come lo percorre un cliente.
//
// ⚠️ La scheda si raggiunge con `?tab=prenota`: cliccando la voce in fondo si
// finisce altrove e sembra che il widget non esista.
//
// Uso: node probe-widget-giornate.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const L = process.env.TEST_LOCALE || TEST_URL
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const g = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null, en = null, ris = null, browser = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-WG-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'ristorante', slug: `zz-wg-${Date.now()}`, name: 'ZZ Widget', active: true, moduli: { booking: true } }).select().single(); en = e.id
  const { data: r } = await admin.from('risorse').insert({ azienda_id: az, entity_tipo: 'ristorante', entity_id: en,
    nome: 'ZZ Casa al mare', modalita: 'giornaliero', quantita: 1, prezzo: 100, attiva: true, conferma_auto: true,
    visibile_minisito: true, disponibilita: { minimo_notti: 2 }, blocchi: [] }).select().single(); ris = r.id

  browser = await chromium.launch()
  const p = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage()
  const errori = []
  p.on('pageerror', x => errori.push('ECCEZIONE: ' + x.message))
  p.on('console', m => { if (m.type() === 'error' && !/favicon|404|manifest/i.test(m.text())) errori.push(m.text().slice(0, 150)) })

  console.log('\nPRENOTARE UN PERIODO DAL SITO\n')
  await p.goto(`${L}/r/${e.slug}?qr=1&tab=prenota`, { waitUntil: 'networkidle' })
  await p.getByText('ZZ Casa al mare').first().waitFor({ timeout: 20000 }).catch(() => {})
  // Il banner dei cookie copre i pulsanti in fondo: va tolto di mezzo come farebbe
  // un visitatore, altrimenti il click finale viene intercettato da lui.
  const cookie = p.getByRole('button', { name: /^Accetto$/ })
  if (await cookie.count()) { await cookie.first().click(); await p.waitForTimeout(600) }
  ok(/A giornate/.test(await p.locator('body').innerText()), 'la risorsa si presenta come «A giornate · €100 a notte»')

  await p.getByText('ZZ Casa al mare').first().click()
  await p.getByText(/Quando arrivi/).waitFor({ timeout: 15000 }).catch(() => {})
  ok(/Quando arrivi/.test(await p.locator('body').innerText()), 'chiede quando si arriva, non un orario')

  // Il calendario: si clicca un giorno libero, non si compila una data.
  // ⚠️ Un giorno può cadere nel mese successivo — a fine mese capita sempre —
  // quindi si passa avanti col pulsante, che è anche il modo di verificarlo.
  const vaiA = async giorno => {
    for (let i = 0; i < 3; i++) {
      const c = p.locator(`[data-giorno="${giorno}"]`)
      if (await c.count()) return c
      await p.getByLabel('Mese successivo').click()
      await p.waitForTimeout(900)
    }
    return null
  }

  const arrivo = await vaiA(g(10))
  ok(!!arrivo, 'il calendario mostra i giorni, anche del mese dopo')
  ok(await p.locator('[data-giorno]:not([disabled])').count() > 0, 'ci sono giorni cliccabili')
  await arrivo.click()
  await p.waitForTimeout(600)
  ok(/E quando riparti/.test(await p.locator('body').innerText()), 'dopo l\'arrivo chiede la partenza')

  const partenza = await vaiA(g(14))
  await partenza.click()
  await p.getByText(/notti/).first().waitFor({ timeout: 15000 }).catch(() => {})
  let t = await p.locator('body').innerText()
  ok(/4 notti/.test(t), 'conta 4 notti')
  ok(/€400/.test(t), 'e fa €400')

  // Sotto il minimo: si ricomincia dall'arrivo e si sceglie il giorno dopo.
  await (await vaiA(g(10))).click(); await p.waitForTimeout(500)
  await (await vaiA(g(11))).click()
  await p.getByText(/minimo/).waitFor({ timeout: 15000 }).catch(() => {})
  ok(/minimo è di 2/.test(await p.locator('body').innerText()), 'sotto il minimo lo dice, invece di un «non disponibile»')

  await (await vaiA(g(10))).click(); await p.waitForTimeout(500)
  await (await vaiA(g(14))).click()
  await p.getByRole('button', { name: /Continua/ }).first().waitFor({ timeout: 15000 }).catch(() => {})
  await p.getByRole('button', { name: /Continua/ }).first().click(); await p.waitForTimeout(900)
  t = await p.locator('body').innerText()
  ok(/4 notti/.test(t) && /400/.test(t), 'il riepilogo nel modulo ripete periodo e totale')

  const campi = p.locator('input[type=text], input[type=email], input:not([type])')
  await campi.nth(0).fill('ZZ Cliente')
  await p.locator('input[type=email]').first().fill(`zz${Date.now()}@example.com`)
  await p.waitForTimeout(400)
  await p.getByRole('button', { name: 'Conferma prenotazione' }).click()
  await p.waitForTimeout(3000)
  t = await p.locator('body').innerText()
  ok(/confermata/i.test(t), 'la prenotazione va a buon fine')
  // ⚠️ Qui il riepilogo leggeva `slot.ora` su uno slot che non esiste: pagina
  // bianca proprio sulla conferma, dopo che la prenotazione era già passata.
  ok(/dal .* al /.test(t) && !/undefined/.test(t), 'e la conferma mostra il periodo, non «ore undefined»')

  const { count } = await admin.from('prenotazioni').select('*', { count: 'exact', head: true }).eq('risorsa_id', ris)
  ok(count === 1, `in archivio c'è la prenotazione (${count})`)

  // Ora che un giorno è occupato: il calendario lo deve spegnere, e l'endpoint
  // pubblico non deve dire **chi** lo occupa.
  console.log('')
  const mese = `${g(10).slice(0, 7)}`
  const risposta = await (await fetch(`${L}/api/booking/public/disponibilita/${ris}?mese=${mese}`)).text()
  ok(risposta.includes(g(11)), `i giorni presi risultano occupati (${mese})`)
  // ⚠️ Davanti c'è un visitatore qualsiasi: l'elenco dei clienti di un'attività
  // non lo riguarda. Si controlla il corpo grezzo, non i campi che ci aspettiamo.
  ok(!/ZZ Cliente|@example\.com|cliente_nome|importo/i.test(risposta),
     'e non si sa chi li occupa: nessun nome, nessuna email, nessun importo')

  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.getByText('ZZ Casa al mare').first().click().catch(() => {})
  await p.waitForTimeout(1200)
  const occupato = await vaiA(g(11))
  ok(occupato && await occupato.isDisabled(), 'un giorno già preso non si può cliccare')
  ok(errori.length === 0, `nessun errore nel browser${errori.length ? ': ' + errori.slice(0, 2).join(' | ') : ''}`)

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  DAL SITO SI PRENOTA UN PERIODO, DALL\'INIZIO ALLA CONFERMA')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (browser) await browser.close()
  if (ris) { await admin.from('prenotazioni').delete().eq('risorsa_id', ris); await admin.from('risorse').delete().eq('id', ris) }
  if (en) await admin.from('entita').delete().eq('id', en)
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
