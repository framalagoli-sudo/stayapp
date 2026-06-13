import { supabaseAdmin } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 20).filter(id => UUID_RE.test(id))
  if (!ids.length) return Response.json([])
  const { data, error } = await supabaseAdmin.from('requests').select('id, type, room, status, created_at').in('id', ids)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}
