import { supabaseAdmin } from './supabase-server'
import { ENTITY_TABLES } from './server-auth'

// Di chi sono gli articoli che si vedono a questo indirizzo.
//
// ⛔ 18/09/2026: non lo decideva nessuno. `/api/blog/public` senza filtri
// elenca gli articoli di **tutte** le aziende, e le pagine del blog non le
// passavano niente. Conseguenze misurate in produzione:
//   · `oltrenova.com/blog` pubblicava l'articolo di un cliente;
//   · `garage22terni.it/blog/<slug>` apriva l'articolo di un ALTRO cliente;
//   · ogni articolo dichiarava `canonical` su oltrenova.com, quindi il
//     contenuto di un cliente veniva attribuito a noi.
//
// L'ambito si decide **dall'indirizzo**, che è l'unica cosa di cui ci si può
// fidare: non da un parametro nell'URL, che chiunque può cambiare.

const STAYAPP = (process.env.NEXT_PUBLIC_STAYAPP_DOMAIN ?? '').trim() || 'oltrenova.com'

// Gli articoli di OltreNova stessa. Finché non esiste un'azienda nostra dentro
// la piattaforma, sul nostro dominio non si pubblica niente — meglio un blog
// vuoto che il blog di un altro.
const AZIENDA_OLTRENOVA = (process.env.OLTRENOVA_AZIENDA_ID ?? '').trim() || null

export function eNostroDominio(host) {
  const h = (host || '').split(':')[0].toLowerCase()
  return !h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')
    || h.includes('vercel.app') || h === STAYAPP || h === `www.${STAYAPP}`
}

// { tipo: 'piattaforma' | 'entita', azienda_id, entity_id, entity_tipo, slug }
export async function ambitoBlog(host) {
  if (eNostroDominio(host)) {
    return { tipo: 'piattaforma', azienda_id: AZIENDA_OLTRENOVA, entity_id: null }
  }

  const dominio = (host || '').split(':')[0].toLowerCase()
  const varianti = dominio.startsWith('www.') ? [dominio, dominio.slice(4)] : [dominio, `www.${dominio}`]
  const { data } = await supabaseAdmin.from('domini')
    .select('azienda_id, entity_tipo, entity_id').in('dominio', varianti).eq('stato', 'attivo').maybeSingle()
  if (!data?.entity_id) return { tipo: 'piattaforma', azienda_id: AZIENDA_OLTRENOVA, entity_id: null }

  const tabella = ENTITY_TABLES[data.entity_tipo]
  const { data: ent } = tabella
    ? await supabaseAdmin.from(tabella).select('slug').eq('id', data.entity_id).maybeSingle()
    : { data: null }

  return {
    tipo: 'entita',
    azienda_id: data.azienda_id,
    entity_id: data.entity_id,
    entity_tipo: data.entity_tipo,
    slug: ent?.slug || null,
  }
}

// L'articolo si può leggere a questo indirizzo? Un articolo dell'azienda senza
// entità (`entity_id` vuoto) vale per tutti i siti di quell'azienda.
export function articoloNellAmbito(articolo, ambito) {
  if (!articolo) return false
  if (ambito.tipo === 'piattaforma') {
    return !!ambito.azienda_id && articolo.azienda_id === ambito.azienda_id
  }
  if (articolo.azienda_id !== ambito.azienda_id) return false
  return !articolo.entity_id || articolo.entity_id === ambito.entity_id
}

// Gli articoli che si vedono a questo indirizzo, pronti per l'elenco. Stesso
// recinto della route: lo decide l'host, non un parametro.
export async function elencoArticoli(host, { lang = 'it', limite = 50 } = {}) {
  const ambito = await ambitoBlog(host)
  const colonne = 'id, title, slug, excerpt, cover_url, cover_focal, author, published_at, category_id, entity_tipo, entity_id'
  let q = supabaseAdmin.from('articoli').select(colonne)
    .eq('published', true).eq('active', true)
    .order('published_at', { ascending: false }).limit(limite)

  if (ambito.tipo === 'entita') {
    q = q.eq('azienda_id', ambito.azienda_id).or(`entity_id.eq.${ambito.entity_id},entity_id.is.null`)
  } else if (ambito.azienda_id) {
    q = q.eq('azienda_id', ambito.azienda_id)
  } else {
    return []   // nessuna azienda nostra: meglio un elenco vuoto che quello di un altro
  }

  const { data, error } = await q
  if (error || !data) return []
  if (lang !== 'en') return data
  // In inglese le schede si traducono qui, come faceva la route.
  const { localizeEntity } = await import('./translate')
  return Promise.all(data.map(async a => {
    const { content, ...resto } = await localizeEntity(a, 'articolo', 'en')
    return resto
  }))
}

// L'indirizzo con cui l'articolo si presenta ai motori di ricerca: quello del
// sito su cui sta, non il nostro. Un sito, un indirizzo.
export function baseDelBlog(host) {
  return eNostroDominio(host) ? `https://www.${STAYAPP}` : `https://${host}`
}
