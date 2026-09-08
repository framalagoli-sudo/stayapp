import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

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

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('risorse_promozioni')
      .select('*, risorse(nome, azienda_id)')
      .order('created_at', { ascending: false })
    if (isUUID(searchParams.get('risorsa_id'))) query = query.eq('risorsa_id', searchParams.get('risorsa_id'))

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const filtered = profile.role === 'super_admin' ? data
      : data.filter(p => p.risorse?.azienda_id === profile.azienda_id)
    return Response.json(filtered)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const body = await request.json()
    if (!body.risorsa_id || !isUUID(body.risorsa_id))
      return Response.json({ error: 'risorsa_id obbligatorio' }, { status: 400 })
    const payload = ripulisci(Object.fromEntries(Object.entries(body).filter(([k]) => PROMO_ALLOWED.includes(k))))
    const { data, error } = await supabaseAdmin.from('risorse_promozioni')
      .insert({ ...payload, risorsa_id: body.risorsa_id }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
