// Il nome della sezione lo sceglie il cliente, e arriva fino all'app.
//
// «Escursioni», «Attività», «Proposte» erano tutte parole **nostre**. La regola
// in questo progetto è che come si chiama quello che offre lo decide il cliente:
// vale per le categorie delle offerte, e a maggior ragione per il nome della
// scheda che i suoi clienti vedono per primo aprendo il QR.
//
// Tre domande, e la terza è quella che di solito viene saltata:
//   1. il campo c'è nel pannello, e salva?
//   2. il nome scelto compare davvero nell'app dell'ospite?
//   3. un nome lunghissimo o non testuale viene tagliato **dal server**?
//      (`maxLength` nell'input è un suggerimento, il corpo si scrive a mano)
//
// Uso: TEST_LOCALE=http://localhost:3000 node probe-nome-sezione.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const MAX = 24
let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const browser = await chromium.launch()
const creati = [], utenti = [], aziende = []
try {
  // ── un'azienda e un'entità effimere, con qualcosa dentro da mostrare
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-NOME-${Date.now()}`, require_2fa: false, moduli: { struttura: true } }).select().single()
  aziende.push(az.id)
  const email = `zz-nome-${Date.now()}@playwright.internal`
  const pw = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: 'Nome' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password: pw })
  const H = { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }

  const ent = await (await fetch(`${L}/api/properties`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'ZZ Agriturismo' }) })).json()
  creati.push(ent.id)

  // Serve contenuto: una scheda vuota non compare, ed è voluto.
  await fetch(`${L}/api/properties/${ent.id}`, { method: 'PATCH', headers: H,
    body: JSON.stringify({ services: [{ id: 's1', name: 'Piscina', description: 'Aperta tutto il giorno' }] }) })

  const schede = async () => {
    const page = await browser.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    await page.goto(`${L}/s/${ent.slug}?qr=1&tab=esplora`, { waitUntil: 'networkidle', timeout: 45000 })
    const testi = await page.locator('.chip-bar button, .chip-bar a').allTextContents()
    await page.close()
    return { testi: testi.map(t => t.trim()).filter(Boolean), errori }
  }

  console.log('\nIL NOME PREDEFINITO, PRIMA CHE IL CLIENTE SCELGA\n')
  let r = await schede()
  ok(r.errori.length === 0, `l'app apre senza errori${r.errori.length ? ': ' + r.errori[0] : ''}`)
  ok(r.testi.includes('Servizi'), `la scheda si chiama «Servizi»  [${r.testi.join(' · ') || '—'}]`)

  // ── il cliente la rinomina dal pannello, cliccando davvero
  console.log('\nIL CLIENTE LA RINOMINA DAL PANNELLO\n')
  const pannello = await browser.newPage()
  // ⚠️ Il pannello tiene connessioni aperte: `networkidle` non arriva mai e la
  // navigazione va in timeout — sembra un sito lento, è un'attesa sbagliata.
  // Si aspetta il DOM, e poi l'elemento che serve davvero.
  await pannello.goto(`${L}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await pannello.waitForSelector('input[type="email"]', { timeout: 30000 })
  await pannello.fill('input[type="email"]', email)
  await pannello.fill('input[type="password"]', pw)
  await pannello.locator('button[type="submit"]').click()
  // ⚠️ NON `waitForURL(/\/admin/)`: quel modello corrisponde anche a
  // `/admin/login`, cioè alla pagina da cui si parte. L'attesa finiva subito, si
  // navigava via mentre il login era ancora in corso e la pagina successiva
  // rimbalzava al login — con l'aria di un guasto del prodotto. Si aspetta di
  // **non essere più** sul login.
  await pannello.waitForURL(u => !String(u).includes('/admin/login'), { timeout: 40000 })
  await pannello.goto(`${L}/admin/struttura/${ent.id}/funzioni`, { waitUntil: 'domcontentloaded', timeout: 45000 })

  // ⚠️ Ci si ancora all'etichetta della funzione, non al «primo input che c'è».
  // E si **aspetta** che la pagina abbia finito di caricare i dati: sul dev
  // locale Next compila la route API al primo accesso, e questa sonda cercava
  // subito, trovava ancora «Caricamento…» e dava per rotto un campo che
  // funzionava. Una misura affrettata è indistinguibile da un guasto vero, e
  // costa lo stesso tempo.
  const campo = pannello.getByLabel("Nome della sezione Servizi nell'app")
  await campo.waitFor({ state: 'visible', timeout: 40000 })
  ok(await campo.count() > 0, 'il campo per il nome è nella pagina Funzioni')

  await campo.fill('Coccole')
  const salvato = pannello.waitForResponse(r => r.url().includes(`/api/properties/${ent.id}`) && r.request().method() === 'PATCH', { timeout: 20000 })
  await campo.blur()
  const esito = await salvato
  ok(esito.status() === 200, `salvato uscendo dal campo (HTTP ${esito.status()})`)
  await pannello.close()

  console.log("\nIL NOME SCELTO ARRIVA NELL'APP DELL'OSPITE\n")
  r = await schede()
  ok(r.testi.includes('Coccole'), `la scheda ora si chiama «Coccole»  [${r.testi.join(' · ') || '—'}]`)
  ok(!r.testi.includes('Servizi'), '      e non dice più «Servizi»')

  // ── il muro vero: il taglio sta nel server, non nell'input
  console.log('\nIL CASO OSTILE — chi non passa dal modulo\n')
  const lungo = 'A'.repeat(400)
  await fetch(`${L}/api/properties/${ent.id}`, { method: 'PATCH', headers: H,
    body: JSON.stringify({ modules: { etichette: { servizi: lungo } } }) })
  const { data: dopo } = await admin.from('entita').select('moduli').eq('id', ent.id).maybeSingle()
  const scritto = dopo?.moduli?.etichette?.servizi || ''
  ok(scritto.length <= MAX, `un nome di 400 caratteri viene tagliato a ${MAX} (salvati: ${scritto.length})`)

  // Un valore non testuale non deve entrare affatto: nel database ci va testo.
  await fetch(`${L}/api/properties/${ent.id}`, { method: 'PATCH', headers: H,
    body: JSON.stringify({ modules: { etichette: { servizi: { $ne: null } } } }) })
  const { data: dopo2 } = await admin.from('entita').select('moduli').eq('id', ent.id).maybeSingle()
  const v = dopo2?.moduli?.etichette?.servizi
  ok(v === undefined || typeof v === 'string', `un valore non testuale non entra (è ${typeof v})`)

  r = await schede()
  ok(r.errori.length === 0, `e l'app apre lo stesso${r.errori.length ? ': ' + r.errori[0] : ''}`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL NOME LO SCEGLIE IL CLIENTE, E IL SERVER LO TIENE A BADA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  await browser.close()
  for (const id of creati) await admin.from('entita').delete().eq('id', id)
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
