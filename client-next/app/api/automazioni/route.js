import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, entitaDellaAzienda, getEntityAziendaId } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

const VALID_TRIGGERS = ['nuova_prenotazione', 'nuovo_contatto', 'pre_visita', 'post_visita']

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('automazioni').select('*').order('created_at', { ascending: false })
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    }
    if (searchParams.get('entity_tipo')) q = q.eq('entity_tipo', searchParams.get('entity_tipo'))
    if (searchParams.get('entity_id'))   q = q.eq('entity_id', searchParams.get('entity_id'))

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    // Il super_admin non ha un'azienda propria: e' la sua condizione normale.
    // Con questa guardia scritta su `azienda_id` non riusciva a creare
    // nemmeno un'automazione sulle entita' che gestisce — e i modelli
    // «Comincia da qui» rispondevano «Accesso negato» proprio a chi
    // amministra la piattaforma.
    if (!profile) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { nome, entity_tipo, entity_id, trigger_evento, steps } = await request.json()
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })
    if (!trigger_evento) return Response.json({ error: 'trigger_evento obbligatorio' }, { status: 400 })
    if (!VALID_TRIGGERS.includes(trigger_evento)) return Response.json({ error: 'trigger_evento non valido' }, { status: 400 })
    // L'automazione scatta sugli eventi di un'entità: dev'essere la propria.
    if (!(await entitaDellaAzienda(profile, entity_tipo, entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }

    // L'azienda e' quella dell'ENTITA', non quella scritta nel profilo:
    // `entitaDellaAzienda` qui sopra ha gia' verificato che chi non e'
    // super_admin possa toccare solo le proprie, quindi per lui le due
    // coincidono — mentre per il super_admin la seconda non esiste.
    const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
    if (!aziendaId) return Response.json({ error: 'Entità non valida' }, { status: 404 })

    const { data, error } = await supabaseAdmin.from('automazioni').insert({
      azienda_id: aziendaId,
      nome: nome?.trim() || '', entity_tipo, entity_id, trigger_evento,
      attiva: true, steps: Array.isArray(steps) ? steps : [],
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
