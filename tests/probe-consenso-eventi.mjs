// Chi prenota un evento lascia nome, email e telefono: senza consenso, no.
//
// La spunta nel modulo è comodità — si toglie con due clic dagli strumenti da
// sviluppatore. La difesa vera sta nella route, e questa sonda la prova
// saltando del tutto il modulo: chiama l'API come farebbe uno script.
//
// Uso: node probe-consenso-eventi.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
let az, user, ev, ko = 0
const ok = (c, t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) ko++ }
try {
  const { data:a } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-CONS-${Date.now()}`, require_2fa:false }).select().single()
  az = a.id
  const email = `zz-cons-${Date.now()}@playwright.internal`, pw = randomBytes(24).toString('base64url')
  const { data:u } = await admin.auth.admin.createUser({ email, password:pw, email_confirm:true })
  user = u.user.id
  await admin.from('profiles').upsert({ id:user, role:'admin_azienda', azienda_id:az, full_name:'ZZ' }, { onConflict:'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data:s } = await anon.auth.signInWithPassword({ email, password:pw })
  const H = { Authorization:`Bearer ${s.session.access_token}`, 'Content-Type':'application/json' }

  console.log('\nIL CONSENSO ALLA PRENOTAZIONE DI UN EVENTO\n')
  const e = await (await fetch(`${L}/api/eventi`, { method:'POST', headers:H,
    body: JSON.stringify({ title:'ZZ Evento consenso', date_start:new Date(Date.now()+864e5).toISOString(), published:true, active:true }) })).json()
  ev = e.id
  ok(!!ev, 'evento di prova creato')
  if (!ev) throw new Error('stop')

  const prenota = (corpo) => fetch(`${L}/api/guest/eventi/${ev}/book`, {
    method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(corpo) })

  // ── saltando il modulo, come farebbe uno script
  const base = { guest_name:'Mario Rossi', guest_email:`zz-p-${Date.now()}@playwright.internal`, guest_phone:'333', seats:1 }
  const senza = await prenota(base)
  ok(senza.status === 400, `senza consenso: respinta (HTTP ${senza.status})`)

  const falso = await prenota({ ...base, privacy_accettata: false })
  ok(falso.status === 400, `consenso a "false": respinta (HTTP ${falso.status})`)

  const furbo = await prenota({ ...base, privacy_accettata: 'true' })
  ok(furbo.status === 400, `consenso come testo "true" invece che vero: respinta (HTTP ${furbo.status})`)

  const uno = await prenota({ ...base, privacy_accettata: 1 })
  ok(uno.status === 400, `consenso come numero 1: respinta (HTTP ${uno.status})`)

  const { count: dopoTentativi } = await admin.from('event_bookings').select('*', { count:'exact', head:true }).eq('event_id', ev)
  ok(dopoTentativi === 0, `nessun dato personale salvato nei tentativi respinti (${dopoTentativi} righe)`)

  // ── con il consenso, invece, deve funzionare
  const buona = await prenota({ ...base, privacy_accettata: true })
  ok(buona.ok, `con il consenso: accettata (HTTP ${buona.status})`)

  const { data: salvata } = await admin.from('event_bookings').select('*').eq('event_id', ev).maybeSingle()
  ok(salvata?.privacy_accettata === true, 'il consenso è registrato')
  ok(!!salvata?.privacy_accettata_il, `è registrato QUANDO (${salvata?.privacy_accettata_il?.slice(0,19) || '—'})`)
  ok(!!salvata?.privacy_testo && salvata.privacy_testo.length > 30,
     `è registrato QUALE testo la persona ha letto (${salvata?.privacy_testo?.slice(0,45) || '—'}…)`)

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `${ko} PROBLEMI` : 'NESSUN DATO PERSONALE ENTRA SENZA CONSENSO PROVATO')
} catch (er) { if (er.message !== 'stop') console.error('ERRORE:', er.message) }
finally {
  if (ev) { await admin.from('event_bookings').delete().eq('event_id', ev); await admin.from('eventi').delete().eq('id', ev) }
  if (user) { try { await admin.auth.admin.deleteUser(user) } catch {} }
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
