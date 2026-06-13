import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    const azienda_id = isSuperAdmin ? (body?.azienda_id || null) : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    let ideaQ = supabaseAdmin.from('idee_editoriali').select('*').eq('id', params.id)
    if (azienda_id) ideaQ = ideaQ.eq('azienda_id', azienda_id)
    const { data: idea, error: ideaErr } = await ideaQ.single()
    if (ideaErr || !idea) return Response.json({ error: 'Idea non trovata' }, { status: 404 })

    const { data: post, error: postErr } = await supabaseAdmin.from('piano_editoriale').insert({
      azienda_id: azienda_id || idea.azienda_id,
      titolo: idea.titolo, testo: idea.note || '',
      canali: idea.canali || [], pillar: idea.pillar || '',
      data_pianificata: body.data_pianificata || null, stato: 'bozza', note: '', labels: [],
    }).select().single()
    if (postErr) return Response.json({ error: postErr.message }, { status: 500 })
    await supabaseAdmin.from('idee_editoriali').delete().eq('id', idea.id)
    return Response.json(post, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
