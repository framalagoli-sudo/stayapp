import { supabaseAdmin } from '@/lib/supabase-server'
import { getEntityAziendaId } from '@/lib/server-auth'
import { localizeEntity } from '@/lib/translate'

// Dati live: mai cachare (vedi nota in /api/guest/a/[slug]).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const entity_tipo = searchParams.get('entity_tipo')
  const entity_id = searchParams.get('entity_id')
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'it'

  let query = supabaseAdmin.from('eventi')
    .select('id, slug, title, description, cover_url, formato_cover, cover_focal, cta_label, cta_condizioni, mostra_prezzo, mostra_prezzo_pagina, prezzo_testo, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('published', true).eq('active', true)
    .gte('date_start', new Date().toISOString()).order('date_start')

  // `entity_tipo` finisce interpolato dentro la .or() qui sotto: va whitelistato
  // prima, come già si fa in /api/collegamenti (anti filter-injection).
  if (['struttura', 'ristorante', 'attivita'].includes(entity_tipo) && UUID_RE.test(entity_id || '')) {
    // Mostra gli eventi di questa entità + gli eventi "aziendali" (senza entità)
    // della stessa azienda: un evento aziendale compare sui siti di tutte le sue entità.
    const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
    if (aziendaId) {
      // `azienda_id` anche sul primo ramo: un evento di un'ALTRA azienda puntato
      // a questa entità non deve comparire qui (difesa in profondità — la scrittura
      // è già bloccata da `entitaDellaAzienda`, ma i record vecchi restano).
      query = query.or(`and(entity_tipo.eq.${entity_tipo},entity_id.eq.${entity_id},azienda_id.eq.${aziendaId}),and(entity_id.is.null,azienda_id.eq.${aziendaId})`)
    } else {
      query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    }
  }
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let out = data || []
  if (lang === 'en') out = await Promise.all(out.map(ev => localizeEntity(ev, 'evento', lang)))
  return Response.json(out)
}
