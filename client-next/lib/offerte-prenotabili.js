import { supabaseAdmin } from './supabase-server'

// Le offerte che si possono prenotare, raccontate come il widget le conosce.
//
// Il `BookingWidget` è nato leggendo la tabella `risorse`. Ora quello che si
// prenota vive nelle **offerte** — un campo da padel e un corso sono la stessa
// cosa vista da due menu diversi. Qui si cambia **la sorgente, non il
// contratto**: chi chiama riceve gli stessi campi di sempre (`nome`,
// `modalita`, `durata_minuti`, `disponibilita`…), quindi il widget, il
// calendario e la conferma non si accorgono di niente.
//
// È lo stesso metodo che ha reso invisibili l'unificazione delle entità, dei
// prodotti e dello shop.
//
// ⚠️ Durante il passaggio **le risorse restano vive**: chi ha ancora solo
// quelle continua a prenotare. Quando le due sorgenti danno la stessa cosa —
// perché l'offerta è stata copiata da una risorsa — vince l'offerta, altrimenti
// il cliente vedrebbe due volte lo stesso campo da padel.

// Il «modo» dell'offerta e la «modalita» della risorsa sono la stessa idea con
// due nomi: qui si torna al vocabolario che il widget parla.
const MODALITA = { calendario: 'slot', coperti: 'coperti', data_fissa: 'giornaliero' }

// Solo le colonne che servono a chi prenota. Restano fuori i riferimenti
// interni e come lavora il cliente: questa lista esce da una route pubblica.
const CAMPI = 'id, titolo, descrizione, modo, impegno, durata_minuti, quantita, max_coperti, ' +
  'prezzo, valuta, colore, disponibilita, chiusure, anticipo_ore, cancellazione_ore, conferma_auto, origine_id'

// Un'offerta raccontata come una risorsa prenotabile.
function comeRisorsa(o) {
  return {
    id: o.id,
    nome: o.titolo || '',
    descrizione: o.descrizione || '',
    modalita: MODALITA[o.modo] || 'slot',
    durata_minuti: o.durata_minuti ?? 60,
    quantita: o.quantita ?? 1,
    max_coperti: o.max_coperti ?? null,
    prezzo: Number(o.prezzo) || 0,
    valuta: o.valuta || 'EUR',
    colore: o.colore || '#00b5b5',
    disponibilita: o.disponibilita || {},
    blocchi: o.chiusure || [],
    anticipo_ore: o.anticipo_ore ?? 1,
    cancellazione_ore: o.cancellazione_ore ?? 24,
    conferma_auto: o.conferma_auto !== false,
    // Dice a chi legge che dietro c'è un'offerta: serve a chi prenota, per
    // scrivere `offerta_id` invece di `risorsa_id`.
    _offerta: true,
    // ⚠️ Da quale risorsa è stata copiata. Senza, la risorsa originale resta
    // nell'elenco accanto alla sua copia e il cliente vede **due volte** lo
    // stesso campo da padel — trovato dalla sonda, non ragionandoci.
    origine_id: o.origine_id || null,
  }
}

// ⚠️ Solo le offerte che **si prenotano davvero**: una che chiede soltanto
// informazioni non ha posti né orari, e nel widget sarebbe un vicolo cieco.
const SI_PRENOTA = ['prenota', 'acquista']

export async function offertePrenotabili(entityId) {
  if (!entityId) return []
  const { data } = await supabaseAdmin.from('offerte')
    .select(CAMPI)
    .eq('entity_id', entityId).eq('attiva', true).eq('pubblicata', true)
    .in('impegno', SI_PRENOTA)
    .order('ordine')
  return (data || []).map(comeRisorsa)
}

// Una sola cosa prenotabile, cercata per id fra le offerte e — se non c'è —
// fra le risorse. Serve a chi calcola la disponibilità e a chi prenota, che
// ricevono un id e non sanno da quale delle due sorgenti venga.
export async function prenotabilePerId(id) {
  const { data: off } = await supabaseAdmin.from('offerte')
    .select(CAMPI + ', azienda_id, entity_id, posti_totali, posti_occupati')
    .eq('id', id).eq('attiva', true).eq('pubblicata', true).maybeSingle()
  if (off && SI_PRENOTA.includes(off.impegno)) {
    return { ...comeRisorsa(off), azienda_id: off.azienda_id, entity_id: off.entity_id, entity_tipo: null,
             posti_totali: off.posti_totali, posti_occupati: off.posti_occupati, _offerta: true }
  }
  const { data: ris } = await supabaseAdmin.from('risorse')
    .select('*').eq('id', id).eq('attiva', true).maybeSingle()
  return ris ? { ...ris, _offerta: false } : null
}
