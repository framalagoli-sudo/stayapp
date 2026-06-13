import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const property_id = searchParams.get('property_id')
    const session_id  = searchParams.get('session_id')
    if (!property_id) return Response.json({ error: 'property_id richiesto' }, { status: 400 })

    if (session_id) {
      const { data, error } = await supabaseAdmin
        .from('messages').select('*')
        .eq('property_id', property_id).eq('session_id', session_id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return Response.json(data)
    }

    const { data, error } = await supabaseAdmin
      .from('messages').select('*')
      .eq('property_id', property_id)
      .order('created_at', { ascending: false })
    if (error) throw error

    const map = new Map()
    for (const msg of data) {
      if (!map.has(msg.session_id)) map.set(msg.session_id, { last: msg, unread: 0 })
      if (msg.sender === 'guest' && !msg.read_at) map.get(msg.session_id).unread++
    }
    const conversations = Array.from(map.values())
      .sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at))
    return Response.json(conversations)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { property_id, session_id, guest_name, sender, body } = await request.json()
    if (!property_id || !session_id || !sender || !body?.trim())
      return Response.json({ error: 'Campi mancanti' }, { status: 400 })
    if (!['guest', 'staff'].includes(sender))
      return Response.json({ error: 'sender non valido' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('messages').insert({ property_id, session_id, guest_name: guest_name || null, sender, body: body.trim() })
      .select().single()
    if (error) throw error
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
