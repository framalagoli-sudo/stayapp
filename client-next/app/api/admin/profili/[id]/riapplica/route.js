import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
import { applicaProfilo } from '@/lib/applica-profilo'

// Riapplica un profilo a tutte le entità della sua categoria. È il modo di far
// arrivare ai clienti un profilo migliorato: il profilo si applica come copia,
// quindi modificarlo non cambia nessuno finché non si riapplica — apposta.
// Solo super_admin.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request, props) {
  const { id } = await props.params
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    if (!UUID.test(id)) return Response.json({ error: 'Non trovato' }, { status: 404 })
    const { data: profilo } = await supabaseAdmin.from('profili_mestiere').select('chiave').eq('id', id).maybeSingle()
    if (!profilo) return Response.json({ error: 'Non trovato' }, { status: 404 })
    const { data: entita, error } = await supabaseAdmin.from('entita').select('id').eq('profilo', profilo.chiave)
    if (error) throw error
    const esiti = []
    for (const e of entita) esiti.push(await applicaProfilo(e.id, profilo.chiave))
    return Response.json({ riapplicate: esiti.length, esiti })
  } catch (err) {
    logError('applica-profilo', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}
