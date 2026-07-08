import { notFound } from 'next/navigation'
import { getAttivita, getElementoVetrina } from '@/lib/guest-data'
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
  const attivita = await getAttivita(slug)
  if (!attivita) return { title: 'OltreNova' }
  const el = await getElementoVetrina('attivita', attivita.id, itemSlug)
  if (!el) return { title: attivita.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = el.seo_title || `${el.titolo} — ${attivita.name}`
  const description = el.seo_description || attivita.minisito?.seo_description || ''
  const image = el.og_image_url || el.copertina_url || attivita.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/v/${itemSlug}` : `https://www.oltrenova.com/a/${slug}/v/${itemSlug}`
  const enUrl = domain ? `https://${domain}/en/v/${itemSlug}` : `https://www.oltrenova.com/en/a/${slug}/v/${itemSlug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title, description,
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
  }
}

export default async function AttivitaVetrinaDetail({ params, searchParams }) {
  const { slug, itemSlug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) notFound()
  const preview = searchParams?.preview === '1'
  const el = await getElementoVetrina('attivita', attivita.id, itemSlug, preview)
  if (!el) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = attivita
  if (lang === 'en') entity = await localizeEntity(attivita, 'attivita', lang)
  return (
    <>
      <GuestSubPage entity={entity} entityType="attivita" pagina={buildPagina(el)} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
