// Chi apre il pannello per la prima volta trova le sue funzioni accese e il
// sito gia online.
//
// Il difetto (27/08): un cliente nuovo trovava 3 funzioni su 8 accese e
// `minisito: null`. Doveva scoprire da solo la pagina delle Funzioni per far
// comparire meta pannello, e il sito — la cosa per cui ha comprato OltreNova —
// non era configurato. Segnalato da Francesco dopo averlo vissuto su un cliente
// vero entrato quella mattina.
//
// ⚠️ Crea le entita **dalle route**, non scrivendo in tabella: la prima volta
// che ho misurato scrivevo diretto nel database e leggevo i default della
// colonna invece di quello che fa il pannello. Provare in un modo diverso da
// come il codice gira nasconde il difetto invece di rivelarlo.
//
// Uso: node probe-cliente-nuovo.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_URL || 'http://localhost:3488'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const { data: az } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-DEF-${Date.now()}`, require_2fa:false }).select().single()
const email=`probe-def-${Date.now()}@playwright.internal`, password=randomBytes(24).toString('base64url')
const { data:u } = await admin.auth.admin.createUser({ email, password, email_confirm:true })
await admin.from('profiles').upsert({ id:u.user.id, role:'admin_azienda', azienda_id:az.id, full_name:'P' }, { onConflict:'id' })
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
const { data:s } = await anon.auth.signInWithPassword({ email, password })
const T = s.session.access_token
let ko=0; const ok=(c,t)=>{console.log(`  ${c?'✓':'✗'} ${t}`); if(!c)ko++}
console.log('\nUN CLIENTE NUOVO TROVA TUTTO ACCESO\n')
const creati = []
for (const [tipo, api, pref] of [['struttura','/api/properties','s'], ['ristorante','/api/ristoranti','r'], ['attivita','/api/attivita','a']]) {
  const r = await fetch(`${L}${api}`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${T}`}, body: JSON.stringify({ name:`ZZ ${tipo}` }) })
  if (!r.ok) { ok(false, `${tipo}: creazione fallita (HTTP ${r.status}) ${(await r.text()).slice(0,80)}`); continue }
  const e = await r.json(); creati.push({ ...e, pref })
  const { data: v } = await admin.from('entita').select('moduli, minisito, slug').eq('id', e.id).single()
  const accese = Object.entries(v.moduli||{}).filter(([,x])=>x).map(([k])=>k)
  ok(accese.length >= 7, `${tipo.padEnd(11)} funzioni accese: ${accese.length} (${accese.join(' ')})`)
  ok(v.minisito?.active === true, `${tipo.padEnd(11)} sito pubblico acceso`)
  const sito = await fetch(`${L}/${pref}/${v.slug}`)
  ok(sito.ok, `${tipo.padEnd(11)} il sito risponde subito (HTTP ${sito.status})`)
}
console.log('\n' + (ko ? `  ${ko} PROBLEMI` : '  TUTTO ACCESO, SITO ONLINE DAL PRIMO MINUTO'))
for (const e of creati) await admin.from('entita').delete().eq('id', e.id)
await admin.auth.admin.deleteUser(u.user.id)
const { error } = await admin.from('aziende').delete().eq('id', az.id); if (error) console.error('pulizia:', error.message)
console.log('[probe] pulito')
process.exit(ko ? 1 : 0)
