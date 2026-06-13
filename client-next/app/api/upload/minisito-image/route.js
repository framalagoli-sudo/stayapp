import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    if (!entity_type || !entity_id) return Response.json({ error: 'entity_type e entity_id obbligatori' }, { status: 400 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role, property_id, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    if (entity_type === 'struttura') {
      const { data: prop } = await supabaseAdmin.from('properties').select('azienda_id').eq('id', entity_id).single()
      if (!prop || (profile.role !== 'super_admin' && prop.azienda_id !== profile.azienda_id && profile.property_id !== entity_id))
        return Response.json({ error: 'Accesso negato' }, { status: 403 })
    } else if (entity_type === 'ristorante') {
      const { data: rist } = await supabaseAdmin.from('ristoranti').select('azienda_id').eq('id', entity_id).single()
      if (!rist || (profile.role !== 'super_admin' && rist.azienda_id !== profile.azienda_id))
        return Response.json({ error: 'Accesso negato' }, { status: 403 })
    } else if (entity_type === 'attivita') {
      const { data: att } = await supabaseAdmin.from('attivita').select('azienda_id').eq('id', entity_id).single()
      if (!att || (profile.role !== 'super_admin' && att.azienda_id !== profile.azienda_id))
        return Response.json({ error: 'Accesso negato' }, { status: 403 })
    } else { return Response.json({ error: 'entity_type non valido' }, { status: 400 }) }

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const result = await uploadToStorage(`${entity_type}/${entity_id}/minisito-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
