import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const nl = searchParams.get('nl')
    if (!token || token === 'TEST') return Response.json({ ok: true, test: true })
    const { data, error } = await supabaseAdmin.from('contatti')
      .update({ iscritto_newsletter: false, updated_at: new Date().toISOString() })
      .eq('unsubscribe_token', token).select('id').single()
    if (error || !data) return Response.json({ error: 'Token non valido' }, { status: 404 })
    if (nl) {
      const { data: nlData } = await supabaseAdmin.from('newsletters').select('unsubscribes_count').eq('id', nl).single()
      if (nlData) await supabaseAdmin.from('newsletters').update({ unsubscribes_count: (nlData.unsubscribes_count || 0) + 1 }).eq('id', nl)
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
