// Il calendario a giornate dice la verità?
//
// ⛔ Due difetti misurati sul Furgone di Automax l'08/09/2026, con la stessa
// radice — un intervallo di date scritto male:
//
//   1. il calendario chiedeva «il giorno G è occupato?» come `(G, G)`, che è
//      l'**intervallo vuoto**: non tocca mai niente. Risultato: liberi il primo
//      e l'ultimo giorno di ogni noleggio, e le prenotazioni corte — dal 24 al
//      25 — sparite del tutto. Sbagliarlo non dà errore, dà «libero» sempre.
//
//   2. per una risorsa che fa pagare il giorno di riconsegna
//      (`conta_giorno_uscita`), quel giorno restava affittabile: chi aveva il
//      furgone dal 24 al 25 pagava il 25, e il sito vendeva 25→26 a un altro.
//      Lo stesso mezzo a due clienti nello stesso giorno.
//
// ⚠️ Risorse ed entità sono finte. Le prenotazioni di un cliente vero non si
// creano né si toccano per fare una misura.
//
// Uso: cd tests && node probe-booking-giornate.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = []

// Un mese lontano, così nessuna data cade nel passato.
const M = '2027-04'
const g = n => `${M}-${String(n).padStart(2, '0')}`

const disponibile = async (id, dal, al) => {
  const r = await fetch(`${L}/api/booking/public/disponibilita/${id}?data=${dal}&data_fine=${al}`)
  return r.json()
}
const calendario = async (id) => {
  const r = await fetch(`${L}/api/booking/public/disponibilita/${id}?mese=${M}`)
  return (await r.json()).occupati || []
}

