import { NextResponse } from 'next/server'

// .trim() obbligatorio: Vercel può iniettare un BOM (U+FEFF) in testa al valore,
// che fa fallire il confronto con l'hostname → il dominio proprio non viene riconosciuto.
const STAYAPP_DOMAIN = process.env.NEXT_PUBLIC_STAYAPP_DOMAIN?.trim() || 'oltrenova.com'
// NEXT_INTERNAL_API_URL o VERCEL_URL danno l'URL Vercel interno (bypassa Cloudflare proxy).
// VERCEL_URL è impostata automaticamente da Vercel per ogni deployment.
const API_BASE = process.env.NEXT_INTERNAL_API_URL?.trim()
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'http://localhost:3000'

function isOwnDomain(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('vercel.app') ||
    hostname.includes('.local') ||
    hostname === STAYAPP_DOMAIN ||
    hostname === `www.${STAYAPP_DOMAIN}`
  )
}

// Route pubbliche globali: esistono alla root, NON sotto un'entità. Sul dominio
// custom NON vanno prefissate con /prefix/slug (altrimenti /blog → /r/slug/blog → 404).
const GLOBAL_PUBLIC_PATHS = [
  '/blog', '/eventi', '/form', '/preventivo', '/recensione',
  '/cancella-prenotazione', '/confirm-subscription', '/unsubscribe', '/signup',
  // ⚠️ Senza queste due, sul dominio di un cliente `/robots.txt` diventava
  // `/r/slug/robots.txt` → 404, e i motori di ricerca non trovavano la sitemap.
  '/robots.txt', '/sitemap.xml',
]
function isGlobalPublicPath(pathname) {
  return GLOBAL_PUBLIC_PATHS.some(r => pathname === r || pathname.startsWith(r + '/'))
}

// ── Un sito, un indirizzo ────────────────────────────────────────────────────
//
// Lo stesso sito vive su tre indirizzi: il nostro percorso, il sottodominio e —
// quando il cliente ce l'ha — il suo dominio. Il `canonical` lo diceva già ai
// motori di ricerca, ma una persona che riceve un link vede comunque il nostro
// nome al posto del suo. Da qui in poi: **se un dominio c'è, si va lì.**
//
// ⚠️ Redirect **temporaneo (307)**, non permanente. Un 301 i browser lo tengono
// in cache per sempre: se domani quel dominio scade o il cliente se ne va,
// continuerebbero ad andare su un indirizzo morto e non potremmo più rimediare.
// La parte per i motori la fa il `canonical`, che punta già lì.
//
// ⚠️ Vale solo sui NOSTRI domini veri: in locale e nelle anteprime di Vercel si
// resta dove si è, altrimenti non si potrebbe più lavorare su una copia.
const PREFISSI = { s: 'struttura', r: 'ristorante', a: 'attivita' }

async function dominioUfficiale(request, query) {
  try {
    const r = await fetch(`${API_BASE}/api/public/dominio-ufficiale?${query}`, { next: { revalidate: 60 } })
    if (!r.ok) return null
    return (await r.json())?.dominio || null
  } catch { return null }   // un guasto qui lascia la pagina dov'è: non la rompe
}

