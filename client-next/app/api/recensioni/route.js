import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('recensioni').select('*').order('created_at', { ascending: false })
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    }
    if (searchParams.get('entity_tipo')) q = q.eq('entity_tipo', searchParams.get('entity_tipo'))
    if (searchParams.get('entity_id'))   q = q.eq('entity_id', searchParams.get('entity_id'))

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile?.azienda_id) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { entity_tipo, entity_id, autore, stelle, testo, fonte = 'manuale' } = await request.json()
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    if (!stelle) {
      const { data, error } = await supabaseAdmin.from('recensioni').insert({
        azienda_id: profile.azienda_id, entity_tipo, entity_id,
        autore: autore?.trim() || '', stelle: 5, testo: '', fonte: 'form',
        verificata: false, pubblica: false,
      }).select().single()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      const link = `${process.env.CLIENT_URL || 'https://oltrenova.com'}/recensione?token=${data.token}`
      return Response.json({ ...data, link }, { status: 201 })
    }

    if (stelle < 1 || stelle > 5) return Response.json({ error: 'stelle deve essere tra 1 e 5' }, { status: 400 })
    if (!autore?.trim()) return Response.json({ error: 'autore obbligatorio' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('recensioni').insert({
      azienda_id: profile.azienda_id, entity_tipo, entity_id,
      autore: autore.trim(), stelle: Number(stelle), testo: testo?.trim() || '',
      fonte, verificata: false, pubblica: true,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