try {
  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-BOOK-${t}`, email: `zz-bk-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ Noleggi', slug: `zz-bk-${t}`, active: true }).select().single()

  const creaRisorsa = async (nome, contaUscita) => {
    const { data } = await admin.from('risorse').insert({
      azienda_id: az.id, entity_tipo: 'attivita', entity_id: ent.id,
      nome, modalita: 'giornaliero', quantita: 1, prezzo: 90, attiva: true,
      disponibilita: contaUscita ? { conta_giorno_uscita: true } : {},
    }).select().single()
    return data
  }
  // Il furgone conta il giorno di riconsegna; la casa no. Sono i due mondi che
  // il codice confondeva.
  const furgone = await creaRisorsa('ZZ Furgone', true)
  const casa    = await creaRisorsa('ZZ Casa', false)

  // ⚠️ L'esito dell'insert si guarda. Senza questo controllo la prima corsa ha
  // dato sei righe rosse che sembravano difetti del codice: le prenotazioni non
  // erano mai state create (`cliente_email` è NOT NULL) e la sonda misurava un
  // database vuoto. Un errore ignorato non resta silenzioso: mente.
  const prenota = async (ris, dal, al) => {
    const { error } = await admin.from('prenotazioni').insert({
      risorsa_id: ris.id, azienda_id: az.id, entity_tipo: 'attivita', entity_id: ent.id,
      data: dal, data_fine: al, cliente_nome: 'ZZ Cliente',
      cliente_email: `zz-book-${t}@playwright.internal`, stato: 'confermata',
    })
    if (error) throw new Error(`non riesco a creare la prenotazione ${dal}→${al}: ${error.message}`)
  }

  console.log('\n1 · UNA PRENOTAZIONE CORTA NON SPARISCE DAL CALENDARIO\n')
  // ⛔ È il caso esatto del Furgone: 24→25, tutta negli estremi.
  await prenota(furgone, g(24), g(25))
  const cal = await calendario(furgone.id)
  ok(cal.includes(g(24)), `il 24 risulta occupato (${cal.includes(g(24)) ? 'sì' : 'NO — la prenotazione è invisibile'})`)
  ok(cal.includes(g(25)), 'e anche il 25, perché il furgone torna quel giorno e si paga')
  ok(!cal.includes(g(26)), 'il 26 invece è libero: la riconsegna era il 25')

  console.log('\n2 · IL PRIMO E L’ULTIMO GIORNO DI UN PERIODO LUNGO CI SONO\n')
  await prenota(furgone, g(10), g(14))
  const cal2 = await calendario(furgone.id)
  const attesi = [10, 11, 12, 13, 14].map(g)
  ok(attesi.every(d => cal2.includes(d)), `tutti i giorni dal 10 al 14 (mancano: ${attesi.filter(d => !cal2.includes(d)).join(', ') || 'nessuno'})`)
  ok(!cal2.includes(g(9)) && !cal2.includes(g(15)), 'e i giorni intorno restano liberi')

  console.log('\n3 · LO STESSO FURGONE NON SI VENDE DUE VOLTE NELLO STESSO GIORNO\n')
  // ⛔ Il difetto costoso: due persone davanti allo stesso mezzo.
  const dopo  = await disponibile(furgone.id, g(25), g(26))
  ok(dopo.disponibile === false, `chi parte il giorno della riconsegna viene fermato (${dopo.disponibile ? 'NO — venduto due volte' : 'sì'})`)
  const prima = await disponibile(furgone.id, g(23), g(24))
  ok(prima.disponibile === false, `e anche chi finisce il giorno della consegna (${prima.disponibile ? 'NO — venduto due volte' : 'sì'})`)
  const lontano = await disponibile(furgone.id, g(26), g(27))
  ok(lontano.disponibile === true, 'mentre il giorno dopo la riconsegna si affitta davvero')

  console.log('\n4 · LA CASA INVECE SI RIAFFITTA IL GIORNO DELL’USCITA\n')
  // ⚠️ Il caso da NON rompere: chi esce il mattino libera la stanza. Trattare
  // una casa come un furgone perderebbe una notte affittabile a ogni cambio.
  await prenota(casa, g(10), g(14))
  const cambio = await disponibile(casa.id, g(14), g(16))
  ok(cambio.disponibile === true, `chi entra il giorno dell'uscita trova libero (${cambio.disponibile ? 'sì' : 'NO — persa una notte a ogni cambio'})`)
  const calCasa = await calendario(casa.id)
  ok(calCasa.includes(g(10)), 'e il giorno di arrivo risulta occupato')
  ok(!calCasa.includes(g(14)), 'mentre quello di uscita è di nuovo libero')

  console.log('\n5 · LE PAROLE SEGUONO LA RISORSA\n')
  const pf = await disponibile(furgone.id, g(2), g(4))
  ok(pf.unita_nome === 'giorni' && pf.unita === 3, `il furgone conta 3 giorni (${pf.unita} ${pf.unita_nome})`)
  const pc = await disponibile(casa.id, g(2), g(4))
  ok(pc.unita_nome === 'notti' && pc.unita === 2, `la casa conta 2 notti (${pc.unita} ${pc.unita_nome})`)
  ok(pf.totale === 270 && pc.totale === 180, `e il totale segue il conto (furgone €${pf.totale}, casa €${pc.totale})`)

  console.log('\n6 · UNA CHIUSURA SEGNATA DAL CLIENTE SI VEDE\n')
  // ⚠️ Stessa radice del punto 1: `periodoBloccato(blocchi, G, G)` confronta
  // `b.data >= G && b.data < G`, falso per qualsiasi data. I giorni chiusi
  // restavano verdi.
  await admin.from('risorse').update({ blocchi: [{ data: g(20) }] }).eq('id', casa.id)
  const calChiuso = await calendario(casa.id)
  ok(calChiuso.includes(g(20)), `il giorno chiuso risulta occupato (${calChiuso.includes(g(20)) ? 'sì' : 'NO — resta prenotabile'})`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL CALENDARIO DICE QUELLO CHE SUCCEDE DAVVERO')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
