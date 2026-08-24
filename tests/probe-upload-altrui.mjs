// A6 — si può caricare un'immagine sulla scheda di un'altra azienda?
//
// Le route di upload non si limitano a scrivere un file: aggiornano anche il
// record (`cover_url`, `logo_url`). Senza controllo di proprietà si cambiava la
// copertina o il logo sul sito di un altro cliente — defacement, non solo spazio
// occupato. Verificato sfruttabile il 24/08/2026 su attività ed eventi.
//
// Uso: node probe-upload-altrui.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

// PNG 1x1 valido: deve superare la validazione del formato, così si misura
// l'autorizzazione e non il parser.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

function corpoFile() {
  const fd = new FormData()
  fd.append('file', new Blob([PNG_1x1], { type: 'image/png' }), 'prova.png')
  return fd
}

async function creaAzienda(tag) {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-UP-${tag}-${Date.now()}`, require_2fa: false }).select().single()
  const email = `probe-up-${tag}-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: `Probe ${tag}` }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const { data: att } = await admin.from('attivita')
    .insert({ azienda_id: az.id, slug: `zz-up-${tag}-${Date.now()}`, name: `Attività ${tag}`, active: true, cover_url: 'originale' })
    .select().single()
  return { aziendaId: az.id, userId: u.user.id, token: s.session.access_token, attivita: att }
}

let A = null, B = null

try {
  A = await creaAzienda('A')
  B = await creaAzienda('B')
  console.log(`\nazienda A (attaccante) e azienda B (vittima) create\n`)

  const carica = (percorso, token) => fetch(`${BASE}${percorso}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: corpoFile(),
  })

  // ── 1. Copertina dell'attività della vittima ───────────────────────────────
  console.log('[1] A carica la copertina sull’attività di B')
  const r1 = await carica(`/api/upload/attivita-cover?attivita_id=${B.attivita.id}`, A.token)
  const { data: dopo1 } = await admin.from('attivita').select('cover_url').eq('id', B.attivita.id).maybeSingle()
  esito(r1.status === 403 || r1.status === 404, `respinto (${r1.status})`)
  esito(dopo1?.cover_url === 'originale', `la copertina della vittima è intatta${dopo1?.cover_url !== 'originale' ? ' — CAMBIATA!' : ''}`)

  // ── 2. Logo dell'attività della vittima ────────────────────────────────────
  console.log('\n[2] A carica il logo sull’attività di B')
  const r2 = await carica(`/api/upload/attivita-logo?attivita_id=${B.attivita.id}`, A.token)
  const { data: dopo2 } = await admin.from('attivita').select('logo_url').eq('id', B.attivita.id).maybeSingle()
  esito(r2.status === 403 || r2.status === 404, `respinto (${r2.status})`)
  esito(!dopo2?.logo_url, `il logo della vittima non è stato sostituito${dopo2?.logo_url ? ' — SOSTITUITO!' : ''}`)

  // ── 3. Non-regressione: sulla PROPRIA attività deve funzionare ─────────────
  console.log('\n[3] A carica la copertina sulla PROPRIA attività (deve funzionare)')
  const r3 = await carica(`/api/upload/attivita-cover?attivita_id=${A.attivita.id}`, A.token)
  const { data: dopo3 } = await admin.from('attivita').select('cover_url').eq('id', A.attivita.id).maybeSingle()
  esito(r3.ok, `accettato (${r3.status})`)
  esito(dopo3?.cover_url && dopo3.cover_url !== 'originale',
    dopo3?.cover_url !== 'originale' ? 'la propria copertina è stata aggiornata' : 'NON aggiornata — funzione rotta')

  // ── 4. Copertina di un evento altrui ───────────────────────────────────────
  console.log('\n[4] A carica la copertina su un evento di B')
  const { data: ev } = await admin.from('eventi').insert({
    azienda_id: B.aziendaId, title: `ZZ-UP-EV-${Date.now()}`, slug: `zz-up-ev-${Date.now()}`,
    date_start: new Date(Date.now() + 7 * 864e5).toISOString(), cover_url: 'originale', active: true,
  }).select().single()
  const r4 = await carica(`/api/upload/event-cover?evento_id=${ev.id}`, A.token)
  const { data: dopo4 } = await admin.from('eventi').select('cover_url').eq('id', ev.id).maybeSingle()
  esito(r4.status === 403 || r4.status === 404, `respinto (${r4.status})`)
  esito(dopo4?.cover_url === 'originale', `la copertina dell’evento è intatta${dopo4?.cover_url !== 'originale' ? ' — CAMBIATA!' : ''}`)
  await admin.from('eventi').delete().eq('id', ev.id)

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI DA GUARDARE` : 'NESSUN PROBLEMA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const x of [A, B]) {
    if (!x) continue
    await admin.from('eventi').delete().eq('azienda_id', x.aziendaId)
    if (x.attivita) await admin.from('attivita').delete().eq('id', x.attivita.id)
    if (x.userId) { try { await admin.auth.admin.deleteUser(x.userId) } catch {} }
    const { error } = await admin.from('aziende').delete().eq('id', x.aziendaId)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] aziende e utenti effimeri eliminati')
  process.exit(problemi ? 1 : 0)
}
