import { requireAuth, getProfile } from '@/lib/server-auth'
import { manutenzioneDomini } from '@/lib/domini-manutenzione'

// Stessa passata del cron, lanciata a mano da super_admin. Con ?tutti=1 ricontrolla
// anche i domini già attivi — utile dopo un cambio di infrastruttura, quando quello
// che risulta "attivo" nel database potrebbe non esserlo più in rete.
export const maxDuration = 60

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Solo super admin' }, { status: 403 })

    const params = new URL(request.url).searchParams
    const tutti = params.get('tutti') === '1'
    const limite = Math.min(parseInt(params.get('limite') || '12', 10) || 12, 40)
    const esito = await manutenzioneDomini({ soloPendenti: !tutti, limite })
    return Response.json(esito)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
