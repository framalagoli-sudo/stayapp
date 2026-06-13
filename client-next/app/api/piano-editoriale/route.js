import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const ALLOWED_STATO = new Set(['bozza', 'pianificato', 'in_revisione', 'pubblicato'])

async function getProfileData(userId, searchParams, body) {
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id, full_name').eq('id', userId).single()
  if (!profile) return {}
  const isSuperAdmin = profile.role === 'super_admin'
  const azienda_id = isSuperAdmin
    ? (body?.azienda_id || searchParams?.get?.('azienda_id') || null)
    : (profile.azienda_id || null)
  return { ...profile, azienda_id, isSuperAdmin }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { azienda_id, isSuperAdmin } = await getProfileData(user.id, searchParams, null)
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    let q = supabaseAdmin.from('piano_editoriale').select('*')
      .order('data_pianificata', { ascending: true, nullsFirst: false })
    if (azienda_id) q = q.eq('azienda_id', azienda_id)

    if (searchParams.get('stato'))       q = q.eq('stato', searchParams.get('stato'))
    if (searchParams.get('campagna_id')) q = q.eq('campagna_id', searchParams.get('campagna_id'))
    if (searchParams.get('richiede_approvazione') === 'true') q = q.eq('richiede_approvazione', true)
    if (searchParams.get('label')) q = q.contains('labels', [String(searchParams.get('label')).toLowerCase().trim()])

    if (searchParams.get('senza_data')) {
      q = q.is('data_pianificata', null)
    } else if (searchParams.get('da') && searchParams.get('a')) {
      q = q.gte('data_pianificata', searchParams.get('da')).lte('data_pianificata', searchParams.get('a') + 'T23:59:59')
    } else if (searchParams.get('mese')) {
      const [year, month] = searchParams.get('mese').split('-')
      const from = `${year}-${month}-01`
      const to   = new Date(year, month, 1).toISOString().slice(0, 10)
      q = q.gte('data_pianificata', from).lt('data_pianificata', to)
    }

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    const { azienda_id, isSuperAdmin, full_name } = await getProfileData(user.id, null, body)
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })

    const { titolo, testo, immagine_url, canali, data_pianificata, stato, note, labels, pillar, design_url, tipo_contenuto, ref_id, ref_tipo, richiede_approvazione, campagna_id } = body
    const stato_safe = ALLOWED_STATO.has(stato) ? stato : 'bozza'
    const authorName = full_name || 'Utente'

    const sanitizeLabels = (arr) => (Array.isArray(arr) ? arr.map(l => String(l).trim().toLowerCase().replace(/[^a-z0-9_àèìòù-]/g, '').slice(0, 50)).filter(Boolean) : [])

    const { data, error } = await supabaseAdmin.from('piano_editoriale').insert({
      azienda_id, titolo: titolo || '', testo: testo || '', immagine_url: immagine_url || '',
      canali: Array.isArray(canali) ? canali : [], data_pianificata: data_pianificata || null,
      stato: stato_safe, note: note || '', labels: sanitizeLabels(labels),
      pillar: pillar || '', design_url: design_url || '', tipo_contenuto: tipo_contenuto || 'post',
      ref_id: ref_id || null, ref_tipo: ref_tipo || null,
      richiede_approvazione: richiede_approvazione === true,
      campagna_id: campagna_id || null,
      created_by: user.id, created_by_name: authorName,
      updated_by: user.id, updated_by_name: authorName,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
