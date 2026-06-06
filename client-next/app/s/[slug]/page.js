import { notFound } from 'next/navigation'
import { serverFetch } from '@/lib/api'
import LandingStruttura from '@/components/guest/LandingStruttura'
import GuestApp from '@/components/guest/GuestApp'

// Genera i meta tag lato server — Google e WhatsApp vedono questi tag nell'HTML grezzo
export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const property = await serverFetch(`/api/guest/${slug}`)
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
    openGraph: {
      title,
      description,
      url,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: 'website',
      locale: 'it_IT',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
    ...(mini.google_site_verification && {
      verification: { google: mini.google_site_verification },
    }),
  }
}

export default async function StrutturaPage({ params, searchParams }) {
  const { slug } = await params
  const property = await serverFetch(`/api/guest/${slug}`)
  if (!property) notFound()

  const isQR = searchParams?.qr === '1'
  const showMinisito = !isQR && property.minisito?.active

  if (showMinisito) {
    return <LandingStruttura property={property} />
  }
  return <GuestApp property={property} />
}
