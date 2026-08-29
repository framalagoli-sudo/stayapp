// Un'offerta si prenota dal sito, come faceva una risorsa del booking.
//
// «Risorse» era l'ultima porta separata per creare qualcosa che si prenota: un
// campo da padel e un corso sono la stessa cosa vista da due menu diversi.
// Le route pubbliche ora cambiano **sorgente, non contratto**: rispondono con
// le offerte nella forma che il widget conosce da sempre.
//
// ⚠️ Durante il passaggio le risorse restano vive. Quando un'offerta è stata
// copiata da una risorsa, l'originale si toglie di mezzo: altrimenti il cliente
// vedrebbe due volte lo stesso campo da padel.
//
// Uso: node probe-offerta-prenotabile.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const L = process.env.TEST_LOCALE || TEST_URL
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const g = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null, en = null, off = null, ris = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-OP-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-op-${Date.now()}`, name: 'ZZ Noleggi', active: true }).select().single(); en = e.id

  // Un'offerta a giornate, come una casa o un'auto.
  const { data: o } = await admin.from('offerte').insert({
    azienda_id: az, entity_id: en, titolo: 'ZZ Casa al mare', modo: 'data_fissa', impegno: 'prenota',
    prezzo: 100, quantita: 1, attiva: true, pubblicata: true, conferma_auto: true,
    disponibilita: { minimo_notti: 2 }, chiusure: [],
  }).select().single(); off = o.id

  // Una vecchia risorsa **già copiata** in un'altra offerta: non deve comparire due volte.
  const { data: r } = await admin.from('risorse').insert({
    azienda_id: az, entity_tipo: 'attivita', entity_id: en, nome: 'ZZ Vecchia', modalita: 'giornaliero',
    quantita: 1, prezzo: 50, attiva: true, visibile_minisito: true, disponibilita: {}, blocchi: [],
  }).select().single(); ris = r.id
  await admin.from('offerte').insert({
    azienda_id: az, entity_id: en, titolo: 'ZZ Vecchia', modo: 'data_fissa', impegno: 'prenota',
    prezzo: 50, quantita: 1, attiva: true, pubblicata: true, origine: 'risorsa', origine_id: ris,
  })

  console.log('\nUN\'OFFERTA SI PRENOTA DAL SITO\n')

  const elenco = await (await fetch(`${L}/api/booking/public/risorse/attivita/${en}`)).json()
  const nomi = (Array.isArray(elenco) ? elenco : []).map(x => x.nome)
  ok(nomi.includes('ZZ Casa al mare'), `l'offerta compare fra le cose prenotabili [${nomi.join(', ')}]`)
  ok(nomi.filter(n => n === 'ZZ Vecchia').length === 1, 'la risorsa già copiata non compare due volte')
  const casa = elenco.find(x => x.nome === 'ZZ Casa al mare')
  ok(casa?.modalita === 'giornaliero', `parla la lingua del widget: modalita «${casa?.modalita}»`)

  const disp = await (await fetch(`${L}/api/booking/public/disponibilita/${off}?data=${g(10)}&data_fine=${g(14)}`)).json()
  ok(disp.notti === 4 && disp.totale === 400, `la disponibilità calcola 4 notti e €400 (${disp.notti}, ${disp.totale})`)

  const corta = await (await fetch(`${L}/api/booking/public/disponibilita/${off}?data=${g(10)}&data_fine=${g(11)}`)).json()
  ok(/minimo/i.test(corta.motivo || ''), `le regole dell'offerta valgono: «${corta.motivo}»`)

  const prenota = (dal, al, nome) => fetch(`${L}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risorsa_id: off, data: dal, data_fine: al, cliente_nome: nome,
      cliente_email: `zz${Date.now()}@example.com`, privacy_accettata: true }),
  })

  const primo = await prenota(g(10), g(14), 'ZZ Primo')
  ok(primo.status === 201, `si prenota (HTTP ${primo.status})`)

  const { data: righe } = await admin.from('prenotazioni').select('offerta_id, risorsa_id, importo_totale').eq('offerta_id', off)
  ok(righe?.length === 1, `la prenotazione è in archivio (${righe?.length || 0})`)
  // ⚠️ Una sola delle due colonne: scriverle entrambe farebbe contare due volte
  // lo stesso posto.
  ok(righe?.[0]?.risorsa_id === null, 'punta all\'offerta e non anche a una risorsa')
  ok(righe?.[0]?.importo_totale === 400, `il totale è 400 (${righe?.[0]?.importo_totale})`)

  // Il punto pericoloso: la capienza cerca `offerta_id`, non `risorsa_id`.
  const secondo = await prenota(g(12), g(16), 'ZZ Secondo')
  ok(secondo.status === 409, `chi si accavalla viene respinto (HTTP ${secondo.status})`)
  const dopo = await prenota(g(14), g(17), 'ZZ Terzo')
  ok(dopo.status === 201, `chi arriva il giorno dell'uscita entra (HTTP ${dopo.status})`)

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  LE OFFERTE SI PRENOTANO, E NON SI PRENOTANO DUE VOLTE')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (off) await admin.from('prenotazioni').delete().eq('offerta_id', off)
  if (az) await admin.from('offerte').delete().eq('azienda_id', az)
  if (ris) { await admin.from('prenotazioni').delete().eq('risorsa_id', ris); await admin.from('risorse').delete().eq('id', ris) }
  if (en) await admin.from('entita').delete().eq('id', en)
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
