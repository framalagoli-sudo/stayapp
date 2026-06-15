import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { createDefaultSubdomain } from '@/lib/create-subdomain'

// Una tantum (super_admin): assicura il record sottodominio slug.oltrenova.com per
// ogni entità esistente. Idempotente — createDefaultSubdomain salta quelli già presenti.
export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Solo super admin' }, { status: 403 })

    const sources = [
      ['struttura',  'properties'],
      ['ristorante', 'ristoranti'],
      ['attivita',   'attivita'],
    ]
    const results = []
    for (const [entity_tipo, table] of sources) {
      const { data: entities } = await supabaseAdmin.from(table).select('id, slug, azienda_id').not('slug', 'is', null)
      for (const e of (entities || [])) {
        if (!e.slug) continue
        await createDefaultSubdomain({ azienda_id: e.azienda_id, entity_tipo, entity_id: e.id, entity_slug: e.slug })
        results.push({ dominio: `${e.slug}.oltrenova.com` })
      }
    }
    return Response.json({ synced: results.length, results })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
