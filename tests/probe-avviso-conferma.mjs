// L'avviso «la conferma all'ospite è spenta», aperto con un browser vero.
//
// ⛔ È codice di browser: `next build` non lo esegue e una GET non lo rende.
// Un identificatore fuori scope o una condizione sbagliata si vedono solo qui.
// Il caso che conta è il negativo: se l'avviso comparisse anche a conferma
// accesa, il titolare leggerebbe un allarme falso e imparerebbe a ignorarlo.
//
// ⚠️ Ambiente tutto finto, indirizzi `@playwright.internal`. Nessun evento vero
// viene aperto: la pagina di un cliente non si tocca per fare una misura.
//
// Uso: cd tests && node probe-avviso-conferma.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
import { withProbeSession } from './probe-auth.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = []

try {
  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-AVVISO-${t}`, email: `zz-av-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'struttura', name: 'ZZ Locale', slug: `zz-av-${t}`, active: true }).select().single()
  const fra = new Date(); fra.setDate(fra.getDate() + 20)

  const creaEvento = async (acceso) => {
    const { data } = await admin.from('eventi').insert({
      azienda_id: az.id, entity_id: ent.id, entity_tipo: 'struttura',
      title: `ZZ conferma ${acceso ? 'accesa' : 'spenta'}`, slug: `zz-av-${acceso ? 'on' : 'off'}-${t}`,
      date_start: fra.toISOString(), price: 0, seats_total: 10, published: true, active: true,
      send_guest_confirmation: acceso,
    }).select().single()
    return data
  }
  const acceso = await creaEvento(true)
  const spento  = await creaEvento(false)

  // Una persona in lista d'attesa sull'evento spento: è il caso peggiore, in cui
  // confermarla non le direbbe niente. L'avviso deve nominarlo.
  await admin.from('event_bookings').insert({
    event_id: spento.id, guest_name: 'ZZ Attesa', guest_email: `zz-att-${t}@playwright.internal`,
    seats: 1, status: 'waitlist',
  })

  await withProbeSession(async ({ page }) => {
    const testo = async (id) => {
      await page.goto(`${L}/admin/eventi/${id}/prenotazioni`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      return (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    }

    console.log('\n1 · CONFERMA SPENTA — IL TITOLARE LO LEGGE\n')
    const a = await testo(spento.id)
    ok(/conferma all’ospite è spenta|conferma all'ospite è spenta/i.test(a), 'l’avviso c’è')
    ok(/non saprà di essere entrato/i.test(a), 'e nomina chi è in lista d’attesa')
    ok(/Accendila/.test(a), 'con il pulsante per accenderla')

    console.log('\n2 · CONFERMA ACCESA — NESSUN ALLARME FALSO\n')
    const b = await testo(acceso.id)
    // ⛔ Un avviso che compare sempre viene ignorato, e allora non serve più.
    ok(!/conferma all’ospite è spenta|conferma all'ospite è spenta/i.test(b), 'l’avviso NON compare')
    ok(/Prenotazioni —/.test(b), 'e la pagina si è caricata davvero (non è una pagina vuota)')
  }, { width: 1100 })

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'L’AVVISO PARLA QUANDO SERVE E TACE QUANDO NON SERVE')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
