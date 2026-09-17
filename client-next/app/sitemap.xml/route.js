import { supabaseAdmin } from '@/lib/supabase-server'
import { ENTITY_TABLES } from '@/lib/server-auth'

// `/sitemap.xml` — l'indirizzo che i motori provano per primo, anche quando
// nessuno gliel'ha detto.
//
// La sitemap vera è quella per entità (`/api/sitemap/<tipo>/<slug>`), che sa di
// pagine, vetrine ed eventi. Qui si porta chi arriva dall'indirizzo
// convenzionale: sul dominio di un cliente si va alla sua, sul nostro non c'è
// niente da elencare.

export const dynamic = 'force-dynamic'

const STAYAPP = (process.env.NEXT_PUBLIC_STAYAPP_DOMAIN ?? '').trim() || 'oltrenova.com'

export async function GET(request) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const nostro = !host || host === 'localhost' || host === '127.0.0.1'
    || host.includes('vercel.app') || host === STAYAPP || host === `www.${STAYAPP}`

  if (!nostro) {
    const varianti = host.startsWith('www.') ? [host, host.slice(4)] : [host, `www.${host}`]
    const { data } = await supabaseAdmin.from('domini')
      .select('entity_tipo, entity_id').in('dominio', varianti).eq('stato', 'attivo').maybeSingle()
    const tabella = data?.entity_tipo ? ENTITY_TABLES[data.entity_tipo] : null
    if (tabella) {
      const { data: ent } = await supabaseAdmin.from(tabella)
        .select('slug').eq('id', data.entity_id).maybeSingle()
      if (ent?.slug) {
        return Response.redirect(`https://${request.headers.get('host')}/api/sitemap/${data.entity_tipo}/${ent.slug}`, 308)
      }
    }
  }

  // Sul nostro dominio: le pagine di OltreNova.
  //
  // ⛔ Fino al 17/09/2026 qui usciva una sitemap **vuota**: i siti dei clienti
  // avevano la loro, il nostro no, e home e blog non erano elencati da nessuna
  // parte. Le sitemap dei clienti non si elencano qui — sarebbe la lista
  // pubblica di chi lavora con noi, e non sta a noi pubblicarla.
  //
  // ⚠️ Gli articoli non ci sono ancora: oggi `articoli` contiene solo contenuti
  // dei clienti. Quando OltreNova avrà i suoi, si aggiungono filtrando per la
  // nostra azienda — mai «tutti i pubblicati».
  if (nostro) {
    const base = `https://www.${STAYAPP}`
    const url = p => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`
    const pagine = ['', '/blog', '/termini', '/privacy', '/cancellazione-dati']
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + pagine.map(url).join('\n') + '\n</urlset>',
      { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    )
  }

  // Nessuna entità dietro questo indirizzo: una sitemap vuota è una risposta
  // onesta, un 500 no.
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  )
}
