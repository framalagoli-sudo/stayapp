import { supabaseAdmin } from '@/lib/supabase-server'
import { getPreset } from '@/lib/vetrinePresets'

export const dynamic = 'force-dynamic'

// Endpoint pubblico per la griglia di una vetrina: elementi pubblicati, SOLO
// colonne pubbliche (dati_privati mai selezionato → gating). Filtri/ricerca/
// paginazione server-side, guidati dal preset:
//  - stato          → filtro su stato_pubblico (pre-filtro blocco o facet)
//  - sel_<key>      → uguaglianza sui campi select del preset (dati->>key)
//  - prezzo_min/max → range su valore_primario (colonna calda, indicizzata)
//  - q              → ricerca testuale sul titolo
//  - limit/offset   → paginazione (+ total per il "Carica altri")
export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url)
    const { data: vetrina } = await supabaseAdmin.from('vetrine')
      .select('id, preset, titolo').eq('id', params.id).single()
    if (!vetrina) return Response.json({ error: 'Vetrina non trovata' }, { status: 404 })
    const preset = getPreset(vetrina.preset)

    let q = supabaseAdmin.from('vetrina_elementi')
      .select('id, titolo, slug, copertina_url, valore_primario, stato_pubblico, dati, immagini', { count: 'exact' })
      .eq('vetrina_id', params.id).eq('status', 'pubblicata')

    const stato = searchParams.get('stato')
    if (stato) q = q.eq('stato_pubblico', stato)

    for (const f of preset.campiPubblici || []) {
      if (f.type !== 'select') continue
      const v = searchParams.get('sel_' + f.key)
      if (v) q = q.eq(`dati->>${f.key}`, v)   // include lo statoPubblico: il valore è anche in dati.<key>
    }

    const pmin = searchParams.get('prezzo_min')
    const pmax = searchParams.get('prezzo_max')
    if (pmin && !Number.isNaN(Number(pmin))) q = q.gte('valore_primario', Number(pmin))
    if (pmax && !Number.isNaN(Number(pmax))) q = q.lte('valore_primario', Number(pmax))

    const search = searchParams.get('q')
    if (search?.trim()) q = q.ilike('titolo', `%${search.trim()}%`)

    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 12, 1), 48)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    q = q.order('ordine', { ascending: true }).range(offset, offset + limit - 1)

    const { data, count, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ preset: vetrina.preset, titolo: vetrina.titolo, elementi: data || [], total: count ?? 0 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
