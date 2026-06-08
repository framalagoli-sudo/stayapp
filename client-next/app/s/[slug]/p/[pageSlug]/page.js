import { notFound } from 'next/navigation'
import { serverFetch } from '@/lib/api'
import GuestSubPage from '@/components/guest/GuestSubPage'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const property = await serverFetch(`/api/guest/${slug}`)
  if (!property) return { title: 'OltreNova' }
  const pagina = await serverFetch(`/api/guest/pagina/struttura/${property.id}/${pageSlug}`).catch(() => null)
  if (!pagina) return { title: property.name }
  const title = pagina.seo_title || `${pagina.titolo} — ${property.name}`
  const description = pagina.seo_description || property.minisito?.seo_description || ''
  const image = pagina.og_image_url || property.cover_url || ''
  const url = searchParams?._domain ? `https://${searchParams._domain}/p/${pageSlug}` : `https://www.oltrenova.com/s/${slug}/p/${pageSlug}`
  return {
    title, description,
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
  }
}

export default async function StrutturaSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const property = await serverFetch(`/api/guest/${slug}`, { next: { revalidate: 60 } })
  if (!property) notFound()
  const pagina = await serverFetch(`/api/guest/pagina/struttura/${property.id}/${pageSlug}`, { next: { revalidate: 0 } }).catch(() => null)
  if (!pagina) notFound()
  return <GuestSubPage entity={property} entityType="struttura" pagina={pagina} domain={searchParams?._domain || null} />
}
