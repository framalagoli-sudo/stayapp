import { supabaseAdmin } from '@/lib/supabase-server'
import { fuoriDaiMotori } from '@/lib/visibilita-motori'
import { hostUfficiale } from '@/lib/indirizzo-ufficiale'

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { tipo, slug } = params
    const tableMap = { struttura: 'entita', ristorante: 'entita', attivita: 'entita' }
    const prefixMap = { struttura: 's', ristorante: 'r', attivita: 'a' }
    const table = tableMap[tipo]
    if (!table) return new Response('Tipo non valido', { status: 400 })

    const { data: entity } = await supabaseAdmin.from(table)
      .select('id, azienda_id, indicizzabile, minisito').eq('slug', slug).eq('active', true).single()
    if (!entity) return new Response('Entità non trovata', { status: 404 })

    // Un sito che ha scelto di non farsi trovare non dichiara niente: la
    // sitemap è un invito a indicizzare, e sarebbe il contrario di ciò che il
    // cliente ha chiesto. Si risponde con un elenco vuoto, non con un errore.
    if (fuoriDaiMotori(entity, {})) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>',
        { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
      )
    }

    const [{ data: pagine }, { data: elementi }, dominio, { data: eventi }, { data: articoli }] = await Promise.all([
      supabaseAdmin.from('pagine').select('slug, updated_at').eq('entity_tipo', tipo).eq('entity_id', entity.id)
        .eq('status', 'pubblicata').neq('slug', '__home__'),
      supabaseAdmin.from('vetrina_elementi').select('slug, updated_at').eq('entity_tipo', tipo).eq('entity_id', entity.id)
        .eq('status', 'pubblicata'),
      // ⚠️ La stessa funzione che decide il `canonical` delle pagine. Prima qui
      // si guardava solo il dominio `custom`, e un sito che ha solo il
      // sottodominio dichiarava nella sitemap un indirizzo diverso da quello
      // che la pagina stessa indica come originale: elencare un indirizzo e
      // poi dire «non è questo» è il modo più rapido per farsi ignorare.
      hostUfficiale(entity.id),
      // ⛔ Gli eventi non erano in nessuna sitemap: la pagina più condivisa che
      // abbiamo — quella che i clienti spingono a pagamento — non era dichiarata
      // da nessuna parte. Ci vanno **anche i conclusi**, perché il sito ora li
      // mostra e restano pagine valide con una data passata.
      supabaseAdmin.from('eventi').select('slug, id, date_start, updated_at')
        .eq('entity_tipo', tipo).eq('entity_id', entity.id)
        .eq('published', true).eq('active', true)
        .order('date_start', { ascending: false }).limit(200),
    ])

    const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://www.oltrenova.com'
    const baseOrigin = dominio ? `https://${dominio}` : clientUrl
    // ⚠️ Sul proprio indirizzo il sito sta alla radice: `/p/menu`, non
    // `/r/garage22/p/menu`. Il secondo risponde lo stesso — il middleware lo
    // riconosce — ed è proprio il problema: sarebbe un SECONDO indirizzo per
    // la stessa pagina, dichiarato da noi, mentre la pagina ne indica un altro.
    const base = dominio ? baseOrigin : `${baseOrigin}/${prefixMap[tipo]}/${slug}`
    const now = new Date().toISOString().split('T')[0]

    const urls = [
      `  <url><loc>${base}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      ...(pagine || []).map(p =>
        `  <url><loc>${base}/p/${p.slug}</loc><lastmod>${(p.updated_at || now).split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
      ),
      ...(elementi || []).map(el =>
        `  <url><loc>${base}/v/${el.slug}</loc><lastmod>${(el.updated_at || now).split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`
      ),
      // Gli eventi stanno alla radice del sito, non sotto /{prefix}/{slug}:
      // è il percorso che il middleware serve anche sui domini dei clienti.
      ...(eventi || []).map(ev =>
        `  <url><loc>${baseOrigin}/eventi/${ev.slug || ev.id}</loc><lastmod>${(ev.updated_at || now).split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
      // Anche gli articoli stanno alla radice del sito: /blog/<indirizzo>.
      ...(articoli || []).map(a =>
        `  <url><loc>${baseOrigin}/blog/${a.slug}</loc><lastmod>${(a.updated_at || a.published_at || now).split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
      ),
    ]

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
    )
  } catch (e) { return new Response(e.message, { status: 500 }) }
}
