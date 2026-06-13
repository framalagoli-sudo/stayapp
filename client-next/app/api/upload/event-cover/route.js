import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const evento_id = searchParams.get('evento_id')
    if (!evento_id) return Response.json({ error: 'evento_id obbligatorio' }, { status: 400 })

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const result = await uploadToStorage(`eventi/${evento_id}/cover-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    await supabaseAdmin.from('eventi').update({ cover_url: result.url, updated_at: new Date().toISOString() }).eq('id', evento_id)
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
