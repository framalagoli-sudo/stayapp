// Cancellare un'azienda porta via TUTTO? Utenti, entità, dati, file.
//
// Nasce dai cinque account di Futura Vacanze: l'azienda era stata cancellata il
// 17/09, e i suoi collaboratori erano ancora lì, senza azienda e ancora capaci di
// fare login. `profiles.azienda_id` è `ON DELETE SET NULL`: il database stacca
// l'utente, non lo toglie.
//
// La sonda non si fida di nessun elenco di tabelle scritto a mano (nemmeno di
// quello della route): legge lo schema che il database pubblica, trova OGNI
// tabella che si lega a un'azienda — direttamente o passando da un'entità, un
// evento, una risorsa, un form, un contatto, un utente — e dopo la
// cancellazione cerca i resti ovunque.
//
// Uso: node probe-cancella-azienda.mjs   ($env:TEST_URL per il dev locale)
// Crea e cancella solo dati suoi (azienda ZZ-CANC-…).
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marca = Date.now()
let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

// Tenuti di proposito dopo la cancellazione: il registro di sicurezza dice chi
// ha fatto cosa anche quando quel qualcuno non esiste più.
const CONSERVATE = new Set(['audit_log'])

const ids = { azienda: null, entita: [], utenti: [], eventi: [], risorse: [], form: [], contatti: [], file: [] }
const sonda = []   // utenti creati dalla sonda stessa (il super_admin che cancella)

async function inserisci(tabella, riga) {
  const { data, error } = await admin.from(tabella).insert(riga).select('id').single()
  if (error) { console.log(`    (non popolata: ${tabella} — ${error.message.slice(0, 90)})`); return null }
  return data.id
}

async function utente(ruolo, extra) {
  const email = `zz-canc-${ruolo}-${marca}@playwright.internal`
  const password = randomBytes(20).toString('base64url') + 'Aa1!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${ruolo}: ${error.message}`)
  await admin.from('profiles').upsert({ id: data.user.id, role: ruolo, full_name: `Canc ${ruolo}`, ...extra }, { onConflict: 'id' })
  return { id: data.user.id, email, password }
}

