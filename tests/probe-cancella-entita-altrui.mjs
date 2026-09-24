// L'admin di un'azienda può cancellare — o staccare i domini di — un'entità
// di UN'ALTRA azienda?
//
// Trovato il 24/09/2026 leggendo le route DELETE di /api/properties,
// /api/ristoranti e /api/attivita: la cancellazione era filtrata per azienda
// (0 righe, nessun errore), ma subito dopo la route chiamava comunque
// `rimuoviDominiEntita` con l'id ricevuto — che stacca gli indirizzi da Vercel
// e ne cancella la riga. Il sito dell'altra azienda andava offline, e la
// risposta era un 200: la sweep di sicurezza guarda cosa esce, non cosa
// succede, e un effetto collaterale non esce.
//
// Qui la vittima ha un dominio FINTO (`.invalid`, che su Vercel non esiste):
// staccarlo è una chiamata innocua, ma la riga nel database cambia — ed è
// quella la prova.
//
// Uso: node probe-cancella-entita-altrui.mjs   ($env:TEST_URL per il dev locale)
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

const aziende = [], utenti = [], entita = []
const API = { struttura: '/api/properties', ristorante: '/api/ristoranti', attivita: '/api/attivita' }

try {
  for (const nome of ['VITTIMA', 'ATTACCANTE']) {
    const { data, error } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-IDOR-${nome}-${marca}`, require_2fa: false }).select('id').single()
    if (error) throw new Error(error.message)
    aziende.push(data.id)
  }
  const [vittima, attaccante] = aziende

  const email = `zz-idor-${marca}@playwright.internal`
  const password = randomBytes(20).toString('base64url') + 'Aa1!'
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: attaccante, full_name: 'Idor' }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    .auth.signInWithPassword({ email, password })
  const H = { Authorization: `Bearer ${s.session.access_token}` }

  for (const tipo of Object.keys(API)) {
    console.log(`\n${tipo}`)
    const slug = `zz-idor-${tipo}-${marca}`
    const { data: e, error: eErr } = await admin.from('entita').insert({ azienda_id: vittima, tipo, name: `ZZ idor ${tipo}`, slug }).select('id').single()
    if (eErr) throw new Error(eErr.message)
    entita.push(e.id)
    const dominio = `zz-idor-${tipo}-${marca}.invalid`
    await admin.from('domini').insert({ azienda_id: vittima, entity_tipo: tipo, entity_id: e.id, entity_slug: slug, dominio, tipo: 'custom', stato: 'attivo' })
    await admin.from('pagine').insert({ entity_id: e.id, entity_tipo: tipo, titolo: 'ZZ idor', slug })

    const r = await fetch(`${BASE}${API[tipo]}/${e.id}`, { method: 'DELETE', headers: H })
    ok(r.status === 404 || r.status === 403, `l'attaccante riceve un rifiuto (${r.status})`)

    const { data: entDopo } = await admin.from('entita').select('id').eq('id', e.id).maybeSingle()
    ok(!!entDopo, 'l\'entità della vittima esiste ancora')
    const { data: domDopo } = await admin.from('domini').select('stato').eq('entity_id', e.id).maybeSingle()
    ok(domDopo?.stato === 'attivo', `il dominio della vittima è intatto (${domDopo ? 'stato ' + domDopo.stato : 'riga CANCELLATA'})`)
    const { count } = await admin.from('pagine').select('*', { count: 'exact', head: true }).eq('entity_id', e.id)
    ok(count === 1, 'la pagina della vittima esiste ancora')

    // Il caso legittimo deve continuare a funzionare: chi ne ha il diritto
    // cancella la PROPRIA entità. (Le strutture le cancellano solo super_admin
    // e admin_gruppo: per l'admin azienda il 403 è la regola di oggi.)
    if (tipo !== 'struttura') {
      const { data: mia } = await admin.from('entita').insert({ azienda_id: attaccante, tipo, name: `ZZ mia ${tipo}`, slug: `zz-idor-mia-${tipo}-${marca}` }).select('id').single()
      entita.push(mia.id)
      const r2 = await fetch(`${BASE}${API[tipo]}/${mia.id}`, { method: 'DELETE', headers: H })
      const { data: miaDopo } = await admin.from('entita').select('id').eq('id', mia.id).maybeSingle()
      ok(r2.status === 200 && !miaDopo, `il titolare cancella la propria entità (${r2.status}, ${miaDopo ? 'ancora presente' : 'sparita'})`)
    }
  }
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (entita.length) {
    await admin.from('domini').delete().in('entity_id', entita)
    await admin.from('pagine').delete().in('entity_id', entita)
    await admin.from('entita').delete().in('id', entita)
  }
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  if (aziende.length) await admin.from('aziende').delete().in('id', aziende)
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nNESSUNA AZIENDA TOCCA LE ENTITÀ DI UN\'ALTRA')
  process.exit(problemi ? 1 : 0)
}
