import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    let q = supabaseAdmin.from('properties').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.single()
    if (error || !data) return Response.json({ error: 'Struttura non trovata' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()

    const allowed = ['name', 'description', 'address', 'phone', 'whatsapp', 'email',
      'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time', 'rules', 'amenities',
      'modules', 'theme', 'logo_url', 'logo_dark_url', 'cover_url', 'services', 'gallery', 'restaurant',
      'activities', 'excursions', 'minisito', 'privacy_data', 'chatbot']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    if (body.slug !== undefined) {
      const clean = String(body.slug).toLowerCase().normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (!clean) return Response.json({ error: 'Slug non valido' }, { status: 400 })
      const { data: existing } = await supabaseAdmin.from('properties')
        .select('id').eq('slug', clean).neq('id', params.id).maybeSingle()
      if (existing) return Response.json({ error: "Questo URL è già in uso da un'altra struttura." }, { status: 409 })
      updates.slug = clean
    }
    if (Object.keys(updates).length === 0) return Response.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    let q = supabaseAdmin.from('properties').update(updates).eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile || !['super_admin', 'admin_gruppo'].includes(profile.role))
      return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })
    let q = supabaseAdmin.from('properties').delete().eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
