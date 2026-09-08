// Le offerte su una risorsa prenotabile: valgono, si vedono, e il prezzo torna.
//
// ⛔ Misurato l'08/09/2026 sul Furgone di Automax: il cliente aveva creato
// «Ponte dell'8 dicembre» (5→9 dicembre, €850) e dal 5 al 9 il sito chiedeva
// €600 — identico a una settimana qualunque. `findPromo` veniva chiamata SOLO
// per gli slot orari: a giornate le offerte si compilavano e non succedeva
// niente, né nel prezzo né sul calendario.
//
// ⛔ E la route di prenotazione applicava il prezzo di qualunque offerta il
// client nominasse, senza controllare che fosse di quella risorsa.
//
// ⚠️ Tutto finto, indirizzi `@playwright.internal`. Le offerte di un cliente
// vero non si toccano nemmeno per leggerle come prova.
//
// Uso: cd tests && node probe-offerte-risorse.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { svuotaAzienda } from './pulizia-prove.mjs'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const L = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const aziende = []

const M = '2027-05'
const g = n => `${M}-${String(n).padStart(2, '0')}`
const chiedi = async (id, dal, al) =>
  (await fetch(`${L}/api/booking/public/disponibilita/${id}?data=${dal}&data_fine=${al}`)).json()

