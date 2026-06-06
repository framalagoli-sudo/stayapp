import { notFound } from 'next/navigation'
import { serverFetch } from '@/lib/api'
import LandingAttivita from '@/components/guest/LandingAttivita'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const attivita = await serverFetch(`/api/guest/a/${slug}`)
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
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function AttivitaPage({ params, searchParams }) {
  const { slug } = await params
  const attivita = await serverFetch(`/api/guest/a/${slug}`)
  if (!attivita) notFound()

  return <LandingAttivita attivita={attivita} />
}
