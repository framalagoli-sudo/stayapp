import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.role === 'super_admin' ? null : profile?.azienda_id
    if (!profile?.role) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    let q = supabaseAdmin.from('pe_commenti').select('*').eq('post_id', params.id).order('created_at', { ascending: true })
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id, full_name').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    let azienda_id = isSuperAdmin ? null : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { testo } = await request.json()
    if (!testo?.trim()) return Response.json({ error: 'Testo obbligatorio' }, { status: 400 })

    if (!azienda_id) {
      const { data: post } = await supabaseAdmin.from('piano_editoriale').select('azienda_id').eq('id', params.id).single()
      azienda_id = post?.azienda_id
    }
    if (!azienda_id) return Response.json({ error: 'azienda_id non determinabile' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('pe_commenti').insert({
      post_id: params.id, azienda_id, author_id: user.id,
      author_name: profile?.full_name || 'Utente', testo: testo.trim(),
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
