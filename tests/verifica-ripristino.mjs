// Il servizio ripristinato funziona DAVVERO?
//
// ⛔ Perché esiste questo file. Il 13/09/2026 ho dichiarato riuscita una prova
// di ripristino avendo verificato solo **letture**: i siti si aprivano e il
// pannello caricava. Non avevo provato a scrivere niente, né l'app del QR, né i
// moduli pubblici — e ho detto di cancellare il progetto di prova prima di
// accorgermene. Un servizio da cui si legge e basta non è ripristinato: è un
// museo.
//
// Questa lista non dipende più da cosa qualcuno si ricorda di guardare.
//
// USO — con l'app locale puntata al progetto RIPRISTINATO:
//   cd client-next
//   SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run dev -- -p 3002
//   cd ../tests && node verifica-ripristino.mjs
//
// Tutto quello che scrive lo cancella. E non tocca la produzione: il bersaglio
// è l'indirizzo locale, e le credenziali sono quelle del ripristino.

import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const QUI = dirname(fileURLToPath(import.meta.url))
config({ path: join(QUI, '.env.test') })
config({ path: join(QUI, '.env.ripristino') })

const APP = process.env.APP_RIPRISTINO || 'http://localhost:3002'
const refDi = u => (String(u || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] || '').toLowerCase()
const PROD = refDi(process.env.SUPABASE_URL), BERS = refDi(process.env.RIPRISTINO_SUPABASE_URL)
if (!BERS) { console.error('\n⛔ Manca tests/.env.ripristino\n'); process.exit(1) }
if (PROD === BERS) { console.error('\n⛔ Il bersaglio è la produzione.\n'); process.exit(1) }

const sb = createClient(process.env.RIPRISTINO_SUPABASE_URL, process.env.RIPRISTINO_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const esiti = []
const ok = (nome, buono, nota = '') => { esiti.push({ nome, buono, nota }); console.log(`  ${buono ? '✓' : '✗'} ${nome}${nota ? '  — ' + nota : ''}`) }
const daPulire = []

console.log('\n' + '='.repeat(64))
console.log('  IL SERVIZIO RIPRISTINATO FUNZIONA?')
console.log('='.repeat(64))
console.log(`\n  app      : ${APP}\n  bersaglio: ${BERS} (produzione ${PROD}: diversa ✓)\n`)

// ── 1. Leggere: i siti dei clienti ───────────────────────────────────────────
console.log('1. I SITI DEI CLIENTI (lettura)\n')
const { data: entita } = await sb.from('entita').select('slug, tipo, name').eq('active', true).limit(6)
const PRE = { struttura: 's', ristorante: 'r', attivita: 'a' }
for (const e of entita || []) {
  const r = await fetch(`${APP}/${PRE[e.tipo]}/${e.slug}`)
  ok(`${e.name}`.slice(0, 36).padEnd(38) + `/${PRE[e.tipo]}/${e.slug}`, r.status === 200, r.status === 200 ? '' : `HTTP ${r.status}`)
}

// ── 2. Le foto vengono dal progetto NUOVO ────────────────────────────────────
console.log('\n2. LE FOTO (dal progetto giusto)\n')
const browser = await chromium.launch()
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const nuove = [], vecchie = [], rotte = []
  p.on('response', r => {
    if (r.request().resourceType() !== 'image') return
    if (r.url().includes(BERS)) nuove.push(1)
    if (r.url().includes(PROD)) vecchie.push(r.url())
    if (!r.ok()) rotte.push(r.status())
  })
  const e = (entita || [])[0]
  await p.goto(`${APP}/${PRE[e.tipo]}/${e.slug}`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(2000)
  ok('le immagini arrivano dal progetto ripristinato', nuove.length > 0 && vecchie.length === 0,
    `nuove ${nuove.length}, dal vecchio ${vecchie.length}`)
  ok('nessuna immagine rotta', rotte.length === 0, rotte.length ? `${rotte.length} non caricate` : '')
  await p.close()
}

// ── 3. L'app del QR ──────────────────────────────────────────────────────────
// È codice di browser: un identificatore fuori scope non lo vede né il build né
// una GET con curl. Va aperta.
console.log('\n3. L’APP DEL QR (codice di browser)\n')
for (const e of (entita || []).slice(0, 3)) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errori = []
  p.on('pageerror', x => errori.push(String(x).slice(0, 80)))
  const r = await p.goto(`${APP}/${PRE[e.tipo]}/${e.slug}?qr=1`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await p.waitForTimeout(2500)
  ok(`app di ${e.name}`.slice(0, 44), r?.status() === 200 && errori.length === 0, errori[0] || '')
  await p.close()
}

// ── 4. SCRIVERE dal pubblico: un modulo di contatto ──────────────────────────
// Il pezzo che mancava: leggere non basta. Se un ospite non può mandare una
// richiesta, il servizio non è tornato su.
console.log('\n4. SCRIVERE — un ospite manda una richiesta\n')
{
  const e = (entita || [])[0]
  const email = `verifica-ripristino-${Date.now()}@example.invalid`
  const r = await fetch(`${APP}/api/guest/contact`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      entity_tipo: e.tipo, entity_id: (await sb.from('entita').select('id').eq('slug', e.slug).maybeSingle()).data?.id,
      name: 'Verifica ripristino', email, message: 'Messaggio di prova: cancellare.', privacy_accettata: true,
    }),
  })
  const corpo = await r.text()
  ok('il modulo pubblico accetta e salva', r.status < 400, r.status < 400 ? '' : `HTTP ${r.status} ${corpo.slice(0, 70)}`)
  const { data: c } = await sb.from('contatti').select('id').eq('email', email).maybeSingle()
  ok('la richiesta è finita nel database', !!c)
  if (c) daPulire.push(['contatti', c.id])
  const { data: req } = await sb.from('requests').select('id').eq('email', email)
  for (const x of req || []) daPulire.push(['requests', x.id])
}

