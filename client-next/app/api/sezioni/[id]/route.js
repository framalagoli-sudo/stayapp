import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'
import { usiDelleSezioni } from '@/lib/sezioni'
import { contenutoSezione, eUuid } from '@/lib/sezioni-regole'

// Carica la sezione e autorizza l'accesso all'entità che la possiede: «è sua?»
// viene prima di qualunque effetto.
async function caricaEAutorizza(request, id) {
  const nonTrovata = { response: Response.json({ error: 'Sezione non trovata' }, { status: 404 }) }
  if (!eUuid(id)) return nonTrovata
  const { data: sezione } = await supabaseAdmin.from('sezioni').select('id, entity_tipo, entity_id').eq('id', id).maybeSingle()
  if (!sezione) return nonTrovata
  const { response } = await requireEntityAccess(request, sezione.entity_tipo, sezione.entity_id)
  if (response) return { response }
  return { sezione, response: null }
}

// Cambia nome e contenuto. Vale per TUTTE le pagine che la usano: è il motivo
// per cui esiste.
export async function PATCH(request, props) {
  const params = await props.params
  try {
    const { sezione, response } = await caricaEAutorizza(request, params.id)
    if (response) return response
    const body = await request.json().catch(() => ({}))
    const modifiche = {}
    if (body.nome !== undefined) modifiche.nome = String(body.nome || '').trim().slice(0, 120) || 'Sezione condivisa'
    if (body.blocks !== undefined) {
      const blocks = contenutoSezione(body.blocks)
      if (!blocks.length) return Response.json({ error: 'Una sezione condivisa deve contenere almeno un blocco' }, { status: 400 })
      modifiche.blocks = blocks
    }
    if (!Object.keys(modifiche).length) return Response.json({ error: 'Nessun campo' }, { status: 400 })
    modifiche.updated_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from('sezioni').update(modifiche).eq('id', sezione.id).select('id, nome, blocks, updated_at').single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// Una sezione usata in qualche pagina non si elimina: prima la si stacca da
// lì. Eliminarla lascerebbe un buco in pagine che nessuno sta guardando.
export async function DELETE(request, props) {
  const params = await props.params
  try {
    const { sezione, response } = await caricaEAutorizza(request, params.id)
    if (response) return response
    const usi = (await usiDelleSezioni(sezione.entity_tipo, sezione.entity_id))[sezione.id] || []
    if (usi.length) {
      return Response.json({ error: `Questa sezione è usata in ${usi.length === 1 ? 'una pagina' : `${usi.length} pagine`} (${usi.map(u => u.titolo).join(', ')}): staccala da lì prima di eliminarla.`, usata_in: usi }, { status: 409 })
    }
    const { error } = await supabaseAdmin.from('sezioni').delete().eq('id', sezione.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
