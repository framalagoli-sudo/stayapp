import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWebhooks } from '@/lib/send-webhooks'

export async function POST(request, props) {
  const params = await props.params;
  try {
    const { firma_nome } = await request.json()
    if (!firma_nome?.trim()) return Response.json({ error: 'Il campo firma è obbligatorio' }, { status: 400 })

    const { data: prev } = await supabaseAdmin.from('preventivi')
      .select('id, stato, scadenza, azienda_id').eq('token', params.token).single()
    if (!prev) return Response.json({ error: 'Preventivo non trovato' }, { status: 404 })
    if (prev.stato === 'accettato') return Response.json({ error: 'Già accettato' }, { status: 400 })
    if (prev.stato === 'scaduto' || prev.stato === 'rifiutato')
      return Response.json({ error: 'Preventivo non più accettabile' }, { status: 400 })
    // La scadenza si legge dalla data, non dallo stato: nessuno scrive mai
    // `scaduto` (non c'è un cron che lo faccia), quindi affidarsi allo stato
    // significava tenere accettabile per sempre un prezzo di mesi prima.
    if (prev.scadenza && new Date(prev.scadenza) < new Date(new Date().toDateString())) {
      return Response.json({ error: 'Questo preventivo è scaduto. Chiedi un aggiornamento.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('preventivi')
      .update({ stato: 'accettato', accettato_at: new Date().toISOString(), firma_nome: firma_nome.trim(), updated_at: new Date().toISOString() })
      .eq('token', params.token).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    sendWebhooks(prev.azienda_id, 'preventivo_accettato', { preventivo_id: prev.id, firma_nome: firma_nome.trim() }).catch(() => {})
    return Response.json({ ok: true, accettato_at: data.accettato_at })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
