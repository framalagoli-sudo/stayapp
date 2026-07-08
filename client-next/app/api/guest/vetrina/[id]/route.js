import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Endpoint pubblico per la griglia di una vetrina: solo elementi pubblicati e
// SOLO colonne pubbliche (dati_privati non viene mai selezionato → gating).
export async function GET(request, { params }) {
  try {
    const { data: vetrina } = await supabaseAdmin.from('vetrine')
      .select('id, preset, titolo, status').eq('id', params.id).single()
    if (!vetrina) return Response.json({ error: 'Vetrina non trovata' }, { status: 404 })

    const { data, error } = await supabaseAdmin.from('vetrina_elementi')
      .select('id, titolo, slug, copertina_url, valore_primario, stato_pubblico, dati, immagini')
      .eq('vetrina_id', params.id).eq('status', 'pubblicata')
      .order('ordine', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ preset: vetrina.preset, titolo: vetrina.titolo, elementi: data || [] })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
