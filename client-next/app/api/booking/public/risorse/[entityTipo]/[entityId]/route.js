import { supabaseAdmin } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

export async function GET(request, { params }) {
  try {
    const { entityTipo, entityId } = params
    if (!isUUID(entityId)) return Response.json({ error: 'entity_id non valido' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('risorse')
      .select('id, nome, descrizione, modalita, durata_minuti, quantita, max_coperti, prezzo, valuta, colore, disponibilita, blocchi, anticipo_ore, cancellazione_ore, conferma_auto')
      .eq('entity_tipo', entityTipo)
      .eq('entity_id', entityId)
      .eq('attiva', true)
      .eq('visibile_minisito', true)
      .order('nome')

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
