import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const attivita_id = searchParams.get('attivita_id')
    if (!attivita_id) return Response.json({ error: 'attivita_id obbligatorio' }, { status: 400 })

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const field = searchParams.get('field') === 'logo_dark_url' ? 'logo_dark_url' : 'logo_url'
    const result = await uploadToStorage(`attivita/${attivita_id}/${field}-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    await supabaseAdmin.from('attivita').update({ [field]: result.url }).eq('id', attivita_id)
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
