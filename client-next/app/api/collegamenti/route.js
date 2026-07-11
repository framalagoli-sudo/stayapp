import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'

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
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const entity_id = searchParams.get('entity_id')
    if (!tipo || !entity_id) return Response.json({ error: 'tipo e entity_id obbligatori' }, { status: 400 })
    // Validazione anti filter-injection prima dell'interpolazione nella .or().
    if (!['struttura', 'ristorante', 'attivita'].includes(tipo) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entity_id))
      return Response.json({ error: 'tipo o entity_id non validi' }, { status: 400 })

    let linksQ = supabaseAdmin
      .from('collegamenti').select('*')
      .or(`and(from_tipo.eq.${tipo},from_id.eq.${entity_id}),and(to_tipo.eq.${tipo},to_id.eq.${entity_id})`)
    // Scope per azienda: un utente vede solo i collegamenti della propria azienda.
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      linksQ = linksQ.eq('azienda_id', profile.azienda_id)
    }
    const { data: links, error } = await linksQ
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const enriched = await enrichLinks(links || [], tipo, entity_id)
    return Response.json(enriched)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const { from_tipo, from_id, to_tipo, to_id } = body
    if (!from_tipo || !from_id || !to_tipo || !to_id)
      return Response.json({ error: 'Campi mancanti' }, { status: 400 })

    // Solo super_admin può specificare un'azienda diversa; gli altri sono vincolati alla propria.
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id) return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    // Verifica che entrambe le entità collegate appartengano a quell'azienda.
    const ENTITY_TABLES = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    for (const [tipo, id] of [[from_tipo, from_id], [to_tipo, to_id]]) {
      const table = ENTITY_TABLES[tipo]
      if (!table) return Response.json({ error: 'Tipo entità non valido' }, { status: 400 })
      const { data: ent } = await supabaseAdmin.from(table).select('azienda_id').eq('id', id).single()
      if (!ent || ent.azienda_id !== azienda_id) return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('collegamenti').insert({ azienda_id, from_tipo, from_id, to_tipo, to_id })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