// ── 5. SCRIVERE dal pannello ─────────────────────────────────────────────────
console.log('\n5. SCRIVERE — dal pannello di gestione\n')
{
  const { data: az } = await sb.from('aziende').select('id').limit(1).maybeSingle()
  const titolo = 'Verifica ripristino — cancellare'
  const { data: ev, error } = await sb.from('eventi').insert({
    azienda_id: az?.id, slug: 'verifica-ripristino-' + Date.now().toString(36),
    title: titolo, date_start: new Date(Date.now() + 7 * 864e5).toISOString(),
    published: true, active: true, price: 0, send_guest_confirmation: false, notify_owner_on_booking: false,
  }).select().single()
  ok('si crea un contenuto nuovo', !!ev, error?.message?.slice(0, 70) || '')
  if (ev) {
    daPulire.push(['eventi', ev.id])
    const { error: e2 } = await sb.from('eventi').update({ location: 'Modificato dalla verifica' }).eq('id', ev.id)
    ok('si modifica un contenuto', !e2, e2?.message?.slice(0, 70) || '')
    const r = await fetch(`${APP}/eventi/${ev.slug}`)
    ok('il contenuto nuovo si vede sul sito pubblico', r.status === 200, r.status === 200 ? '' : `HTTP ${r.status}`)
  }
}

// ── 6. Il pannello si apre e carica le sezioni ───────────────────────────────
console.log('\n6. IL PANNELLO\n')
{
  const EMAIL = process.env.VERIFICA_EMAIL || 'fra.malagoli@gmail.com'
  const PASSWORD = 'verifica-' + Math.random().toString(36).slice(2, 12)
  const { data: utenti } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const u = (utenti?.users || []).find(x => x.email === EMAIL)
  if (!u) ok(`l’account ${EMAIL} esiste nel ripristino`, false)
  else {
    await sb.auth.admin.updateUserById(u.id, { password: PASSWORD })
    // ⚠️ Il 2FA si spegne solo sulla COPIA, per poter entrare: i fattori TOTP
    // non sono nell'archivio, quindi qui nessuno ne ha uno.
    await sb.from('aziende').update({ require_2fa: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    const p = await browser.newPage({ viewport: { width: 1400, height: 950 } })
    const errori = []
    p.on('pageerror', x => errori.push(String(x).slice(0, 90)))
    await p.goto(`${APP}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await p.locator('input[type=email]').waitFor({ timeout: 90000 })
    await p.fill('input[type=email]', EMAIL)
    await p.fill('input[type=password]', PASSWORD)
    await p.getByRole('button', { name: /accedi|entra|login/i }).first().click()
    await p.waitForTimeout(6000)
    ok('si entra nel pannello', new URL(p.url()).pathname.startsWith('/admin') && !p.url().includes('login'))
    for (const [nome, path, atteso] of [
      ['Aziende', '/admin/aziende', /Aziende/i],
      ['Contatti', '/admin/contatti', /Contatti/i],
      ['Eventi', '/admin/eventi', /Eventi/i],
      ['Prenotazioni', '/admin/booking/prenotazioni', /Prenotazioni|Booking/i],
      ['Newsletter', '/admin/newsletter', /Newsletter/i],
      ['Pagine del sito', '/admin/aziende', /Aziende/i],
    ]) {
      await p.goto(APP + path, { waitUntil: 'domcontentloaded' })
      const caricata = await p.getByText(atteso).first().waitFor({ timeout: 45000 }).then(() => true).catch(() => false)
      ok(`sezione ${nome}`, caricata)
    }
    ok('nessun errore di pagina nel pannello', errori.length === 0, errori[0] || '')
    await p.close()
  }
}
await browser.close()

// ── Pulizia ──────────────────────────────────────────────────────────────────
for (const [tabella, id] of daPulire) await sb.from(tabella).delete().eq('id', id)
console.log(`\n  pulizia: ${daPulire.length} righe di prova cancellate`)

// ── Esito ────────────────────────────────────────────────────────────────────
const rotti = esiti.filter(e => !e.buono)
console.log('\n' + '─'.repeat(64))
console.log(rotti.length
  ? `  ${rotti.length} CONTROLLI SU ${esiti.length} NON PASSANO — il ripristino NON è finito`
  : `  TUTTI E ${esiti.length} I CONTROLLI PASSANO — il servizio è davvero in piedi`)
console.log('─'.repeat(64) + '\n')
process.exit(rotti.length ? 1 : 0)
