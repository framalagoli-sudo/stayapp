// Il cruscotto della Dashboard: «cosa succede» nell'attività, in pochi numeri
// confrontati col periodo prima. È la prima metà della visione del 14/10
// (STRATEGIA.md §6.4); la seconda — «cosa fare» — sono i consigli.
//
// ⚠️ Escono solo conteggi e somme, mai nomi o recapiti: chi vuole sapere chi,
// apre la pagina da cui il numero viene.
//
// Un numero compare solo se la funzione si usa: a chi non ha mai preso una
// prenotazione, «0 prenotazioni» ogni settimana è rumore, non informazione.
//
// Solo server. Chi chiama ha già deciso di quale azienda si parla.
import { supabaseAdmin } from './supabase-server'
import { righeIncassi } from './incassi'
import { soloAperti } from './evento-concluso'
import { postiEvento } from './posti-evento'

// Le sole durate ammesse: un valore arrivato dalla richiesta non decide da
// solo quanto indietro si legge.
export const PERIODI = [7, 30]
export const periodoAmmesso = v => PERIODI.includes(Number(v)) ? Number(v) : PERIODI[0]

const indietro = (giorni, da = Date.now()) => new Date(da - giorni * 86400000).toISOString()

async function conta(query) {
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count || 0
}

// Un numero e quello del periodo prima, già divisi.
const coppia = (righe, campo, inizio, meta) => ({
  ora: righe.filter(r => r[campo] >= meta).length,
  prima: righe.filter(r => r[campo] >= inizio && r[campo] < meta).length,
})

export async function cruscotto(aziendaId, giorni = PERIODI[0]) {
  const adesso = Date.now()
  const meta = indietro(giorni, adesso)          // inizio del periodo
  const inizio = indietro(giorni * 2, adesso)    // inizio del periodo prima

  const { data: entita, error: e1 } = await supabaseAdmin.from('entita')
    .select('id').eq('azienda_id', aziendaId)
  if (e1) throw new Error(e1.message)
  const ids = (entita || []).map(e => e.id)

  const visite = q => ids.length
    ? conta(q(supabaseAdmin.from('page_views').select('id', { count: 'exact', head: true }).in('entity_id', ids)))
    : Promise.resolve(0)
  const contatti = q => conta(q(supabaseAdmin.from('contatti').select('id', { count: 'exact', head: true }).eq('azienda_id', aziendaId)))

  const [
    visiteOra, visitePrima,
    contattiOra, contattiPrima, contattiInvitabili,
    eventi, risorseRecenti, risorseMai, azienda, prossimo,
  ] = await Promise.all([
    visite(q => q.gte('viewed_at', meta)),
    visite(q => q.gte('viewed_at', inizio).lt('viewed_at', meta)),
    contatti(q => q.gte('created_at', meta)),
    contatti(q => q.gte('created_at', inizio).lt('created_at', meta)),
    // Chi ha detto sì alle promozioni: avere un contatto non è poterlo invitare.
    contatti(q => q.eq('iscritto_newsletter', true)),
    supabaseAdmin.from('eventi').select('id, event_bookings(created_at, status)').eq('azienda_id', aziendaId),
    supabaseAdmin.from('prenotazioni').select('created_at, stato')
      .eq('azienda_id', aziendaId).gte('created_at', inizio),
    conta(supabaseAdmin.from('prenotazioni').select('id', { count: 'exact', head: true }).eq('azienda_id', aziendaId)),
    supabaseAdmin.from('aziende').select('stripe_account_id, fuso_orario').eq('id', aziendaId).maybeSingle(),
    soloAperti(supabaseAdmin.from('eventi')
      .select('id, title, date_start, seats_total, seats_booked, posti_riservati')
      .eq('azienda_id', aziendaId).eq('published', true).eq('active', true))
      .order('date_start').limit(1),
  ])
  const errore = eventi.error || risorseRecenti.error || azienda.error || prossimo.error
  if (errore) throw new Error(errore.message)

  // Le prenotazioni: serate e risorse insieme, senza quelle annullate e senza
  // la lista d'attesa (non hanno un posto).
  const prenotazioniEventi = (eventi.data || []).flatMap(e => e.event_bookings || [])
  const valide = [
    ...prenotazioniEventi.filter(b => b.status !== 'cancelled' && b.status !== 'waitlist'),
    ...(risorseRecenti.data || []).filter(p => p.stato !== 'cancellata'),
  ]
  const prenotazioniUsate = prenotazioniEventi.length > 0 || risorseMai > 0

  // Gli incassi solo a chi incassa online: col conto collegato, o se ne ha già avuti.
  let incassi = null
  const righe = await righeIncassi(aziendaId, { da: inizio, limite: 1000 })
  if (azienda.data?.stripe_account_id || righe.length) {
    const somma = rr => Math.round(rr.reduce((n, r) => n + r.importo, 0) * 100) / 100
    incassi = {
      ora: somma(righe.filter(r => r.quando >= meta)),
      prima: somma(righe.filter(r => r.quando >= inizio && r.quando < meta)),
    }
  }

  const ev = prossimo.data?.[0]
  let prossimoEvento = null
  if (ev) {
    const p = postiEvento(ev)
    prossimoEvento = {
      id: ev.id, titolo: ev.title, quando: ev.date_start,
      prenotati: p.prenotati, capienza: p.illimitato ? null : p.capienza,
    }
  }

  return {
    giorni,
    fuso: azienda.data?.fuso_orario || null,
    visite: { ora: visiteOra, prima: visitePrima },
    contatti: { ora: contattiOra, prima: contattiPrima, invitabili: contattiInvitabili },
    prenotazioni: prenotazioniUsate ? coppia(valide, 'created_at', inizio, meta) : null,
    incassi,
    prossimoEvento,
  }
}
