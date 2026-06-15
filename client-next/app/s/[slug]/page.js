import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getStruttura, getPagina } from '@/lib/guest-data'
import LandingStruttura from '@/components/guest/LandingStruttura'
import GuestApp from '@/components/guest/GuestApp'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const property = await getStruttura(slug)
  if (!property) return { title: 'OltreNova' }

  const mini = property.minisito || {}
  const title = mini.seo_title || property.name
  const description = mini.seo_description || property.description || ''
  const image = property.cover_url || ''
  const url = searchParams?._domain
    ? `https://${searchParams._domain}`
    : `https://www.oltrenova.com/s/${slug}`

  return {
    title,
    description,
    manifest: `/api/manifest/s/${slug}`,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: property.name },
    icons: { apple: property.logo_url || '/icons/apple-touch-icon.png' },
    openGraph: {
      title, description, url,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: 'website', locale: 'it_IT',
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function StrutturaPage({ params, searchParams }) {
  const { slug } = await params
  const property = await getStruttura(slug)
  if (!property) notFound()

  const isQR = searchParams?.qr === '1'
  const showMinisito = !isQR && property.minisito?.active

  if (showMinisito) {
    const preview = searchParams?.preview === '1'
    const homePage = await getPagina('struttura', property.id, '__home__', preview)
    const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
    return <LandingStruttura property={property} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} />
  }
  return <Suspense><GuestApp property={property} domain={searchParams?._domain || null} /></Suspense>
}
