import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { calcNextRun } from '@/lib/blog-scheduler'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json([])
    const { data, error } = await supabaseAdmin.from('blog_automazioni')
      .select('*').eq('azienda_id', azienda_id).order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const body = await request.json()
    const { entity_tipo, entity_id, entity_nome,
      frequenza = 'settimanale', ora_pubblicazione = 9,
      giorno_settimana = 1, giorno_mese = 1,
      argomenti = [], modalita = 'bozza', notifica_email } = body

    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    const next = calcNextRun(frequenza, ora_pubblicazione, giorno_settimana, giorno_mese)
    const { data, error } = await supabaseAdmin.from('blog_automazioni').insert({
      azienda_id, entity_tipo, entity_id, entity_nome: entity_nome || null,
      frequenza, ora_pubblicazione, giorno_settimana, giorno_mese,
      argomenti, modalita,
      notifica_email: notifica_email || null,
      next_run_at: next.toISOString(),
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
