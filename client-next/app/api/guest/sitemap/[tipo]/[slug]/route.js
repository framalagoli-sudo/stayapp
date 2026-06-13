import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const { tipo, slug } = params
    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    const prefixMap = { struttura: 's', ristorante: 'r', attivita: 'a' }
    const table = tableMap[tipo]
    if (!table) return new Response('Tipo non valido', { status: 400 })

    const { data: entity } = await supabaseAdmin.from(table).select('id').eq('slug', slug).eq('active', true).single()
    if (!entity) return new Response('Entità non trovata', { status: 404 })

    const [{ data: pagine }, { data: dominio }] = await Promise.all([
      supabaseAdmin.from('pagine').select('slug, updated_at').eq('entity_tipo', tipo).eq('entity_id', entity.id)
        .eq('status', 'pubblicata').neq('slug', '__home__'),
      supabaseAdmin.from('domini').select('dominio').eq('entity_tipo', tipo).eq('entity_id', entity.id)
        .eq('stato', 'attivo').eq('tipo', 'custom').limit(1).maybeSingle(),
    ])

    const clientUrl = process.env.CLIENT_URL || 'https://www.oltrenova.com'
    const baseOrigin = dominio?.dominio ? `https://${dominio.dominio}` : clientUrl
    const base = `${baseOrigin}/${prefixMap[tipo]}/${slug}`
    const now = new Date().toISOString().split('T')[0]

    const urls = [
      `  <url><loc>${dominio?.dominio ? `https://${dominio.dominio}` : base}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      ...(pagine || []).map(p =>
        `  <url><loc>${base}/p/${p.slug}</loc><lastmod>${(p.updated_at || now).split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
      ),
    ]

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
    )
  } catch (e) { return new Response(e.message, { status: 500 }) }
}
