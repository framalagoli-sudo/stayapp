import { supabaseAdmin } from '@/lib/supabase-server'
import { puoIncassare } from '@/lib/checkout'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { postiRichiesti, rifiutoPrenotazione, contoEvento } from '@/lib/evento-prenotazione'
import { MINUTI_PER_PAGARE } from '@/lib/prenotazioni-scadute'

export const dynamic = 'force-dynamic'

// Cosa succede se confermo? — chiesto PRIMA di prenotare.
//
// Garage 22 (03/10/2026): chi premeva «Prenota» si ritrovava alla cassa senza
// che nessuno gli avesse detto che c'era da pagare, la chiudeva, e i posti
// restavano tenuti mezz'ora per nessuno. Ora la pagina mostra prima cosa sta
// per fare: quanti posti, quanto costa, quanto si paga adesso.
//
// Pubblica di proposito, come la prenotazione. Non scrive niente e non tiene
// nessun posto: i posti si prendono solo alla conferma. Non riceve e non
// restituisce dati personali — solo i conti della richiesta.
//
// ⚠️ La cifra la calcola il server con le stesse funzioni della prenotazione
// (`lib/evento-prenotazione.js`): calcolata nel browser, potrebbe non essere
// quella che la cassa chiede un istante dopo.
export async function POST(request, props) {
  const params = await props.params
  try {
    const rl = await rateLimit(request, { name: 'evento-riepilogo', limit: 60, windowSec: 3600, ip: getClientIp(request) })
    if (!rl.allowed) return tooManyRequests()

    const { package_id, seats } = await request.json()

    // Solo le colonne che servono ai conti, e nessuna torna indietro.
    const { data: evento, error } = await supabaseAdmin.from('eventi')
      .select('id, azienda_id, price, packages, acconto_percentuale, date_start, date_end, seats_total, seats_booked, posti_riservati, prenotazioni_chiuse, prenotazioni_chiuse_testo, lista_attesa')
      .eq('id', params.id).eq('published', true).eq('active', true).maybeSingle()
    if (error || !evento) return Response.json({ error: 'Evento non trovato' }, { status: 404 })

    const posti = postiRichiesti(seats)
    if (!posti) return Response.json({ error: 'Indica per quante persone vuoi prenotare.' }, { status: 400 })
    const rifiuto = rifiutoPrenotazione(evento, posti)
    if (rifiuto) return Response.json(rifiuto, { status: 400 })

    const { totale, conto } = contoEvento(evento, typeof package_id === 'string' ? package_id : null, posti)
    // Senza un conto collegato la cassa non si apre e si paga sul posto: dire
    // «andrai al pagamento» sarebbe una promessa che la prenotazione non mantiene.
    if (!(conto.dovuto > 0) || !(await puoIncassare(evento.azienda_id))) {
      return Response.json({ posti, da_pagare: 0 })
    }
    return Response.json({
      posti, totale, da_pagare: conto.dovuto, saldo: conto.saldo,
      tutto: conto.tutto, perc: conto.perc, minuti: MINUTI_PER_PAGARE,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
