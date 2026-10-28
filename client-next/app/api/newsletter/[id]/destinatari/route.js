import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { destinatariNewsletter, listaValida, escludiValida } from '@/lib/newsletter-destinatari'

// A quante persone arriverebbe questa newsletter se partisse adesso.
// Lo stesso conto dell'invio (`lib/newsletter-destinatari.js`): escono solo
// numeri e i nomi delle liste, mai gli indirizzi.
//
// Con `?anteprima=1` conta la scelta che c'è a schermo e non è ancora salvata
// (`lista=<chiave>`, `escludi=<chiave>` ripetuto): l'editor la usa per dire
// subito quanti restano togliendo una lista. Le chiavi passano dalle stesse
// funzioni del salvataggio, e le liste si cercano solo nell'azienda della
// newsletter: una chiave di un'altra azienda non trova niente.
export async function GET(request, props) {
  const params = await props.params
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('newsletters').select('id, azienda_id, tag_filter, lista, escludi').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: nl } = await q.maybeSingle()
    if (!nl) return Response.json({ error: 'Newsletter non trovata' }, { status: 404 })

    const sp = new URL(request.url).searchParams
    if (sp.get('anteprima') === '1') {
      nl.lista = listaValida(sp.get('lista') ? { chiave: sp.get('lista') } : null)
      nl.escludi = escludiValida(sp.getAll('escludi').map(chiave => ({ chiave })))
    }

    try {
      const { contatti, lista, esclusi } = await destinatariNewsletter(nl)
      return Response.json({ quanti: contatti.length, lista, esclusi })
    } catch (e) {
      // Una lista non esiste più: non è un guasto, è una cosa da dire a chi sta per inviare.
      return Response.json({ quanti: 0, lista: null, esclusi: null, problema: e.message })
    }
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
