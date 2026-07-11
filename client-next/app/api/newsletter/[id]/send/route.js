import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { sendNewsletterById } from '@/lib/newsletter-send'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    // Anti-IDOR: la newsletter deve appartenere all'azienda del chiamante.
    let own = supabaseAdmin.from('newsletters').select('id').eq('id', params.id)
    if (profile.role !== 'super_admin') own = own.eq('azienda_id', profile.azienda_id)
    const { data: owned } = await own.single()
    if (!owned) return Response.json({ error: 'Newsletter non trovata' }, { status: 404 })

    const sent = await sendNewsletterById(params.id)
    return Response.json({ ok: true, sent })
  } catch (e) {
    const status = e.message.includes('non trovata') ? 404 : e.message.includes('già inviata') ? 400 : 500
    return Response.json({ error: e.message }, { status })
  }
}
