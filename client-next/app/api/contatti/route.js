import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'
import { sendWebhooks } from '@/lib/send-webhooks'

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('contatti').select('*').order('created_at', { ascending: false })

    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      q = q.eq('azienda_id', searchParams.get('azienda_id'))
    }
    if (searchParams.get('tag')) q = q.contains('tags', [searchParams.get('tag')])
    if (searchParams.get('newsletter') === 'true') q = q.eq('iscritto_newsletter', true)
    if (searchParams.get('search')) {
      const s = searchParams.get('search')
      q = q.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefono.ilike.%${s}%`)
    }
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
    const body = await request.json()
    const { nome, email, telefono, tags, note, iscritto_newsletter } = body
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id || !nome?.trim()) return Response.json({ error: 'azienda_id e nome obbligatori' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('contatti').insert({
      azienda_id, nome: nome.trim(),
      email: email?.trim() || null, telefono: telefono?.trim() || null,
      tags: tags || [], note: note || null,
      iscritto_newsletter: !!iscritto_newsletter, fonte: 'manuale',
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    sendWebhooks(data.azienda_id, 'nuovo_contatto', { contatto_id: data.id, nome: data.nome, email: data.email, telefono: data.telefono })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
