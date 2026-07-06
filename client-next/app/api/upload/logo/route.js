import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const { data: profile } = await supabaseAdmin.from('profiles').select('property_id, role, azienda_id').eq('id', user.id).single()
    const propertyId = searchParams.get('property_id') || profile?.property_id
    if (!propertyId) return Response.json({ error: 'Struttura non associata al profilo' }, { status: 403 })

    if (searchParams.get('property_id') && profile?.role !== 'super_admin') {
      const { data: prop } = await supabaseAdmin.from('properties').select('azienda_id').eq('id', propertyId).single()
      if (!prop || prop.azienda_id !== profile?.azienda_id) return Response.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const field = searchParams.get('field') === 'logo_dark_url' ? 'logo_dark_url' : 'logo_url'
    const result = await uploadToStorage(`${propertyId}/${field}-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    await supabaseAdmin.from('properties').update({ [field]: result.url }).eq('id', propertyId)
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('property_id').eq('id', user.id).single()
    if (!profile?.property_id) return Response.json({ error: 'Struttura non associata' }, { status: 403 })
    const field = new URL(request.url).searchParams.get('field') === 'logo_dark_url' ? 'logo_dark_url' : 'logo_url'
    const { data: prop } = await supabaseAdmin.from('properties').select(field).eq('id', profile.property_id).single()
    if (prop?.[field]) {
      const idx = prop[field].indexOf('/property-media/')
      if (idx !== -1) await supabaseAdmin.storage.from('property-media').remove([prop[field].slice(idx + 16).split('?')[0]])
    }
    await supabaseAdmin.from('properties').update({ [field]: null }).eq('id', profile.property_id)
    return Response.json({ success: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
