import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getStruttura, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import LandingStruttura from '@/components/guest/LandingStruttura'
import GuestApp from '@/components/guest/GuestApp'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'
import { fuoriDaiMotori, METADATA_NASCOSTA } from '@/lib/visibilita-motori'
import { hostUfficiale } from '@/lib/indirizzo-ufficiale'

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
  // Chi resta fuori dai motori di ricerca lo decide `fuoriDaiMotori`, in un
  // posto solo: l'app del QR (che contiene la password del WiFi), un minisito
  // spento, o un cliente che ha deciso di non farsi ancora trovare.
  const title = mini.seo_title || property.name
  const description = mini.seo_description || property.description || ''
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = property.cover_url || property.logo_url || ''
  // L'indirizzo ufficiale del sito: il dominio del cliente, o il suo
  // sottodominio. Serve anche quando la pagina è servita da oltrenova.com,
  // altrimenti lo stesso sito si presenta a Google come tre siti gemelli.
  const domain = searchParams?._domain || await hostUfficiale(property.id)
  const itUrl = domain ? `https://${domain}` : `https://www.oltrenova.com/s/${slug}`
  const enUrl = domain ? `https://${domain}/en` : `https://www.oltrenova.com/en/s/${slug}`
  const url = lang === 'en' ? enUrl : itUrl

  return {
    title,
    description,
    ...(fuoriDaiMotori(property, searchParams) && METADATA_NASCOSTA),
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
