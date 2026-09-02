import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function PATCH(request, props) {
  const params = await props.params;
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

    const body = await request.json()
    const allowed = ['pubblica', 'risposta', 'stelle', 'autore', 'testo', 'fonte']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()

    let q = supabaseAdmin.from('recensioni').update(updates).eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params;
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

    let q = supabaseAdmin.from('recensioni').delete().eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
