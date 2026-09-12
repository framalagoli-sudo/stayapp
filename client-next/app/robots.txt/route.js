import { supabaseAdmin } from '@/lib/supabase-server'
import { ENTITY_TABLES } from '@/lib/server-auth'

// `/robots.txt` — dove dire ai motori di ricerca dove sta la sitemap.
//
// ⛔ Non esisteva: rispondeva 404 sia su oltrenova.com sia sui domini dei
// clienti. La sitemap per entità c'era già, ma l'unico modo di scoprirla era un
// `<link rel="sitemap">` che aggiunge JavaScript dopo il caricamento — e non è
// un canale che i motori usano. Risultato: sitemap scritta e mai letta.
//
// Il file cambia con il dominio: su quello di un cliente dichiara la SUA
// sitemap, che è l'unica che gli interessa.
//
// ⚠️ Niente `Disallow` sull'app dell'ospite: è `noindex`, e per leggere quel
// noindex il motore deve poterla scaricare. Bloccarla qui otterrebbe il
// contrario — un indirizzo noto, mai visitato e quindi mai escluso davvero.

export const dynamic = 'force-dynamic'

const PREFISSI = { struttura: 's', ristorante: 'r', attivita: 'a' }
const STAYAPP = (process.env.NEXT_PUBLIC_STAYAPP_DOMAIN ?? '').trim() || 'oltrenova.com'

function nostroDominio(host) {
  return !host || host === 'localhost' || host.startsWith('localhost:') || host.startsWith('127.0.0.1')
    || host.includes('vercel.app') || host === STAYAPP || host === `www.${STAYAPP}`
}

async function entitaDelDominio(host) {
  const dominio = host.split(':')[0].toLowerCase()
  const varianti = dominio.startsWith('www.') ? [dominio, dominio.slice(4)] : [dominio, `www.${dominio}`]
  const { data } = await supabaseAdmin.from('domini')
    .select('entity_tipo, entity_id').in('dominio', varianti).eq('stato', 'attivo').maybeSingle()
  if (!data?.entity_tipo) return null
  const tabella = ENTITY_TABLES[data.entity_tipo]
  if (!tabella) return null
  const { data: ent } = await supabaseAdmin.from(tabella)
    .select('slug').eq('id', data.entity_id).maybeSingle()
  return ent?.slug ? { tipo: data.entity_tipo, slug: ent.slug } : null
}

export async function GET(request) {
  const host = request.headers.get('host') || ''
  const righe = ['User-agent: *', 'Allow: /', 'Disallow: /admin']

  try {
    if (!nostroDominio(host)) {
      const ent = await entitaDelDominio(host)
      if (ent) righe.push('', `Sitemap: https://${host}/api/sitemap/${ent.tipo}/${ent.slug}`)
    }
    // Sul nostro dominio non si elencano le sitemap dei clienti: sarebbe
    // l'elenco pubblico di chi lavora con noi, e non lo decidiamo noi.
  } catch { /* un robots.txt senza sitemap è comunque meglio di un 404 */ }

  return new Response(righe.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
