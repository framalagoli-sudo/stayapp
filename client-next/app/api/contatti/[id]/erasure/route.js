import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    let q = supabaseAdmin.from('contatti').select('id').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: contatto, error } = await q.single()
    if (error || !contatto) return Response.json({ error: 'Contatto non trovato' }, { status: 404 })

    const short = params.id.slice(0, 8)
    await supabaseAdmin.from('contatti').update({
      nome: 'Anonimo', email: `cancellato-${short}@gdpr.anonimo`,
      telefono: null, note: null, tags: [], iscritto_newsletter: false, updated_at: new Date().toISOString(),
    }).eq('id', params.id)
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
