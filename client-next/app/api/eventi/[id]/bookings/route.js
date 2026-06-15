import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'

export async function GET(request, { params }) {
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
