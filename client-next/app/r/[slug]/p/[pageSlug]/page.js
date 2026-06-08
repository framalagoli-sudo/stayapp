import { notFound } from 'next/navigation'
import { serverFetch } from '@/lib/api'
import GuestSubPage from '@/components/guest/GuestSubPage'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const ristorante = await serverFetch(`/api/guest/r/${slug}`)
  if (!ristorante) return { title: 'OltreNova' }
  const pagina = await serverFetch(`/api/guest/pagina/ristorante/${ristorante.id}/${pageSlug}`).catch(() => null)
  if (!pagina) return { title: ristorante.name }
  const title = pagina.seo_title || `${pagina.titolo} — ${ristorante.name}`
  const description = pagina.seo_description || ristorante.minisito?.seo_description || ''
  const image = pagina.og_image_url || ristorante.cover_url || ''
  const url = searchParams?._domain ? `https://${searchParams._domain}/p/${pageSlug}` : `https://www.oltrenova.com/r/${slug}/p/${pageSlug}`
  return {
    title, description,
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
  }
}

export default async function RistoranteSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const ristorante = await serverFetch(`/api/guest/r/${slug}`, { next: { revalidate: 60 } })
  if (!ristorante) notFound()
  const pagina = await serverFetch(`/api/guest/pagina/ristorante/${ristorante.id}/${pageSlug}`, { next: { revalidate: 0 } }).catch(() => null)
  if (!pagina) notFound()
  return <GuestSubPage entity={ristorante} entityType="ristorante" pagina={pagina} domain={searchParams?._domain || null} />
}
