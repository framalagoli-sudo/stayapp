import { requireEntityAccess } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { captureSnapshot, applySnapshot } from '@/lib/site-snapshot'

export const dynamic = 'force-dynamic'

// POST /api/sito-snapshots/[id]/restore → ripristina quella versione.
// Sicuro: prima salva un auto-snapshot dello stato corrente (annullabile).
export async function POST(request, { params }) {
  const { id } = await params

  const { data: snap } = await supabaseAdmin.from('site_snapshots').select('*').eq('id', id).single()
  if (!snap) return Response.json({ error: 'Versione non trovata' }, { status: 404 })

  const { user, response } = await requireEntityAccess(request, snap.entity_tipo, snap.entity_id)
  if (response) return response

  // 1. Auto-snapshot dello stato corrente, così il ripristino è a sua volta annullabile.
  try {
    const current = await captureSnapshot(snap.entity_tipo, snap.entity_id)
    if (current) {
      await supabaseAdmin.from('site_snapshots').insert({
        entity_tipo: snap.entity_tipo, entity_id: snap.entity_id, azienda_id: current.azienda_id,
        label: 'Prima del ripristino', kind: 'auto_pre_restore',
        created_by: user.email || user.id,
        entity_data: current.entity_data, pagine_data: current.pagine_data,
      })
    }
  } catch (e) {
    return Response.json({ error: 'Impossibile salvare il backup pre-ripristino: ' + e.message }, { status: 500 })
  }

  // 2. Applica lo snapshot scelto.
  try {
    await applySnapshot(snap.entity_tipo, snap.entity_id, snap.entity_data, snap.pagine_data)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
