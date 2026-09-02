// Il giro di una recensione, dall'inizio alla fine.
//
// ⛔ Misurato il 01/09: 2 recensioni in tutto il database, **0 richieste inviate
// e 0 compilate** in tutta la storia del progetto. Il codice c'era e non l'aveva
// percorso nessuno — e il modello «Grazie, e com'è andata?» messo live lo stesso
// giorno ci manda dentro i clienti.
//
// Non si legge il codice: si fa quello che farebbe un ospite.
//   1. l'ospite apre il link che ha ricevuto e trova la sua pagina;
//   2. lascia voto e testo, e la cosa arriva davvero;
//   3. con 4-5 stelle viene mandato al profilo pubblico del cliente
//      («smart redirect»), con meno no — e il titolare riceve un'email;
//   4. lo stesso link non si può usare due volte.
//
// 🔒 E il caso ostile: un token inventato, e un indirizzo di redirect malevolo
// salvato nel pannello, che NON deve uscire verso il browser di nessuno.
//
// ⚠️ Gli indirizzi sono quelli che usa davvero la pagina
// (`/api/guest/recensione/<token>`): provare in un modo diverso da come il
// codice gira nasconde il difetto invece di rivelarlo.
//
// Uso: cd tests && node probe-recensioni.mjs
//      TEST_LOCALE=http://localhost:3000 node probe-recensioni.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const create = []
let minisitoOriginale = null
let entita = null

async function chiediRecensione(ent) {
  const { data, error } = await admin.from('recensioni').insert({
    azienda_id: ent.azienda_id, entity_tipo: ent.tipo, entity_id: ent.id,
    autore: 'ZZ Ospite', stelle: 5, testo: '', fonte: 'form',
    verificata: false, pubblica: false,
  }).select().single()
  if (error) throw new Error(`richiesta non creata: ${error.message}`)
  create.push(data.id)
  return data
}

try {
  const { data: ent } = await admin.from('entita')
    .select('id, name, slug, tipo, azienda_id, minisito').eq('active', true).limit(1).maybeSingle()
  entita = ent
  minisitoOriginale = ent.minisito || {}
  console.log(`entità di prova: ${ent.name} (${ent.tipo})`)

  // Il cliente ha messo il link al suo profilo Google.
  await admin.from('entita').update({
    minisito: { ...minisitoOriginale, recensioni_redirect_url: 'https://g.page/r/zz-prova/review' },
  }).eq('id', ent.id)

  console.log('\n1 · L’OSPITE APRE IL LINK CHE HA RICEVUTO\n')
  const rec = await chiediRecensione(ent)
  const r = await fetch(`${L}/api/guest/recensione/${rec.token}`)
  const dati = await r.json()
  ok(r.status === 200, `il link è valido (HTTP ${r.status})`)
  // ⚠️ Il nome esce da `entita`: leggendolo dalle tabelle vecchie, ferme dalla
  // migration 079, restava vuoto per ogni entità creata dopo l'unificazione.
  ok(dati.entity_name === ent.name, `sa di chi è la pagina («${dati.entity_name || 'vuoto'}»)`)
  ok(!!dati.redirect_url, `e conosce il profilo pubblico del cliente (${dati.redirect_url || 'nessuno'})`)

  console.log('\n2 · CINQUE STELLE: SI FINISCE SU GOOGLE\n')
  const buona = await fetch(`${L}/api/guest/recensione/${rec.token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stelle: 5, autore: 'ZZ Ospite', testo: 'Tutto benissimo.' }),
  })
  const esito = await buona.json()
  ok(buona.status === 200, `l'invio riesce (HTTP ${buona.status})${buona.status !== 200 ? ' — ' + (esito.error || '') : ''}`)
  ok(!!esito.redirect, `e rimanda al profilo pubblico (${esito.redirect || 'nessun rimando'})`)

  const { data: salvata } = await admin.from('recensioni')
    .select('stelle, testo, verificata, pubblica').eq('id', rec.id).maybeSingle()
  ok(salvata?.stelle === 5, `il voto è arrivato (${salvata?.stelle ?? 'niente'})`)
  ok(!!salvata?.testo, 'e anche il testo')
  ok(salvata?.pubblica === true, 'una recensione positiva finisce online')

  console.log('\n3 · LO STESSO LINK NON SI RIUSA\n')
  // Senza questo, chi ha il link scrive quante recensioni vuole — e ogni invio
  // manda un'altra email al titolare.
  const bis = await fetch(`${L}/api/guest/recensione/${rec.token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stelle: 1, autore: 'ZZ', testo: 'ZZ secondo invio' }),
  })
  ok(bis.status === 410, `il secondo invio viene rifiutato (HTTP ${bis.status})`)

  console.log('\n4 · DUE STELLE: RESTA PRIVATA, NIENTE GOOGLE\n')
  const rec2 = await chiediRecensione(ent)
  const brutta = await fetch(`${L}/api/guest/recensione/${rec2.token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stelle: 2, autore: 'ZZ Scontento', testo: 'Non mi è piaciuto.' }),
  })
  const esito2 = await brutta.json()
  ok(brutta.status === 200, `l'invio riesce lo stesso (HTTP ${brutta.status})`)
  ok(!esito2.redirect, 'e NON manda a lasciare una recensione pubblica')
  const { data: salvata2 } = await admin.from('recensioni').select('pubblica, verificata').eq('id', rec2.id).maybeSingle()
  ok(salvata2?.pubblica === false, 'resta privata: la legge il titolare, non il mondo')
  ok(salvata2?.verificata === true, 'ma è registrata come ricevuta')

  console.log('\n5 · UN INDIRIZZO MALEVOLO NON ESCE DI QUI\n')
  // 🔒 Il redirect lo scrive il cliente nel pannello e il browser ci va da solo,
  // senza che nessuno clicchi: se non è http o https non deve uscire.
  for (const cattivo of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '  jAvAsCrIpT:alert(1)']) {
    await admin.from('entita').update({
      minisito: { ...minisitoOriginale, recensioni_redirect_url: cattivo },
    }).eq('id', ent.id)
    const rec3 = await chiediRecensione(ent)
    const risp = await fetch(`${L}/api/guest/recensione/${rec3.token}`)
    const d3 = await risp.json()
    ok(!d3.redirect_url, `«${cattivo.trim().slice(0, 28)}…» non esce (${d3.redirect_url || 'null'})`)
  }

  console.log('\n6 · UN TOKEN INVENTATO NON APRE NIENTE\n')
  const finto = await fetch(`${L}/api/guest/recensione/00000000-0000-0000-0000-000000000000`)
  ok(finto.status === 404, `token inesistente rifiutato (HTTP ${finto.status})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL GIRO DELLA RECENSIONE È INTERO')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  // Il minisito torna esattamente com'era: la prova non deve lasciare un cliente
  // con un indirizzo di redirect che non ha mai scritto.
  if (entita && minisitoOriginale) {
    await admin.from('entita').update({ minisito: minisitoOriginale }).eq('id', entita.id)
  }
  for (const id of create) await admin.from('recensioni').delete().eq('id', id)
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
