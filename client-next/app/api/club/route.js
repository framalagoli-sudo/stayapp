import { requireAuth, getProfile } from '@/lib/server-auth'
import { clubPer } from '@/lib/club'

// Il Club visto da un cliente: «Oggi per te» e l'archivio. Il titolare legge
// quello della SUA azienda (i suoi mestieri); il super_admin può guardarlo con
// gli occhi di un'azienda indicandola, o senza: allora vede solo ciò che vale
// per tutti. Lo staff no, come per il cruscotto.
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let aziendaId = null
    if (profile.role === 'admin_azienda') {
      aziendaId = profile.azienda_id
      if (!aziendaId) return Response.json({ oggi: [], archivio: [] })
    } else if (profile.role === 'super_admin') {
      const richiesta = new URL(request.url).searchParams.get('azienda_id')
      if (richiesta && !UUID.test(richiesta)) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
      aziendaId = richiesta || null
    } else return Response.json({ error: 'Non consentito' }, { status: 403 })

    return Response.json(await clubPer(aziendaId))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
