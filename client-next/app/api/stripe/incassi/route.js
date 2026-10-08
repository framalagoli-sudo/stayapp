import { supabaseAdmin } from '@/lib/supabase-server'
import { incassatoOnline } from '@/lib/gruppi-prenotazioni-evento'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'

// Gli incassi di questa azienda: cosa è stato pagato online, quando e quanto.
//
// ⛔ Perché esiste (22/09/2026). Garage 22 riceve il primo pagamento vero, di
// Agnese. Nel database è tutto giusto — webhook arrivato, riga segnata pagata.
// Francesco apre **Pagamenti** e non trova niente, perché quella pagina è solo
// il collegamento del conto: «collega», «stato», «riprendi». Non ha mai
// elencato un incasso, e quindi il titolare non aveva **nessun** posto in cui
// vedere i soldi entrati.
//
// ⚠️ **Non si chiede niente a Stripe.** Si leggono le nostre righe, quelle già
// segnate pagate dal webhook. È una scelta, non una scorciatoia:
//   · non tocchiamo **nessun** dato di pagamento — né carte, né ultime quattro
//     cifre, né intestatari: non li vogliamo, e ciò che non si chiede non si può
//     perdere;
//   · la pagina non dipende da un fornitore esterno che può essere lento o giù;
//   · per la ricevuta vera, il rimborso e il saldo c'è la dashboard di Stripe,
//     dove il cliente entra col **suo** account. Quella è casa sua.
//
// 🔒 Si risponde solo per la propria azienda: `resolveAziendaId` non lascia che
// un `azienda_id` arrivato nella richiesta scavalchi quello del profilo.

export const dynamic = 'force-dynamic'

const LIMITE = 100

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const { searchParams } = new URL(request.url)
    const azienda_id = resolveAziendaId(profile, searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    // I tre posti in cui si incassa, nello stesso ordine del webhook e di
    // `lib/esito-pagamento.js`. Colonne elencate: un asterisco qui pubblicherebbe
    // da solo ogni colonna aggiunta domani a tre tabelle diverse.
    const [ordini, prenotazioni, eventi] = await Promise.all([
      supabaseAdmin.from('ordini')
        .select('id, numero, totale, nome_cliente, created_at, updated_at')
        .eq('azienda_id', azienda_id).eq('pagamento_stato', 'pagato')
        .order('updated_at', { ascending: false }).limit(LIMITE),

      supabaseAdmin.from('prenotazioni')
        .select('id, servizio, importo_totale, importo_online, cliente_nome, data, created_at, updated_at, risorse(nome)')
        .eq('azienda_id', azienda_id).eq('pagamento_stato', 'pagato')
        .order('updated_at', { ascending: false }).limit(LIMITE),

      // `event_bookings` non ha `azienda_id`: si passa dagli eventi dell'azienda.
      supabaseAdmin.from('eventi')
        .select('id, title, acconto_percentuale, event_bookings(id, seats, total_amount, importo_online, guest_name, pagamento_stato, created_at, updated_at)')
        .eq('azienda_id', azienda_id),
    ])

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
        righe.push({
          id: `evento-${b.id}`, tipo: 'Evento',
          cosa: b.seats > 1 ? `${ev.title} — ${b.seats} posti` : ev.title,
          // La cifra arrivata, non il totale: con un acconto o un link sono diverse.
          chi: b.guest_name || null, importo: incassatoOnline(ev, b),
          quando: b.updated_at || b.created_at,
        })
      }
    }

    // Tre query separate tornano ordinate ognuna per conto suo: l'ordine vero si
    // fa qui, altrimenti la lista sembra mescolata a caso.
    righe.sort((a, b) => new Date(b.quando) - new Date(a.quando))

    return Response.json({
      righe: righe.slice(0, LIMITE),
      totale: righe.reduce((n, r) => n + r.importo, 0),
      // Lo dice la lista stessa: se è troncata, chi guarda deve saperlo invece
      // di credere che siano tutti.
      troncata: righe.length > LIMITE,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
