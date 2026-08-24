import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const evento_id = searchParams.get('evento_id')
    if (!evento_id) return Response.json({ error: 'evento_id obbligatorio' }, { status: 400 })
    // Questa route SCRIVE la copertina sull'evento: dev'essere il proprio.
    const { response } = await requireRecordAccess(request, 'eventi', evento_id)
    if (response) return response

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const result = await uploadToStorage(`eventi/${evento_id}/cover-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    await supabaseAdmin.from('eventi').update({ cover_url: result.url, updated_at: new Date().toISOString() }).eq('id', evento_id)
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
