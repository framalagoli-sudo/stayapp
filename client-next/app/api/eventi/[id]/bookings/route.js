import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'
import { recomputeEventSeats } from '@/lib/event-seats'

export async function GET(request, props) {
  const params = await props.params;
  try {
    // Verifica che l'evento appartenga all'azienda dell'utente.
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const { data, error } = await supabaseAdmin
      .from('event_bookings').select('*').eq('event_id', params.id)
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// Il titolare segna una prenotazione arrivata per telefono.
//
// Prima si poteva prenotare **solo** dal sito: chi chiamava finiva su un
// quaderno, e i posti sul pannello non tornavano più con la realtà. Da lì un
// evento risultava mezzo vuoto mentre era pieno, oppure si accettava una
// prenotazione di troppo.
//
// ⚠️ Il consenso privacy non si finge. Chi prenota al telefono non ha spuntato
// niente: è il titolare che raccoglie i dati e risponde di averlo informato.
// Si registra **com'è andata davvero** — «raccolto a voce dal titolare» — invece
// di scrivere una spunta che nessuno ha messo. Se un domani qualcuno chiede
// conto di quel dato, la differenza fra le due cose è tutta.
export async function POST(request, props) {
  const params = await props.params
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response

    const { guest_name, guest_email, guest_phone, seats, notes } = await request.json()
    if (!guest_name?.trim()) return Response.json({ error: 'Serve almeno il nome' }, { status: 400 })

    const posti = Math.max(1, parseInt(seats) || 1)

    const { data: evento } = await supabaseAdmin.from('eventi')
      .select('id, price, seats_total, seats_booked').eq('id', params.id).maybeSingle()
    if (!evento) return Response.json({ error: 'Evento non trovato' }, { status: 404 })

    // ⚠️ Il limite vale anche qui: senza, il titolare può segnare più posti di
    // quanti ne ha e scoprirlo la sera dell'evento. Si avvisa e si lascia
    // decidere a lui — è il suo locale, magari aggiunge un tavolo.
    if (evento.seats_total && (evento.seats_booked || 0) + posti > evento.seats_total) {
      return Response.json({
        error: `Restano ${Math.max(0, evento.seats_total - (evento.seats_booked || 0))} posti su ${evento.seats_total}. Per accettarne di più, alza prima i posti disponibili nell'evento.`,
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('event_bookings').insert({
      event_id: params.id,
      guest_name: guest_name.trim(),
      // ⚠️ Può essere vuota: chi telefona detta un nome e riattacca. Serve la
      // migration 108 — prima la colonna era obbligatoria, perché fino a ieri
      // si prenotava solo dal sito.
      guest_email: guest_email?.trim() || null,
      guest_phone: guest_phone?.trim() || null,
      seats: posti,
      total_amount: (evento.price || 0) * posti,
      notes: notes?.trim() || null,
      // Confermata: l'ha presa il titolare al telefono, non c'è niente da attendere.
      status: 'confirmed',
      // ⚠️ Nessuna spunta finta: si scrive che il consenso è stato raccolto a
      // voce, e da chi. `privacy_accettata` resta falso perché **non** è stata
      // spuntata una casella — la prova è il testo qui sotto.
      privacy_accettata: false,
      privacy_accettata_il: new Date().toISOString(),
      privacy_testo: 'Prenotazione raccolta al telefono dal titolare, che dichiara di aver informato la persona sul trattamento dei suoi dati.',
      // La conferma non parte: chi ha telefonato ha già avuto la risposta a voce.
      conferma_inviata_il: new Date().toISOString(),
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    await recomputeEventSeats(params.id)
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
