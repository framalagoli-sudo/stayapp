import { notFound } from 'next/navigation'
import { getStruttura, getPagina } from '@/lib/guest-data'
import GuestSubPage from '@/components/guest/GuestSubPage'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const property = await getStruttura(slug)
  if (!property) return { title: 'OltreNova' }
  const pagina = await getPagina('struttura', property.id, pageSlug)
  if (!pagina) return { title: property.name }
  const title = pagina.seo_title || `${pagina.titolo} — ${property.name}`
  const description = pagina.seo_description || property.minisito?.seo_description || ''
  const image = pagina.og_image_url || property.cover_url || ''
  const url = searchParams?._domain
    ? `https://${searchParams._domain}/p/${pageSlug}`
    : `https://www.oltrenova.com/s/${slug}/p/${pageSlug}`
  return {
    title, description,
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
  }
}

export default async function StrutturaSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const property = await getStruttura(slug)
  if (!property) notFound()
  const preview = searchParams?.preview === '1'
  const pagina = await getPagina('struttura', property.id, pageSlug, preview)
  if (!pagina) notFound()
  return <GuestSubPage entity={property} entityType="struttura" pagina={pagina} domain={searchParams?._domain || null} />
}
