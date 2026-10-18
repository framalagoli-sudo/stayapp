// Sonda: il calendario admin rispetta «conta il giorno di uscita» come il sito.
//
// Bug Automax (17/10): prenotazione 17→18 su un noleggio (conta_giorno_uscita).
// Il sito mostrava il 18 occupato (giusto), l'area admin lo mostrava libero →
// rischio di ri-affittare al telefono un'auto già fuori. La route /api/booking/
// occupancy aveva una copia a mano della regola che ignorava il flag; ora usa
// `fineOccupazione` come il sito.
//
//  - Risorsa con conta_giorno_uscita=true: una prenotazione 17→18 occupa 17 E 18.
//  - Risorsa senza il flag (stile hotel): la stessa occupa 17 ma NON il 18 (uscita).
//
// A mano. Uso: cd tests && node probe-calendario-uscita.mjs
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

let az = null, utente = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${!ok && nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)
// Un mese lontano, stabile, lontano da «oggi»: nessun termine di cancellazione in mezzo.
const MESE = '2031-06'
const D17 = `${MESE}-17`, D18 = `${MESE}-18`

try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-USCITA-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', slug: `zz-uscita-${t}`, name: 'ZZ Noleggi', active: true }).select().single(), 'entità')
  const base = { azienda_id: az.id, entity_tipo: 'attivita', entity_id: ent.id, modalita: 'giornaliero', quantita: 1, prezzo: 100, attiva: true, conferma_auto: true, blocchi: [] }
  const risConta = await deve(a.from('risorse').insert({ ...base, nome: 'ZZ Auto (conta uscita)', disponibilita: { conta_giorno_uscita: true } }).select().single(), 'risorsa conta')
  const risHotel = await deve(a.from('risorse').insert({ ...base, nome: 'ZZ Casa (uscita libera)', disponibilita: {} }).select().single(), 'risorsa hotel')
  const pren = (ris) => ({ risorsa_id: ris.id, azienda_id: az.id, entity_tipo: 'attivita', entity_id: ent.id, data: D17, data_fine: D18, cliente_nome: 'ZZ Cirulli', cliente_email: 'zz@example.invalid', n_persone: 1, stato: 'confermata', importo_totale: 200 })
  await deve(a.from('prenotazioni').insert(pren(risConta)).select('id').single(), 'prenotazione conta')
  await deve(a.from('prenotazioni').insert(pren(risHotel)).select('id').single(), 'prenotazione hotel')

  // Sessione admin_azienda della ZZ, per chiamare occupancy con lo scope giusto.
  const email = `zz-uscita-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })

  console.log(`\nIL CALENDARIO ADMIN (occupancy) RISPETTA «CONTA IL GIORNO DI USCITA»\n`)
  const occ = await (await fetch(`${BASE}/api/booking/occupancy?data_da=${MESE}-01&data_a=${MESE}-30`, { headers: { Authorization: `Bearer ${s.session.access_token}` } })).json()
  const gA = occ[risConta.id] || {}
  const gH = occ[risHotel.id] || {}
  esito(!!gA[D17] && !!gA[D18], 'risorsa che CONTA l’uscita: 17→18 occupa SIA il 17 SIA il 18 (come il sito)', `17:${!!gA[D17]} 18:${!!gA[D18]}`)
  esito(!!gH[D17] && !gH[D18], 'risorsa stile hotel: 17→18 occupa il 17 ma NON il 18 (uscita libera)', `17:${!!gH[D17]} 18:${!!gH[D18]}`)
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  try { if (az) { await a.from('prenotazioni').delete().eq('azienda_id', az.id); await a.from('risorse').delete().eq('azienda_id', az.id) } } catch {}
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
