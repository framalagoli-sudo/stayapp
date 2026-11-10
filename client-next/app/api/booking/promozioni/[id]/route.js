import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { datiOffertaPuliti } from '@/lib/offerte-risorsa'

// Autorizza l'accesso a una promozione tramite la risorsa che la possiede, e la
// restituisce intera: la modifica si controlla sul risultato completo, non sui
// soli campi che arrivano (un cambio di tipo senza il valore nuovo
// lascerebbe un'offerta che non si può calcolare).
async function authorize(request, id) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }
  const { data: promo } = await supabaseAdmin.from('risorse_promozioni')
    .select('*, risorse(azienda_id, modalita)').eq('id', id).single()
  if (!promo) return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  if (profile.role !== 'super_admin' && promo.risorse?.azienda_id !== profile.azienda_id) {
    return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  }
  return { response: null, promo }
}

export async function PATCH(request, props) {
  const params = await props.params;
  try {
    const { response, promo } = await authorize(request, params.id)
    if (response) return response
    const body = await request.json()
    const { risorse, id, risorsa_id, created_at, ...salvata } = promo
    const { dati, errore } = datiOffertaPuliti({ ...salvata, ...body }, risorse)
    if (errore) return Response.json({ error: errore }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('risorse_promozioni').update(dati).eq('id', params.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, props) {
  const params = await props.params;
  try {
    const { response } = await authorize(request, params.id)
    if (response) return response
    const { error } = await supabaseAdmin.from('risorse_promozioni').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
