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
  const attivita = await serverFetch(`/api/guest/a/${slug}`, { next: { revalidate: 60 } })
  if (!attivita) notFound()

  const preview = searchParams?.preview === '1'
  const homePage = await serverFetch(`/api/guest/pagina/attivita/${attivita.id}/__home__${preview ? '?preview=1' : ''}`, { next: { revalidate: 0 } }).catch(() => null)
  const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
  return <LandingAttivita attivita={attivita} initialHomeBlocks={initialHomeBlocks} />
}
