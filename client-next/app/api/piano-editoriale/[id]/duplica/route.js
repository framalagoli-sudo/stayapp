import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    const isSuperAdmin = profile?.role === 'super_admin'
    const azienda_id = isSuperAdmin ? ((await request.json().catch(() => ({}))).azienda_id || null) : profile?.azienda_id
    if (!isSuperAdmin && !azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    let origQ = supabaseAdmin.from('piano_editoriale').select('*').eq('id', params.id)
    if (azienda_id) origQ = origQ.eq('azienda_id', azienda_id)
    const { data: orig, error: origErr } = await origQ.single()
    if (origErr || !orig) return Response.json({ error: 'Post non trovato' }, { status: 404 })

    const { data: copy, error: copyErr } = await supabaseAdmin.from('piano_editoriale').insert({
      azienda_id: azienda_id || orig.azienda_id,
      titolo: orig.titolo ? `Copia — ${orig.titolo}` : '',
      testo: orig.testo || '', immagine_url: orig.immagine_url || '',
      canali: orig.canali || [], data_pianificata: null, stato: 'bozza',
      note: orig.note || '', labels: orig.labels || [], pillar: orig.pillar || '',
      design_url: orig.design_url || '', tipo_contenuto: orig.tipo_contenuto || 'post',
      ref_id: orig.ref_id || null, ref_tipo: orig.ref_tipo || null,
    }).select().single()
    if (copyErr) return Response.json({ error: copyErr.message }, { status: 500 })
    return Response.json(copy, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
