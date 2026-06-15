import { notFound } from 'next/navigation'
import { getRistorante, getPagina } from '@/lib/guest-data'
import GuestSubPage from '@/components/guest/GuestSubPage'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) return { title: 'OltreNova' }
  const pagina = await getPagina('ristorante', ristorante.id, pageSlug)
  if (!pagina) return { title: ristorante.name }
  const title = pagina.seo_title || `${pagina.titolo} — ${ristorante.name}`
  const description = pagina.seo_description || ristorante.minisito?.seo_description || ''
  const image = pagina.og_image_url || ristorante.cover_url || ''
  const url = searchParams?._domain
    ? `https://${searchParams._domain}/p/${pageSlug}`
    : `https://www.oltrenova.com/r/${slug}/p/${pageSlug}`
  return {
    title, description,
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website' },
  }
}

export default async function RistoranteSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) notFound()
  const preview = searchParams?.preview === '1'
  const pagina = await getPagina('ristorante', ristorante.id, pageSlug, preview)
  if (!pagina) notFound()
  return <GuestSubPage entity={ristorante} entityType="ristorante" pagina={pagina} domain={searchParams?._domain || null} />
}
