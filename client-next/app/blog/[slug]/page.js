import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getArticolo } from '@/lib/guest-data'
import { ambitoBlog, articoloNellAmbito, baseDelBlog } from '@/lib/blog-ambito'
import { contenutoArticoloPulito } from '@/lib/articolo-pubblico'
import { localizeEntity } from '@/lib/translate'
import ArticoloPage from '@/components/public/ArticoloPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug } = await params
  const art = await getArticolo(slug)
  if (!art) return { title: 'Articolo — OltreNova' }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  // ⛔ L'indirizzo era scritto a mano: l'articolo di un cliente, letto sul SUO
  // dominio, dichiarava ai motori di ricerca di stare da noi — il contenuto
  // veniva attribuito a OltreNova. Un sito, un indirizzo: vale anche qui.
  const base = baseDelBlog((await headers()).get('host'))
  const itUrl = `${base}/blog/${slug}`
  const enUrl = `${base}/en/blog/${slug}`
  const url = lang === 'en' ? enUrl : itUrl

  // Di chi e questo articolo. Senza, Facebook scrive il DOMINIO in maiuscolo
  // sopra il titolo: «OLTRENOVA.COM» sull'articolo di un cliente.
  let siteName
  if (art.entity_id) {
    const { data: ente } = await supabaseAdmin.from('entita')
      .select('name').eq('id', art.entity_id).maybeSingle()
    siteName = ente?.name || undefined
  }

  return {
    title: art.title || 'Articolo',
    description: art.excerpt || '',
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: {
      title: art.title,
      description: art.excerpt || '',
      url,
      siteName,
      images: art.cover_url ? [{ url: art.cover_url }] : [],
      type: 'article',
      locale: lang === 'en' ? 'en_US' : 'it_IT',
      publishedTime: art.published_at,
    },
    twitter: { card: 'summary_large_image', title: art.title, images: art.cover_url ? [art.cover_url] : [] },
  }
}

export default async function ArticoloRoute(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  // Il divieto vale anche sulla pagina, non solo sulla route che le serve i
  // dati: altrimenti resterebbe un indirizzo che risponde 200 e si fa indicizzare.
  const { slug } = await params
  const art = await getArticolo(slug)
  if (!articoloNellAmbito(art, await ambitoBlog((await headers()).get('host')))) notFound()
  // Il contenuto viene servito dal SERVER, già ripulito: prima l'articolo
  // arrivava dal browser e nell'HTML c'erano 4 parole — per un motore di
  // ricerca il pezzo non esisteva.
  const tradotto = lang === 'en' ? await localizeEntity(art, 'articolo', 'en') : art
  const iniziale = { ...tradotto, lingua: lang, contenutoHtml: contenutoArticoloPulito(tradotto.content) }

  return (
    <>
      <ArticoloPage iniziale={iniziale} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
