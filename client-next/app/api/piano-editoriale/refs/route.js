import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    const azienda_id = isSuperAdmin ? searchParams.get('azienda_id') : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    if (!azienda_id) return Response.json([])

    const tipo = searchParams.get('tipo')
    if (tipo === 'articolo') {
      const { data } = await supabaseAdmin.from('articoli').select('id, titolo').eq('azienda_id', azienda_id).order('created_at', { ascending: false }).limit(100)
      return Response.json((data || []).map(r => ({ id: r.id, label: r.titolo })))
    }
    if (tipo === 'evento') {
      const { data } = await supabaseAdmin.from('eventi').select('id, title').eq('azienda_id', azienda_id).order('created_at', { ascending: false }).limit(100)
      return Response.json((data || []).map(r => ({ id: r.id, label: r.title })))
    }
    if (tipo === 'newsletter') {
      const [props, rists, atts] = await Promise.all([
        supabaseAdmin.from('properties').select('id').eq('azienda_id', azienda_id),
        supabaseAdmin.from('ristoranti').select('id').eq('azienda_id', azienda_id),
        supabaseAdmin.from('attivita').select('id').eq('azienda_id', azienda_id),
      ])
      const entityIds = [...(props.data || []), ...(rists.data || []), ...(atts.data || [])].map(e => e.id)
      if (!entityIds.length) return Response.json([])
      const { data } = await supabaseAdmin.from('newsletters').select('id, subject').in('entity_id', entityIds).order('created_at', { ascending: false }).limit(100)
      return Response.json((data || []).map(r => ({ id: r.id, label: r.subject })))
    }
    return Response.json([])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
