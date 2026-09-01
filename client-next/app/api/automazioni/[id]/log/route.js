import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    // Il super_admin non ha un'azienda propria: e' la sua condizione normale,
    // non un difetto del suo profilo. Pretendere `azienda_id` qui lo bloccava
    // in cima, e il ramo `role !== 'super_admin'` qui sotto non veniva mai
    // raggiunto: un ramo mai raggiunto non da' errore, da' silenzio.
    if (!profile || (profile.role !== 'super_admin' && !profile.azienda_id))
      return Response.json({ error: 'Accesso negato' }, { status: 403 })

    let q = supabaseAdmin.from('automazioni').select('id').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: auto } = await q.single()
    if (!auto) return Response.json({ error: 'Non trovata' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('automazioni_log')
      .select('id, step_index, contact_email, contact_nome, scheduled_at, sent_at, status, error_msg, created_at')
      .eq('automazione_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
