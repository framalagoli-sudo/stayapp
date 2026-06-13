import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function enrichLinks(links, tipo, id) {
  const result = []
  for (const link of links) {
    const isFrom = link.from_tipo === tipo && link.from_id === id
    const otherTipo = isFrom ? link.to_tipo : link.from_tipo
    const otherId   = isFrom ? link.to_id   : link.from_id
    const table = otherTipo === 'struttura' ? 'properties' : otherTipo === 'ristorante' ? 'ristoranti' : 'attivita'
    const { data: entity } = await supabaseAdmin.from(table).select('id, name, slug, logo_url').eq('id', otherId).single()
    if (entity) result.push({ collegamento_id: link.id, tipo: otherTipo, ...entity })
  }
  return result
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const entity_id = searchParams.get('entity_id')
    if (!tipo || !entity_id) return Response.json({ error: 'tipo e entity_id obbligatori' }, { status: 400 })

    const { data: links, error } = await supabaseAdmin
      .from('collegamenti').select('*')
      .or(`and(from_tipo.eq.${tipo},from_id.eq.${entity_id}),and(to_tipo.eq.${tipo},to_id.eq.${entity_id})`)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const enriched = await enrichLinks(links || [], tipo, entity_id)
    return Response.json(enriched)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { from_tipo, from_id, to_tipo, to_id, azienda_id } = await request.json()
    if (!from_tipo || !from_id || !to_tipo || !to_id || !azienda_id)
      return Response.json({ error: 'Campi mancanti' }, { status: 400 })

    const allowedAziendaId = ['super_admin', 'admin', 'editor'].includes(profile.role) ? azienda_id : profile.azienda_id
    if (!allowedAziendaId) return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('collegamenti').insert({ azienda_id: allowedAziendaId, from_tipo, from_id, to_tipo, to_id })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
