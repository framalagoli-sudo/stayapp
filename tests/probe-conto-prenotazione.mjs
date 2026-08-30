// Quello che il cliente legge coincide con quello che paga.
//
// ⚠️ Nasce da un difetto trovato guardando il modulo, non leggendo il codice:
// su un noleggio che conta il giorno della riconsegna — un furgone, un'auto —
// dal 10 al 12 settembre si leggeva
//
//     «2 notti · €90 a notte»          e sotto:  €270
//
// Il totale era **giusto** (3 giorni di noleggio), il testo no. Nessun test lo
// vedeva: il server calcolava bene e il browser scriveva «notti» perché era
// l'unica parola che conosceva.
//
// L'ambiguità sul prezzo è quella che genera contestazioni, e questa era della
// specie peggiore: due numeri veri accostati male.
//
// Uso: node probe-conto-prenotazione.mjs
//      TEST_LOCALE=http://localhost:3000 node probe-conto-prenotazione.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const creati = []
try {
  const { data: qualsiasi } = await admin.from('risorse').select('azienda_id, entity_tipo, entity_id').limit(1).maybeSingle()
  if (!qualsiasi) { console.log('\nNessuna risorsa: niente da provare.\n'); process.exit(0) }

  // Due risorse identiche, diverse in una cosa sola: chi conta il giorno della
  // riconsegna e chi no. È lì che il testo e il totale possono divergere.
  const base = {
    ...qualsiasi, nome: 'ZZ Conto', modalita: 'giornaliero', prezzo: 100,
    quantita: 1, attiva: true, visibile_minisito: true,
  }
  const { data: aNotti } = await admin.from('risorse')
    .insert({ ...base, nome: 'ZZ Conto notti', disponibilita: {} }).select().single()
  const { data: aGiorni } = await admin.from('risorse')
    .insert({ ...base, nome: 'ZZ Conto giorni', disponibilita: { conta_giorno_uscita: true } }).select().single()
  creati.push(aNotti.id, aGiorni.id)

  // Un periodo lontano, per non incrociare prenotazioni vere.
  const g = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  const dal = g(200), al = g(203)   // 3 notti · 4 giorni

  console.log('\nCHI AFFITTA A NOTTI (una casa, una camera)\n')
  let r = await (await fetch(`${L}/api/booking/public/disponibilita/${aNotti.id}?data=${dal}&data_fine=${al}`)).json()
  ok(r.unita === 3, `dal ${dal} al ${al} sono 3 unità (dice ${r.unita})`)
  ok(r.unita_nome === 'notti', `si chiamano «notti» (dice «${r.unita_nome}»)`)
  ok(r.totale === 300, `totale 300 a 100 l'una (dice ${r.totale})`)
  // ⛔ Il controllo che dà il nome a questa sonda.
  ok(r.unita * r.prezzo === r.totale, `il conto torna: ${r.unita} × ${r.prezzo} = ${r.totale}`)

  console.log('\nCHI NOLEGGIA A GIORNI (un furgone, un\'auto)\n')
  r = await (await fetch(`${L}/api/booking/public/disponibilita/${aGiorni.id}?data=${dal}&data_fine=${al}`)).json()
  ok(r.unita === 4, `lo stesso periodo sono 4 unità (dice ${r.unita})`)
  ok(r.unita_nome === 'giorni', `si chiamano «giorni» (dice «${r.unita_nome}»)`)
  ok(r.totale === 400, `totale 400 a 100 l'uno (dice ${r.totale})`)
  ok(r.unita * r.prezzo === r.totale, `il conto torna: ${r.unita} × ${r.prezzo} = ${r.totale}`)

  // E la differenza fra i due è esattamente un'unità: se un giorno sparisse,
  // qualcuno pagherebbe una giornata che non ha avuto — o non la pagherebbe.
  console.log('\nLA DIFFERENZA FRA I DUE MODI\n')
  const n = await (await fetch(`${L}/api/booking/public/disponibilita/${aNotti.id}?data=${dal}&data_fine=${al}`)).json()
  ok(r.unita === n.unita + 1, `chi conta la riconsegna paga esattamente un'unità in più (${n.unita} → ${r.unita})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'QUELLO CHE SI LEGGE È QUELLO CHE SI PAGA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const id of creati) {
    await admin.from('prenotazioni').delete().eq('risorsa_id', id)
    const { error } = await admin.from('risorse').delete().eq('id', id)
    if (error) console.error('pulizia:', error.message)
  }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
