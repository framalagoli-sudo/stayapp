import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase-server'
import EventoPage from '@/components/guest/EventoPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'
import { oraLocale } from '@/lib/fuso'
import { trovaEvento } from '@/lib/evento-indirizzo'
import { buildEventoSchema } from '@/lib/evento-schema'
import { eventoConcluso } from '@/lib/evento-concluso'
import { permanentRedirect, notFound } from 'next/navigation'

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
const CAMPI = 'id, slug, title, description, cover_url, date_start, date_end, location, price, ' +
  'mostra_prezzo, seats_total, seats_booked, prenotazioni_chiuse, entity_id, entity_tipo, aziende(fuso_orario)'

function primeRighe(testo, max = 200) {
  const pulito = String(testo || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return pulito.length > max ? pulito.slice(0, max - 1).trimEnd() + '…' : pulito
}

export async function generateMetadata(props) {
  const { id } = await props.params
  const searchParams = await props.searchParams

  try {
    // `id` è l'indirizzo scritto nell'URL: lo slug parlante, oppure un id dei
    // link di prima. Risolve `trovaEvento`, che li conosce tutti e tre.
    const { evento: ev } = await trovaEvento(id, CAMPI)
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
    // ⚠️ Il canonical punta SEMPRE all'indirizzo parlante, anche a chi è
    // arrivato con un id: è il modo di dire ai motori «questa pagina è una
    // sola», invece di spargere il valore su due indirizzi diversi.
    const dominio = searchParams?._domain
    const prefissoLingua = searchParams?._lang === 'en' ? '/en' : ''
    const url = (dominio ? `https://${dominio}` : 'https://www.oltrenova.com')
      + `${prefissoLingua}/eventi/${ev.slug || ev.id}`

    // Il giorno nel fuso dell'azienda: sul server (UTC) un evento dopo
    // mezzanotte finiva sul giorno prima.
    const quando = oraLocale(ev.date_start, ev.aziende?.fuso_orario,
      { day: 'numeric', month: 'long', year: 'numeric', hour: undefined, minute: undefined })
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
  const { id } = await props.params
  const searchParams = await props.searchParams;
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'

  const { evento, indirizzoGiusto } = await trovaEvento(id, CAMPI)

  // ⛔ Un indirizzo che non esiste rispondeva **200**: la pagina si caricava
  // lo stesso e l'errore lo scriveva il browser. Per un motore di ricerca era
  // una pagina valida da indicizzare, e per chi arrivava da un link vecchio una
  // pagina bianca senza spiegazione. Un 404 dice la verità a tutti e due.
  if (!evento) notFound()

  // Chi è arrivato da un id o da un indirizzo di un tempo viene portato su
  // quello buono, una volta sola e per sempre (308). I link già pubblicati
  // continuano a funzionare: cambia solo cosa si legge nella barra.
  //
  // ⚠️ La query si porta dietro `back` e gli altri parametri veri, ma NON
  // `_domain` e `_lang`: quelli li mette il middleware per uso interno, e
  // finirebbero in bella vista nell'indirizzo del cliente. Il prefisso /en si
  // rimette nel percorso, che è dove il visitatore lo vede.
  if (indirizzoGiusto && indirizzoGiusto !== id) {
    const query = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams || {})) {
      if (k === '_domain' || k === '_lang') continue
      if (typeof v === 'string') query.set(k, v)
    }
    const coda = query.toString()
    permanentRedirect(`${lang === 'en' ? '/en' : ''}/eventi/${indirizzoGiusto}${coda ? `?${coda}` : ''}`)
  }

  let ente = null
  if (evento?.entity_id) {
    const { data } = await supabaseAdmin.from('entita').select('name').eq('id', evento.entity_id).maybeSingle()
    ente = data
  }
  // I dati strutturati li scrive il SERVER: chi legge i link non esegue
  // JavaScript, e la pagina dell'evento è codice di browser.
  const schema = evento ? buildEventoSchema({
    evento, nomeEntita: ente?.name,
    url: (searchParams?._domain ? `https://${searchParams._domain}` : 'https://www.oltrenova.com')
      + `${lang === 'en' ? '/en' : ''}/eventi/${evento.slug || evento.id}`,
    concluso: eventoConcluso(evento),
  }) : null

  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      {schema && (
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      )}
      <EventoPage />
      <LanguageSwitcher lang={lang} />
    </Suspense>
  )
}
