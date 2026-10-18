// Sonda: i file caricati (giro 10 dell'agente, 17/10/2026).
//
//  1. CROSS-TENANT: l'azienda B non può scrivere un file (né la copertina) in
//     un'entità di A passando il suo id → 403, e la copertina di A non cambia.
//     (Buco trovato e chiuso il 17/10 in /api/upload/cover: scriveva cover_url
//     su QUALSIASI entity_id dalla query senza controllare la proprietà.)
//  2. CONTENUTO: solo immagini vere. Un file che mente sul tipo (testo/SVG con
//     content-type image/png) è rifiutato; l'estensione salvata viene dalla
//     whitelist, mai dal nome del client → mai servito come codice.
//  3. IL CASO BUONO: B carica nella PROPRIA entità → 200.
//
// A mano. Uso: cd tests && node probe-upload-sicurezza.mjs
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

// Un PNG 1x1 vero (passa la firma e sharp).
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQBHijyQAAAAAElFTkSuQmCC', 'base64')

let azA = null, azB = null, utente = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

const invia = async (token, path, bytes, type, nome) => {
  const fd = new FormData()
  fd.append('file', new Blob([bytes], { type }), nome)
  return fetch(`${BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
}

try {
  azA = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-UPLOAD-A-${t}`, require_2fa: false, moduli: { struttura: true } }).select().single(), 'azienda A')
  azB = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-UPLOAD-B-${t}`, require_2fa: false, moduli: { struttura: true } }).select().single(), 'azienda B')
  const entA = await deve(a.from('entita').insert({ azienda_id: azA.id, tipo: 'struttura', name: 'ZZ Hotel A', slug: `zz-up-a-${t}`, cover_url: null }).select().single(), 'entità A')
  const entB = await deve(a.from('entita').insert({ azienda_id: azB.id, tipo: 'struttura', name: 'ZZ Hotel B', slug: `zz-up-b-${t}`, cover_url: null }).select().single(), 'entità B')

  const email = `zz-upload-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ B', azienda_id: azB.id, property_id: entB.id }, { onConflict: 'id' })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const token = s.session.access_token

  console.log(`\n1. CROSS-TENANT — B tenta di scrivere nell'entità di A\n`)
  const rCover = await invia(token, `/api/upload/cover?property_id=${entA.id}`, PNG_1x1, 'image/png', 'x.png')
  esito(rCover.status === 403, 'B carica la copertina sull’entità di A → 403', `status ${rCover.status}`)
  const aDopo = await deve(a.from('entita').select('cover_url').eq('id', entA.id).single(), 'rilettura A')
  esito(aDopo.cover_url === null, 'la copertina di A NON è cambiata', String(aDopo.cover_url))
  const rMini = await invia(token, `/api/upload/minisito-image?entity_type=struttura&entity_id=${entA.id}`, PNG_1x1, 'image/png', 'x.png')
  esito(rMini.status === 403, 'B carica un’immagine minisito nell’entità di A → 403', `status ${rMini.status}`)

  console.log(`\n2. CONTENUTO — solo immagini vere\n`)
  const rTesto = await invia(token, `/api/upload/cover?property_id=${entB.id}`, Buffer.from('<svg onload="alert(1)"><script>alert(2)</script></svg>'), 'image/png', 'finta.png')
  esito(rTesto.status === 400, 'un file che mente (SVG/testo spacciato per image/png) → 400', `status ${rTesto.status}`)
  const rSvgz = await invia(token, `/api/upload/cover?property_id=${entB.id}`, Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]), 'image/png', 'x.png')
  esito(rSvgz.status === 400, 'un file con firma sconosciuta (gzip/svgz) → 400', `status ${rSvgz.status}`)
  const rGrande = await invia(token, `/api/upload/cover?property_id=${entB.id}`, Buffer.alloc(6 * 1024 * 1024, 0x41), 'image/png', 'x.png')
  // In produzione Vercel rifiuta il corpo troppo grande al bordo (413); in locale è parseUpload (400). In ogni caso: rifiutato.
  esito(rGrande.status === 400 || rGrande.status === 413, 'un file oltre i 5 MB è rifiutato (400 o 413 al bordo)', `status ${rGrande.status}`)

  console.log(`\n3. IL CASO BUONO — B carica nella PROPRIA entità\n`)
  const rOk = await invia(token, `/api/upload/cover?property_id=${entB.id}`, PNG_1x1, 'image/png', 'x.png')
  const okBody = await rOk.json().catch(() => ({}))
  esito(rOk.status === 200 && typeof okBody.url === 'string' && /\.(webp|png|jpg)\b/.test(okBody.url), 'B carica la propria copertina → 200, URL immagine', `status ${rOk.status} ${okBody.url || okBody.error || ''}`)
  const bDopo = await deve(a.from('entita').select('cover_url').eq('id', entB.id).single(), 'rilettura B')
  esito(!!bDopo.cover_url, 'la copertina di B è stata salvata sulla SUA entità')
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (azA) await cancellaAziendaDiProva(azA.id)
  if (azB) await cancellaAziendaDiProva(azB.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
