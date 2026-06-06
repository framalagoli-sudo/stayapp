import { Suspense } from 'react'
import BlogListPage from '@/components/public/BlogListPage'

export const metadata = {
  title: 'Blog & News — OltreNova',
  description: 'Articoli, aggiornamenti e curiosità',
}

export const dynamic = 'force-dynamic'

export default function BlogPage() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <BlogListPage />
    </Suspense>
  )
}
