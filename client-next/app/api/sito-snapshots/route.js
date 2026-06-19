import { requireEntityAccess } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { captureSnapshot } from '@/lib/site-snapshot'

export const dynamic = 'force-dynamic'

const MAX_MANUAL = 25 // retention: ultime N versioni manuali per entità

// GET /api/sito-snapshots?entity_tipo=&entity_id=  → lista versioni (senza i dati pesanti)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const entity_tipo = searchParams.get('entity_tipo')
  const entity_id = searchParams.get('entity_id')
  const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
  if (response) return response

  const { data, error } = await supabaseAdmin
    .from('site_snapshots')
    .select('id, label, kind, created_by, created_at')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST /api/sito-snapshots  { entity_tipo, entity_id, label }  → salva versione corrente
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { entity_tipo, entity_id, label } = body
  const { user, response } = await requireEntityAccess(request, entity_tipo, entity_id)
  if (response) return response

  const snap = await captureSnapshot(entity_tipo, entity_id)
  if (!snap) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

  const { data, error } = await supabaseAdmin.from('site_snapshots').insert({
    entity_tipo, entity_id, azienda_id: snap.azienda_id,
    label: (label || '').toString().slice(0, 120), kind: 'manual',
    created_by: user.email || user.id,
    entity_data: snap.entity_data, pagine_data: snap.pagine_data,
  }).select('id, label, kind, created_by, created_at').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Retention: elimina le versioni manuali oltre le ultime MAX_MANUAL.
  const { data: extra } = await supabaseAdmin
    .from('site_snapshots').select('id')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('kind', 'manual')
    .order('created_at', { ascending: false }).range(MAX_MANUAL, 999)
  if (extra && extra.length) {
    await supabaseAdmin.from('site_snapshots').delete().in('id', extra.map((e) => e.id))
  }

  return Response.json(data, { status: 201 })
}
