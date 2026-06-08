import { notFound } from 'next/navigation'
import { serverFetch } from '@/lib/api'
import GuestSubPage from '@/components/guest/GuestSubPage'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const attivita = await serverFetch(`/api/guest/a/${slug}`)
  if (!attivita) return { title: 'OltreNova' }
  const pagina = await serverFetch(`/api/guest/pagina/attivita/${attivita.id}/${pageSlug}`).catch(() => null)
  if (!pagina) return { title: attivita.name }
  const title = pagina.seo_title || `${pagina.titolo} — ${attivita.name}`
  const description = pagina.seo_description || attivita.minisito?.seo_description || ''
  const image = pagina.og_image_url || attivita.cover_url || ''
  const url = searchParams?._domain ? `https://${searchParams._domain}/p/${pageSlug}` : `https://www.oltrenova.com/a/${slug}/p/${pageSlug}`
  return {
    title, description,
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
  }
}

export default async function AttivitaSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const attivita = await serverFetch(`/api/guest/a/${slug}`, { next: { revalidate: 60 } })
  if (!attivita) notFound()
  const pagina = await serverFetch(`/api/guest/pagina/attivita/${attivita.id}/${pageSlug}`, { next: { revalidate: 0 } }).catch(() => null)
  if (!pagina) notFound()
  return <GuestSubPage entity={attivita} entityType="attivita" pagina={pagina} domain={searchParams?._domain || null} />
}
