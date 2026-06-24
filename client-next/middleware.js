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
    if (!data?.entity_tipo || !data?.entity_slug) return NextResponse.next()

    const { entity_tipo: tipo, entity_slug: slug } = data
    const prefix = tipo === 'struttura' ? 's' : tipo === 'ristorante' ? 'r' : 'a'

    // Rewrite trasparente: fondaconarni.com/qualsiasi-path → /{prefix}/{slug}/...
    // L'URL nel browser rimane fondaconarni.com — il visitatore non vede niente
    const entityPath = `/${prefix}/${slug}`
    let newPath
    if (pathname === '/' || pathname === '') {
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
