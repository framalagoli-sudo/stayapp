import { notFound } from 'next/navigation'
import { getStruttura, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import GuestSubPage from '@/components/guest/GuestSubPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const maxDuration = 30

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug, pageSlug } = await params
  const property = await getStruttura(slug)
  if (!property) return { title: 'OltreNova' }
  const pagina = await getPagina('struttura', property.id, pageSlug)
  if (!pagina) return { title: property.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = pagina.seo_title || `${pagina.titolo} — ${property.name}`
  const description = pagina.seo_description || property.minisito?.seo_description || ''
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = pagina.og_image_url || property.cover_url || property.logo_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/p/${pageSlug}` : `https://www.oltrenova.com/s/${slug}/p/${pageSlug}`
  const enUrl = domain ? `https://${domain}/en/p/${pageSlug}` : `https://www.oltrenova.com/en/s/${slug}/p/${pageSlug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title, description,
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    // Senza `siteName` Facebook scrive il DOMINIO in maiuscolo sopra il titolo:
    // su un link oltrenova.com diventa «OLTRENOVA.COM» sul sito di un cliente,
    // e in un'inserzione a pagamento e' il nostro nome al posto del suo.
    openGraph: { title, description, url, siteName: property.name, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
  }
}

export default async function StrutturaSubPage(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug, pageSlug } = await params
  const property = await getStruttura(slug)
  if (!property) notFound()
  const preview = searchParams?.preview || null // token firmato dall'editor
  let pagina = await getPagina('struttura', property.id, pageSlug, preview)
  if (!pagina) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = property
  if (lang === 'en') {
    entity = await localizeEntity(property, 'struttura', lang)
    pagina = await localizeEntity(pagina, 'pagina', lang)
  }
  return (
    <>
      <GuestSubPage entity={entity} entityType="struttura" pagina={pagina} domain={searchParams?._domain || null} lang={lang} />
      {!pagina.hide_header && <LanguageSwitcher lang={lang} />}
    </>
  )
}
