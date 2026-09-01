import { notFound } from 'next/navigation'
import { getRistorante, getOfferta } from '@/lib/guest-data'
import { localizeEntity } from '@/lib/translate'
import GuestSubPage from '@/components/guest/GuestSubPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const maxDuration = 30

// La pagina di un'offerta riusa l'impianto delle sotto-pagine: intestazione del
// sito, piede completo e dati legali arrivano da soli. Chi ci arriva da un
// social deve capire di chi è la pagina e poter proseguire — non finire in un
// vicolo cieco con un solo «indietro».
function costruisciPagina(offerta) {
  return {
    titolo: offerta.titolo,
    slug: `offerte/${offerta.id}`,
    hide_header: false,
    hide_footer: false,
    seo_title: '',
    seo_description: (offerta.descrizione || '').slice(0, 160),
    og_image_url: offerta.cover_url || '',
    blocks: [{ id: 'offerta-det', type: 'offerta_dettaglio', data: offerta }],
  }
}

export async function generateMetadata(props) {
  const { slug, id } = await props.params
  const entita = await getRistorante(slug)
  if (!entita) return { title: 'OltreNova' }
  const offerta = await getOfferta(entita.id, id)
  if (!offerta) return { title: entita.name }
  const title = `${offerta.titolo} — ${entita.name}`
  const description = (offerta.descrizione || '').slice(0, 160)
  // Meglio il logo che un'anteprima muta: senza immagine Facebook mostra un
  // rettangolo grigio che nessuno apre. Misurato il 01/09: 11 entita' su 15
  // non hanno una copertina.
  const image = offerta.cover_url || entita.cover_url || entita.logo_url || ''
    // Senza `siteName` Facebook scrive il DOMINIO in maiuscolo sopra il titolo:
    // su un link oltrenova.com diventa «OLTRENOVA.COM» sul sito di un cliente,
    // e in un'inserzione a pagamento e' il nostro nome al posto del suo.
  return { title, description, openGraph: { title, description, siteName: entita.name, images: image ? [{ url: image }] : [], type: 'website' } }
}

export default async function OffertaDetail(props) {
  const searchParams = await props.searchParams
  const { slug, id } = await props.params
  const entita = await getRistorante(slug)
  if (!entita) notFound()
  const offerta = await getOfferta(entita.id, id)
  if (!offerta) notFound()
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  let entity = entita
  if (lang === 'en') entity = await localizeEntity(entita, 'ristorante', lang)
  return (
    <>
      <GuestSubPage entity={entity} entityType="ristorante" pagina={costruisciPagina(offerta)} domain={searchParams?._domain || null} lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
