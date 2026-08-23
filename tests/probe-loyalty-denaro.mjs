// Punti e gift card sono denaro: verifica che si consumino SOLO a pagamento
// avvenuto, e una volta sola.
//
// Prima del fix (23/08/2026): l'ordine appena creato — non pagato — bruciava
// la gift card, scalava i punti e ne accreditava di nuovi. Chi ordinava senza
// mai pagare fabbricava sconti dal nulla.
//
// Uso: node probe-loyalty-denaro.mjs        (default: build locale su :3187)
//      TEST_URL=https://www.oltrenova.com node probe-loyalty-denaro.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'http://localhost:3187'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const saldo = async (az, c) => {
  const { data } = await admin.from('loyalty_points').select('punti').eq('azienda_id', az).eq('contatto_id', c)
  return (data || []).reduce((s, r) => s + r.punti, 0)
}
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

let az = null, userId = null, problemi = 0

try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-LOY-${Date.now()}`, require_2fa: false }).select().single()
  az = a.id

  const email = `probe-loy-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = u.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'admin_azienda', azienda_id: az, full_name: 'Probe Loyalty' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const token = s.session.access_token

  await admin.from('loyalty_programs').insert({ azienda_id: az, nome: 'Prova', attivo: true, punti_per_euro: 10, valore_punto: 0.01, soglia_riscatto: 100 })
  const { data: cont } = await admin.from('contatti').insert({ azienda_id: az, nome: 'Cliente Prova', email }).select().single()
  await admin.from('loyalty_points').insert({ azienda_id: az, contatto_id: cont.id, punti: 5000, tipo: 'manuale', note: 'dotazione di prova' })
  const CODICE = `PROVA${Date.now().toString(36).toUpperCase()}`
  await admin.from('gift_cards').insert({ azienda_id: az, codice: CODICE, valore_iniziale: 50, valore_residuo: 50, attiva: true })
  const { data: prod } = await admin.from('prodotti').insert({ azienda_id: az, nome: 'Articolo di prova', prezzo: 100, attivo: true }).select().single()

  const puntiIniziali = await saldo(az, cont.id)
  console.log(`\nsetup: ${puntiIniziali} punti, gift card da 50€, articolo da 100€\n`)

  // ── L'ordine viene creato ma NON pagato ─────────────────────────────────────
  console.log('[1] ordine creato e mai pagato')
  const r = await fetch(`${BASE}/api/shop/public/${az}/ordine`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_cliente: email, nome_cliente: 'Cliente Prova',
      voci: [{ prodotto_id: prod.id, qty: 1 }],
      punti_da_usare: 5000, codice_gift_card: CODICE,
    }),
  })
  const ordine = await r.json()
  if (!ordine?.id && !ordine?.ordine) { console.log('    risposta:', JSON.stringify(ordine).slice(0, 200)) }
  const ordineId = ordine.id || ordine.ordine?.id

  const dopoOrdine = await saldo(az, cont.id)
  const { data: gc1 } = await admin.from('gift_cards').select('valore_residuo').eq('codice', CODICE).single()
  esito(dopoOrdine === puntiIniziali, `punti intatti finché non paga (${puntiIniziali} → ${dopoOrdine})`)
  esito(Number(gc1.valore_residuo) === 50, `gift card intatta finché non paga (50 → ${gc1.valore_residuo})`)

  // ── Il titolare conferma il pagamento ───────────────────────────────────────
  console.log('\n[2] il titolare marca l’ordine come pagato')
  const p1 = await fetch(`${BASE}/api/shop/ordini/${ordineId}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'pagato' }),
  })
  await new Promise(r => setTimeout(r, 1200))
  const dopoPag = await saldo(az, cont.id)
  const { data: gc2 } = await admin.from('gift_cards').select('valore_residuo').eq('codice', CODICE).single()
  esito(p1.status === 200, `conferma accettata (${p1.status})`)
  esito(dopoPag !== puntiIniziali, `ora i punti si muovono (${puntiIniziali} → ${dopoPag})`)
  esito(Number(gc2.valore_residuo) < 50, `ora la gift card si scala (50 → ${gc2.valore_residuo})`)

  // ── Doppia conferma: non deve raddoppiare niente ────────────────────────────
  console.log('\n[3] la stessa conferma arriva due volte (Stripe rispedisce gli eventi)')
  await fetch(`${BASE}/api/shop/ordini/${ordineId}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'pagato' }),
  })
  await new Promise(r => setTimeout(r, 1200))
  const dopoDoppio = await saldo(az, cont.id)
  const { data: gc3 } = await admin.from('gift_cards').select('valore_residuo').eq('codice', CODICE).single()
  esito(dopoDoppio === dopoPag, `punti non accreditati due volte (${dopoPag} → ${dopoDoppio})`)
  esito(Number(gc3.valore_residuo) === Number(gc2.valore_residuo), `gift card non scalata due volte (${gc2.valore_residuo} → ${gc3.valore_residuo})`)

  // ── Il colpo che prima funzionava ───────────────────────────────────────────
  console.log('\n[4] tre ordini mai pagati di fila (prima: punti gratis e gift card bruciata)')
  const primaAttacco = await saldo(az, cont.id)
  const { data: gcPrima } = await admin.from('gift_cards').select('valore_residuo').eq('codice', CODICE).single()
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/api/shop/public/${az}/ordine`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_cliente: email, nome_cliente: 'Attacco', voci: [{ prodotto_id: prod.id, qty: 5 }], punti_da_usare: 5000, codice_gift_card: CODICE }),
    })
  }
  await new Promise(r => setTimeout(r, 1200))
  const dopoAttacco = await saldo(az, cont.id)
  const { data: gcDopo } = await admin.from('gift_cards').select('valore_residuo').eq('codice', CODICE).single()
  esito(dopoAttacco === primaAttacco, `nessun punto fabbricato dal nulla (${primaAttacco} → ${dopoAttacco})`)
  esito(Number(gcDopo.valore_residuo) === Number(gcPrima.valore_residuo), `gift card non bruciata da ordini non pagati (${gcPrima.valore_residuo} → ${gcDopo.valore_residuo})`)

  console.log('\n' + '─'.repeat(60))
  console.log(problemi ? `${problemi} CONTROLLI FALLITI` : 'TUTTI I CONTROLLI SUPERATI')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (az) {
    await admin.from('ordini').delete().eq('azienda_id', az)
    await admin.from('prodotti').delete().eq('azienda_id', az)
    await admin.from('gift_cards').delete().eq('azienda_id', az)
    await admin.from('loyalty_points').delete().eq('azienda_id', az)
    await admin.from('loyalty_programs').delete().eq('azienda_id', az)
    await admin.from('contatti').delete().eq('azienda_id', az)
  }
  if (userId) { try { await admin.auth.admin.deleteUser(userId) } catch {} }
  if (az) {
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] dati di prova eliminati')
  process.exit(problemi ? 1 : 0)
}
