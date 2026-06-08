import { NextResponse } from 'next/server'

const STAYAPP_DOMAIN = process.env.NEXT_PUBLIC_STAYAPP_DOMAIN || 'oltrenova.com'
// Usa Railway direttamente per evitare il roundtrip Cloudflare → Railway (bloccato da edge)
const API_BASE = process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
  const { pathname } = request.nextUrl

  // Domini propri di OltreNova → routing normale
  if (isOwnDomain(hostname)) return NextResponse.next()

  // Domini custom → risolvi l'entità e fai rewrite trasparente
  try {
    const res = await fetch(
      `${API_BASE}/api/public/resolve-domain?d=${encodeURIComponent(hostname)}`,
      { next: { revalidate: 3600 } }  // cache 1 ora — il dominio non cambia spesso
    )
    if (!res.ok) return NextResponse.next()

    const data = await res.json()
    if (!data?.entity_tipo || !data?.entity_slug) return NextResponse.next()

    const { entity_tipo: tipo, entity_slug: slug } = data
    const prefix = tipo === 'struttura' ? 's' : tipo === 'ristorante' ? 'r' : 'a'

    // Rewrite trasparente: fondaconarni.com/qualsiasi-path → /s/slug/qualsiasi-path
    // L'URL nel browser rimane fondaconarni.com — il visitatore non vede niente
    const newPath = pathname === '/' ? `/${prefix}/${slug}` : `/${prefix}/${slug}${pathname}`
    const rewriteUrl = new URL(newPath, request.url)
    rewriteUrl.searchParams.set('_domain', hostname) // passa il dominio per og: tags

    return NextResponse.rewrite(rewriteUrl)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Escludi static files e api routes interne
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
}
