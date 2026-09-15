// Il tetto mensile dell'AI regge davvero?
//
// Nato il 15/09/2026: con le credenziali già in mano a più clienti, delle 13
// chiamate all'AI solo una aveva un limite vero. Le domande a cui si risponde
// provando, non leggendo:
//   1. una chiamata sotto il tetto passa, e la spesa finisce in `ai_consumi`
//      con i token veri (non zero, non stimati)?
//   2. a tetto superato la route risponde 429 con un messaggio leggibile, e
//      soprattutto NON chiama l'AI (nessuna riga nuova)?
//   3. il pannello legge «100%, esaurito»?
//   4. il chatbot pubblico, a credito finito, risponde con i contatti invece di
//      un errore — e senza spendere?
//
// ⚠️ Scatta davvero l'avviso «Credito AI esaurito» verso ERROR_ALERT_EMAIL
// (l'operatore, non un cliente): una volta al mese per azienda, e l'azienda è
// finta (ZZ-AI-…). Serve anche a provare che l'avviso arrivi.
//
// Crea la propria azienda, entità e utente e li cancella (le righe di
// `ai_consumi` se ne vanno in cascata con l'azienda).
//
// Uso: node probe-ai-consumi.mjs        (TEST_URL per puntare al dev locale)
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

async function chiama(path, { token, body, metodo = 'POST' } = {}) {
  const r = await fetch(TEST_URL + path, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90_000),
  })
  const grezzo = await r.text()
  let json = null
  try { json = JSON.parse(grezzo) } catch {}
  return { status: r.status, grezzo, json }
}
const righe = async az => {
  const { data, error } = await admin.from('ai_consumi').select('funzione, modello, token_input, token_output, costo_usd').eq('azienda_id', az)
  if (error) throw new Error(`ai_consumi: ${error.message} (migration 119 eseguita?)`)
  return data
}

