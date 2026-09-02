import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, resolveAziendaId } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('webhooks').select('*').order('created_at', { ascending: false })
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      q = q.eq('azienda_id', searchParams.get('azienda_id'))
    }
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
    // Scritta su `azienda_id`, questa guardia lo fermava in cima e rendeva
    // irraggiungibile il ramo `role !== 'super_admin'` qui sotto — un ramo mai
    // raggiunto non da errore, da silenzio.
    if (!profile || (profile.role !== 'super_admin' && !profile.azienda_id))
      return Response.json({ error: 'Accesso negato' }, { status: 403 })
    const { nome, url, eventi, azienda_id } = await request.json()
    // Un webhook non appartiene a un'entita' ma a un'azienda: il super_admin
    // deve dire quale, perche' dal suo profilo non si deduce. `resolveAziendaId`
    // ignora il parametro per chi non e' super_admin — che resta sulla propria.
    const aziendaId = resolveAziendaId(profile, azienda_id)
    if (!aziendaId) return Response.json({ error: 'Indicare l’azienda' }, { status: 400 })
    if (!url?.trim()) return Response.json({ error: 'URL obbligatorio' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('webhooks').insert({
      azienda_id: aziendaId, nome: nome?.trim() || '', url: url.trim(),
      eventi: Array.isArray(eventi) ? eventi : [], attivo: true,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
