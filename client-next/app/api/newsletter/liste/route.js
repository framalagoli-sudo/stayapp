import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { listeNewsletter } from '@/lib/newsletter-destinatari'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Le liste fra cui scegliere a chi mandare una newsletter, con i loro numeri.
// Sempre dell'azienda di chi chiede: un `azienda_id` nell'indirizzo conta solo
// per il super_admin, che non ne ha una sua. Escono titoli e conteggi, mai
// nomi o indirizzi.
export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    const chiesta = new URL(request.url).searchParams.get('azienda_id')
    const aziendaId = profile.role === 'super_admin' ? (UUID.test(chiesta || '') ? chiesta : null) : profile.azienda_id
    if (!aziendaId) return Response.json({ tutti: { persone: 0, raggiungibili: 0 }, liste: [] })
    return Response.json(await listeNewsletter(aziendaId))
  } catch (e) { return Response.json({ error: 'Non siamo riusciti a leggere le liste. Riprova fra poco.' }, { status: 500 }) }
}
