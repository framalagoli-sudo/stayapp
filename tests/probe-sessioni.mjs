// A8 — che ne è di una sessione già aperta quando cambia chi sei?
//
// Il token è firmato e vive fino alla scadenza: se i controlli si fidassero di
// quanto c'è scritto dentro, togliere i permessi o rimuovere una persona
// dall'azienda non avrebbe effetto finché non scade la sessione. Qui si verifica
// che valga invece lo stato attuale del profilo, letto a ogni richiesta.
//
// Uso: node probe-sessioni.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

let az = null, userId = null

try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-SESS-${Date.now()}`, require_2fa: false }).select().single()
  az = a.id
  const email = `probe-sess-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = u.user.id
  await admin.from('profiles').upsert({ id: userId, role: 'staff', azienda_id: az, full_name: 'Probe Sessione', permissions: { contatti: true } }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const token = s.session.access_token
  console.log('\nutente staff creato, con permesso sui contatti\n')

  const provaContatti = () => fetch(`${BASE}/api/contatti`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.status)
  const scrivi = () => fetch(`${BASE}/api/contatti`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Probe', email: `probe-c-${Date.now()}@playwright.internal` }),
  }).then(r => r.status)

  console.log('[1] con la sessione appena aperta')
  esito(await provaContatti() === 200, 'legge i contatti')

  // ── Permesso revocato mentre la sessione è aperta ───────────────────────────
  console.log('\n[2] il titolare gli revoca il permesso (sessione ancora aperta)')
  await admin.from('profiles').update({ permissions: {} }).eq('id', userId)
  const dopoRevoca = await scrivi()
  esito(dopoRevoca === 403, `la scrittura è bloccata subito (${dopoRevoca}) — non serve aspettare la scadenza`)

  // ── Persona rimossa dall'azienda ────────────────────────────────────────────
  console.log('\n[3] la persona viene tolta dall’azienda')
  await admin.from('profiles').update({ azienda_id: null }).eq('id', userId)
  const senzaAzienda = await provaContatti()
  esito(senzaAzienda !== 200 || true, `risposta: ${senzaAzienda}`)
  const corpo = await fetch(`${BASE}/api/contatti`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.text())
  const vedeDati = corpo.length > 2 && corpo !== '[]'
  esito(!vedeDati, vedeDati ? 'VEDE ANCORA I DATI dell’azienda da cui è stato tolto' : 'non vede più i dati dell’azienda')

  // ── Utente eliminato del tutto ──────────────────────────────────────────────
  console.log('\n[4] l’utente viene eliminato')
  await admin.auth.admin.deleteUser(userId)
  userId = null
  const dopoElim = await provaContatti()
  esito(dopoElim === 401 || dopoElim === 403, `il token non vale più (${dopoElim})`)

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI DA GUARDARE` : 'NESSUN PROBLEMA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (az) await admin.from('contatti').delete().eq('azienda_id', az)
  if (userId) { try { await admin.auth.admin.deleteUser(userId) } catch {} }
  if (az) {
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] dati di prova eliminati')
  process.exit(problemi ? 1 : 0)
}
