import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getStruttura, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import LandingStruttura from '@/components/guest/LandingStruttura'
import GuestApp from '@/components/guest/GuestApp'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

// Copre la traduzione Haiku al primo caricamento EN (cache miss). Visite dopo = cache, istantanee.
export const maxDuration = 30

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug } = await params
  const property = await getStruttura(slug)
  if (!property) return { title: 'OltreNova' }

  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const mini = property.minisito || {}
  // L'app dell'ospite non è una pagina da motore di ricerca: è quello che si
  // apre inquadrando il QR in camera, e contiene la password del WiFi, gli
  // orari e le regole della casa. Senza questo, basta che un link finisca in
  // giro perché Google indicizzi la password di un cliente — misurato il
  // 25/08/2026 su una struttura vera. Il minisito, che è la pagina di
  // marketing, resta indicizzabile come prima.
  const mostraApp = searchParams?.qr === '1' || !mini.active
  const title = mini.seo_title || property.name
  const description = mini.seo_description || property.description || ''
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = property.cover_url || property.logo_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}` : `https://www.oltrenova.com/s/${slug}`
  const enUrl = domain ? `https://${domain}/en` : `https://www.oltrenova.com/en/s/${slug}`
  const url = lang === 'en' ? enUrl : itUrl

  return {
    title,
    description,
    ...(mostraApp && { robots: { index: false, follow: false } }),
    manifest: `/api/manifest/s/${slug}`,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: property.name },
    icons: { apple: property.logo_url || '/icons/apple-touch-icon.png' },
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: {
      title, description, url,
      // Senza `siteName` Facebook scrive il DOMINIO in maiuscolo sopra il titolo:
      // su un link oltrenova.com diventa «OLTRENOVA.COM» sul sito di un cliente,
      // e in un'inserzione a pagamento e' il nostro nome al posto del suo.
      siteName: property.name,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT',
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    ...(mini.google_site_verification && { verification: { google: mini.google_site_verification } }),
  }
}

export default async function StrutturaPage(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug } = await params
  let property = await getStruttura(slug)
  if (!property) notFound()

  const isQR = searchParams?.qr === '1'
  const showMinisito = !isQR && property.minisito?.active
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'

  // Le credenziali del WiFi si chiedono solo quando si rende davvero l'app
  // dell'ospite. Le sotto-pagine e il minisito non le ricevono nemmeno dal
  // database: prima arrivavano ovunque e venivano tolte dopo, che è una difesa
  // sola e facile da dimenticare al prossimo ramo che qualcuno aggiunge.
  if (!showMinisito) property = await getStruttura(slug, { ospite: true })

  if (showMinisito) {
    const preview = searchParams?.preview || null // token firmato dall'editor
    let homePage = await getPagina('struttura', property.id, '__home__', preview)
    let localized = property
    if (lang === 'en') {
      localized = await localizeEntity(property, 'struttura', lang)
      if (homePage) homePage = await localizeEntity(homePage, 'pagina', lang)
    }
    const initialHomeBlocks = homePage?.id && Array.isArray(homePage.blocks) && homePage.blocks.length ? homePage.blocks : null
    // Il minisito è la pagina marketing (anonima, indicizzata dai motori): non deve
    // spedire credenziali. Rimuovo i campi wifi (li usa solo la PWA-ospite, ramo sotto).
    const { wifi_password, wifi_name, ...safeProperty } = localized
    return (
      <>
        <LandingStruttura property={safeProperty} initialHomeBlocks={initialHomeBlocks} domain={searchParams?._domain || null} lang={lang} />
        <LanguageSwitcher lang={lang} />
      </>
    )
  }
  return <Suspense><GuestApp property={property} domain={searchParams?._domain || null} /></Suspense>
}
