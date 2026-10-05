import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { unisciContatti } from '@/lib/contatti-cura'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Unisce due schede della stessa persona: quella nell'indirizzo resta, l'altra
// (`altro_id`) le passa tutto e sparisce. Vedi `lib/contatti-cura.js`.
//
// 🔒 Tutte e due devono essere dell'azienda di chi chiede, e si controlla PRIMA
// di toccare qualcosa: una scheda di un'altra azienda risulta «non trovata».
export async function POST(request, props) {
  const params = await props.params
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { altro_id } = await request.json()
    if (!UUID_RE.test(params.id) || !UUID_RE.test(altro_id || '') || altro_id === params.id)
      return Response.json({ error: 'Servono due schede diverse' }, { status: 400 })

    const { data: schede } = await supabaseAdmin.from('contatti').select('*').in('id', [params.id, altro_id])
    const principale = (schede || []).find(c => c.id === params.id), altro = (schede || []).find(c => c.id === altro_id)
    const sue = c => c && (profile.role === 'super_admin' || c.azienda_id === profile.azienda_id)
    if (!sue(principale) || !sue(altro) || principale.azienda_id !== altro.azienda_id)
      return Response.json({ error: 'Contatto non trovato' }, { status: 404 })

    await unisciContatti(principale, altro)
    const { data } = await supabaseAdmin.from('contatti').select('*').eq('id', params.id).single()
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
