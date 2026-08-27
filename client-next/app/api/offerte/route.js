import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId, entitaDellaAzienda } from '@/lib/server-auth'
import { impegnoValido, modoDedotto } from '@/lib/offerte-catalogo'
import { formatoValido, focalValido } from '@/lib/formati-foto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

// Cosa il pannello può scrivere. Fuori da qui restano le colonne che decide il
// sistema: `azienda_id` (dal profilo, non dal corpo), `posti_occupati` (lo muove
// chi prenota, e un cliente che se lo azzerasse rivenderebbe posti già venduti),
// `origine` e `origine_id` (dicono da dove è arrivata una riga migrata).
const AMMESSI = [
  'entity_id', 'impegno', 'titolo', 'descrizione', 'categoria',
  'cover_url', 'formato_cover', 'cover_focal', 'colore',
  'luogo', 'prezzo', 'valuta', 'mostra_prezzo', 'mostra_prezzo_pagina', 'prezzo_testo',
  'data_inizio', 'data_fine', 'durata_minuti', 'quantita', 'max_coperti',
  'posti_totali', 'disponibilita', 'chiusure', 'pacchetti',
  'cta_label', 'cta_condizioni', 'avvisa_titolare', 'conferma_ospite',
  'attiva', 'pubblicata', 'ordine',
]

// I valori che finiscono in un catalogo chiuso o in una proprietà CSS non si
// prendono mai come arrivano: si cercano fra quelli previsti e in mancanza
// tornano al predefinito.
function ripulisci(body) {
  const p = Object.fromEntries(Object.entries(body).filter(([k]) => AMMESSI.includes(k)))

  if ('impegno' in p) p.impegno = impegnoValido(p.impegno) || 'chiedi'
  if ('formato_cover' in p) p.formato_cover = formatoValido(p.formato_cover)
  if ('cover_focal' in p) p.cover_focal = focalValido(p.cover_focal)
  return p
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('offerte').select('*').order('ordine').order('data_inizio')

    // Le route usano la chiave di servizio e scavalcano la RLS: il recinto per
    // azienda lo mette questo controllo, non il database.
    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    if (isUUID(searchParams.get('entity_id'))) query = query.eq('entity_id', searchParams.get('entity_id'))

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
    if (!['super_admin', 'admin_azienda'].includes(profile.role))
      return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    const body = await request.json()
    if (!body.titolo?.trim()) return Response.json({ error: 'Serve un titolo' }, { status: 400 })

    const azienda_id = resolveAziendaId(profile, isUUID(body.azienda_id) ? body.azienda_id : null)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda valida associata al profilo.' }, { status: 400 })

    const payload = ripulisci(body)

    // ⚠️ `entity_id` arriva dal client: senza questo controllo si pubblicava una
    // propria offerta sul sito di un'altra azienda. `azienda_id` era protetto,
    // `entity_id` no — è già successo con gli eventi.
    // Il confronto è con l'azienda **scelta**, non col ruolo di chi scrive: così
    // vale anche per un super_admin che ha il selettore su un'altra azienda.
    if (payload.entity_id) {
      const { data: ent } = await supabaseAdmin.from('entita')
        .select('azienda_id').eq('id', payload.entity_id).maybeSingle()
      if (!ent || ent.azienda_id !== azienda_id)
        return Response.json({ error: 'Entità non valida' }, { status: 403 })
    }

    // Il prodotto che questa offerta amplifica. Arriva dal client come tutto il
    // resto: si verifica che appartenga alla stessa azienda, altrimenti si
    // metterebbe in offerta la roba di un altro cliente.
    let prodotto_id = null
    if (isUUID(body.prodotto_id)) {
      const { data: el } = await supabaseAdmin.from('vetrina_elementi')
        .select('id, entity_id').eq('id', body.prodotto_id).maybeSingle()
      const { data: suo } = el
        ? await supabaseAdmin.from('entita').select('azienda_id').eq('id', el.entity_id).maybeSingle()
        : { data: null }
      if (!el || suo?.azienda_id !== azienda_id)
        return Response.json({ error: 'Prodotto non valido' }, { status: 403 })
      prodotto_id = el.id
    }

    const { data, error } = await supabaseAdmin.from('offerte')
      .insert({ ...payload, azienda_id, prodotto_id, modo: modoDedotto(payload) })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
