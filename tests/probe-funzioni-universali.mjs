// L'all-in-one è vero anche nell'ESPERIENZA, non solo nei dati?
//
// Prima le funzioni erano decise dal tipo: un hotel non poteva avere un menù,
// un ristorante non poteva elencare i servizi. Non era una scelta di prodotto,
// era il codice che non sapeva fare altrimenti. Qui si verifica che ogni tipo
// possa accendere ogni funzione, aprirne la pagina e salvarne il contenuto.
//
// Uso: TEST_LOCALE=http://localhost:3488 node probe-funzioni-universali.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
let problemi = 0
const ok = (c,t) => { console.log(`  ${c?'✓':'✗'} ${t}`); if(!c) problemi++ }
const ROTTA = { struttura:'struttura', ristorante:'ristoranti', attivita:'attivita' }
const API   = { struttura:'/api/properties', ristorante:'/api/ristoranti', attivita:'/api/attivita' }
let az=null, userId=null; const creati=[]
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale:`ZZ-FUNZ-${Date.now()}`, require_2fa:false, moduli:{struttura:true,ristorante:true,attivita:true} }).select().single()
  az = a.id
  const email=`zz-funz-${Date.now()}@playwright.internal`, pw=randomBytes(24).toString('base64url')
  const { data:u } = await admin.auth.admin.createUser({ email, password:pw, email_confirm:true })
  userId = u.user.id
  await admin.from('profiles').upsert({ id:userId, role:'admin_azienda', azienda_id:az, full_name:'Funz' }, { onConflict:'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data:s } = await anon.auth.signInWithPassword({ email, password:pw })
  const H = { Authorization:`Bearer ${s.session.access_token}`, 'Content-Type':'application/json' }

  for (const tipo of ['struttura','ristorante','attivita']) {
    console.log(`\n${tipo}`)
    const r = await fetch(L+API[tipo], { method:'POST', headers:H, body: JSON.stringify({ name:`ZZ ${tipo} funz` }) })
    const ent = await r.json()
    if (!ent?.id) { ok(false, `creazione fallita`); continue }
    creati.push(ent.id)

    // accende TUTTE le funzioni, anche quelle "di un altro verticale"
    const campo = tipo==='attivita' ? 'pwa' : 'modules'
    await fetch(`${L}${API[tipo]}/${ent.id}`, { method:'PATCH', headers:H,
      body: JSON.stringify({ [campo]: { menu:true, servizi:true, attivita:true, escursioni:true, galleria:true, vetrine:true, chatbot:true } }) })

    // ogni sezione deve aprirsi
    const sezioni = ['menu','services','activities','excursions','gallery','vetrine','funzioni']
    const rotte = []
    for (const sez of sezioni) {
      const p = await fetch(`${L}/admin/${ROTTA[tipo]}/${ent.id}/${sez}`)
      if (p.status !== 200) rotte.push(`${sez}:${p.status}`)
    }
    ok(rotte.length===0, `apre tutte le sezioni${rotte.length?' — problemi: '+rotte.join(' '):''}`)

    // e i contenuti "fuori verticale" si salvano davvero
    const contenuti = tipo==='ristorante'
      ? { services:[{ id:'x', name:'Parcheggio' }] }        // un ristorante con i servizi
      : { menu:[{ id:'x', category:'Colazioni', items:[] }] } // un hotel/una palestra col menù
    const salvato = await fetch(`${L}${API[tipo]}/${ent.id}`, { method:'PATCH', headers:H, body: JSON.stringify(contenuti) })
    const dopo = await salvato.json()
    const campoTest = Object.keys(contenuti)[0]
    ok(salvato.ok && Array.isArray(dopo?.[campoTest]) && dopo[campoTest].length===1,
      `salva "${campoTest}" — la funzione di un altro verticale`)
  }
  console.log('\n' + '─'.repeat(60))
  console.log(problemi ? `${problemi} PROBLEMI` : 'OGNI TIPO PUÒ USARE OGNI FUNZIONE')
} catch (e) { console.error('ERRORE:', e.message); problemi++ }
finally {
  for (const id of creati) await admin.from('entita').delete().eq('id', id)
  if (userId) { try { await admin.auth.admin.deleteUser(userId) } catch {} }
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
