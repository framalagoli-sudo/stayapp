// Rastrellamento di sicurezza su TUTTE le route API.
//
// Tre domande, le stesse per ogni route, a cui si risponde provando e non leggendo:
//   1. risponde a chi non ha fatto login?
//   2. un utente dell'azienda B vede o tocca i dati dell'azienda A?
//   3. le liste restituiscono solo i dati della propria azienda?
//
// Crea due aziende effimere con i loro utenti, prova, e cancella tutto.
// Uso: node probe-security-sweep.mjs [--verbose]

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const verbose = process.argv.includes('--verbose')

// Route pubbliche per costruzione: qui un 200 senza credenziali è corretto.
const PUBBLICHE = [
  /^\/api\/guest\//, /^\/api\/public\//, /^\/api\/cron\//, /^\/api\/webhooks?$/,
  /^\/api\/resend-webhook/, /^\/api\/whatsapp\/webhook/, /^\/api\/shop\/webhook/,
  /^\/api\/auth\/(forgot-password|reset-password|signup|signup-status)/,
  /^\/api\/contatti\/subscribe/, /^\/api\/client-error/, /^\/api\/upload$/,
  /^\/api\/(llms|manifest|sitemap)\//, /^\/api\/newsletter\/archive\//,
  /^\/api\/form-builder\/public\//, /^\/api\/preventivi\/public\//,
]
const eProtetta = p => !PUBBLICHE.some(r => r.test(p))

// Elenca le route dal filesystem: l'unica fonte che non dimentica niente.
function elencaRoute(dir, base = '/api') {
  const out = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) out.push(...elencaRoute(p, `${base}/${nome}`))
    else if (nome === 'route.js') out.push(base)
  }
  return out
}

const UUID_FINTO = '00000000-0000-0000-0000-000000000000'
// I segmenti dinamici si riempiono con un valore che non esiste: quello che
// conta è COME risponde, non se trova il record.
const concreta = p => p.replace(/\[\.\.\.[^\]]+\]/g, 'x').replace(/\[[^\]]+\]/g, UUID_FINTO)

async function chiama(path, token, metodo = 'GET') {
  try {
    const r = await fetch(TEST_URL + path, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(metodo !== 'GET' ? { body: '{}' } : {}),
      signal: AbortSignal.timeout(20000),
    })
    let corpo = ''
    try { corpo = (await r.text()).slice(0, 400) } catch {}
    return { status: r.status, corpo }
  } catch (e) { return { status: 0, corpo: e.message } }
}

async function creaAzienda(etichetta) {
  const { data: az } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-SEC-${etichetta}-${Date.now()}` }).select().single()
  const email = `probe-sec-${etichetta}-${Date.now()}@playwright.internal`
  const password = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: `Probe ${etichetta}`, azienda_id: az.id }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { aziendaId: az.id, userId: u.user.id, token: s.session.access_token }
}

let A = null, B = null
const problemi = []

try {
  const routes = elencaRoute('../client-next/app/api').sort()
  console.log(`route trovate: ${routes.length}\n`)

  A = await creaAzienda('A')
  B = await creaAzienda('B')
  console.log('due aziende effimere create (A e B)\n')

  // Dati riconoscibili dentro l'azienda A: se compaiono a B, è una fuga.
  const marcatore = `ZZ-SEGRETO-${Date.now()}`
  const { data: contattoA } = await admin.from('contatti').insert({
    azienda_id: A.aziendaId, nome: marcatore, email: `${marcatore}@example.it`, fonte: 'probe',
  }).select().single()

  // ── 1. Senza credenziali ────────────────────────────────────────────────────
  console.log('[1] le route protette rispondono a chi non ha fatto login?')
  let apertiSenzaLogin = 0
  for (const r of routes) {
    if (!eProtetta(r)) continue
    const { status } = await chiama(concreta(r), null)
    // 401/403 = respinta · 404/405 = non esiste per quel metodo · 400 = validazione prima dell'auth (accettabile ma segnalato in verbose)
    if (status === 200) {
      problemi.push({ tipo: 'ACCESSO SENZA LOGIN', route: r, dettaglio: 'risponde 200 senza token' })
      console.log(`    ✗ ${r} → 200`)
      apertiSenzaLogin++
    } else if (verbose) console.log(`    · ${r} → ${status}`)
  }
  if (!apertiSenzaLogin) console.log('    nessuna route protetta risponde senza credenziali ✓')

  // ── 2. Le liste mostrano dati di altre aziende? ──────────────────────────────
  console.log('\n[2] le liste restituiscono dati di un’altra azienda?')
  const collection = routes.filter(r => eProtetta(r) && !r.includes('['))
  let fughe = 0
  for (const r of collection) {
    const { status, corpo } = await chiama(r, B.token)
    if (status !== 200) { if (verbose) console.log(`    · ${r} → ${status}`); continue }
    if (corpo.includes(marcatore) || corpo.includes(A.aziendaId)) {
      problemi.push({ tipo: 'FUGA TRA AZIENDE', route: r, dettaglio: 'la lista contiene dati dell’azienda A' })
      console.log(`    ✗ ${r} → contiene dati di un’altra azienda`)
      fughe++
    } else if (verbose) console.log(`    · ${r} → 200, pulita`)
  }
  if (!fughe) console.log(`    ${collection.length} liste controllate, nessuna perdita ✓`)

  // ── 3. Si può toccare una risorsa di un'altra azienda? ───────────────────────
  console.log('\n[3] un’altra azienda può leggere o modificare una risorsa non sua?')
  const perId = [
    { path: `/api/contatti/${contattoA.id}`, cosa: 'contatto' },
  ]
  let idor = 0
  for (const t of perId) {
    for (const metodo of ['GET', 'PATCH', 'DELETE']) {
      const { status, corpo } = await chiama(t.path, B.token, metodo)
      const passato = status === 200 && !corpo.includes('error')
      if (passato) {
        problemi.push({ tipo: 'RISORSA ALTRUI', route: `${metodo} ${t.path}`, dettaglio: `${t.cosa} di A raggiungibile da B` })
        console.log(`    ✗ ${metodo} ${t.cosa} altrui → ${status}`)
        idor++
      } else if (verbose) console.log(`    · ${metodo} ${t.cosa} altrui → ${status}`)
    }
  }
  // Il contatto di A deve essere ancora lì e intatto.
  const { data: dopo } = await admin.from('contatti').select('nome').eq('id', contattoA.id).maybeSingle()
  if (!dopo) {
    problemi.push({ tipo: 'RISORSA ALTRUI', route: `DELETE /api/contatti/:id`, dettaglio: 'B è riuscita a CANCELLARE un contatto di A' })
    console.log('    ✗ il contatto di A è stato cancellato da B')
  } else if (!idor) console.log('    nessuna risorsa altrui raggiungibile ✓')

  console.log('\n' + '─'.repeat(64))
  if (!problemi.length) console.log('NESSUN PROBLEMA TROVATO su', routes.length, 'route')
  else {
    console.log(`${problemi.length} PROBLEMI DA GUARDARE:\n`)
    problemi.forEach(p => console.log(`  [${p.tipo}] ${p.route}\n      ${p.dettaglio}`))
  }
} catch (e) {
  console.error('ERRORE:', e.message)
} finally {
  for (const x of [A, B]) {
    if (!x) continue
    await admin.from('contatti').delete().eq('azienda_id', x.aziendaId)
    if (x.userId) await admin.auth.admin.deleteUser(x.userId).catch(() => {})
    const { error } = await admin.from('aziende').delete().eq('id', x.aziendaId)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('\n[probe] aziende e utenti effimeri eliminati')
}
