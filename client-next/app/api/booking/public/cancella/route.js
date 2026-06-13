import { supabaseAdmin } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!isUUID(token)) return Response.json({ error: 'Token non valido' }, { status: 400 })

    const { data: pren, error } = await supabaseAdmin.from('prenotazioni')
      .select('*, risorse(nome, cancellazione_ore)')
      .eq('cancellation_token', token)
      .single()

    if (error || !pren) return Response.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    if (pren.stato === 'cancellata') return Response.json({ error: 'Già cancellata' }, { status: 400 })

    if (pren.ora_inizio) {
      const appuntamento = new Date(`${pren.data}T${pren.ora_inizio}`)
      const limite = new Date(appuntamento.getTime() - (pren.risorse?.cancellazione_ore || 24) * 3600000)
      if (new Date() > limite) {
        return Response.json({ error: `Non è più possibile cancellare (limite ${pren.risorse?.cancellazione_ore || 24}h prima)` }, { status: 400 })
      }
    }

    await supabaseAdmin.from('prenotazioni')
      .update({ stato: 'cancellata', updated_at: new Date().toISOString() })
      .eq('id', pren.id)

    return Response.json({ ok: true, messaggio: 'Prenotazione cancellata con successo' })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
