import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'
import { usiDelleSezioni } from '@/lib/sezioni'
import { contenutoSezione } from '@/lib/sezioni-regole'

// Le sezioni condivise di un sito: un pezzo di pagina scritto una volta e
// usato su più pagine. Appartengono a un'entità, e l'accesso è quello delle
// sue pagine (`requireEntityAccess`).

export const dynamic = 'force-dynamic'
const MAX_SEZIONI = 50

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id = searchParams.get('entity_id')
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })
    const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (response) return response

    const { data, error } = await supabaseAdmin.from('sezioni').select('id, nome, blocks, updated_at')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).order('created_at', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const usi = await usiDelleSezioni(entity_tipo, entity_id)
    return Response.json((data || []).map(s => ({ ...s, blocks: contenutoSezione(s.blocks), usata_in: usi[s.id] || [] })))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { entity_tipo, entity_id } = body
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })
    const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (response) return response

    const blocks = contenutoSezione(body.blocks)
    if (!blocks.length) return Response.json({ error: 'Una sezione condivisa deve contenere almeno un blocco' }, { status: 400 })
    const nome = String(body.nome || '').trim().slice(0, 120) || 'Sezione condivisa'

    const { count } = await supabaseAdmin.from('sezioni').select('id', { count: 'exact', head: true })
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    if ((count || 0) >= MAX_SEZIONI) return Response.json({ error: `Un sito può avere al massimo ${MAX_SEZIONI} sezioni condivise` }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('sezioni')
      .insert({ entity_tipo, entity_id, nome, blocks }).select('id, nome, blocks, updated_at').single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ...data, usata_in: [] }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
