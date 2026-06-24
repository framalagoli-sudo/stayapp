import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getStruttura, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import LandingStruttura from '@/components/guest/LandingStruttura'
import GuestApp from '@/components/guest/GuestApp'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

// Copre la traduzione Haiku al primo caricamento EN (cache miss). Visite dopo = cache, istantanee.
export const maxDuration = 30

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const property = await getStruttura(slug)
  if (!property) return { title: 'OltreNova' }

  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const mini = property.minisito || {}
  const title = mini.seo_title || property.name
  const description = mini.seo_description || property.description || ''
  const image = property.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}` : `https://www.oltrenova.com/s/${slug}`
  const enUrl = domain ? `https://${domain}/en` : `https://www.oltrenova.com/en/s/${slug}`
  const url = lang === 'en' ? enUrl : itUrl

  return {
    title,
    description,
    manifest: `/api/manifest/s/${slug}`,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: property.name },
    icons: { apple: property.logo_url || '/icons/apple-touch-icon.png' },
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: {
      title, description, url,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT',
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function StrutturaPage({ params, searchParams }) {
  const { slug } = await params
  const property = await getStruttura(slug)
  if (!property) notFound()

  const isQR = searchParams?.qr === '1'
  const showMinisito = !isQR && property.minisito?.active
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'

  if (showMinisito) {
    const preview = searchParams?.preview === '1'
    let homePage = await getPagina('struttura', property.id, '__home__', preview)
    let localized = property
    if (lang === 'en') {
      localized = await localizeEntity(property, 'struttura', lang)
      if (homePage) homePage = await localizeEntity(homePage, 'pagina', lang)
    }
    const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
    return (
      <>
        <LandingStruttura property={localized} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} lang={lang} />
        <LanguageSwitcher lang={lang} />
      </>
    )
  }
  return <Suspense><GuestApp property={property} domain={searchParams?._domain || null} /></Suspense>
}
