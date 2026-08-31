// Prenotazioni ed eventi incassano, e il conto torna.
//
// ⚠️ Il controllo che dà il nome a questa sonda è l'ultimo: **quello che si
// paga deve essere esattamente la percentuale del totale**. È lo stesso genere
// di difetto del «2 notti · €90 a notte» sopra un totale di €270 — due numeri
// veri accostati male, e la differenza la scopre chi paga.
//
// Si provano anche i due casi in cui NON si deve pagare nulla, che sono la
// maggior parte: acconto a zero (si paga sul posto) e conto Stripe non
// collegato. In entrambi la prenotazione deve **restare valida**: il posto è
// già stato tenuto, e perderlo perché la cassa non è disponibile sarebbe un
// danno peggiore del mancato incasso.
//
// Uso: TEST_LOCALE=http://localhost:3000 node probe-acconto.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const g = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

const aziende = [], utenti = [], risorse = []
try {
  // ── un'azienda SENZA conto collegato: il caso più comune oggi
  const { data: azSenza } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-ACC-SENZA-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(azSenza.id)
  const { data: ent } = await admin.from('entita').select('id, tipo').limit(1).maybeSingle()

  const nuovaRisorsa = async (aziendaId, perc) => {
    const { data } = await admin.from('risorse').insert({
      azienda_id: aziendaId, entity_tipo: ent.tipo, entity_id: ent.id,
      nome: `ZZ Acconto ${perc}%`, modalita: 'giornaliero', prezzo: 100, quantita: 1,
      acconto_percentuale: perc, attiva: true, visibile_minisito: true,
      disponibilita: {},
    }).select().single()
    risorse.push(data.id)
    return data
  }

  const prenota = (id, dal, al) => fetch(`${L}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      risorsa_id: id, data: dal, data_fine: al, cliente_nome: 'ZZ Cliente',
      cliente_email: `zz-acc-${Date.now()}@playwright.internal`, n_persone: 1, privacy_accettata: true,
    }),
  }).then(r => r.json().then(j => ({ s: r.status, j })))

  console.log('\nACCONTO A ZERO — si paga sul posto, com\'era\n')
  let r = await nuovaRisorsa(azSenza.id, 0)
  let esito = await prenota(r.id, g(300), g(303))
  ok(esito.s === 201, `la prenotazione riesce (HTTP ${esito.s})`)
  ok(!esito.j.pagamento, 'nessuna cassa: non c\'è niente da pagare')

  console.log('\nACCONTO CHIESTO MA CONTO NON COLLEGATO\n')
  r = await nuovaRisorsa(azSenza.id, 30)
  esito = await prenota(r.id, g(310), g(313))
  // ⛔ Il punto: il posto è già suo, e non lo perde perché la cassa manca.
  ok(esito.s === 201, `la prenotazione RESTA VALIDA (HTTP ${esito.s})`)
  ok(!esito.j.pagamento, 'nessun link di pagamento, e si paga sul posto')

  // ── ora un'azienda CON il conto collegato
  console.log('\nACCONTO DEL 30% CON IL CONTO COLLEGATO\n')
  const { data: azCon } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-ACC-CON-${Date.now()}`, require_2fa: false }).select().single()
  aziende.push(azCon.id)
  const email = `zz-acc-${Date.now()}@playwright.internal`
  const pw = randomBytes(24).toString('base64url')
  const { data: u } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true })
  utenti.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: azCon.id, full_name: 'Acc' }, { onConflict: 'id' })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password: pw })
  await fetch(`${L}/api/stripe/connect`, {
    method: 'POST', headers: { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
  })

  r = await nuovaRisorsa(azCon.id, 30)
  esito = await prenota(r.id, g(320), g(323))
  ok(esito.s === 201, `la prenotazione riesce (HTTP ${esito.s})`)
  ok(!!esito.j.pagamento?.url, 'c\'è il link per pagare')

  // 3 notti × 100 € = 300 €, e il 30% è 90 €.
  const totale = Number(esito.j.importo_totale)
  const atteso = Math.round(totale * 30) / 100
  ok(esito.j.pagamento?.importo === atteso,
     `⛔ si paga ${esito.j.pagamento?.importo} su un totale di ${totale}: è il 30% (atteso ${atteso})`)
  ok(esito.j.pagamento?.saldo === +(totale - atteso).toFixed(2),
     `il saldo dichiarato è ${esito.j.pagamento?.saldo}, cioè il resto`)
  ok(esito.j.pagamento?.tutto === false, 'non è segnato come pagamento intero, perché è un acconto')

  const { data: pren } = await admin.from('prenotazioni')
    .select('pagamento_id, pagamento_stato').eq('id', esito.j.id).maybeSingle()
  ok(!!pren?.pagamento_id, 'la sessione è annotata sulla prenotazione, così il webhook la ritrova')
  ok(pren?.pagamento_stato === 'non_pagato', `risulta non pagata finché non paga (${pren?.pagamento_stato})`)

  console.log('\nAL 100% È IL SALDO, NON UN ACCONTO\n')
  r = await nuovaRisorsa(azCon.id, 100)
  esito = await prenota(r.id, g(330), g(333))
  ok(esito.j.pagamento?.importo === Number(esito.j.importo_totale), `si paga tutto (${esito.j.pagamento?.importo})`)
  ok(esito.j.pagamento?.tutto === true, 'ed è segnato come intero, non come acconto')
  ok(esito.j.pagamento?.saldo === 0, 'nessun saldo residuo')

  console.log('\n' + '─'.repeat(66))
  console.log(problemi ? `${problemi} PROBLEMI` : 'SI PAGA QUELLO CHE È SCRITTO, E SENZA CASSA SI PRENOTA LO STESSO')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const id of risorse) {
    await admin.from('prenotazioni').delete().eq('risorsa_id', id)
    await admin.from('risorse').delete().eq('id', id)
  }
  for (const id of utenti) { try { await admin.auth.admin.deleteUser(id) } catch {} }
  for (const id of aziende) { const { error } = await admin.from('aziende').delete().eq('id', id); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
