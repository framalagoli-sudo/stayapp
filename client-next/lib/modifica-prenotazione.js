// Il titolare modifica una prenotazione di una risorsa: date, dati del
// cliente, totale.
//
// ⛔ Perché esiste: fino al 10/11/2026 una prenotazione si poteva solo
// confermare, annullare o eliminare. Automax, per spostare un noleggio di un
// giorno, doveva cancellarlo e rifarlo a mano — perdendo il pagamento, il link
// di disdetta del cliente e la storia.
//
// Le decisioni (Francesco, 10/11):
//   · si cambiano date (solo a giornate), nome, email, telefono, note e totale;
//   · cambiando le date il totale si ricalcola col listino, ma il titolare può
//     scrivere un'altra cifra e resta quella;
//   · le date nuove si controllano come una prenotazione nuova sui vincoli
//     fisici (periodo libero, chiusure, giorni non vendibili); minimo, massimo
//     e giorni di ritiro/riconsegna sono regole per il sito, e il titolare può
//     fare un'eccezione;
//   · il cliente si avvisa solo se il titolare lo chiede;
//   · già pagata online: date e dati sì, il totale no (la differenza non si
//     incassa né si rimborsa da sola);
//   · sta pagando alla cassa del sito: non si tocca finché non paga o scade.
//
// ⚠️ Il controllo delle sovrapposizioni dopo il salvataggio NON è
// `confermaPostiPrenotazione`: quello, se trova un conflitto, cancella la
// prenotazione — giusto per una appena nata, un disastro per una che esiste.
// Qui, in caso di conflitto, si rimette com'era.

import { supabaseAdmin } from './supabase-server'
import { contoGiornaliero } from './conto-giornaliero'
import { siSovrappongono, fineOccupazione } from './booking-giornaliero'
import { attendePagamento, linkInCorso } from './stato-prenotazione'
import { emailValida } from './contatti-import'
import { ritiraLink } from './link-pagamento'

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const PAGATA = ['pagato', 'rimborsato']

// I campi che si possono mandare, e nient'altro.
function testo(v, max) {
  if (v === undefined) return undefined
  if (v === null) return ''
  if (typeof v !== 'string') return { errore: true }
  return v.trim().slice(0, max)
}

// Cosa diventerebbe la prenotazione, senza scrivere niente.
// Torna `{ errore, status }` oppure `{ payload, conto, avvisi, cambiaTotale }`.
export async function prepara(prev, risorsa, richiesta) {
  if (prev.stato === 'cancellata')
    return { errore: 'Questa prenotazione è annullata: non si modifica. Se il cliente la vuole ancora, creane una nuova.', status: 409 }
  if (attendePagamento(prev))
    return { errore: 'Il cliente sta pagando online in questo momento: aspetta che paghi o che la cassa scada (mezz’ora), poi modificala.', status: 409 }

  const payload = {}
  const avvisi = []

  // ── I dati del cliente
  const nome = testo(richiesta.cliente_nome, 200)
  const email = testo(richiesta.cliente_email, 200)
  const telefono = testo(richiesta.cliente_telefono, 40)
  const note = testo(richiesta.note_cliente, 1000)
  if ([nome, email, telefono, note].some(v => v?.errore)) return { errore: 'Valori non validi.', status: 400 }
  if (nome !== undefined) {
    if (!nome) return { errore: 'Serve il nome di chi prenota.', status: 400 }
    payload.cliente_nome = nome
  }
  if (email !== undefined) {
    if (email && !emailValida(email)) return { errore: 'L’email non sembra scritta bene.', status: 400 }
    payload.cliente_email = email.toLowerCase()
  }
  if (telefono !== undefined) payload.cliente_telefono = telefono || null
  if (note !== undefined) payload.note_cliente = note || null

  // ── Le date (solo a giornate)
  const dal = richiesta.data ?? prev.data
  const al = richiesta.data_fine ?? prev.data_fine
  const cambiaDate = dal !== prev.data || al !== prev.data_fine
  let conto = null
  if (cambiaDate) {
    if (risorsa?.modalita !== 'giornaliero')
      return { errore: 'Le date si cambiano da qui solo per le risorse a giornate.', status: 400 }
    if (!DATA_RE.test(dal || '') || !DATA_RE.test(al || '')) return { errore: 'Date non valide.', status: 400 }
    if (al < dal) return { errore: 'La riconsegna viene prima del ritiro.', status: 400 }
    conto = await contoGiornaliero(risorsa, dal, al, { escludi: prev.id, regoleVendita: false })
    if (!conto.ok) return { errore: conto.motivo || 'Quel periodo non è disponibile.', status: 409 }
    payload.data = dal
    payload.data_fine = al
  }

  // ── Il totale
  const pagata = PAGATA.includes(prev.pagamento_stato)
  const vecchio = Number(prev.importo_totale) || 0
  let nuovo = vecchio
  let aMano = false
  if (richiesta.importo_totale !== undefined && richiesta.importo_totale !== null && richiesta.importo_totale !== '') {
    const n = Number(richiesta.importo_totale)
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { errore: 'Totale non valido.', status: 400 }
    nuovo = Math.round(n * 100) / 100
    aMano = true
  } else if (conto) {
    nuovo = conto.totale
  }

  if (pagata) {
    if (aMano && nuovo !== vecchio)
      return { errore: 'È già stata pagata online: il totale non si cambia da qui. Per una differenza da incassare usa «Chiedi il pagamento»; un rimborso si fa da Stripe.', status: 409 }
    if (conto && conto.totale !== vecchio)
      avvisi.push(`Col listino le date nuove costerebbero €${conto.totale}: il totale resta €${vecchio} perché è già stata pagata online.`)
    nuovo = vecchio
  }

  const cambiaTotale = nuovo !== vecchio
  if (cambiaTotale) payload.importo_totale = nuovo
  if (conto) {
    // La fotografia del conto segue le date nuove; se il totale non è quello
    // del listino lo si scrive, così chi la rilegge sa perché non torna.
    const totaleListino = conto.totale
    payload.dettaglio_prezzo = nuovo === totaleListino
      ? conto.dettaglio
      : { ...conto.dettaglio, totale: nuovo, a_mano: true }
    payload.promozione_id = conto.offerta?.id || null
  } else if (cambiaTotale) {
    payload.dettaglio_prezzo = { ...(prev.dettaglio_prezzo || {}), totale: nuovo, a_mano: true }
  }

  // Un link di pagamento già mandato era per la cifra di prima: si ritira, o il
  // cliente pagherebbe un importo che non è più quello giusto.
  if (cambiaTotale && linkInCorso(prev)) avvisi.push('Il link di pagamento che avevi mandato è stato ritirato: era per la cifra di prima. Se serve, chiedilo di nuovo.')

  return { payload, conto, avvisi, cambiaTotale, cambiaDate, totale: nuovo, pagata }
}

