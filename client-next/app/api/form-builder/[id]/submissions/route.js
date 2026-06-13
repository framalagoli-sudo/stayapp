import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { data: form } = await supabaseAdmin.from('form_builder').select('id')
      .eq('id', params.id).eq('azienda_id', profile.azienda_id).single()
    if (!form) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const limit  = Math.min(Number(searchParams.get('limit') || '50'), 200)
    const offset = Number(searchParams.get('offset') || '0')

    const { data, count, error } = await supabaseAdmin.from('form_submissions')
      .select('*', { count: 'exact' }).eq('form_id', params.id)
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data, count, limit, offset })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
