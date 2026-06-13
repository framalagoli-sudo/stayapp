import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { entity_tipo, entity_id, autore } = await request.json()
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('recensioni').insert({
      azienda_id: profile.azienda_id, entity_tipo, entity_id,
      autore: autore?.trim() || '', stelle: 5, testo: '', fonte: 'form',
      verificata: false, pubblica: false,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const link = `${process.env.CLIENT_URL || 'https://oltrenova.com'}/recensione?token=${data.token}`
    return Response.json({ token: data.token, link }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
