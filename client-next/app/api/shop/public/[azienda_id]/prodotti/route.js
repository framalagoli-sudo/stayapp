import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('prodotti').select('*')
      .eq('azienda_id', params.azienda_id).eq('attivo', true)
      .order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
