import { serverFetch } from '@/lib/api'
import ArticoloPage from '@/components/public/ArticoloPage'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const art = await serverFetch(`/api/blog/public/${slug}`)
  if (!art) return { title: 'Articolo — OltreNova' }
  return {
    title: art.title || 'Articolo',
    description: art.excerpt || '',
    openGraph: {
      title: art.title,
      description: art.excerpt || '',
      images: art.cover_url ? [{ url: art.cover_url }] : [],
      type: 'article',
      publishedTime: art.published_at,
    },
    twitter: { card: 'summary_large_image', title: art.title, images: art.cover_url ? [art.cover_url] : [] },
  }
}

export default function ArticoloRoute() {
  return <ArticoloPage />
}
