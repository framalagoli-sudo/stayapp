import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { ricontrolla, riallineaSlug } from '@/lib/domini-manutenzione'

export const maxDuration = 30

// "Controlla adesso": guarda com'è messo il dominio in questo momento — DNS reali,
// registrazione, certificato — e salva l'esito. Il verdetto arriva già in lingua
// umana dentro verifica_dettaglio, così la pagina dice al cliente cosa manca.
export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('domini').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: dom } = await q.maybeSingle()
    if (!dom) return Response.json({ error: 'Dominio non trovato' }, { status: 404 })

    // Limite alto: mentre il cliente aspetta, la pagina ricontrolla da sola ogni
    // 45 secondi e non deve mai sbattere contro il limite.
    const { allowed } = await rateLimit(request, { name: 'domini-verify', limit: 200, windowSec: 3600 })
    if (!allowed) return tooManyRequests()

    await riallineaSlug(dom)
    const aggiornato = await ricontrolla(dom)
    return Response.json(aggiornato || dom)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
