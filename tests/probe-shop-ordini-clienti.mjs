// Ordini e Clienti: due domande separate, e un elenco che non si compila a mano.
//
// Il modello è quello di Shopify, per decisione di Francesco: «per tutta la
// parte ecommerce ci ispiriamo a loro che sono i migliori».
//
// Due cose si provano qui, e nascono da due errori facili:
//
//  1. **Un ordine ha due stati.** «Ho incassato?» e «È partito?» sono domande
//     diverse che capitano in qualsiasi ordine. Con un campo solo, scrivere
//     «spedito» cancellava l'informazione sul pagamento — e un contrassegno non
//     era rappresentabile affatto.
//
//  2. **I clienti non sono una tabella nuova.** Si ricavano dagli ordini, come
//     in Shopify: chi compra diventa un cliente perché ha comprato. Una seconda
//     anagrafica accanto ai Contatti sarebbe la solita seconda porta per la
//     stessa stanza.
//
// E il numero che conta: **«speso» somma solo ciò che è stato incassato.** È il
// valore su cui un negoziante decide chi trattare bene: gonfiarlo con ordini
// mai pagati lo rende inutile.
//
// Uso: node probe-shop-ordini-clienti.mjs
//      TEST_LOCALE=http://localhost:3000 node probe-shop-ordini-clienti.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const ordiniCreati = [], utenti = [], aziende = []
try {
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-SHOP-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const email = `zz-shop-${Date.now()}@playwright.internal`
  const pw = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: 'Shop' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password: pw })
  const H = { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }

  // Tre ordini dello stesso cliente + uno di un altro. Uno non pagato: è quello
  // che smaschera un totale «speso» calcolato male.
  const cliente = 'zz-compratore@playwright.internal'
  const righe = [
    { email_cliente: cliente, nome_cliente: 'Anna Bianchi', totale: 100, stato: 'pagato' },
    { email_cliente: cliente, nome_cliente: 'Anna Bianchi', totale: 50,  stato: 'spedito' },
    { email_cliente: cliente, nome_cliente: 'Anna Bianchi', totale: 999, stato: 'in_attesa' },  // MAI incassato
    { email_cliente: 'zz-altro@playwright.internal', nome_cliente: 'Luca Verdi', totale: 30, stato: 'consegnato' },
  ]
  for (const r of righe) {
    const { data } = await admin.from('ordini').insert({ ...r, azienda_id: az.id, voci: [{ nome: 'X', qty: 1 }] }).select().single()
    ordiniCreati.push(data.id)
  }

  console.log('\nUN ORDINE HA DUE STATI, NON UNO\n')
  const { data: dopo } = await admin.from('ordini')
    .select('stato, pagamento_stato, evasione_stato, totale').eq('azienda_id', az.id).order('totale')
  const trova = t => dopo.find(x => Number(x.totale) === t)

  ok(trova(50)?.pagamento_stato === 'pagato' && trova(50)?.evasione_stato === 'spedito',
     `«spedito» ora dice anche che è pagato  (${trova(50)?.pagamento_stato} / ${trova(50)?.evasione_stato})`)
  ok(trova(999)?.pagamento_stato === 'non_pagato' && trova(999)?.evasione_stato === 'da_evadere',
     `«in attesa» = non pagato e da evadere  (${trova(999)?.pagamento_stato} / ${trova(999)?.evasione_stato})`)
  ok(trova(30)?.pagamento_stato === 'pagato' && trova(30)?.evasione_stato === 'consegnato',
     `«consegnato» = pagato e consegnato  (${trova(30)?.pagamento_stato} / ${trova(30)?.evasione_stato})`)

  // ⛔ Il database rifiuta uno stato inventato: la validazione in route è la
  // prima difesa, il CHECK è quella che vale anche per la service_role.
  const { error: rifiutato } = await admin.from('ordini')
    .update({ pagamento_stato: 'quasi_pagato' }).eq('id', ordiniCreati[0])
  ok(!!rifiutato, 'uno stato inventato viene rifiutato dal database')

  console.log('\nI CLIENTI SI RICAVANO DAGLI ORDINI\n')
  const clienti = await (await fetch(`${L}/api/shop/clienti`, { headers: H })).json()
  ok(Array.isArray(clienti), `la route risponde con un elenco (${Array.isArray(clienti) ? clienti.length : JSON.stringify(clienti).slice(0, 60)})`)
  ok(clienti.length === 2, `due clienti distinti da quattro ordini (${clienti.length})`)

  const anna = clienti.find(c => c.email === cliente)
  ok(!!anna, 'Anna compare una volta sola, non tre')
  ok(anna?.ordini === 3, `ha 3 ordini (${anna?.ordini})`)
  // ⛔ Il controllo che conta: 100 + 50 incassati, i 999 mai pagati NON contano.
  ok(anna?.speso === 150, `speso = 150, non 1149: i non pagati non si contano (${anna?.speso})`)
  ok(anna?.nome === 'Anna Bianchi', `il nome arriva dagli ordini («${anna?.nome}»)`)

  console.log('\nNESSUNO VEDE I CLIENTI DI UN ALTRO\n')
  const senza = await fetch(`${L}/api/shop/clienti`)
  ok(senza.status === 401 || senza.status === 403, `senza credenziali: ${senza.status}`)

  // Un'altra azienda, con il proprio token, non deve vedere questi clienti.
  const { data: az2 } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-SHOP2-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(az2.id)
  const email2 = `zz-shop2-${Date.now()}@playwright.internal`
  const { data: u2 } = await admin.auth.admin.createUser({ email: email2, password: pw, email_confirm: true })
  utenti.push(u2.user.id)
  await admin.from('profiles').upsert({ id: u2.user.id, role: 'admin_azienda', azienda_id: az2.id, full_name: 'Shop2' }, { onConflict: 'id' })
  const { data: s2 } = await anon.auth.signInWithPassword({ email: email2, password: pw })
  const altrui = await (await fetch(`${L}/api/shop/clienti`, { headers: { Authorization: `Bearer ${s2.session.access_token}` } })).json()
  ok(Array.isArray(altrui) && altrui.length === 0, `un'altra azienda non vede nessuno di questi (${Array.isArray(altrui) ? altrui.length : '?'})`)

  console.log('\n' + '─'.repeat(66))
  console.log(problemi ? `${problemi} PROBLEMI` : 'DUE STATI SEPARATI, E I CLIENTI ESCONO DAGLI ORDINI')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const id of ordiniCreati) await admin.from('ordini').delete().eq('id', id)
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