let az = null, ent = null, u = null
try {
  const n = Date.now()
  const { data: a, error: ea } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-AI-${n}`, require_2fa: false }).select().single()
  if (ea) throw new Error(`azienda: ${ea.message}`)
  az = a.id
  const { data: e, error: ee } = await admin.from('entita').insert({
    azienda_id: az, tipo: 'attivita', slug: `zz-ai-${n}`, name: 'ZZ Officina', active: true,
    phone: '+39 000 0000000', email: 'zz-ai@example.invalid',
  }).select().single()
  if (ee) throw new Error(`entita: ${ee.message}`)
  ent = e.id
  const email = `probe-ai-${n}@playwright.internal`, password = randomBytes(24).toString('base64url')
  const { data: us } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); u = us.user.id
  await admin.from('profiles').upsert({ id: u, role: 'admin_azienda', azienda_id: az, full_name: 'Probe AI' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const token = s.session.access_token
  console.log(`\nazienda effimera ZZ-AI-${n} — contro ${TEST_URL}\n`)

  // 1. sotto il tetto
  console.log('1. una chiamata sotto il tetto (predefinito)')
  const r1 = await chiama('/api/ai/genera', { token, body: { tipo: 'minisito_tagline', tema: 'officina di biciclette in città' } })
  console.log(`     ${r1.status} ${r1.grezzo.slice(0, 160)}`)
  ok(r1.status === 200 && r1.json?.testo, 'la generazione risponde')
  ok(typeof r1.json?.usage?.percentuale === 'number', 'la risposta porta la percentuale usata')
  // Sulle chiavi, non sul testo: una tagline può contenere la parola «costo».
  ok(JSON.stringify(Object.keys(r1.json || {}).concat(Object.keys(r1.json?.usage || {}))) === '["testo","usage","percentuale"]',
    'nessuna cifra in dollari arriva al cliente (solo testo e percentuale)')
  const dopo1 = await righe(az)
  ok(dopo1.length === 1, `una riga in ai_consumi (trovate ${dopo1.length})`)
  if (dopo1[0]) {
    const x = dopo1[0]
    console.log(`     ${x.funzione} · ${x.modello} · in ${x.token_input} / out ${x.token_output} · $${x.costo_usd}`)
    ok(x.token_input > 0 && x.token_output > 0 && Number(x.costo_usd) > 0, 'token e costo veri, non zero')
  }

  // 2. tetto superato
  console.log('\n2. tetto abbassato sotto la spesa già fatta')
  await admin.from('aziende').update({ ai_budget_mensile_usd: 0.000001 }).eq('id', az)
  const r2 = await chiama('/api/ai/genera', { token, body: { tipo: 'minisito_tagline', tema: 'di nuovo' } })
  console.log(`     ${r2.status} ${r2.grezzo.slice(0, 200)}`)
  ok(r2.status === 429, 'risponde 429')
  ok(r2.json?.budget_esaurito === true && /si rinnova il 1°/.test(r2.json?.error || ''), 'con un messaggio che dice quando si rinnova')
  ok((await righe(az)).length === 1, "nessuna chiamata all'AI partita (righe invariate)")

  for (const [path, body] of [
    ['/api/content-studio/caption', { piattaforma: 'instagram', topic: 'prova' }],
    ['/api/ai/social-post', { tema: 'prova', canale: 'instagram' }],
    ['/api/ai/blog-auto', { entity_tipo: 'attivita', entity_id: ent, argomento: 'prova' }],
    ['/api/ai/from-document', { entity_tipo: 'attivita', entity_id: ent, documento: 'PAGINA HOME\nprova' }],
    ['/api/site-templates/ai-fill', { entity_tipo: 'attivita', entity_id: ent, template_id: 'x' }],
  ]) {
    const r = await chiama(path, { token, body })
    // ai-fill con template inesistente può fermarsi prima (404): conta che non spenda.
    ok(r.status === 429 || (path.includes('ai-fill') && r.status === 404), `${path} fermata (${r.status})`)
  }
  ok((await righe(az)).length === 1, 'ancora nessuna spesa dopo le altre funzioni')

  // 3. il pannello
  console.log('\n3. quello che legge il pannello')
  const r3 = await chiama('/api/ai/usage', { token, metodo: 'GET' })
  console.log(`     ${r3.status} ${r3.grezzo}`)
  ok(r3.json?.percentuale === 100 && r3.json?.esaurito === true, '100%, esaurito')

  // 4. chatbot pubblico
  console.log('\n4. il chatbot pubblico a credito finito')
  const r4 = await chiama('/api/guest/chat', { body: { entity_tipo: 'attivita', entity_id: ent, messages: [{ role: 'user', content: 'che orari fate?' }] } })
  console.log(`     ${r4.status} ${r4.grezzo}`)
  ok(r4.status === 200 && /non è disponibile/.test(r4.json?.reply || '') && /000 0000000/.test(r4.json?.reply || ''), 'risponde con i contatti, non con un errore')
  ok((await righe(az)).length === 1, 'e non spende')

  // 5. un estraneo non spende il credito di un altro con blog-auto
  console.log("\n5. blog-auto con l'entità di un'altra azienda")
  await admin.from('aziende').update({ ai_budget_mensile_usd: null }).eq('id', az)
  const { data: altra } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-AI-ALTRA-${n}`, require_2fa: false }).select().single()
  const { data: entAltra } = await admin.from('entita').insert({ azienda_id: altra.id, tipo: 'attivita', slug: `zz-ai-altra-${n}`, name: 'ZZ Altra', active: true }).select().single()
  const r5 = await chiama('/api/ai/blog-auto', { token, body: { entity_tipo: 'attivita', entity_id: entAltra.id } })
  ok(r5.status === 404, `rifiutata (${r5.status})`)
  await admin.from('entita').delete().eq('id', entAltra.id)
  await admin.from('aziende').delete().eq('id', altra.id)
} catch (e) {
  console.error('\n✗ la sonda si è fermata:', e.message); ko++
} finally {
  if (u) await admin.auth.admin.deleteUser(u).catch(() => {})
  if (ent) await admin.from('entita').delete().eq('id', ent)
  if (az) {
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.log(`\n⚠ azienda ZZ-AI non cancellata: ${error.message}`)
  }
  console.log(`\n[probe] dati effimeri eliminati\n${ko ? `✗ ${ko} DA GUARDARE` : '✓ tutto regge'}\n`)
  process.exit(ko ? 1 : 0)
}
