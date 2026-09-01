import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase-server'
import EventoPage from '@/components/guest/EventoPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const dynamic = 'force-dynamic'

// Come si presenta questa pagina quando qualcuno la condivide — o ci manda
// sopra un'inserzione a pagamento.
//
// ⛔ Prima non c'era NIENTE qui, quindi valevano i metadata della piattaforma:
// una campagna verso l'evento di un cliente mostrava titolo «OltreNova»,
// descrizione «La piattaforma per il tuo business di servizi» e il nostro logo.
// Il cliente pagava per pubblicizzare noi. La pagina di un evento è la più
// condivisa che abbiamo — è fatta apposta per essere spinta sui social.
//
// ⚠️ Il resto della pagina è codice di browser (EventoPage fa la fetch da sé),
// ma `generateMetadata` gira sul server: l'anteprima si può costruire lo stesso,
// e chi legge i link non esegue JavaScript.
//
// Le colonne si elencano: questa risposta finisce nell'HTML pubblico.
const CAMPI = 'title, description, cover_url, date_start, location, entity_id, entity_tipo'

function primeRighe(testo, max = 200) {
  const pulito = String(testo || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return pulito.length > max ? pulito.slice(0, max - 1).trimEnd() + '…' : pulito
}

export async function generateMetadata(props) {
  const { id } = await props.params
  const searchParams = await props.searchParams

  try {
    const { data: ev } = await supabaseAdmin.from('eventi')
      .select(CAMPI).eq('id', id).eq('published', true).eq('active', true).maybeSingle()
    // Un evento non pubblicato non racconta niente di sé: nessuna anteprima da
    // costruire, e nemmeno un titolo che ne riveli l'esistenza.
    if (!ev) return { title: 'Evento' }

    let ente = null
    if (ev.entity_id) {
      const { data } = await supabaseAdmin.from('entita')
        .select('name, slug, cover_url, logo_url').eq('id', ev.entity_id).maybeSingle()
      ente = data
    }

    // ⚠️ `og:site_name` è quello che Facebook scrive sopra il titolo. Senza,
    // ci mette il DOMINIO in maiuscolo — e su un link oltrenova.com diventa
    // «OLTRENOVA.COM» sotto l'evento di un altro. Qui ci va il nome del cliente.
    const siteName = ente?.name || undefined

    // L'immagine è la locandina. Se l'evento non ce l'ha si ripiega sulla
    // copertina del sito e poi sul logo: un'anteprima con l'immagine sbagliata
    // è discutibile, una senza immagine non la guarda nessuno.
    const immagine = ev.cover_url || ente?.cover_url || ente?.logo_url || ''

    // Il dominio del cliente quando c'è: il middleware lo passa qui, e un link
    // pubblicitario deve portare il suo indirizzo, non il nostro.
    const dominio = searchParams?._domain
    const url = dominio
      ? `https://${dominio}/eventi/${id}`
      : `https://www.oltrenova.com/eventi/${id}`

    const quando = ev.date_start
      ? new Date(ev.date_start).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''
    const descrizione = primeRighe(ev.description)
      || [quando, ev.location].filter(Boolean).join(' · ')
      || undefined

    return {
      title: siteName ? `${ev.title} — ${siteName}` : ev.title,
      description: descrizione,
      alternates: { canonical: url },
      openGraph: {
        title: ev.title,
        description: descrizione,
        url,
        siteName,
        images: immagine ? [{ url: immagine }] : [],
        // Un evento ha una data: `article` la mostra, `website` no.
        type: 'article',
        locale: searchParams?._lang === 'en' ? 'en_US' : 'it_IT',
      },
      twitter: {
        card: immagine ? 'summary_large_image' : 'summary',
        title: ev.title, description: descrizione,
        images: immagine ? [immagine] : [],
      },
    }
  } catch {
    // Un'anteprima mancata non deve portarsi dietro la pagina.
    return { title: 'Evento' }
  }
}

export default async function Page(props) {
  const searchParams = await props.searchParams;
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <EventoPage />
      <LanguageSwitcher lang={lang} />
    </Suspense>
  )
}
