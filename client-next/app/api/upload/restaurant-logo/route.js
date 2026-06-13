import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const ristorante_id = searchParams.get('ristorante_id')
    if (!ristorante_id) return Response.json({ error: 'ristorante_id obbligatorio' }, { status: 400 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      const { data: rist } = await supabaseAdmin.from('ristoranti').select('azienda_id').eq('id', ristorante_id).single()
      if (!rist || rist.azienda_id !== profile?.azienda_id) return Response.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const result = await uploadToStorage(`ristoranti/${ristorante_id}/logo_url-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    await supabaseAdmin.from('ristoranti').update({ logo_url: result.url }).eq('id', ristorante_id)
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
