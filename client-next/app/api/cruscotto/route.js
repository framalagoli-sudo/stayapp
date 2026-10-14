import { requireAuth, getProfile } from '@/lib/server-auth'
import { cruscotto, periodoAmmesso } from '@/lib/cruscotto'

// Il cruscotto della Dashboard: i numeri del titolare, per la SUA azienda. Il
// super_admin guarda quelli di un'azienda indicandola; lo staff no — gli
// incassi e i conti dell'attività non sono un permesso che abbia ricevuto.
// Risponde solo con conteggi e somme, mai con nomi o recapiti.
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let aziendaId
    if (profile.role === 'admin_azienda') aziendaId = profile.azienda_id
    else if (profile.role === 'super_admin') {
      const richiesta = searchParams.get('azienda_id')
      if (!richiesta || !UUID.test(richiesta)) return Response.json({ error: 'Azienda non indicata' }, { status: 400 })
      aziendaId = richiesta
    } else return Response.json({ error: 'Non consentito' }, { status: 403 })
    if (!aziendaId) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    return Response.json(await cruscotto(aziendaId, periodoAmmesso(searchParams.get('giorni'))))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
