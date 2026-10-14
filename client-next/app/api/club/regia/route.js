import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { contenutiRegia } from '@/lib/club'
import { contenutoPulito, prossimeOccasioni } from '@/lib/club-regole'

// La regia del Club: solo il super_admin (a chiunque altro, 404). Elenco dei
// contenuti con i conteggi, i mestieri tra cui scegliere, le occasioni in arrivo.
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const [contenuti, { data: mestieri, error }] = await Promise.all([
      contenutiRegia(),
      supabaseAdmin.from('profili_mestiere').select('chiave, nome').order('ordine'),
    ])
    if (error) throw new Error(error.message)
    return Response.json({ contenuti, mestieri: mestieri || [], occasioni: prossimeOccasioni() })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireSuperAdmin(request)
    if (response) return response
    const { contenuto, errore } = contenutoPulito(await request.json().catch(() => ({})))
    if (errore) return Response.json({ error: errore }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('club_contenuti')
      .insert({ ...contenuto, creato_da: user.id }).select('id').single()
    if (error) throw new Error(error.message)
    return Response.json({ id: data.id })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
