import { getArticolo } from '@/lib/guest-data'
import ArticoloPage from '@/components/public/ArticoloPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params
  const art = await getArticolo(slug)
  if (!art) return { title: 'Articolo — OltreNova' }
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  const itUrl = `https://www.oltrenova.com/blog/${slug}`
  const enUrl = `https://www.oltrenova.com/en/blog/${slug}`
  const url = lang === 'en' ? enUrl : itUrl
  return {
    title: art.title || 'Articolo',
    description: art.excerpt || '',
    alternates: { canonical: url, languages: { it: itUrl, en: enUrl, 'x-default': itUrl } },
    openGraph: {
      title: art.title,
      description: art.excerpt || '',
      url,
      images: art.cover_url ? [{ url: art.cover_url }] : [],
      type: 'article',
      locale: lang === 'en' ? 'en_US' : 'it_IT',
      publishedTime: art.published_at,
    },
    twitter: { card: 'summary_large_image', title: art.title, images: art.cover_url ? [art.cover_url] : [] },
  }
}

export default function ArticoloRoute({ searchParams }) {
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  return (
    <>
      <ArticoloPage />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
