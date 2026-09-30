import { requireAuth, getProfile } from '@/lib/server-auth'
import { primiPassi } from '@/lib/primi-passi'

// «Inizia qui»: i passi del titolare, per la SUA azienda. Il super_admin può
// guardare quelli di un'azienda indicandola; lo staff no (non sono suoi da
// completare). Risponde solo con esiti e nomi di campi, mai con i dati.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let aziendaId
    if (profile.role === 'admin_azienda') aziendaId = profile.azienda_id
    else if (profile.role === 'super_admin') {
      const richiesta = new URL(request.url).searchParams.get('azienda_id')
      if (!richiesta || !UUID.test(richiesta)) return Response.json({ error: 'Azienda non indicata' }, { status: 400 })
      aziendaId = richiesta
    } else return Response.json({ error: 'Non consentito' }, { status: 403 })
    if (!aziendaId) return Response.json({ entita: [], contatto: null })

    return Response.json(await primiPassi(aziendaId))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
