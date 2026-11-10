// Il conto di una prenotazione a giornate, lato server: un posto solo.
//
// ⛔ Perché esiste: la stessa sequenza — prenotazioni che toccano il periodo,
// regole, offerte, totale — era scritta a mano in tre route (disponibilità dal
// sito, prenotazione dal sito, prenotazione presa dal titolare). Aggiungendo il
// calendario dei prezzi andava cambiata in tre punti, e il punto dimenticato
// avrebbe dato un totale diverso: un prezzo letto sul sito e un altro
// addebitato, o un noleggio preso al telefono a un prezzo che il sito non fa.
//
// Le regole stanno in `booking-giornaliero.js` e `offerte-risorsa.js` (senza
// dipendenze, li legge anche il browser); qui si leggono i dati e basta.

import { supabaseAdmin } from './supabase-server'
import { verificaPeriodo, giornoDopo, mappaTariffe } from './booking-giornaliero'
import { contoDelPeriodo } from './offerte-risorsa'
import { fusoDiAzienda } from './fuso-azienda'
import { giornoLocale } from './fuso'

// Che giorno è adesso **per l'azienda**: prenotazione anticipata e last minute
// contano i giorni che mancano, e il giorno del server (UTC) sbaglierebbe a
// cavallo della mezzanotte italiana.
export async function oggiPerRisorsa(risorsa) {
  return giornoLocale(new Date(), await fusoDiAzienda(risorsa?.azienda_id))
}

// Colonne del calendario che servono al conto. Elencate, mai `*`: una di
// queste route risponde a chi non ha fatto login.
export const COLONNE_TARIFFE = 'data, ora_inizio, prezzo, minimo_notti, massimo_notti, chiuso_arrivo, chiuso_partenza, non_vendibile'

// Il calendario di una risorsa fra due giorni compresi, come mappa.
export async function leggiTariffe(risorsaId, dal, al) {
  const { data, error } = await supabaseAdmin.from('risorse_tariffe')
    .select(COLONNE_TARIFFE)
    .eq('risorsa_id', risorsaId).is('ora_inizio', null)
    .gte('data', dal).lte('data', al)
  if (error) throw error
  return mappaTariffe(data || [])
}

// Le prenotazioni che possono toccare il periodo (le altre non contano).
export async function prenotazioniCheToccano(risorsaId, dal) {
  const { data, error } = await supabaseAdmin.from('prenotazioni')
    .select('id, data, data_fine').eq('risorsa_id', risorsaId)
    .in('stato', ['confermata', 'in_attesa']).gte('data_fine', dal)
  if (error) throw error
  return data || []
}

// Il periodo si può prenotare, e quanto costa.
//
// Torna `{ ok, motivo }` se non si può; altrimenti anche `totale` (quello da
// pagare), `totalePieno` (il listino, per il «anziché»), `offerta` e
// `dettaglio` (la fotografia da salvare sulla prenotazione).
//
// ⚠️ L'offerta la sceglie il server fra quelle che valgono davvero per queste
// date: fidarsi di un id proposto dal client significherebbe far decidere lo
// sconto a chi paga.
//
// Per spostare una prenotazione che c'è già: `escludi` è il suo id (altrimenti
// occuperebbe sé stessa e non si potrebbe allungare di un giorno), e
// `regoleVendita: false` lascia al titolare le eccezioni (vedi `verificaPeriodo`).
export async function contoGiornaliero(risorsa, dal, al, { escludi = null, regoleVendita = true } = {}) {
  // Il calendario si legge fino al giorno dopo la fine: serve la riga del
  // giorno di riconsegna (chiuso alla partenza), e per chi conta le notti
  // quella del giorno d'uscita.
  const [occupate, tariffe, offerte, oggi] = await Promise.all([
    prenotazioniCheToccano(risorsa.id, dal),
    leggiTariffe(risorsa.id, dal, al ? giornoDopo(al) : dal),
    supabaseAdmin.from('risorse_promozioni').select('*')
      .eq('risorsa_id', risorsa.id).eq('attiva', true)
      .then(({ data, error }) => { if (error) throw error; return data || [] }),
    oggiPerRisorsa(risorsa),
  ])

  const altre = escludi ? occupate.filter(p => p.id !== escludi) : occupate
  const esito = verificaPeriodo(risorsa, dal, al, altre, tariffe, { regoleVendita })
  if (!esito.ok) return { ...esito, offerte, oggi }

  const conto = contoDelPeriodo(risorsa, dal, al, offerte, esito.totale, oggi)
  return {
    ...esito,
    offerte,
    oggi,
    totale: conto.totale,
    totalePieno: conto.totalePieno,
    offerta: conto.offerta,
    dettaglio: {
      giorni: esito.giorni,
      totale_listino: conto.totalePieno,
      offerta: conto.offerta ? { id: conto.offerta.id, nome: conto.offerta.nome, sconto: conto.offerta.sconto } : null,
      totale: conto.totale,
    },
  }
}
