import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return Response.json({ error: 'token obbligatorio' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('form_builder')
      .select('id, nome, descrizione, campi, redirect_url, attivo, multi_step').eq('token', token).single()
    if (error || !data) return Response.json({ error: 'Form non trovato' }, { status: 404 })
    if (!data.attivo) return Response.json({ error: 'Form non attivo' }, { status: 403 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
