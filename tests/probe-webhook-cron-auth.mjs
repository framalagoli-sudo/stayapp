// Sonda: webhook e cron autenticati (giro 11 dell'agente, 17/10/2026).
//
// Un webhook dichiara «è stato pagato», «l'email è rimbalzata», «il conto è
// cambiato»; un cron manda email, fa backup, libera posti. Chi conosce solo
// l'indirizzo non deve poter far scattare niente. Si prova con chiamate
// FORGIATE (firma assente/falsa, nessun secret) e si verifica che siano
// rifiutate — mai un 200 che processa.
//
// A mano (non scrive niente, non crea aziende). Uso: cd tests && node probe-webhook-cron-auth.mjs
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.test', quiet: true })
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')

let rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }

try {
  console.log(`\n1. WEBHOOK — firma assente/falsa → rifiutato (mai 200)\n`)
  const webhookForgiati = [
    ['POST', '/api/stripe/webhook', { 'stripe-signature': 't=1,v1=falsa' }, '{"type":"checkout.session.completed","data":{"object":{"id":"cs_fake"}}}'],
    ['POST', '/api/stripe/webhook-account', { 'stripe-signature': 't=1,v1=falsa' }, '{"id":"evt_fake"}'],
    ['POST', '/api/resend-webhook', { 'svix-id': 'x', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,falsa' }, '{"type":"email.bounced","data":{"to":["vittima@example.invalid"]}}'],
    ['POST', '/api/resend-webhook', {}, '{"type":"email.bounced"}'],  // senza nessun header svix
    ['POST', '/api/whatsapp/webhook', { 'x-hub-signature-256': 'sha256=falsa' }, '{"entry":[]}'],
    ['POST', '/api/whatsapp/webhook', {}, '{"entry":[]}'],  // senza firma
  ]
  for (const [method, path, headers, body] of webhookForgiati) {
    const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body })
    const corpo = await r.text().catch(() => '')
    // Rifiutato PER LA FIRMA, non perché il codice si rompe prima: il 400 del
    // webhook dei conti Stripe è stato «verde» per due mesi mentre diceva
    // «parseThinEvent is not a function» — non avrebbe accettato neanche Stripe.
    const rotto = /is not a function|is not defined|Cannot read prop|undefined/i.test(corpo)
    esito((r.status === 400 || r.status === 401) && !rotto, `${path}${Object.keys(headers).length ? '' : ' (nessun header)'} → ${r.status} (rifiutato)`, `status ${r.status}, corpo ${corpo.slice(0, 90)}`)
  }

  console.log(`\n2. WHATSAPP verify (GET) — verify_token sbagliato non restituisce la sfida\n`)
  const rv = await fetch(`${BASE}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN-SBAGLIATO&hub.challenge=SFIDA12345`)
  const corpoVerify = await rv.text()
  esito(!corpoVerify.includes('SFIDA12345'), 'con verify_token sbagliato la sfida NON viene restituita', `status ${rv.status}, corpo ${corpoVerify.slice(0, 40)}`)

  console.log(`\n3. CRON — senza CRON_SECRET → 401\n`)
  // Letti da vercel.json: un cron nuovo entra nella prova da solo.
  const cron = JSON.parse(readFileSync(new URL('../client-next/vercel.json', import.meta.url), 'utf8')).crons
    .map(c => c.path.replace('/api/cron/', ''))
  for (const c of cron) {
    const senza = await fetch(`${BASE}/api/cron/${c}`)
    const sbagliato = await fetch(`${BASE}/api/cron/${c}`, { headers: { Authorization: 'Bearer secret-sbagliato' } })
    esito(senza.status === 401 && sbagliato.status === 401, `cron/${c} senza secret e con secret sbagliato → 401`, `${senza.status} · ${sbagliato.status}`)
  }

  console.log(`\n4. WEBHOOK in uscita (CRUD admin) — senza login → 401\n`)
  const w1 = await fetch(`${BASE}/api/webhooks`)
  esito(w1.status === 401, 'GET /api/webhooks senza token → 401', `status ${w1.status}`)
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  console.log(`\n[probe] ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
