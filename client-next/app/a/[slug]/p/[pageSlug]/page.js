import { notFound } from 'next/navigation'
import { getAttivita, getPagina } from '@/lib/guest-data'
import GuestSubPage from '@/components/guest/GuestSubPage'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) return { title: 'OltreNova' }
  const pagina = await getPagina('attivita', attivita.id, pageSlug)
  if (!pagina) return { title: attivita.name }
  const title = pagina.seo_title || `${pagina.titolo} — ${attivita.name}`
  const description = pagina.seo_description || attivita.minisito?.seo_description || ''
  const image = pagina.og_image_url || attivita.cover_url || ''
  const url = searchParams?._domain
    ? `https://${searchParams._domain}/p/${pageSlug}`
    : `https://www.oltrenova.com/a/${slug}/p/${pageSlug}`
  return {
    title, description,
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
  }
}

export default async function AttivitaSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) notFound()
  const preview = searchParams?.preview === '1'
  const pagina = await getPagina('attivita', attivita.id, pageSlug, preview)
  if (!pagina) notFound()
  return <GuestSubPage entity={attivita} entityType="attivita" pagina={pagina} domain={searchParams?._domain || null} />
}