async function versoIlDominioDelCliente(request, hostname, pathname, lang) {
  // Solo dal dominio della piattaforma, mai da localhost o dalle anteprime.
  if (hostname !== STAYAPP_DOMAIN && hostname !== `www.${STAYAPP_DOMAIN}`) return null

  const sito = pathname.match(/^\/(s|r|a)\/([^/?#]+)(\/.*)?$/)
  const evento = pathname.match(/^\/eventi\/([^/?#]+)$/)
  let dominio = null, resto = ''

  if (sito) {
    dominio = await dominioUfficiale(request, `tipo=${PREFISSI[sito[1]]}&slug=${encodeURIComponent(sito[2])}`)
    resto = sito[3] || '/'
  } else if (evento) {
    // L'evento sta alla radice, non sotto il sito: il percorso resta uguale.
    dominio = await dominioUfficiale(request, `evento=${encodeURIComponent(evento[1])}`)
    resto = pathname
  } else return null

  if (!dominio || dominio === hostname) return null

  const destinazione = new URL(`${lang === 'en' ? '/en' : ''}${resto}`, `https://${dominio}`)
  // La query originale si porta dietro tutto: `?qr=1` (l'app del QR), il token
  // di anteprima, le etichette delle campagne.
  destinazione.search = request.nextUrl.search
  return NextResponse.redirect(destinazione, 307)
}

export async function middleware(request) {
  const hostname = request.headers.get('host')?.split(':')[0] || ''
  let pathname = request.nextUrl.pathname

  // Lingua dal prefisso URL: IT = nessun prefisso, EN = /en/... .
  // Strippiamo /en e propaghiamo _lang=en come searchParam (le pagine lo leggono).
  let lang = null
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    lang = 'en'
    pathname = pathname.slice(3) || '/'  // rimuove '/en'
  }

  // Domini propri di OltreNova
  if (isOwnDomain(hostname)) {
    // Se questo sito ha un dominio suo, si va lì: un sito, un indirizzo.
    const verso = await versoIlDominioDelCliente(request, hostname, pathname, lang)
    if (verso) return verso
    if (!lang) return NextResponse.next()  // IT a root → routing normale
    const url = request.nextUrl.clone()
    url.pathname = pathname               // URL nel browser resta /en/... (SEO), serviamo la pagina IT-path
    url.searchParams.set('_lang', 'en')
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-stayapp-lang', 'en')  // il root layout lo legge per <html lang>
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Domini custom → risolvi l'entità e fai rewrite trasparente
  try {
    const res = await fetch(
      `${API_BASE}/api/public/resolve-domain?d=${encodeURIComponent(hostname)}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.next()

    const data = await res.json()

    // Indirizzo precedente di un'entità rinominata: redirect permanente al nuovo,
    // conservando path e query (QR stampati, link condivisi, risultati di ricerca).
    if (data?.redirect_a) {
      const destinazione = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${data.redirect_a}`)
      return NextResponse.redirect(destinazione, 308)
    }

    if (!data?.entity_tipo || !data?.entity_slug) return NextResponse.next()

    const { entity_tipo: tipo, entity_slug: slug } = data

    // Anche il sottodominio che diamo noi cede il passo al dominio del cliente:
    // altrimenti resterebbe in concorrenza proprio con l'indirizzo che deve
    // vincere. Chi è già sul dominio giusto non viene toccato (`!== hostname`).
    if (data.tipo === 'subdomain') {
      const proprio = await dominioUfficiale(request, `tipo=${tipo}&slug=${encodeURIComponent(slug)}`)
      if (proprio && proprio !== hostname) {
        const destinazione = new URL(`${lang === 'en' ? '/en' : ''}${pathname}`, `https://${proprio}`)
        destinazione.search = request.nextUrl.search
        return NextResponse.redirect(destinazione, 307)
      }
    }
    const prefix = tipo === 'struttura' ? 's' : tipo === 'ristorante' ? 'r' : 'a'

    // Rewrite trasparente: fondaconarni.com/qualsiasi-path → /{prefix}/{slug}/...
    // L'URL nel browser rimane fondaconarni.com — il visitatore non vede niente
    const entityPath = `/${prefix}/${slug}`
    let newPath
    if (isGlobalPublicPath(pathname)) {
      newPath = pathname  // /blog, /eventi… → route globale, niente prefisso entità
    } else if (pathname === '/' || pathname === '') {
      newPath = entityPath
    } else if (pathname.startsWith(entityPath)) {
      newPath = pathname  // già il path corretto (es. clic su ?qr=1 dal sito custom)
    } else {
      newPath = `${entityPath}${pathname}`  // sotto-pagina: /p/about → /r/slug/p/about
    }

    // Clona nextUrl per preservare tutti i query params originali (incluso ?qr=1)
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = newPath
    rewriteUrl.searchParams.set('_domain', hostname)
    if (lang) rewriteUrl.searchParams.set('_lang', 'en')

    const requestHeaders = new Headers(request.headers)
    if (lang) requestHeaders.set('x-stayapp-lang', 'en')  // il root layout lo legge per <html lang>
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Escludi le route /api (lavorano per slug: il rewrite del dominio custom le
    // storpierebbe → fetch client rotte) e gli static files.
    '/((?!api/|_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
}
