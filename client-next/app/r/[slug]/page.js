import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getRistorante, getPagina } from '@/lib/guest-data'
import LandingRistorante from '@/components/guest/LandingRistorante'
import RestaurantApp from '@/components/guest/RestaurantApp'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) return { title: 'OltreNova' }

  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const mini = ristorante.minisito || {}
  const title = mini.seo_title || ristorante.name
  const description = mini.seo_description || ristorante.description || ''
  const image = ristorante.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}` : `https://www.oltrenova.com/r/${slug}`
  const enUrl = domain ? `https://${domain}/en` : `https://www.oltrenova.com/en/r/${slug}`
  const url = lang === 'en' ? enUrl : itUrl

  return {
    title,
    description,
    manifest: `/api/manifest/r/${slug}`,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: ristorante.name },
    icons: { apple: ristorante.logo_url || '/icons/apple-touch-icon.png' },
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function RistorantePage({ params, searchParams }) {
  const { slug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) notFound()

  const isQR = searchParams?.qr === '1'
  const showMinisito = !isQR && ristorante.minisito?.active
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'

  if (showMinisito) {
    const preview = searchParams?.preview === '1'
    const homePage = await getPagina('ristorante', ristorante.id, '__home__', preview)
    const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
    return (
      <>
        <LandingRistorante ristorante={ristorante} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} lang={lang} />
        <LanguageSwitcher lang={lang} />
      </>
    )
  }
  return <Suspense><RestaurantApp ristorante={ristorante} domain={searchParams?._domain || null} /></Suspense>
}
