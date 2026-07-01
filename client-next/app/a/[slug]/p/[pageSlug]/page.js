import { notFound } from 'next/navigation'
import { getAttivita, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import GuestSubPage from '@/components/guest/GuestSubPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const maxDuration = 30

export async function generateMetadata({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) return { title: 'OltreNova' }
  const pagina = await getPagina('attivita', attivita.id, pageSlug)
  if (!pagina) return { title: attivita.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = pagina.seo_title || `${pagina.titolo} — ${attivita.name}`
  const description = pagina.seo_description || attivita.minisito?.seo_description || ''
  const image = pagina.og_image_url || attivita.cover_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/p/${pageSlug}` : `https://www.oltrenova.com/a/${slug}/p/${pageSlug}`
  const enUrl = domain ? `https://${domain}/en/p/${pageSlug}` : `https://www.oltrenova.com/en/a/${slug}/p/${pageSlug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title, description,
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: { title, description, url, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
  }
}

export default async function AttivitaSubPage({ params, searchParams }) {
  const { slug, pageSlug } = await params
  const attivita = await getAttivita(slug)
  if (!attivita) notFound()
  const preview = searchParams?.preview === '1'
  let pagina = await getPagina('attivita', attivita.id, pageSlug, preview)
  if (!pagina) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = attivita
  if (lang === 'en') {
    entity = await localizeEntity(attivita, 'attivita', lang)
    pagina = await localizeEntity(pagina, 'pagina', lang)
  }
  return (
    <>
      <GuestSubPage entity={entity} entityType="attivita" pagina={pagina} domain={searchParams?._domain || null} lang={lang} />
      {!pagina.hide_header && <LanguageSwitcher lang={lang} />}
    </>
  )
}
