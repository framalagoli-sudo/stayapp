import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { data, error } = await supabaseAdmin.from('preventivi')
      .update({ stato: 'inviato', updated_at: new Date().toISOString() })
      .eq('id', params.id).eq('azienda_id', profile.azienda_id)
      .select('*, contatti(nome, email)').single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