try {
  const { error: eCol } = await admin.from('risorse_promozioni').select('prezzo_modo, minimo_notti').limit(1)
  if (eCol) {
    console.log('\n⛔ Mancano le colonne `prezzo_modo` / `minimo_notti`.')
    console.log('   Esegui `supabase/migrations/113_offerte_risorse_periodo_e_durata.sql` e rilancia.\n')
    process.exitCode = 2
    throw new Error('migration 113 mancante')
  }

  const t = Date.now()
  const { data: az } = await admin.from('aziende')
    .insert({ ragione_sociale: `ZZ-OFF-${t}`, email: `zz-of-${t}@playwright.internal`, require_2fa: false }).select().single()
  aziende.push(az.id)
  const { data: ent } = await admin.from('entita')
    .insert({ azienda_id: az.id, tipo: 'attivita', name: 'ZZ Noleggi', slug: `zz-of-${t}`, active: true }).select().single()

  const creaRisorsa = async (nome) => {
    const { data, error } = await admin.from('risorse').insert({
      azienda_id: az.id, entity_tipo: 'attivita', entity_id: ent.id,
      nome, modalita: 'giornaliero', quantita: 1, prezzo: 100, attiva: true,
      disponibilita: { conta_giorno_uscita: true },
    }).select().single()
    if (error) throw new Error(`risorsa: ${error.message}`)
    return data
  }
  const creaOfferta = async (ris, campi) => {
    const { data, error } = await admin.from('risorse_promozioni').insert({
      risorsa_id: ris.id, nome: 'ZZ Offerta', badge_label: 'Offerta',
      colore: '#e53e3e', attiva: true, ...campi,
    }).select().single()
    if (error) throw new Error(`offerta: ${error.message}`)
    return data
  }

  const furgone = await creaRisorsa('ZZ Furgone')   // €100 al giorno
  const altra   = await creaRisorsa('ZZ Altra')

  console.log('\n1 · SENZA OFFERTA, IL LISTINO\n')
  // Dal 10 al 12 con conta_giorno_uscita sono 3 giorni.
  const base = await chiedi(furgone.id, g(10), g(12))
  ok(base.totale === 300, `3 giorni a €100 fanno €${base.totale}`)
  ok(!base.offerta, 'e nessuna offerta è nominata')

  console.log('\n2 · «PER TUTTO IL PERIODO» È IL TOTALE\n')
  const periodo = await creaOfferta(furgone, {
    nome: 'ZZ Ponte', data_inizio: g(10), data_fine: g(12),
    prezzo_speciale: 250, prezzo_modo: 'periodo',
  })
  const conPeriodo = await chiedi(furgone.id, g(10), g(12))
  ok(conPeriodo.totale === 250, `il totale è €${conPeriodo.totale}, non €${300}`)
  ok(conPeriodo.totale_pieno === 300, `e il prezzo pieno resta €${conPeriodo.totale_pieno}, per poter scrivere «anziché»`)
  ok(conPeriodo.offerta?.nome === 'ZZ Ponte', `l'offerta si chiama per nome: «${conPeriodo.offerta?.nome}»`)

  console.log('\n3 · FUORI DALLE SUE DATE NON VALE\n')
  // ⚠️ Il periodo dev'essere CONTENUTO nell'offerta: chi prenota dal 10 al 20
  // non sta facendo il ponte solo perché due giorni ci cadono dentro.
  const sbordo = await chiedi(furgone.id, g(10), g(20))
  ok(!sbordo.offerta, `un periodo che sborda non prende l'offerta (${sbordo.offerta?.nome || 'nessuna'})`)

  console.log('\n4 · «PER OGNI GIORNO» MOLTIPLICA\n')
  await admin.from('risorse_promozioni').update({ prezzo_modo: 'giorno', prezzo_speciale: 70 }).eq('id', periodo.id)
  const alGiorno = await chiedi(furgone.id, g(10), g(12))
  // ⛔ È la differenza che il pannello non chiedeva: 70 al giorno per 3 giorni
  // sono 210, non 70. Su cinque giorni la distanza fra le due letture è cinque
  // volte il conto.
  ok(alGiorno.totale === 210, `€70 al giorno per 3 giorni fanno €${alGiorno.totale}`)

  console.log('\n5 · LA DURATA MINIMA\n')
  await admin.from('risorse_promozioni').update({
    data_inizio: null, data_fine: null, prezzo_modo: 'giorno', prezzo_speciale: 70, minimo_notti: 4,
  }).eq('id', periodo.id)
  const corto = await chiedi(furgone.id, g(10), g(12))     // 2 notti
  ok(!corto.offerta, `sotto il minimo non si applica (${corto.offerta ? 'applicata' : 'no'}) e si paga €${corto.totale}`)
  const lungo = await chiedi(furgone.id, g(10), g(15))     // 5 notti, 6 giorni
  ok(!!lungo.offerta, 'da 4 notti in su si applica')
  ok(lungo.totale === 420, `e costa €${lungo.totale} invece di €600`)

  console.log('\n6 · L’OFFERTA DI UN’ALTRA RISORSA NON VALE QUI\n')
  // ⛔ Il buco: bastava nominare l'id di un'offerta qualunque per averne il
  // prezzo. Ora l'offerta è legata alla sua risorsa.
  await creaOfferta(altra, { nome: 'ZZ Altrui', prezzo_speciale: 1, prezzo_modo: 'periodo' })
  const suFurgone = await chiedi(furgone.id, g(20), g(22))
  ok(suFurgone.totale === 300, `il furgone costa €${suFurgone.totale}, non €1`)

  console.log('\n7 · FRA DUE OFFERTE VALIDE VINCE LA PIÙ CONVENIENTE\n')
  // ⛔ Un cliente che scopre di aver pagato il prezzo peggiore fra due offerte
  // entrambe valide non torna, e ha ragione.
  await admin.from('risorse_promozioni').update({ minimo_notti: null }).eq('id', periodo.id)
  await creaOfferta(furgone, { nome: 'ZZ Meglio', prezzo_speciale: 150, prezzo_modo: 'periodo' })
  const scelta = await chiedi(furgone.id, g(20), g(22))
  ok(scelta.totale === 150, `si paga €${scelta.totale} (€150 a periodo batte €70 × 3 = €210)`)
  ok(scelta.offerta?.nome === 'ZZ Meglio', `e si chiama «${scelta.offerta?.nome}»`)

  console.log('\n8 · IL CALENDARIO LO SEGNALA\n')
  await admin.from('risorse_promozioni').update({ data_inizio: g(24), data_fine: g(26) }).eq('id', periodo.id)
  const mese = await (await fetch(`${L}/api/booking/public/disponibilita/${furgone.id}?mese=${M}`)).json()
  const segnati = Object.keys(mese.offerte || {})
  ok(segnati.includes(g(24)) && segnati.includes(g(26)), `i giorni dell'offerta sono segnati (${segnati.length} giorni)`)
  ok(mese.offerte?.[g(24)]?.nome === 'ZZ Ponte', `col nome giusto: «${mese.offerte?.[g(24)]?.nome}»`)
  // ⚠️ Un'offerta senza date non colora niente: colorerebbe tutto l'anno, che
  // equivale a non segnalare più nulla.
  ok(!segnati.includes(g(1)), 'e i giorni senza offerta restano puliti')

  console.log('\n9 · SI PAGA QUELLO CHE SI È LETTO\n')
  // ⛔ Il difetto peggiore sarebbe che il totale mostrato e quello salvato
  // divergano: si addebita una cifra che il cliente non ha mai visto.
  const mostrato = await chiedi(furgone.id, g(24), g(26))
  const r = await fetch(`${L}/api/booking/public/prenota`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      risorsa_id: furgone.id, data: g(24), data_fine: g(26),
      cliente_nome: 'ZZ Prova', cliente_email: `zz-pr-${t}@playwright.internal`,
      n_persone: 1, privacy_accettata: true,
      // Un client malintenzionato propone l'offerta da €1 di un'altra risorsa.
      promozione_id: (await admin.from('risorse_promozioni').select('id').eq('nome', 'ZZ Altrui').maybeSingle()).data?.id,
    }),
  })
  const esito = await r.json()
  ok(r.status === 201, `la prenotazione riesce (HTTP ${r.status})`)
  const { data: salvata } = await admin.from('prenotazioni')
    .select('importo_totale, promozione_id').eq('risorsa_id', furgone.id).maybeSingle()
  ok(salvata?.importo_totale === mostrato.totale,
    `si paga €${salvata?.importo_totale}, esattamente quello che era scritto (€${mostrato.totale})`)
  ok(salvata?.promozione_id !== null, 'e resta registrato in base a quale offerta')

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'LE OFFERTE VALGONO, SI VEDONO, E IL CONTO TORNA')
} catch (e) {
  if (e.message !== 'migration 113 mancante') { console.error('ERRORE:', e.message); problemi++ }
} finally {
  for (const id of aziende) { const e = await svuotaAzienda(id); if (e) console.error('pulizia:', e) }
  console.log('[probe] pulito')
  process.exitCode = problemi ? 1 : 0
}
