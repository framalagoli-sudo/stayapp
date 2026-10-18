// Sonda: iniezione nei filtri delle liste/ricerche (giro 9 dell'agente, 17/10/2026).
//
// In PostgREST la `.or('col.ilike.%X%,…')` con X dal client è l'equivalente di una
// SQL injection: se X contiene `,` `(` `)` si inietta logica di filtro e si prova a
// scavalcare il recinto per azienda. La lettura dice che le difese ci sono
// (contatti: strip di `,()\*` + `.eq(azienda_id)` separato; collegamenti: tipo in
// whitelist + UUID; occupancy/prenotazioni: date validate). Qui si PROVA, come B
// che tenta di leggere i dati di A.
//
//  1. Ricerca contatti: B, con payload d'iniezione in `?search=`, non vede MAI un
//     contatto di A. La risposta resta la sua.
//  2. Le date malformate nei filtri booking sono rifiutate (400), non interpolate.
//  3. collegamenti: tipo/entity_id non validi → 400.
//
// A mano. Uso: cd tests && node probe-iniezione-filtri.mjs
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

let azA = null, azB = null, utente = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

try {
  azA = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-INIEZIONE-A-${t}`, require_2fa: false }).select().single(), 'azienda A')
  azB = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-INIEZIONE-B-${t}`, require_2fa: false }).select().single(), 'azienda B')
  const marcatoreA = `SEGRETO-DI-A-${t}`
  const marcatoreB = `CONTATTO-DI-B-${t}`
  await deve(a.from('contatti').insert({ azienda_id: azA.id, nome: marcatoreA, email: `a-${t}@example.invalid` }).select('id').single(), 'contatto A')
  await deve(a.from('contatti').insert({ azienda_id: azB.id, nome: marcatoreB, email: `b-${t}@example.invalid` }).select('id').single(), 'contatto B')

  // Utente admin_azienda di B, con sessione vera.
  const email = `zz-iniez-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ B', azienda_id: azB.id }, { onConflict: 'id' })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const token = s.session.access_token
  const get = (path) => fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })

  console.log(`\n1. RICERCA CONTATTI — B tenta di leggere A via ?search=\n`)
  // I payload: provano a chiudere l'ilike e aggiungere un filtro che scavalchi l'azienda.
  const payloads = [
    marcatoreA,                                                   // il nome di A, cercato da B
    `%`,                                                          // tutto
    `x,nome.ilike.%${marcatoreA.slice(0, 8)}%`,                   // virgola per aggiungere un or
    `x),or(azienda_id.eq.${azA.id}`,                              // chiudere il gruppo e cambiare azienda
    `*),or(nome.not.is.null`,                                     // stella + breakout
    `\\`,                                                          // backslash
  ]
  for (const p of payloads) {
    const r = await get(`/api/contatti?search=${encodeURIComponent(p)}`)
    const body = await r.text()
    const okStatus = r.status === 200
    const nonVedeA = !body.includes(marcatoreA)
    esito(okStatus && nonVedeA, `search=${JSON.stringify(p).slice(0, 36)} → B non vede A`, `status ${r.status}${!nonVedeA ? ' — HA VISTO A' : ''}`)
  }
  // Controprova: B vede i SUOI contatti (la difesa non ha rotto il caso buono).
  const mio = await (await get(`/api/contatti`)).json()
  esito(Array.isArray(mio) && mio.some(c => c.nome === marcatoreB) && !mio.some(c => c.nome === marcatoreA), 'B vede i propri contatti e nessuno di A', `${Array.isArray(mio) ? mio.length : '?'} righe`)

  console.log(`\n2. DATE MALFORMATE NEI FILTRI BOOKING → rifiutate, non interpolate\n`)
  const iniezioneData = encodeURIComponent(`2020-01-01),or(azienda_id.eq.${azA.id}`)
  const r1 = await get(`/api/booking/occupancy?data_da=${iniezioneData}&data_a=2020-12-31`)
  esito(r1.status === 400, 'occupancy con data_da iniettata → 400', `status ${r1.status}`)
  const r2 = await get(`/api/booking/prenotazioni?data=${iniezioneData}`)
  esito(r2.status === 400, 'prenotazioni con data iniettata → 400', `status ${r2.status}`)
  // Le date buone continuano a funzionare.
  const r1ok = await get(`/api/booking/occupancy?data_da=2020-01-01&data_a=2020-12-31`)
  esito(r1ok.status === 200, 'occupancy con date valide → 200 (il caso buono regge)', `status ${r1ok.status}`)

  console.log(`\n3. COLLEGAMENTI — tipo/entity_id non validi → 400\n`)
  const c1 = await get(`/api/collegamenti?tipo=struttura&entity_id=${encodeURIComponent(`x),or(azienda_id.eq.${azA.id}`)}`)
  esito(c1.status === 400, 'entity_id non-UUID → 400', `status ${c1.status}`)
  const c2 = await get(`/api/collegamenti?tipo=javascript&entity_id=00000000-0000-0000-0000-000000000000`)
  esito(c2.status === 400, 'tipo fuori whitelist → 400', `status ${c2.status}`)
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (azA) await cancellaAziendaDiProva(azA.id)
  if (azB) await cancellaAziendaDiProva(azB.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
