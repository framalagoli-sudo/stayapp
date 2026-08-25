// La whitelist unica non deve aver aperto la porta alle chiavi di sistema.
//
// Unificando i campi modificabili (prima una lista per verticale, ora una sola)
// il rischio è di allargare troppo: un PATCH che riscrive `azienda_id` sposta
// l'entità sotto un'altra azienda, cioè regala i dati di un cliente a un altro.
// Qui si prova a scriverli davvero e si rilegge dal DB.
//
// Uso: TEST_LOCALE=http://localhost:3488 node probe-entita-campi-sistema.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
let problemi = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) problemi++ }
const API = { struttura:'/api/properties', ristorante:'/api/ristoranti', attivita:'/api/attivita' }
const aziende = [], utenti = [], entita = []
try {
  const mk = async n => { const { data } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-SYS-${n}-${Date.now()}`, require_2fa:false, moduli:{struttura:true,ristorante:true,attivita:true} }).select().single(); aziende.push(data.id); return data.id }
  const azA = await mk('A'), azB = await mk('B')
  const email=`zz-sys-${Date.now()}@playwright.internal`, pw=randomBytes(24).toString('base64url')
  const { data:u } = await admin.auth.admin.createUser({ email, password:pw, email_confirm:true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id:u.user.id, role:'admin_azienda', azienda_id:azA, full_name:'Sys' }, { onConflict:'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data:s } = await anon.auth.signInWithPassword({ email, password:pw })
  const H = { Authorization:`Bearer ${s.session.access_token}`, 'Content-Type':'application/json' }

  for (const tipo of ['struttura','ristorante','attivita']) {
    console.log(`\n${tipo}`)
    const r = await fetch(L+API[tipo], { method:'POST', headers:H, body: JSON.stringify({ name:`ZZ sys ${tipo}` }) })
    const ent = await r.json()
    if (!ent?.id) { ok(false, 'creazione fallita'); continue }
    entita.push(ent.id)
    const primaId = ent.id

    await fetch(`${L}${API[tipo]}/${ent.id}`, { method:'PATCH', headers:H, body: JSON.stringify({
      azienda_id: azB,               // regalare l'entità a un'altra azienda
      id: '00000000-0000-0000-0000-000000000001',
      tipo: 'struttura',             // cambiare l'indirizzo pubblico da fuori
      plan: 'enterprise',            // sbloccarsi un piano
      origine_tabella: 'falso',
      created_at: '2000-01-01T00:00:00Z',
      name: 'ZZ sys toccata',        // un campo lecito, per essere certi che il PATCH sia passato
    }) })
    const { data: dopo } = await admin.from('entita').select('*').eq('id', primaId).maybeSingle()
    ok(!!dopo, 'l\'entità esiste ancora con lo stesso id')
    ok(dopo?.name === 'ZZ sys toccata', 'il PATCH è stato davvero eseguito (campo lecito scritto)')
    ok(dopo?.azienda_id === azA, `azienda_id non spostata${dopo?.azienda_id!==azA?' — DATI REGALATI A UN\'ALTRA AZIENDA':''}`)
    ok(dopo?.tipo === tipo, `tipo tecnico invariato (${dopo?.tipo})`)
    ok(dopo?.plan !== 'enterprise', `plan non auto-assegnato (${dopo?.plan})`)
    ok(!dopo?.created_at?.startsWith('2000'), 'created_at non riscritto')
  }
  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI` : 'LE CHIAVI DI SISTEMA RESTANO FUORI PORTATA')
} catch (e) { console.error('ERRORE:', e.message); problemi++ }
finally {
  for (const id of entita) await admin.from('entita').delete().eq('id', id)
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
