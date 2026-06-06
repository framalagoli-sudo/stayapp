import BlogListPage from '@/components/public/BlogListPage'

export const metadata = {
  title: 'Blog & News — OltreNova',
  description: 'Articoli, aggiornamenti e curiosità',
}

export default function BlogPage() {
  return <BlogListPage />
}

export const dynamic = 'force-dynamic'
