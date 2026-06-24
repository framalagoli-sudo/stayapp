import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAttivita, getPagina } from '@/lib/guest-data'
import LandingAttivita from '@/components/guest/LandingAttivita'
import AttivitaPWA from '@/components/guest/AttivitaPWA'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) return { title: 'OltreNova' }

  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const mini = attivita.minisito || {}
  const title = mini.seo_title || attivita.name
  const description = mini.seo_description || attivita.description || ''
  const image = attivita.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}` : `https://www.oltrenova.com/a/${slug}`
  const enUrl = domain ? `https://${domain}/en` : `https://www.oltrenova.com/en/a/${slug}`
  const url = lang === 'en' ? enUrl : itUrl

  return {
    title,
    description,
    manifest: `/api/manifest/a/${slug}`,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: attivita.name },
    icons: { apple: attivita.logo_url || '/icons/apple-touch-icon.png' },
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function AttivitaPage({ params, searchParams }) {
  const { slug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) notFound()

  // QR + PWA attiva → app installabile; ogni altro caso → minisito (marketing).
  // Default ON (coerente con AttivitaModuliPage: pwa.active !== false).
  const isQR = searchParams?.qr === '1'
  const pwaActive = attivita.pwa?.active !== false
  if (isQR && pwaActive) {
    return <Suspense><AttivitaPWA attivita={attivita} domain={searchParams?._domain || null} /></Suspense>
  }

  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const preview = searchParams?.preview === '1'
  const homePage = await getPagina('attivita', attivita.id, '__home__', preview)
  const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
  return (
    <>
      <LandingAttivita attivita={attivita} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