// Salva. Torna `{ errore, status }` oppure `{ prenotazione, avvisi }`.
export async function salva(prev, risorsa, preparato) {
  const { payload, cambiaTotale, cambiaDate } = preparato
  if (!Object.keys(payload).length) return { prenotazione: prev, avvisi: preparato.avvisi }

  payload.updated_at = new Date().toISOString()

  let { data: nuova, error } = await supabaseAdmin.from('prenotazioni').update(payload).eq('id', prev.id).select().single()
  if (error) throw error

  // Due modifiche (o una modifica e una prenotazione dal sito) nello stesso
  // istante possono aver preso lo stesso periodo. Si ricontrolla a cose fatte:
  // se è così, la prenotazione torna com'era.
  if (cambiaDate && risorsa?.modalita === 'giornaliero') {
    const { data: altre } = await supabaseAdmin.from('prenotazioni')
      .select('id, data, data_fine').eq('risorsa_id', risorsa.id)
      .in('stato', ['confermata', 'in_attesa']).neq('id', prev.id)
      .gte('data_fine', nuova.data)
    const mia = fineOccupazione(risorsa, nuova.data, nuova.data_fine)
    const sovrapposte = (altre || []).filter(b =>
      siSovrappongono(nuova.data, mia, b.data, fineOccupazione(risorsa, b.data, b.data_fine))).length
    if (sovrapposte + 1 > (Number(risorsa.quantita) || 1)) {
      const indietro = {}
      for (const k of Object.keys(payload)) indietro[k] = prev[k] ?? null
      indietro.updated_at = new Date().toISOString()
      await supabaseAdmin.from('prenotazioni').update(indietro).eq('id', prev.id)
      return { errore: 'Nel frattempo quel periodo è stato preso: la prenotazione è rimasta com’era.', status: 409 }
    }
  }

  // Il link di pagamento si chiude su Stripe solo a modifica riuscita: tornando
  // indietro, il cliente deve poter ancora pagare quello che aveva ricevuto.
  if (cambiaTotale && linkInCorso(prev)) {
    const ritiro = await ritiraLink('risorsa', prev, prev.azienda_id)
    if (ritiro) {
      const r = await supabaseAdmin.from('prenotazioni').update(ritiro).eq('id', prev.id).select().single()
      if (r.error) throw r.error
      nuova = r.data
    }
  }
  return { prenotazione: nuova, avvisi: preparato.avvisi }
}
