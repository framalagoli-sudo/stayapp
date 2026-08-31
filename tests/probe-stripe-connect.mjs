// Il cliente collega il suo conto, e il rischio non è nostro.
//
// Il vincolo di Francesco, sue parole: *«voglio che ogni bega, rischio ecc. sia
// tra il ns cliente e stripe»* e **«io non voglio trattenere nulla»**.
//
// ⛔ Il controllo che dà il nome a questa sonda è uno solo:
//
//     losses_collector === 'stripe'
//
// Se quel campo venisse omesso creando l'account, il valore predefinito è
// `application` — cioè **noi**. Nessun errore, nessun avviso: semplicemente i
// saldi negativi dei clienti diventerebbero un debito di OltreNova. È il tipo di
// guasto che non si vede finché non arriva il conto.
//
// L'account demo che Stripe crea da solo in sandbox ce l'ha davvero,
// `application`: la prova che il difetto non è teorico.
//
// Uso: TEST_LOCALE=http://localhost:3000 node probe-stripe-connect.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const utenti = [], aziende = []
try {
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-STRIPE-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const email = `zz-stripe-${Date.now()}@playwright.internal`
  const pw = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: 'Stripe' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password: pw })
  const H = { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }

  console.log('\nPRIMA DI COLLEGARE\n')
  let r = await (await fetch(`${L}/api/stripe/connect`, { headers: H })).json()
  ok(r.collegato === false, `l'azienda non risulta collegata (${JSON.stringify(r).slice(0, 80)})`)

  console.log('\nIL CLIENTE COLLEGA IL SUO CONTO\n')
  const creato = await (await fetch(`${L}/api/stripe/connect`, { method: 'POST', headers: H, body: '{}' })).json()
  ok(!!creato.account_id?.startsWith('acct_'), `account creato: ${creato.account_id || creato.error}`)
  ok(!!creato.url?.startsWith('https://'), `Stripe ha dato il link di attivazione`)

  const { data: dopo } = await admin.from('aziende').select('stripe_account_id').eq('id', az.id).maybeSingle()
  ok(dopo?.stripe_account_id === creato.account_id, `l'id è stato salvato sull'azienda`)

  // ⚠️ Cliccando due volte non deve nascere un secondo account: il cliente
  // completerebbe l'attivazione su uno e incasserebbe sull'altro.
  const secondo = await (await fetch(`${L}/api/stripe/connect`, { method: 'POST', headers: H, body: '{}' })).json()
  ok(secondo.account_id === creato.account_id, `un secondo clic riusa lo stesso account, non ne crea un altro`)

  console.log('\n⛔ IL RISCHIO NON È NOSTRO\n')
  r = await (await fetch(`${L}/api/stripe/connect`, { headers: H })).json()
  ok(r.collegato === true, 'lo stato dice collegato')
  ok(r.responsabilita?.losses_collector === 'stripe',
     `le PERDITE sono di Stripe, non nostre (${r.responsabilita?.losses_collector})`)
  ok(r.responsabilita?.fees_collector === 'stripe',
     `le commissioni le incassa Stripe dal cliente (${r.responsabilita?.fees_collector})`)
  ok(r.incassa === false && r.da_completare === true,
     `appena creato non incassa e ha requisiti da completare — giusto così`)

  console.log('\nNESSUNO VEDE O TOCCA IL CONTO DI UN ALTRO\n')
  const senza = await fetch(`${L}/api/stripe/connect`)
  ok(senza.status === 401 || senza.status === 403, `senza credenziali: ${senza.status}`)

  const { data: az2 } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-STRIPE2-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az2.id)
  const email2 = `zz-stripe2-${Date.now()}@playwright.internal`
  const { data: u2 } = await admin.auth.admin.createUser({ email: email2, password: pw, email_confirm: true })
  utenti.push(u2.user.id)
  await admin.from('profiles').upsert({ id: u2.user.id, role: 'admin_azienda', azienda_id: az2.id, full_name: 'S2' }, { onConflict: 'id' })
  const { data: s2 } = await anon.auth.signInWithPassword({ email: email2, password: pw })
  const H2 = { Authorization: `Bearer ${s2.session.access_token}`, 'Content-Type': 'application/json' }

  const altrui = await (await fetch(`${L}/api/stripe/connect`, { headers: H2 })).json()
  ok(altrui.collegato === false, `un'altra azienda non vede questo conto`)

  // Chiedere esplicitamente l'azienda altrui non deve servire a niente.
  const forzato = await (await fetch(`${L}/api/stripe/connect?azienda_id=${az.id}`, { headers: H2 })).json()
  ok(forzato.collegato === false, `e non lo vede nemmeno chiedendolo per id`)

  console.log('\n' + '─'.repeat(66))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL CLIENTE INCASSA SUL SUO CONTO, E LE PERDITE SONO DI STRIPE')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  // ⚠️ Gli account Stripe di prova restano in sandbox: l'API non li cancella e
  // non è un problema — è un ambiente finto. Qui si pulisce solo il nostro.
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
