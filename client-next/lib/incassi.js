// Gli incassi online di un'azienda, letti dalle NOSTRE righe già segnate pagate
// dal webhook. La usano la pagina «Pagamenti» (l'elenco) e il cruscotto della
// Dashboard (le somme): due copie della stessa regola darebbero due cifre
// diverse per gli stessi soldi.
//
// ⚠️ **Non si chiede niente a Stripe**: nessun dato di carta entra da noi, e la
// pagina non dipende da un fornitore che può essere lento o giù.
//
// Solo server. Chi chiama ha già deciso di quale azienda si parla.
import { supabaseAdmin } from './supabase-server'
import { incassatoOnline } from './gruppi-prenotazioni-evento'

// `da` (ISO) limita alle righe pagate da quel momento in poi; `limite` vale per
// ognuno dei tre posti in cui si incassa.
export async function righeIncassi(aziendaId, { da = null, limite = 100 } = {}) {
  let ordiniQ = supabaseAdmin.from('ordini')
    .select('id, numero, totale, nome_cliente, created_at, updated_at')
    .eq('azienda_id', aziendaId).eq('pagamento_stato', 'pagato')
    .order('updated_at', { ascending: false }).limit(limite)
  let prenotazioniQ = supabaseAdmin.from('prenotazioni')
    .select('id, servizio, importo_totale, importo_online, cliente_nome, data, created_at, updated_at, risorse(nome)')
    .eq('azienda_id', aziendaId).eq('pagamento_stato', 'pagato')
    .order('updated_at', { ascending: false }).limit(limite)
  if (da) { ordiniQ = ordiniQ.gte('updated_at', da); prenotazioniQ = prenotazioniQ.gte('updated_at', da) }

  // I tre posti, nello stesso ordine del webhook e di `lib/esito-pagamento.js`.
  // Colonne elencate: un asterisco pubblicherebbe da solo ogni colonna futura.
  const [ordini, prenotazioni, eventi] = await Promise.all([
    ordiniQ,
    prenotazioniQ,
    // `event_bookings` non ha `azienda_id`: si passa dagli eventi dell'azienda.
    supabaseAdmin.from('eventi')
      .select('id, title, acconto_percentuale, event_bookings(id, seats, total_amount, importo_online, guest_name, pagamento_stato, created_at, updated_at)')
      .eq('azienda_id', aziendaId),
  ])
  const errore = ordini.error || prenotazioni.error || eventi.error
  if (errore) throw new Error(errore.message)

  const righe = []
  for (const o of ordini.data || []) {
    righe.push({
      id: `ordine-${o.id}`, tipo: 'Ordine', cosa: `Ordine #${o.numero}`,
      chi: o.nome_cliente || null, importo: Number(o.totale) || 0,
      quando: o.updated_at || o.created_at,
    })
  }
  for (const p of prenotazioni.data || []) {
    righe.push({
      id: `prenotazione-${p.id}`, tipo: 'Prenotazione', cosa: p.risorse?.nome || p.servizio || 'Prenotazione',
      // Con un acconto è arrivata la quota, non il totale.
      chi: p.cliente_nome || null, importo: Number(p.importo_online ?? p.importo_totale) || 0,
      quando: p.updated_at || p.created_at,
    })
  }
  for (const ev of eventi.data || []) {
    for (const b of ev.event_bookings || []) {
      if (b.pagamento_stato !== 'pagato') continue
      const quando = b.updated_at || b.created_at
      if (da && quando < da) continue
      righe.push({
        id: `evento-${b.id}`, tipo: 'Evento',
        cosa: b.seats > 1 ? `${ev.title} — ${b.seats} posti` : ev.title,
        // La cifra arrivata, non il totale: con un acconto o un link sono diverse.
        chi: b.guest_name || null, importo: incassatoOnline(ev, b),
        quando,
      })
    }
  }

  // Tre query tornano ordinate ognuna per conto suo: l'ordine vero si fa qui.
  righe.sort((a, b) => new Date(b.quando) - new Date(a.quando))
  return righe
}
