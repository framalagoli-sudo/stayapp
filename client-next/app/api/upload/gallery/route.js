import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('property_id').eq('id', user.id).single()
    if (!profile?.property_id) return Response.json({ error: 'Struttura non associata' }, { status: 403 })

    const result = await uploadToStorage(
      `${profile.property_id}/gallery-${Date.now()}.${parsed.ext}`,
      parsed.buffer, parsed.contentType
    )
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
