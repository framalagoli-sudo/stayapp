import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { destinatariNewsletter } from '@/lib/newsletter-destinatari'

// A quante persone arriverebbe questa newsletter se partisse adesso.
// Lo stesso conto dell'invio (`lib/newsletter-destinatari.js`): escono solo
// numeri e il nome della lista, mai gli indirizzi.
export async function GET(request, props) {
  const params = await props.params
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('newsletters').select('id, azienda_id, tag_filter, lista').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: nl } = await q.maybeSingle()
    if (!nl) return Response.json({ error: 'Newsletter non trovata' }, { status: 404 })

    try {
      const { contatti, lista } = await destinatariNewsletter(nl)
      return Response.json({ quanti: contatti.length, lista })
    } catch (e) {
      // La lista non esiste più: non è un guasto, è una cosa da dire a chi sta per inviare.
      return Response.json({ quanti: 0, lista: null, problema: e.message })
    }
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