try {
  // ── 1. Un'azienda completa ────────────────────────────────────────────────
  const { data: az, error: azErr } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-CANC-${marca}`, require_2fa: false }).select('id').single()
  if (azErr) throw new Error(azErr.message)
  ids.azienda = az.id

  const ent = await inserisci('entita', { azienda_id: az.id, tipo: 'ristorante', name: `ZZ canc ${marca}`, slug: `zz-canc-${marca}` })
  if (!ent) throw new Error('senza entità la prova non ha senso')
  ids.entita.push(ent)

  const titolare = await utente('admin_azienda', { azienda_id: az.id })
  const collaboratore = await utente('staff', { azienda_id: az.id, permissions: { eventi: true } })
  ids.utenti.push(titolare.id, collaboratore.id)

  const contatto = await inserisci('contatti', { azienda_id: az.id, email: `zz-canc-${marca}@example.invalid`, nome: 'Canc' })
  if (contatto) ids.contatti.push(contatto)
  const evento = await inserisci('eventi', { azienda_id: az.id, entity_id: ent, entity_tipo: 'ristorante', slug: `zz-canc-${marca}`, title: 'ZZ canc', date_start: new Date(Date.now() + 864e5).toISOString() })
  if (evento) {
    ids.eventi.push(evento)
    await inserisci('event_bookings', { event_id: evento, guest_name: 'Canc', guest_email: `zz-canc-b-${marca}@example.invalid`, seats: 1, privacy_accettata: true })
  }
  const risorsa = await inserisci('risorse', { azienda_id: az.id, entity_id: ent, entity_tipo: 'ristorante', nome: 'ZZ canc' })
  if (risorsa) {
    ids.risorse.push(risorsa)
    await inserisci('prenotazioni', { azienda_id: az.id, risorsa_id: risorsa, entity_id: ent, entity_tipo: 'ristorante', cliente_nome: 'Canc', cliente_email: `zz-canc-p-${marca}@example.invalid`, n_persone: 1, data: new Date().toISOString().slice(0, 10), privacy_accettata: true })
  }
  await inserisci('requests', { property_id: ent, type: 'other', message: 'ZZ canc', privacy_accettata: true })
  await inserisci('messages', { property_id: ent, session_id: `zz-${marca}`, sender: 'guest', body: 'ZZ canc' })
  await inserisci('page_views', { entity_id: ent, entity_tipo: 'ristorante' })
  await inserisci('pagine', { entity_id: ent, entity_tipo: 'ristorante', titolo: 'ZZ canc', slug: `zz-canc-${marca}` })
  await inserisci('offerte', { azienda_id: az.id, entity_id: ent, titolo: 'ZZ canc' })
  const form = await inserisci('form_builder', { azienda_id: az.id, nome: 'ZZ canc' })
  if (form) { ids.form.push(form); await inserisci('form_submissions', { form_id: form, azienda_id: az.id, dati: {} }) }
  // La riga storica: nessuno ci scrive più, ma se c'è deve sparire anche lei
  // (è lì che stavano, per esempio, le credenziali del WiFi).
  await inserisci('ristoranti', { id: ent, azienda_id: az.id, name: `ZZ canc ${marca}`, slug: `zz-canc-legacy-${marca}` })

  // Un file nella cartella dell'entità, come lo scrive il caricamento vero.
  const percorso = `ristoranti/${ent}/zz-canc-${marca}.txt`
  const { error: upErr } = await admin.storage.from('property-media').upload(percorso, Buffer.from('zz'), { contentType: 'text/plain' })
  if (upErr) console.log(`    (file non caricato: ${upErr.message})`)
  else ids.file.push(percorso)

  // ── 2. La cancellazione, dalla route vera ────────────────────────────────
  const capo = await utente('super_admin', {})
  sonda.push(capo.id)
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email: capo.email, password: capo.password })
  const r = await fetch(`${BASE}/api/aziende/${az.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${s.session.access_token}` } })
  const corpo = await r.text()
  ok(r.ok, `DELETE /api/aziende/:id → ${r.status} ${corpo.slice(0, 120)}`)

  // ── 3. Cosa è rimasto ────────────────────────────────────────────────────
  const { data: azDopo } = await admin.from('aziende').select('id').eq('id', az.id).maybeSingle()
  ok(!azDopo, 'l\'azienda non esiste più')

  for (const u of [titolare, collaboratore]) {
    const { data } = await admin.auth.admin.getUserById(u.id)
    ok(!data?.user, `l'utente ${u === titolare ? 'titolare' : 'collaboratore'} non esiste più`)
    const prova = await anon.auth.signInWithPassword({ email: u.email, password: u.password })
    ok(!!prova.error, `  …e non può più fare login${prova.error ? '' : ' (!!)'}`)
  }

  // Ogni tabella dello schema che si lega a qualcosa di questa azienda.
  const schema = await (await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  })).json()
  const cerca = {
    azienda_id: [az.id],
    entity_id: ids.entita, entita_id: ids.entita, property_id: ids.entita,
    ristorante_id: ids.entita, attivita_id: ids.entita,
    event_id: ids.eventi, evento_id: ids.eventi,
    risorsa_id: ids.risorse, form_id: ids.form, contatto_id: ids.contatti,
    user_id: ids.utenti, profile_id: ids.utenti,
  }
  const resti = []
  for (const [tabella, def] of Object.entries(schema.definitions || {})) {
    if (CONSERVATE.has(tabella)) continue
    const colonne = Object.keys(def.properties || {})
    for (const [col, valori] of Object.entries(cerca)) {
      if (!colonne.includes(col) || !valori.length) continue
      const { count, error } = await admin.from(tabella).select('*', { count: 'exact', head: true }).in(col, valori)
      if (error) { console.log(`    (non leggibile: ${tabella}.${col} — ${error.message.slice(0, 60)})`); continue }
      if (count) resti.push(`${tabella}.${col}: ${count}`)
    }
    // Le tabelle delle entità (nuova e storiche) si cercano anche per id.
    if (['entita', 'properties', 'ristoranti', 'attivita'].includes(tabella)) {
      const { count } = await admin.from(tabella).select('*', { count: 'exact', head: true }).in('id', ids.entita)
      if (count) resti.push(`${tabella}.id: ${count}`)
    }
  }
  ok(resti.length === 0, `nessuna riga rimasta nel database${resti.length ? ' — ' + resti.join(' · ') : ''}`)

  for (const p of ids.file) {
    const cartella = p.slice(0, p.lastIndexOf('/'))
    const { data } = await admin.storage.from('property-media').list(cartella)
    ok(!(data || []).length, `nessun file rimasto in ${cartella}/${(data || []).length ? ` (${data.length})` : ''}`)
  }
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  // Pulizia di ciò che la route non ha portato via, perché la prova non
  // lasci niente in produzione in nessun caso.
  if (ids.azienda) {
    for (const t of ['requests', 'messages']) await admin.from(t).delete().in('property_id', ids.entita)
    for (const t of ['page_views', 'pagine']) await admin.from(t).delete().in('entity_id', ids.entita)
    for (const t of ['ristoranti', 'properties', 'attivita', 'entita']) await admin.from(t).delete().in('id', ids.entita)
    await admin.from('prenotazioni').delete().eq('azienda_id', ids.azienda)
    await admin.from('aziende').delete().eq('id', ids.azienda)
  }
  for (const p of ids.file) await admin.storage.from('property-media').remove([p])
  for (const id of [...ids.utenti, ...sonda]) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nL\'AZIENDA È SPARITA DEL TUTTO')
  process.exit(problemi ? 1 : 0)
}
