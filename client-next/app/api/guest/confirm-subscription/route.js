import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return Response.json({ error: 'Token mancante' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('contatti')
      .update({ iscritto_newsletter: true, confirmation_token: null, updated_at: new Date().toISOString() })
      .eq('confirmation_token', token).select('id').single()
    if (error || !data) return Response.json({ error: 'Token non valido o già usato' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
