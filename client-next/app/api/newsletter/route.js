import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    const { searchParams } = new URL(request.url)

    let q = supabaseAdmin.from('newsletters')
      .select('id, subject, preheader, template_id, status, sent_at, scheduled_at, recipients_count, unsubscribes_count, entity_tipo, entity_id, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      q = q.eq('azienda_id', searchParams.get('azienda_id'))
    }
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const azienda_id = profile.azienda_id || body.azienda_id
    if (!azienda_id) return Response.json({ error: 'azienda_id mancante' }, { status: 400 })

    const { subject = '', preheader = '', template_id = 'semplice', content = {}, entity_tipo = 'struttura', entity_id = null, scheduled_at = null } = body
    const { data, error } = await supabaseAdmin.from('newsletters').insert({
      azienda_id, subject, preheader, template_id, content, entity_tipo,
      entity_id: entity_id || null, status: 'draft', scheduled_at: scheduled_at || null,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
