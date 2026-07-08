import { notFound } from 'next/navigation'
import { getStruttura, getElementoVetrina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import GuestSubPage from '@/components/guest/GuestSubPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const maxDuration = 30

function buildPagina(elemento) {
  return {
    titolo: elemento.titolo,
    slug: `v/${elemento.slug}`,
    hide_header: false,
    hide_footer: false,
    seo_title: elemento.seo_title || '',
    seo_description: elemento.seo_description || '',
    og_image_url: elemento.og_image_url || elemento.copertina_url || '',
    blocks: [{ id: 'vetrina-det', type: 'vetrina_dettaglio', data: elemento }],
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { slug, itemSlug } = await params
  const property = await getStruttura(slug)
  if (!property) return { title: 'OltreNova' }
  const el = await getElementoVetrina('struttura', property.id, itemSlug)
  if (!el) return { title: property.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = el.seo_title || `${el.titolo} — ${property.name}`
  const description = el.seo_description || property.minisito?.seo_description || ''
  const image = el.og_image_url || el.copertina_url || property.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/v/${itemSlug}` : `https://www.oltrenova.com/s/${slug}/v/${itemSlug}`
  const enUrl = domain ? `https://${domain}/en/v/${itemSlug}` : `https://www.oltrenova.com/en/s/${slug}/v/${itemSlug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title, description,
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
  }
}

export default async function StrutturaVetrinaDetail({ params, searchParams }) {
  const { slug, itemSlug } = await params
  const property = await getStruttura(slug)
  if (!property) notFound()
  const preview = searchParams?.preview === '1'
  const el = await getElementoVetrina('struttura', property.id, itemSlug, preview)
  if (!el) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = property
  if (lang === 'en') entity = await localizeEntity(property, 'struttura', lang)
  return (
    <>
      <GuestSubPage entity={entity} entityType="struttura" pagina={buildPagina(el)} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
