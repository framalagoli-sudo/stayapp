// Più numeri WhatsApp per la stessa azienda: regge tutto quello che li legge?
//
// Dal 16/09/2026 un'azienda può avere un numero per entità più uno «generale»
// (migration 122). Prima ogni punto del codice chiedeva «il numero di questa
// azienda» con `.maybeSingle()`, che con due righe **fallisce**: il difetto non
// si vedrebbe finché un cliente non collega il secondo numero. Le domande:
//   1. il pannello elenca tutti i numeri, con l'entità di ciascuno?
//   2. scollegarne uno lascia vivi gli altri?
//   3. un id di un'altra azienda non cancella niente?
//   4. le pagine pubbliche (canali del modulo prenotazione) rispondono ancora?
//   5. il token non esce MAI verso il browser?
//
// Crea la propria azienda con due entità e cancella tutto.
// Uso: node probe-whatsapp-numeri.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: K, SUPABASE_ANON_KEY: A, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(U, K, { auth: { persistSession: false } })
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }
const api = (path, token, metodo = 'GET') => fetch(TEST_URL + path, {
  method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
}).then(async r => ({ s: r.status, testo: await r.text() })).then(r => ({ ...r, j: (() => { try { return JSON.parse(r.testo) } catch { return null } })() }))

let az = null, altra = null, utenti = []
try {
  const n = Date.now()
  const crea = async etichetta => {
    const { data: a, error } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-WA-${etichetta}-${n}`, require_2fa: false }).select('id').single()
    if (error) throw new Error(`azienda: ${error.message}`)
    return a.id
  }
  az = await crea('A'); altra = await crea('B')
  const ent = async (aziendaId, nome) => {
    const { data, error } = await admin.from('entita').insert({ azienda_id: aziendaId, tipo: 'attivita', slug: `zz-wa-${nome}-${n}`, name: `ZZ ${nome}`, active: true }).select('id').single()
    if (error) throw new Error(`entita: ${error.message}`)
    return data.id
  }
  const officina = await ent(az, 'Officina'), bar = await ent(az, 'Bar')

  // Tre righe: una per entità e una generale. Se la migration 122 non c'è, il
  // primo insert fallisce e la sonda lo dice chiaramente.
  const numero = async (aziendaId, entityId, telefono) => {
    const { error } = await admin.from('whatsapp_account').insert({
      azienda_id: aziendaId, entity_id: entityId, waba_id: `zzwaba${n}`,
      phone_number_id: `zz${telefono}`, numero_visualizzato: telefono, stato: 'attivo',
      access_token_cifrato: 'ZZ-TOKEN-FINTO-NON-VALIDO',
    })
    if (error) throw new Error(`numero ${telefono}: ${error.message} — migration 122 eseguita?`)
  }
  await numero(az, officina, '+39 000 000001')
  await numero(az, bar, '+39 000 000002')
  await numero(az, null, '+39 000 000003')
  // Un modello finto: scollegare UN numero non deve portarselo via, perché i
  // modelli sono dell'account WhatsApp e servono agli altri numeri.
  await admin.from('whatsapp_template').insert({
    azienda_id: az, catalogo_key: 'zz_probe', catalogo_versione: 1, lingua: 'it',
    nome_meta: `zz_probe_${n}`, stato: 'approvato',
  })
  console.log(`\nazienda ZZ-WA-A-${n} con 3 numeri — contro ${TEST_URL}\n`)

  const email = `probe-wa-${n}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: us, error: eu } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (eu) throw new Error(`utente: ${eu.message}`)
  utenti.push(us.user.id)
  await admin.from('profiles').upsert({ id: us.user.id, role: 'admin_azienda', azienda_id: az, full_name: 'Probe WA' }, { onConflict: 'id' })
  const { data: s } = await createClient(U, A, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  const token = s.session.access_token

  // 1. il pannello li vede tutti
  const r1 = await api(`/api/whatsapp/connect?azienda_id=${az}`, token)
  ok(r1.s === 200 && (r1.j?.numeri || []).length === 3, `elenca i 3 numeri (${r1.s}, ${(r1.j?.numeri || []).length})`)
  ok((r1.j?.numeri || []).some(x => x.entity_id === officina) && (r1.j?.numeri || []).some(x => !x.entity_id),
    'dice di chi è ciascuno (entità e generale)')
  ok((r1.j?.entita || []).length === 2, `manda le entità a cui assegnarli (${(r1.j?.entita || []).length})`)
  // 5. il token è la cosa più preziosa che abbiamo: non deve uscire mai.
  ok(!/ZZ-TOKEN-FINTO|access_token_cifrato/.test(r1.testo), 'il token NON esce verso il browser')

  // 4. la route pubblica non si rompe con più numeri
  const r4 = await api(`/api/guest/canali/attivita/${officina}`, null)
  ok(r4.s === 200 && r4.j && 'whatsapp' in r4.j, `i canali pubblici rispondono ancora (${r4.s} ${r4.testo.slice(0, 40)})`)

  // 3. l'id di un'altra azienda non cancella niente
  const { data: altroNum } = await admin.from('whatsapp_account').insert({
    azienda_id: altra, waba_id: `zzwaba-b-${n}`, phone_number_id: `zz-b-${n}`,
    numero_visualizzato: '+39 000 000009', stato: 'attivo',
  }).select('id').single()
  const r3 = await api(`/api/whatsapp/connect?azienda_id=${az}&account_id=${altroNum.id}`, token, 'DELETE')
  ok(r3.s === 404, `scollegare il numero di un'altra azienda: ${r3.s}`)
  const { data: vivo } = await admin.from('whatsapp_account').select('id').eq('id', altroNum.id).maybeSingle()
  ok(!!vivo, 'e quel numero è ancora lì')

  // 2. scollegarne uno lascia vivi gli altri
  const daTogliere = r1.j.numeri.find(x => x.entity_id === bar)
  const r2 = await api(`/api/whatsapp/connect?azienda_id=${az}&account_id=${daTogliere.id}`, token, 'DELETE')
  ok(r2.s === 200, `scollega il numero del bar (${r2.s})`)
  const dopo = await api(`/api/whatsapp/connect?azienda_id=${az}`, token)
  ok((dopo.j?.numeri || []).length === 2, `ne restano 2 (${(dopo.j?.numeri || []).length})`)
  const { count } = await admin.from('whatsapp_template').select('id', { count: 'exact', head: true }).eq('azienda_id', az)
  ok(count === 1, `i modelli restano agli altri numeri (${count} su 1 atteso)`)
} catch (e) {
  console.error('\n✗ la sonda si è fermata:', e.message); ko++
} finally {
  for (const u of utenti) await admin.auth.admin.deleteUser(u).catch(() => {})
  for (const a of [az, altra]) {
    if (!a) continue
    await admin.from('entita').delete().eq('azienda_id', a)
    const { error } = await admin.from('aziende').delete().eq('id', a)
    if (error) console.log(`⚠ azienda ${a} non cancellata: ${error.message}`)
  }
  console.log(`\n[probe] dati effimeri eliminati\n${ko ? `✗ ${ko} DA GUARDARE` : '✓ tutto regge'}\n`)
  process.exit(ko ? 1 : 0)
}
