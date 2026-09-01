import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAttivita, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import LandingAttivita from '@/components/guest/LandingAttivita'
import AttivitaPWA from '@/components/guest/AttivitaPWA'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

// Copre la traduzione Haiku al primo caricamento EN (cache miss). Visite dopo = cache, istantanee.
export const maxDuration = 30

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) return { title: 'OltreNova' }

  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const mini = attivita.minisito || {}
  const title = mini.seo_title || attivita.name
  const description = mini.seo_description || attivita.description || ''
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = attivita.cover_url || attivita.logo_url || ''
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
    // Senza `siteName` Facebook scrive il DOMINIO in maiuscolo sopra il titolo:
    // su un link oltrenova.com diventa «OLTRENOVA.COM» sul sito di un cliente,
    // e in un'inserzione a pagamento e' il nostro nome al posto del suo.
    openGraph: { title, description, url, siteName: attivita.name, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function AttivitaPage(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
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
  const preview = searchParams?.preview || null // token firmato dall'editor
  let homePage = await getPagina('attivita', attivita.id, '__home__', preview)
  let localized = attivita
  if (lang === 'en') {
    localized = await localizeEntity(attivita, 'attivita', lang)
    if (homePage) homePage = await localizeEntity(homePage, 'pagina', lang)
  }
  const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
  return (
    <>
      <LandingAttivita attivita={localized} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
