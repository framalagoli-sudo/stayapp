// Un cliente che si registra da solo, riesce ad arrivare al sito pubblicato?
//
// Non si deduce leggendo il codice: si percorre. Questa sonda crea un account
// **identico** a quello che produce `/api/auth/signup` (stessa azienda, stessi
// moduli spenti, stesso ruolo) e prova a fare, nell'ordine, quello che farebbe
// un cliente il primo giorno. Ogni passo che non riesce è un punto in cui oggi
// serve una telefonata.
//
// Uso: TEST_LOCALE=http://localhost:3488 node probe-percorso-cliente.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const passi = []
const passo = (n, esito, nota) => { passi.push({ n, esito, nota }); console.log(`  ${esito?'✓':'✗'} ${n}${nota?` — ${nota}`:''}`) }
let azId = null, userId = null, entId = null
try {
  console.log('\nIL PRIMO GIORNO DI UN CLIENTE CHE SI È REGISTRATO DA SOLO\n')
  // ── esattamente quello che fa /api/auth/signup
  const email = `zz-percorso-${Date.now()}@playwright.internal`, pw = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true })
  userId = u.user.id
  const { data: az } = await admin.from('aziende').insert({
    ragione_sociale: 'ZZ Studio Legale Prova', email,
    moduli: { struttura: false, ristorante: false, attivita: false },
    piano: 'base', active: true, subscription_status: 'trial',
    trial_ends_at: new Date(Date.now()+14*864e5).toISOString(), require_2fa: false,
  }).select().single()
  azId = az.id
  await admin.from('profiles').upsert({ id: userId, role: 'admin_azienda', azienda_id: azId, full_name: 'ZZ Studio Legale Prova' }, { onConflict: 'id' })

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{persistSession:false} })
  const { data: s, error: e1 } = await anon.auth.signInWithPassword({ email, password: pw })
  passo('1. accede al pannello', !e1 && !!s?.session)
  const H = { Authorization:`Bearer ${s.session.access_token}`, 'Content-Type':'application/json' }

  // ── 2. la pagina indicata dall'email di benvenuto
  const onb = await fetch(`${L}/admin/onboarding`)
  passo("2. apre la pagina che gli indica l'email di benvenuto", onb.status === 200, `/admin/onboarding → HTTP ${onb.status}`)

  // ── 3. crea la sua prima entità (il suo sito)
  const r = await fetch(`${L}/api/attivita`, { method:'POST', headers:H, body: JSON.stringify({ name:'ZZ Studio Legale Prova' }) })
  const ent = await r.json()
  entId = ent?.id || null
  passo('3. crea la sua prima entità (senza chiedere a nessuno)', r.ok && !!ent?.id, r.ok ? `slug ${ent.slug}` : `HTTP ${r.status}: ${ent?.error||''}`)

  if (entId) {
    // ── 4. la vede nel proprio elenco
    const lista = await (await fetch(`${L}/api/attivita`, { headers:H })).json()
    passo('4. la ritrova nel proprio elenco', Array.isArray(lista) && lista.some(x => x.id === entId),
      Array.isArray(lista) ? `${lista.length} entità` : 'risposta non è una lista')

    // ── 5. compila i dati e pubblica
    const patch = await fetch(`${L}/api/attivita/${entId}`, { method:'PATCH', headers:H,
      body: JSON.stringify({ description:'Assistenza legale per imprese', phone:'075 000000', email, minisito:{ active:true, tagline:'Diritto del lavoro' } }) })
    passo('5. compila i dati e attiva il sito pubblico', patch.ok, patch.ok ? '' : `HTTP ${patch.status}`)

    // ── 6. il sito risponde davvero a un visitatore
    const pub = await fetch(`${L}/a/${ent.slug}`)
    const html = await pub.text()
    passo('6. il sito è online e mostra il suo nome', pub.status === 200 && html.includes('ZZ Studio Legale Prova'), `HTTP ${pub.status}`)

    // ── 7. le funzioni: può accendere quello che gli serve?
    const fz = await fetch(`${L}/api/attivita/${entId}`, { method:'PATCH', headers:H, body: JSON.stringify({ pwa:{ servizi:true, vetrine:true } }) })
    passo('7. accende le funzioni che gli servono', fz.ok)

    // ── 8. collega il proprio dominio
    const dom = await fetch(`${L}/api/domini`, { method:'POST', headers:H,
      body: JSON.stringify({ dominio:`zz-prova-${Date.now()}.example.com`, entity_tipo:'attivita', entity_id:entId }) })
    const domJson = await dom.json().catch(()=>({}))
    passo('8. collega il proprio dominio', dom.ok, dom.ok ? '' : `HTTP ${dom.status}: ${domJson?.error||''}`)
    if (dom.ok && domJson?.id) await admin.from('domini').delete().eq('id', domJson.id)
  }

  // ── 9. il pannello gli mostra qualcosa da fare?
  const dash = await fetch(`${L}/admin`)
  passo('9. il pannello si apre', dash.status === 200, `HTTP ${dash.status}`)

  const ko = passi.filter(p => !p.esito)
  console.log('\n' + '─'.repeat(64))
  console.log(ko.length ? `${ko.length} PUNTI DI CADUTA:\n${ko.map(p=>'   • '+p.n).join('\n')}` : 'IL PERCORSO REGGE DA SOLO')
} catch (e) { console.error('ERRORE:', e.message) }
finally {
  if (entId) await admin.from('entita').delete().eq('id', entId)
  if (userId) { try { await admin.auth.admin.deleteUser(userId) } catch {} }
  if (azId) { const { error } = await admin.from('aziende').delete().eq('id', azId); if (error) console.error('pulizia azienda:', error.message) }
  console.log('[probe] pulito')
}
