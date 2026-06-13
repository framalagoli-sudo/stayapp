import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  try {
    const body = await request.json()
    const { guest_name, guest_email, guest_phone, package_id, seats, notes } = body
    if (!guest_name?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    if (!guest_email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    const { data: evento, error: evErr } = await supabaseAdmin.from('eventi')
      .select('id, seats_total, seats_booked, packages, price').eq('id', params.id).single()
    if (evErr || !evento) return Response.json({ error: 'Evento non trovato' }, { status: 404 })

    const reqSeats = parseInt(seats) || 1
    if (evento.seats_total && (evento.seats_booked + reqSeats) > evento.seats_total)
      return Response.json({ error: 'Posti non disponibili' }, { status: 400 })

    let price = evento.price || 0
    if (package_id) {
      const pkg = (evento.packages || []).find(p => p.id === package_id)
      if (pkg) price = pkg.price || 0
    }
    const { data, error } = await supabaseAdmin.from('event_bookings').insert({
      event_id: params.id, guest_name, guest_email,
      guest_phone: guest_phone || null, package_id: package_id || null,
      seats: reqSeats, total_amount: price * reqSeats, notes: notes || null, status: 'pending',
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
