import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response

    const { status, notes } = await request.json()
    const payload = { updated_at: new Date().toISOString() }
    if (status !== undefined) payload.status = status
    if (notes  !== undefined) payload.notes  = notes

    const { data, error } = await supabaseAdmin
      .from('event_bookings').update(payload).eq('id', params.bookingId).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    if (status) {
      const { data: confirmed } = await supabaseAdmin
        .from('event_bookings').select('seats').eq('event_id', data.event_id).eq('status', 'confirmed')
      const total = (confirmed || []).reduce((s, b) => s + (b.seats || 1), 0)
      await supabaseAdmin.from('eventi').update({ seats_booked: total, updated_at: new Date().toISOString() }).eq('id', data.event_id)
    }

    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
