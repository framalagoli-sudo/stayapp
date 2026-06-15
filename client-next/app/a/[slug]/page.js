import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAttivita, getPagina } from '@/lib/guest-data'
import LandingAttivita from '@/components/guest/LandingAttivita'
import AttivitaPWA from '@/components/guest/AttivitaPWA'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) return { title: 'OltreNova' }

  const mini = attivita.minisito || {}
  const title = mini.seo_title || attivita.name
  const description = mini.seo_description || attivita.description || ''
  const image = attivita.cover_url || ''
  const url = searchParams?._domain
    ? `https://${searchParams._domain}`
    : `https://www.oltrenova.com/a/${slug}`

  return {
    title,
    description,
    manifest: `/api/manifest/a/${slug}`,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: attivita.name },
    icons: { apple: attivita.logo_url || '/icons/apple-touch-icon.png' },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function AttivitaPage({ params, searchParams }) {
  const { slug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) notFound()

  // QR + PWA attiva → app installabile; ogni altro caso → minisito (marketing).
  // Default ON (coerente con AttivitaModuliPage: pwa.active !== false).
  const isQR = searchParams?.qr === '1'
  const pwaActive = attivita.pwa?.active !== false
  if (isQR && pwaActive) {
    return <Suspense><AttivitaPWA attivita={attivita} domain={searchParams?._domain || null} /></Suspense>
  }

  const preview = searchParams?.preview === '1'
  const homePage = await getPagina('attivita', attivita.id, '__home__', preview)
  const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
  return <LandingAttivita attivita={attivita} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} />
}
