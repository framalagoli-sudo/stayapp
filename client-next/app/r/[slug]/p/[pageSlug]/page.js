import { notFound } from 'next/navigation'
import { getRistorante, getPagina } from '@/lib/guest-data'
import GuestSubPage from '@/components/guest/GuestSubPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) return { title: 'OltreNova' }
  const pagina = await getPagina('ristorante', ristorante.id, pageSlug)
  if (!pagina) return { title: ristorante.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = pagina.seo_title || `${pagina.titolo} — ${ristorante.name}`
  const description = pagina.seo_description || ristorante.minisito?.seo_description || ''
  const image = pagina.og_image_url || ristorante.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/p/${pageSlug}` : `https://www.oltrenova.com/r/${slug}/p/${pageSlug}`
  const enUrl = domain ? `https://${domain}/en/p/${pageSlug}` : `https://www.oltrenova.com/en/r/${slug}/p/${pageSlug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title, description,
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
  }
}

export default async function RistoranteSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) notFound()
  const preview = searchParams?.preview === '1'
  const pagina = await getPagina('ristorante', ristorante.id, pageSlug, preview)
  if (!pagina) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  return (
    <>
      <GuestSubPage entity={ristorante} entityType="ristorante" pagina={pagina} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
