import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    // Anti-IDOR: l'originale deve appartenere all'azienda del chiamante.
    let origq = supabaseAdmin.from('newsletters').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') origq = origq.eq('azienda_id', profile.azienda_id)
    const { data: orig, error } = await origq.single()
    if (error || !orig) return Response.json({ error: 'Non trovata' }, { status: 404 })

    const { data, error: e2 } = await supabaseAdmin.from('newsletters').insert({
      azienda_id: orig.azienda_id, entity_tipo: orig.entity_tipo, entity_id: orig.entity_id,
      subject: `${orig.subject} (copia)`, preheader: orig.preheader || '',
      template_id: orig.template_id, content: orig.content, status: 'draft',
    }).select().single()
    if (e2) return Response.json({ error: e2.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
