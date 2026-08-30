import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, resolveAziendaId, entitaDellaAzienda } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

const ALLOWED = ['nome', 'descrizione', 'modalita', 'entity_tipo', 'entity_id',
  'durata_minuti', 'quantita', 'max_coperti', 'prezzo', 'valuta', 'colore',
  'galleria', 'disponibilita', 'blocchi', 'anticipo_ore', 'cancellazione_ore', 'conferma_auto', 'attiva', 'visibile_minisito']

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('risorse').select('*').order('nome')
    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    if (searchParams.get('entity_tipo') && searchParams.get('entity_id')) {
      query = query.eq('entity_tipo', searchParams.get('entity_tipo')).eq('entity_id', searchParams.get('entity_id'))
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    let azienda_id = resolveAziendaId(profile, isUUID(body.azienda_id) ? body.azienda_id : null)

    // Un super_admin non ha un'azienda propria: `resolveAziendaId` gliela chiede
    // nel corpo, ma il pannello non la manda e ogni salvataggio finiva in
    // «Nessuna azienda valida». L'azienda si legge dall'entità su cui sta
    // creando — è il dato che ha davvero in mano, e non dipende da quale voce
    // sia selezionata nella barra in cima.
    // Vale solo per lui: per tutti gli altri `resolveAziendaId` ha già imposto
    // la propria azienda, e questo ramo non viene nemmeno raggiunto.
    if (!azienda_id && profile.role === 'super_admin' && isUUID(body.entity_id)) {
      const { data: ent } = await supabaseAdmin.from('entita')
        .select('azienda_id').eq('id', body.entity_id).maybeSingle()
      azienda_id = ent?.azienda_id || null
    }
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda valida' }, { status: 400 })
    if (!body.nome?.trim()) return Response.json({ error: 'Il nome è obbligatorio' }, { status: 400 })
    // Una risorsa appartiene sempre a un'entità: la colonna è NOT NULL. Senza
    // questo controllo l'errore che arrivava all'utente era il messaggio grezzo
    // del database — «null value in column entity_tipo» — che non dice a nessuno
    // cosa fare. `entitaDellaAzienda` più sotto lascia passare l'assenza,
    // perché per altri contenuti significa «vale per tutta l'azienda».
    if (!body.entity_id || !body.entity_tipo)
      return Response.json({ error: 'Scegli dove si prenota questa risorsa' }, { status: 400 })

    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    // L'entità dev'essere propria: altrimenti la risorsa finirebbe prenotabile
    // dal sito di un altro cliente, con le prenotazioni dirottate a noi.
    if (!(await entitaDellaAzienda(profile, payload.entity_tipo, payload.entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }
    const { data, error } = await supabaseAdmin.from('risorse').insert({ ...payload, azienda_id }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
