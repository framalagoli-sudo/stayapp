import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'

const PROMO_ALLOWED = ['nome', 'descrizione', 'data_inizio', 'data_fine',
  'ora_inizio', 'ora_fine', 'giorni_settimana', 'prezzo_speciale', 'badge_label', 'colore', 'attiva',
  // Il periodo dice QUANDO vale, `minimo_notti` da quanto dev'essere lungo, e
  // `prezzo_modo` se quel prezzo è di una giornata o di tutto il soggiorno.
  'prezzo_modo', 'minimo_notti']

// ⛔ `prezzo_modo` decide se il prezzo speciale è di una giornata o di tutto il
// soggiorno: su cinque giorni le due letture differiscono di cinque volte. È un
// valore che arriva dal client e finisce in un conto, quindi passa da un
// catalogo chiuso — e in mancanza torna al predefinito, mai a quello che è
// stato mandato. Il `CHECK` sulla tabella è il muro dietro a questo.
const MODI_PREZZO = ['giorno', 'periodo']
function ripulisci(payload) {
  if (payload.prezzo_modo !== undefined && !MODI_PREZZO.includes(payload.prezzo_modo))
    payload.prezzo_modo = 'giorno'
  if (payload.minimo_notti !== undefined) {
    const n = parseInt(payload.minimo_notti)
    payload.minimo_notti = Number.isFinite(n) && n > 0 ? n : null
  }
  return payload
}

// Autorizza l'accesso a una promozione tramite la risorsa che la possiede.
async function authorize(request, id) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }
  const { data: promo } = await supabaseAdmin.from('risorse_promozioni')
    .select('id, risorse(azienda_id)').eq('id', id).single()
  if (!promo) return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  if (profile.role !== 'super_admin' && promo.risorse?.azienda_id !== profile.azienda_id) {
    return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  }
  return { response: null }
}

export async function PATCH(request, props) {
  const params = await props.params;
  try {
    const { response } = await authorize(request, params.id)
    if (response) return response
    const body = await request.json()
    const payload = ripulisci(Object.fromEntries(Object.entries(body).filter(([k]) => PROMO_ALLOWED.includes(k))))
    const { data, error } = await supabaseAdmin.from('risorse_promozioni').update(payload).eq('id', params.id).select().single()
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
