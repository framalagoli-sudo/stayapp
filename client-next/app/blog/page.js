import { Suspense } from 'react'
import { headers } from 'next/headers'
import BlogListPage from '@/components/public/BlogListPage'
import { elencoArticoli } from '@/lib/blog-ambito'

export const metadata = {
  alternates: { canonical: '/blog' },
  title: 'Blog & News — OltreNova',
  description: 'Articoli, aggiornamenti e curiosità',
}

export const dynamic = 'force-dynamic'

// ⛔ L'elenco degli articoli arrivava dal browser: nell'HTML c'erano 10 parole,
// e per un motore di ricerca questa pagina non elencava niente — nemmeno i link
// agli articoli, che è il modo in cui li trova. Ora la lista la prepara il
// server, come per ogni altra pagina pubblica.
export default async function BlogPage({ searchParams }) {
  const sp = await searchParams
  const lang = sp?._lang === 'en' ? 'en' : 'it'
  const articoli = await elencoArticoli((await headers()).get('host'), { lang })

  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <BlogListPage iniziali={articoli} lingua={lang} />
    </Suspense>
  )
}
