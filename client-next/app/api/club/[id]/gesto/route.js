import { requireAuth, getProfile } from '@/lib/server-auth'
import { registraGesto } from '@/lib/club'

// Un cliente ha visto un contenuto del Club, o ne ha premuto il pulsante. Conta
// solo per il titolare e solo su contenuti che la sua azienda può vedere: chi
// guarda da super_admin non sporca i numeri della regia.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GESTI = ['visto', 'clic']

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const { id } = await params
    if (!UUID.test(id || '')) return Response.json({ error: 'Contenuto non valido' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    if (!GESTI.includes(body?.gesto)) return Response.json({ error: 'Gesto non valido' }, { status: 400 })

    if (profile?.role !== 'admin_azienda' || !profile.azienda_id) return Response.json({ ok: true, contato: false })
    const contato = await registraGesto(profile.azienda_id, id, body.gesto)
    return Response.json({ ok: true, contato })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
