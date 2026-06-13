import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { Resend } from 'resend'

async function getCallerProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const caller = await getCallerProfile(user.id)
    if (!caller) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    const { searchParams } = new URL(request.url)

    if (caller.role === 'super_admin') {
      const filterAzienda = searchParams.get('azienda_id')
      if (filterAzienda) {
        const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role, full_name, azienda_id, permissions').eq('azienda_id', filterAzienda).eq('role', 'staff')
        if (!profiles?.length) return Response.json([])
        const ids = profiles.map(p => p.id)
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const authMap = Object.fromEntries((authData?.users || []).filter(u => ids.includes(u.id)).map(u => [u.id, u]))
        return Response.json(profiles.map(p => ({ id: p.id, role: p.role, full_name: p.full_name, azienda_id: p.azienda_id, permissions: p.permissions || {}, email: authMap[p.id]?.email || null, banned: !!authMap[p.id]?.banned_until, confirmed: !!authMap[p.id]?.email_confirmed_at, last_sign_in: authMap[p.id]?.last_sign_in_at || null, invited: !authMap[p.id]?.email_confirmed_at })))
      }
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (authErr) return Response.json({ error: authErr.message }, { status: 500 })
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role, full_name, azienda_id, property_id, permissions')
      const { data: aziende } = await supabaseAdmin.from('aziende').select('id, ragione_sociale')
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      const aziendaMap = Object.fromEntries((aziende || []).map(a => [a.id, a.ragione_sociale]))
      return Response.json(authData.users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at, banned: !!u.banned_until, confirmed: !!u.email_confirmed_at, last_sign_in: u.last_sign_in_at, ...profileMap[u.id], azienda_name: aziendaMap[profileMap[u.id]?.azienda_id] || null })))
    }

    if (caller.role === 'admin_azienda') {
      if (!caller.azienda_id) return Response.json([])
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role, full_name, azienda_id, permissions').eq('azienda_id', caller.azienda_id).eq('role', 'staff')
      if (!profiles?.length) return Response.json([])
      const ids = profiles.map(p => p.id)
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const authMap = Object.fromEntries((authData?.users || []).filter(u => ids.includes(u.id)).map(u => [u.id, u]))
      return Response.json(profiles.map(p => ({ id: p.id, role: p.role, full_name: p.full_name, azienda_id: p.azienda_id, permissions: p.permissions || {}, email: authMap[p.id]?.email || null, banned: !!authMap[p.id]?.banned_until, confirmed: !!authMap[p.id]?.email_confirmed_at, last_sign_in: authMap[p.id]?.last_sign_in_at || null, invited: !authMap[p.id]?.email_confirmed_at })))
    }
    return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const caller = await getCallerProfile(user.id)
    if (caller?.role !== 'super_admin') return Response.json({ error: 'Solo super_admin può eseguire questa operazione' }, { status: 403 })
    const { email, password, full_name, role = 'admin_azienda', azienda_id } = await request.json()
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    if (!password || password.length < 6) return Response.json({ error: 'Password minimo 6 caratteri' }, { status: 400 })
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true, user_metadata: { full_name } })
    if (authErr) return Response.json({ error: authErr.message }, { status: 400 })
    await new Promise(r => setTimeout(r, 600))
    await supabaseAdmin.from('profiles').update({ role, azienda_id: azienda_id || null, full_name }).eq('id', authData.user.id)
    return Response.json({ id: authData.user.id, email: authData.user.email, role, azienda_id, full_name, banned: false }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
