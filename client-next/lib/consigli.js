// I consigli personali: «cosa fare adesso», dai numeri di un cliente. La regia
// del Club li crea e li modifica (tabella `club_consigli`, migration 138);
// QUANDO scattano lo dicono i segnali di lib/consigli-segnali.js.
//
// ⛔ Al titolare arrivano solo i consigli ATTIVI e del suo mestiere; le bozze
// le vede solo il super_admin, per guardarle all'opera sui clienti veri prima
// di attivarle. Il filtro sta qui, sul server.
//
// Escono titolo, perché e pulsante con i numeri dell'attività stessa: mai nomi
// o recapiti di persone.
//
// Solo server. Chi chiama ha già deciso di quale azienda si parla.
import { supabaseAdmin } from './supabase-server'
import { soloAperti } from './evento-concluso'
import { postiEvento } from './posti-evento'
import { mestieriDi } from './club'
import { SEGNALI, parametriPuliti, componi, azioneConsiglio } from './consigli-segnali'
import { perMestieri } from './club-regole'

const GIORNO = 864e5
const COLONNE = 'id, segnale, parametri, mestieri, titolo, perche, azione, stato, ordine'

// I fatti che servono ai segnali, letti una volta per tutte.
export async function fatti(aziendaId) {
  const adesso = Date.now()
  const iso = n => new Date(adesso - n * GIORNO).toISOString()
  const { data: ent, error: e0 } = await supabaseAdmin.from('entita').select('id').eq('azienda_id', aziendaId)
  if (e0) throw new Error(e0.message)
  const ids = (ent || []).map(e => e.id)
  const visite = (da, a) => {
    if (!ids.length) return Promise.resolve({ count: 0 })
    let q = supabaseAdmin.from('page_views').select('id', { count: 'exact', head: true }).in('entity_id', ids).gte('viewed_at', da)
    if (a) q = q.lt('viewed_at', a)
    return q
  }
  const [invitabili, newsletter, passati, futuri, prossimo, vOra, vPrima, contatti, ultimo] = await Promise.all([
    supabaseAdmin.from('contatti').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId).eq('iscritto_newsletter', true),
    supabaseAdmin.from('newsletters').select('sent_at')
      .eq('azienda_id', aziendaId).eq('status', 'sent').not('sent_at', 'is', null)
      .order('sent_at', { ascending: false }).limit(1),
    supabaseAdmin.from('eventi').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId).eq('published', true)
      .lt('date_start', new Date(adesso).toISOString()).gte('date_start', iso(180)),
    soloAperti(supabaseAdmin.from('eventi').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId).eq('published', true).eq('active', true)),
    soloAperti(supabaseAdmin.from('eventi')
      .select('id, title, date_start, seats_total, seats_booked, posti_riservati')
      .eq('azienda_id', aziendaId).eq('published', true).eq('active', true))
      .order('date_start').limit(1),
    visite(iso(7)),
    visite(iso(14), iso(7)),
    supabaseAdmin.from('contatti').select('id', { count: 'exact', head: true }).eq('azienda_id', aziendaId),
    supabaseAdmin.from('contatti').select('created_at').eq('azienda_id', aziendaId)
      .order('created_at', { ascending: false }).limit(1),
  ])
  const errore = [invitabili, newsletter, passati, futuri, prossimo, vOra, vPrima, contatti, ultimo].find(r => r.error)?.error
  if (errore) throw new Error(errore.message)

  const ev = prossimo.data?.[0]
  const p = ev ? postiEvento(ev) : null
  return {
    invitabili: invitabili.count || 0,
    ultimaNewsletter: newsletter.data?.[0]?.sent_at || null,
    eventiPassati: passati.count || 0,
    eventiFuturi: futuri.count || 0,
    prossimo: ev ? { id: ev.id, titolo: ev.title, quando: ev.date_start, prenotati: p.prenotati, capienza: p.illimitato ? null : p.capienza } : null,
    visiteOra: vOra.count || 0,
    visitePrima: vPrima.count || 0,
    contattiTotali: contatti.count || 0,
    ultimoContatto: ultimo.data?.[0]?.created_at || null,
  }
}

// Un consiglio applicato ai fatti di un'azienda: null se non scatta.
export function applica(c, f, adesso = Date.now()) {
  const s = SEGNALI[c.segnale]
  if (!s) return null
  const valori = s.scatta(f, parametriPuliti(c.segnale, c.parametri), adesso)
  if (!valori) return null
  return {
    chiave: c.id,
    titolo: componi(c.titolo, valori),
    perche: componi(c.perche, valori),
    azione: azioneConsiglio(c.azione, valori),
    bozza: c.stato !== 'attivo',
  }
}

const MASSIMO = 3

// `bozze`: true solo per il super_admin.
export async function consigliPer(aziendaId, { bozze = false } = {}) {
  let q = supabaseAdmin.from('club_consigli').select(COLONNE).order('ordine').order('created_at')
  if (!bozze) q = q.eq('stato', 'attivo')
  const [{ data: catalogo, error }, mestieri] = await Promise.all([q, mestieriDi(aziendaId)])
  if (error) throw new Error(error.message)
  const suoi = (catalogo || []).filter(c => perMestieri(c, mestieri))
  if (!suoi.length) return []
  const f = await fatti(aziendaId)
  return suoi.map(c => applica(c, f)).filter(Boolean).slice(0, bozze ? 20 : MASSIMO)
}

// La regia, prima di salvare: su quali clienti scatterebbe oggi, e con quale
// frase. Si guardano le aziende vere (non quelle di prova delle sonde).
export async function anteprima(consiglio) {
  const { data: aziende, error } = await supabaseAdmin.from('aziende')
    .select('id, ragione_sociale').not('ragione_sociale', 'ilike', 'ZZ%').order('ragione_sociale').limit(100)
  if (error) throw new Error(error.message)
  const esiti = []
  for (const az of aziende || []) {
    if (!perMestieri(consiglio, await mestieriDi(az.id))) continue
    const r = applica({ ...consiglio, id: 'anteprima' }, await fatti(az.id))
    if (r) esiti.push({ azienda: az.ragione_sociale, titolo: r.titolo })
  }
  return { aziende: (aziende || []).length, scatta: esiti }
}
