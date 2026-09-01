import { notFound } from 'next/navigation'
import { getRistorante, getElementoVetrina } from '@/lib/guest-data'
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

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug, itemSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) return { title: 'OltreNova' }
  const el = await getElementoVetrina('ristorante', ristorante.id, itemSlug)
  if (!el) return { title: ristorante.name }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const title = el.seo_title || `${el.titolo} — ${ristorante.name}`
  const description = el.seo_description || ristorante.minisito?.seo_description || ''
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = el.og_image_url || el.copertina_url || ristorante.cover_url || ristorante.logo_url || ''
  const domain = searchParams?._domain
  const itUrl = domain ? `https://${domain}/v/${itemSlug}` : `https://www.oltrenova.com/r/${slug}/v/${itemSlug}`
  const enUrl = domain ? `https://${domain}/en/v/${itemSlug}` : `https://www.oltrenova.com/en/r/${slug}/v/${itemSlug}`
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

export default async function RistoranteVetrinaDetail(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug, itemSlug } = await params
  const ristorante = await getRistorante(slug)
  if (!ristorante) notFound()
  const preview = searchParams?.preview || null // token firmato dall'editor
  const el = await getElementoVetrina('ristorante', ristorante.id, itemSlug, preview)
  if (!el) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = ristorante
  if (lang === 'en') entity = await localizeEntity(ristorante, 'ristorante', lang)
  return (
    <>
      <GuestSubPage entity={entity} entityType="ristorante" pagina={buildPagina(el)} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
