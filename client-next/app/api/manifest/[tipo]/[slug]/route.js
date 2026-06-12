import { serverFetch } from '@/lib/api'

export async function GET(request, { params }) {
  const { tipo, slug } = await params

  let entity = null
  try {
    if (tipo === 's') entity = await serverFetch(`/api/guest/${slug}`)
    else if (tipo === 'r') entity = await serverFetch(`/api/guest/r/${slug}`)
    else if (tipo === 'a') entity = await serverFetch(`/api/guest/a/${slug}`)
  } catch {}

  if (!entity) return new Response('Not found', { status: 404 })

  const primaryColor = entity.minisito?.primaryColor || '#00b5b5'
  const name = entity.name || 'OltreNova'
  const shortName = name.length > 14 ? name.substring(0, 14) : name
  const logoUrl = entity.logo_url || null

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: 'any', type: 'image/png', purpose: 'any' },
        { src: logoUrl, sizes: 'any', type: 'image/png', purpose: 'maskable' },
      ]
    : [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ]

  const manifest = {
    name,
    short_name: shortName,
    description: entity.description || '',
    start_url: `/${tipo}/${slug}?source=pwa`,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: primaryColor,
    background_color: '#ffffff',
    icons,
  }

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
