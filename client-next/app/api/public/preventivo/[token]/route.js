import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { data, error } = await supabaseAdmin.from('preventivi')
      .select('id, numero, titolo, stato, valuta, iva_pct, voci, note, scadenza, accettato_at, firma_nome, aziende(ragione_sociale, email)')
      .eq('token', params.token).single()
    if (error || !data) return Response.json({ error: 'Preventivo non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
