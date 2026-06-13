import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return Response.json({ error: 'Token mancante' }, { status: 400 })

    const { data } = await supabaseAdmin.from('survey_risposte')
      .select('nome_cliente, compilato_at, azienda_id')
      .eq('token', token).single()
    if (!data) return Response.json({ error: 'Survey non trovata' }, { status: 404 })

    const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale').eq('id', data.azienda_id).single()
    return Response.json({ nome: data.nome_cliente, compilata: !!data.compilato_at, business: az?.ragione_sociale || '' })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { token, nps_score, commento } = await request.json()
    if (!token) return Response.json({ error: 'Token mancante' }, { status: 400 })
    if (nps_score === undefined || nps_score === null) return Response.json({ error: 'Punteggio obbligatorio' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('survey_risposte')
      .update({ nps_score, commento: commento || '', compilato_at: new Date().toISOString() })
      .eq('token', token)
      .is('compilato_at', null)
      .select().single()

    if (error || !data) return Response.json({ error: 'Survey non valida o già compilata' }, { status: 400 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
