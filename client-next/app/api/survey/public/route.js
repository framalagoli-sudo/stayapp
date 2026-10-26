import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

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
    // Il token non si indovina, ma una porta pubblica che scrive ha comunque un tetto.
    const rl = await rateLimit(request, { name: 'survey-public', limit: 20, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()

    const { token, nps_score, commento } = await request.json()
    if (!token || typeof token !== 'string') return Response.json({ error: 'Token mancante' }, { status: 400 })
    // Il punteggio NPS è un intero da 0 a 10: è quello che il pannello conta
    // fra promotori e detrattori, e un valore fuori scala falserebbe il conto.
    if (!Number.isInteger(nps_score) || nps_score < 0 || nps_score > 10)
      return Response.json({ error: 'Punteggio obbligatorio, da 0 a 10' }, { status: 400 })
    if (commento != null && (typeof commento !== 'string' || commento.length > 3000))
      return Response.json({ error: 'Commento troppo lungo' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('survey_risposte')
      .update({ nps_score, commento: commento || '', compilato_at: new Date().toISOString() })
      .eq('token', token)
      .is('compilato_at', null)
      .select('id').single()

    if (error || !data) return Response.json({ error: 'Survey non valida o già compilata' }, { status: 400 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
