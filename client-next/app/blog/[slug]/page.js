import { supabaseAdmin } from '@/lib/supabase-server'
import { getArticolo } from '@/lib/guest-data'
import ArticoloPage from '@/components/public/ArticoloPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export async function generateMetadata(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { slug } = await params
  const art = await getArticolo(slug)
  if (!art) return { title: 'Articolo — OltreNova' }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const itUrl = `https://www.oltrenova.com/blog/${slug}`
  const enUrl = `https://www.oltrenova.com/en/blog/${slug}`
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
  return (
    <>
      <ArticoloPage />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
