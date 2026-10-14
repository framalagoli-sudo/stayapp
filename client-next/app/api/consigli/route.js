import { requireAuth, getProfile } from '@/lib/server-auth'
import { consigliPer } from '@/lib/consigli'

// «Cosa fare adesso»: i consigli che scattano dai dati dell'azienda. Al
// titolare solo quelli approvati; al super_admin anche le bozze, per vederle
// all'opera sui clienti veri prima di firmarle. Lo staff no.
export const dynamic = 'force-dynamic'

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
    if (!aziendaId) return Response.json({ consigli: [] })

    const consigli = await consigliPer(aziendaId, { bozze: profile.role === 'super_admin' })
    return Response.json({ consigli })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
