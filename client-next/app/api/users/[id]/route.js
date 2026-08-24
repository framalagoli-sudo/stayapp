import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
async function getCallerProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function PATCH(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const caller = await getCallerProfile(user.id)
    if (!['super_admin', 'admin_azienda'].includes(caller?.role)) return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })

    if (caller.role === 'admin_azienda') {
      const { data: target } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', params.id).single()
      if (target?.azienda_id !== caller.azienda_id || target?.role !== 'staff') return Response.json({ error: 'Non puoi modificare questo utente' }, { status: 403 })
    }

    const { role, azienda_id, full_name, banned, permissions } = await request.json()
    if (typeof banned === 'boolean') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(params.id, { ban_duration: banned ? '87600h' : 'none' })
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }
    const profileUpdates = {}
    if (role !== undefined && caller.role === 'super_admin') profileUpdates.role = role
    if (azienda_id !== undefined && caller.role === 'super_admin') profileUpdates.azienda_id = azienda_id || null
    if (full_name !== undefined) profileUpdates.full_name = full_name
    if (permissions !== undefined) profileUpdates.permissions = permissions
    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', params.id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    // Un super_admin vede TUTTE le aziende: è la chiave universale della
    // piattaforma, e per scelta ne esiste uno solo. Se ne compare un altro — per
    // errore o perché qualcuno è entrato nell'account che può crearli — va saputo
    // subito, non alla prossima verifica manuale.
    if (profileUpdates.role === 'super_admin') {
      const { data: promosso } = await supabaseAdmin.auth.admin.getUserById(params.id)
      await logError('ruolo/super-admin-creato',
        `${promosso?.user?.email || params.id} è stato promosso a super_admin da ${user.email || user.id}`,
        { alert: true })
    }

    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const caller = await getCallerProfile(user.id)
    if (!['super_admin', 'admin_azienda'].includes(caller?.role)) return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })
    if (caller.role === 'admin_azienda') {
      const { data: target } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', params.id).single()
      if (target?.azienda_id !== caller.azienda_id || target?.role !== 'staff') return Response.json({ error: 'Non puoi eliminare questo utente' }, { status: 403 })
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
