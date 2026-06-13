import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const ALLOWED_STATO = new Set(['bozza', 'pianificato', 'in_revisione', 'pubblicato'])

async function getProfileData(userId, body) {
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id, full_name').eq('id', userId).single()
  if (!profile) return {}
  const isSuperAdmin = profile.role === 'super_admin'
  const azienda_id = isSuperAdmin ? (body?.azienda_id || null) : (profile.azienda_id || null)
  return { ...profile, azienda_id, isSuperAdmin }
}

export async function GET(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { azienda_id, isSuperAdmin } = await getProfileData(user.id, null)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    let q = supabaseAdmin.from('piano_editoriale').select('*').eq('id', params.id)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { data, error } = await q.single()
    if (error) return Response.json({ error: 'Non trovato' }, { status: 404 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { azienda_id, isSuperAdmin, full_name } = await getProfileData(user.id, body)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const allowed = ['titolo', 'testo', 'immagine_url', 'canali', 'data_pianificata', 'stato', 'note', 'labels', 'pillar', 'design_url', 'tipo_contenuto', 'ref_id', 'ref_tipo', 'richiede_approvazione', 'campagna_id']
    const patch = { updated_at: new Date().toISOString(), updated_by: user.id, updated_by_name: full_name || 'Utente' }
    for (const k of allowed) if (k in body) patch[k] = body[k]
    if (patch.stato !== undefined && !ALLOWED_STATO.has(patch.stato)) delete patch.stato
    if (patch.labels !== undefined) {
      patch.labels = Array.isArray(patch.labels)
        ? patch.labels.map(l => String(l).trim().toLowerCase().replace(/[^a-z0-9_àèìòù-]/g, '').slice(0, 50)).filter(Boolean)
        : []
    }

    let q = supabaseAdmin.from('piano_editoriale').update(patch).eq('id', params.id)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { azienda_id, isSuperAdmin } = await getProfileData(user.id, null)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })
    let q = supabaseAdmin.from('piano_editoriale').delete().eq('id', params.id)
    if (azienda_id) q = q.eq('azienda_id', azienda_id)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
