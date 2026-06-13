import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { aziendaId } = params
    const { searchParams } = new URL(request.url)
    const codice = searchParams.get('codice')
    if (!codice) return Response.json({ error: 'Codice obbligatorio' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('gift_cards')
      .select('id, codice, valore_residuo, scadenza, attiva')
      .eq('azienda_id', aziendaId).eq('codice', codice.toUpperCase()).single()

    if (error || !data) return Response.json({ error: 'Gift card non trovata' }, { status: 404 })
    if (!data.attiva) return Response.json({ error: 'Gift card non attiva' }, { status: 400 })
    if (data.scadenza && new Date(data.scadenza) < new Date()) return Response.json({ error: 'Gift card scaduta' }, { status: 400 })
    if (data.valore_residuo <= 0) return Response.json({ error: 'Gift card esaurita' }, { status: 400 })
    return Response.json({ id: data.id, codice: data.codice, valore_residuo: data.valore_residuo })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
