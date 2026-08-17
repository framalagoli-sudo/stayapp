import { supabaseAdmin } from '@/lib/supabase-server'
import { ENTITY_TABLES } from '@/lib/server-auth'

// Traduce un dominio nell'entità da servire. Lo chiama il middleware ad ogni
// richiesta che arriva da un dominio non nostro.
//
// ⚠️ Lo slug si legge SEMPRE dall'entità, non dalla copia salvata in `domini`:
// il cliente può rinominare la sua pagina in qualsiasi momento e la copia resta
// indietro, mandando i visitatori su un indirizzo che non esiste più (404).
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const dominio = searchParams.get('d')?.trim().toLowerCase()
  if (!dominio) return Response.json({ error: 'Parametro d obbligatorio' }, { status: 400 })

  const variants = dominio.startsWith('www.') ? [dominio, dominio.slice(4)] : [dominio, `www.${dominio}`]
  const { data, error } = await supabaseAdmin.from('domini')
    .select('id, entity_tipo, entity_id, entity_slug, tipo, stato, redirect_a')
    .in('dominio', variants).eq('stato', 'attivo').maybeSingle()
  if (error || !data) return Response.json({ error: 'Dominio non registrato' }, { status: 404 })

  // Indirizzo precedente dopo una rinomina: si manda il visitatore su quello
  // nuovo invece di servirgli il sito, così i link vecchi non si spezzano e i
  // motori di ricerca aggiornano l'indirizzo indicizzato.
  if (data.tipo === 'alias' && data.redirect_a) {
    return Response.json(
      { redirect_a: data.redirect_a },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  }

  const table = ENTITY_TABLES[data.entity_tipo]
  const { data: entity } = table
    ? await supabaseAdmin.from(table).select('slug').eq('id', data.entity_id).maybeSingle()
    : { data: null }
  if (!entity?.slug) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

  // La copia si autoripara quando la troviamo disallineata.
  if (entity.slug !== data.entity_slug) {
    await supabaseAdmin.from('domini')
      .update({ entity_slug: entity.slug, updated_at: new Date().toISOString() })
      .eq('id', data.id)
  }

  return Response.json(
    { entity_tipo: data.entity_tipo, entity_id: data.entity_id, entity_slug: entity.slug, tipo: data.tipo },
    // La CDN assorbe le richieste ripetute: senza, ogni pagina vista su un dominio
    // custom costerebbe due query al database.
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
