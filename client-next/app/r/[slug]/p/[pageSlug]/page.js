import { notFound } from 'next/navigation'
import { getRistorante, getPagina } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import GuestSubPage from '@/components/guest/GuestSubPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const maxDuration = 30

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug, pageSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) return { title: 'OltreNova' }
  const pagina = await getPagina('ristorante', ristorante.id, pageSlug)
  if (!pagina) return { title: ristorante.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = pagina.seo_title || `${pagina.titolo} — ${ristorante.name}`
  const description = pagina.seo_description || ristorante.minisito?.seo_description || ''
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = pagina.og_image_url || ristorante.cover_url || ristorante.logo_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/p/${pageSlug}` : `https://www.oltrenova.com/r/${slug}/p/${pageSlug}`
  const enUrl = domain ? `https://${domain}/en/p/${pageSlug}` : `https://www.oltrenova.com/en/r/${slug}/p/${pageSlug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title, description,
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    // Senza `siteName` Facebook scrive il DOMINIO in maiuscolo sopra il titolo:
    // su un link oltrenova.com diventa «OLTRENOVA.COM» sul sito di un cliente,
    // e in un'inserzione a pagamento e' il nostro nome al posto del suo.
    openGraph: { title, description, url, siteName: ristorante.name, images: image ? [{ url: image }] : [], type: 'website', locale: lang === 'en' ? 'en_US' : 'it_IT' },
  }
}

export default async function RistoranteSubPage(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug, pageSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) notFound()
  const preview = searchParams?.preview || null // token firmato dall'editor
  let pagina = await getPagina('ristorante', ristorante.id, pageSlug, preview)
  if (!pagina) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = ristorante
  if (lang === 'en') {
    entity = await localizeEntity(ristorante, 'ristorante', lang)
    pagina = await localizeEntity(pagina, 'pagina', lang)
  }
  return (
    <>
      <GuestSubPage entity={entity} entityType="ristorante" pagina={pagina} domain={searchParams?._domain || null} lang={lang} />
      {!pagina.hide_header && <LanguageSwitcher lang={lang} />}
    </>
  )
}
