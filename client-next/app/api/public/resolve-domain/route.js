import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const dominio = searchParams.get('d')?.trim().toLowerCase()
  if (!dominio) return Response.json({ error: 'Parametro d obbligatorio' }, { status: 400 })
  const variants = dominio.startsWith('www.') ? [dominio, dominio.slice(4)] : [dominio, `www.${dominio}`]
  const { data, error } = await supabaseAdmin.from('domini').select('entity_tipo, entity_id, entity_slug, tipo, stato')
    .in('dominio', variants).eq('stato', 'attivo').maybeSingle()
  if (error || !data) return Response.json({ error: 'Dominio non registrato' }, { status: 404 })
  return Response.json(data)
}
