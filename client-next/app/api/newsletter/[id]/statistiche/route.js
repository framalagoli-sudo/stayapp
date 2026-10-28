import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { staffPuoLeggereContatti } from '@/lib/contatti-regole'
import { statisticheNewsletter } from '@/lib/newsletter-statistiche'

// Com'è andata una newsletter inviata: numeri, link premuti e — a chi può
// leggere i contatti — chi l'ha aperta e chi ha cliccato.
export async function GET(request, props) {
  const params = await props.params
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id, permissions').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('newsletters').select('id, azienda_id, recipients_count, unsubscribes_count').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: nl } = await q.maybeSingle()
    if (!nl) return Response.json({ error: 'Newsletter non trovata' }, { status: 404 })
    // Una bozza non ha righe: risponde coi numeri a zero, non con un errore.

    return Response.json(await statisticheNewsletter(nl, { conNomi: staffPuoLeggereContatti(profile) }))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
