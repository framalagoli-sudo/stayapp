// Il ciclo completo di un'entità sulla tabella unificata.
//
// Crea, rilegge, modifica, elenca e pubblica ognuno dei tre tipi, verificando
// che il pannello continui a vedere i nomi storici (`modules`, `pwa`, `tipo`
// come settore) mentre sotto il database usa quelli nuovi. E che il tipo NON
// limiti più le funzioni: è il motivo per cui si è unificato.
//
// Uso: TEST_LOCALE=http://localhost:3455 node probe-entita-ciclo.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
let problemi = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) problemi++ }
let az=null, userId=null; const creati=[]
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-CICLO-${Date.now()}`, require_2fa:false, moduli:{struttura:true,ristorante:true,attivita:true} }).select().single()
  az = a.id
  const email=`zz-ciclo-${Date.now()}@playwright.internal`, pw=randomBytes(24).toString('base64url')
  const { data:u } = await admin.auth.admin.createUser({ email, password:pw, email_confirm:true })
  userId = u.user.id
  await admin.from('profiles').upsert({ id:userId, role:'admin_azienda', azienda_id:az, full_name:'Ciclo' }, { onConflict:'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data:s } = await anon.auth.signInWithPassword({ email, password:pw })
  const H = { Authorization:`Bearer ${s.session.access_token}`, 'Content-Type':'application/json' }

  for (const [nome, ep, tipo] of [['struttura','/api/properties','struttura'],['ristorante','/api/ristoranti','ristorante'],['attivita','/api/attivita','attivita']]) {
    console.log(`\n${nome}`)
    const r = await fetch(L+ep, { method:'POST', headers:H, body: JSON.stringify({ name:`ZZ ${nome} ciclo`, ...(tipo==='attivita'?{tipo:'Palestra'}:{}) }) })
    const d = await r.json()
    if (!d?.id) { ok(false, `creazione fallita: ${JSON.stringify(d).slice(0,90)}`); continue }
    creati.push(d.id)
    ok(r.status===201, `creata (${d.slug})`)
    if (tipo==='attivita') ok(d.tipo==='Palestra', `il settore torna al pannello come "tipo" (${d.tipo})`)

    const g = await (await fetch(`${L}${ep}/${d.id}`, { headers:H })).json()
    ok(g?.id===d.id, 'riletta')

    const campoModuli = tipo==='attivita' ? 'pwa' : 'modules'
    const pd = await (await fetch(`${L}${ep}/${d.id}`, { method:'PATCH', headers:H, body: JSON.stringify({ name:'ZZ Rinominata', [campoModuli]:{ info:true, prova:true } }) })).json()
    ok(pd?.name==='ZZ Rinominata', 'rinominata')
    ok(pd?.[campoModuli]?.prova===true, `${campoModuli} torna col nome storico`)
    const { data: riga } = await admin.from('entita').select('moduli, tipo').eq('id', d.id).maybeSingle()
    ok(riga?.moduli?.prova===true, 'nel database sta in "moduli"')
    ok(riga?.tipo===tipo, `il tipo tecnico resta "${riga?.tipo}"`)

    const lista = await (await fetch(L+ep, { headers:H })).json()
    ok(Array.isArray(lista) && lista.some(x=>x.id===d.id), "compare nell'elenco")

    await admin.from('entita').update({ active:true, minisito:{ active:true } }).eq('id', d.id)
    const pref = { struttura:'s', ristorante:'r', attivita:'a' }[tipo]
    ok((await fetch(`${L}/${pref}/${d.slug}`)).status===200, 'il sito pubblico risponde')
  }

  console.log('\nparità funzionale — il tipo non limita più niente')
  for (const id of creati) {
    const { error } = await admin.from('entita')
      .update({ menu:[{cat:'Prova'}], services:[{name:'Prova'}], wifi_name:'X', activities:[{a:1}] }).eq('id', id)
    ok(!error, 'menù, servizi, wifi e attività convivono sulla stessa entità')
  }
  console.log('\n' + '─'.repeat(60))
  console.log(problemi ? `${problemi} PROBLEMI` : 'CICLO COMPLETO CORRETTO')
} catch (e) { console.error('ERRORE:', e.message); problemi++ }
finally {
  for (const id of creati) await admin.from('entita').delete().eq('id', id)
  if (userId) { try { await admin.auth.admin.deleteUser(userId) } catch {} }
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
