import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'

// Elenca le immagini già caricate su Storage per un'entità, per riusarle nei
// blocchi (media library "sfoglia & riusa"). Scopato per entità (no IDOR).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    if (!entity_type || !entity_id) return Response.json({ error: 'entity_type e entity_id obbligatori' }, { status: 400 })

    const { response } = await requireEntityAccess(request, entity_type, entity_id)
    if (response) return response

    const prefix = `${entity_type}/${entity_id}`
    const { data, error } = await supabaseAdmin.storage.from('property-media')
      .list(prefix, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const IMG = /\.(jpe?g|png|webp|gif|avif)$/i
    const items = (data || [])
      .filter(f => f.name && IMG.test(f.name))
      .map(f => ({
        name: f.name,
        url: supabaseAdmin.storage.from('property-media').getPublicUrl(`${prefix}/${f.name}`).data.publicUrl,
      }))
    return Response.json(items)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
