import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase-server'
import EventoPage from '@/components/guest/EventoPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'
import { oraLocale } from '@/lib/fuso'
import { trovaEvento } from '@/lib/evento-indirizzo'
import { buildEventoSchema } from '@/lib/evento-schema'
import { eventoConcluso } from '@/lib/evento-concluso'
import { permanentRedirect, notFound } from 'next/navigation'
import { fuoriDaiMotori, METADATA_NASCOSTA } from '@/lib/visibilita-motori'
import { hostUfficiale } from '@/lib/indirizzo-ufficiale'
import { datiEventoPubblico, CAMPI_EVENTO } from '@/lib/evento-pubblico'

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
// Le colonne sono quelle di `lib/evento-pubblico.js`: l'elenco era scritto due
// volte e questo era più corto, quindi la pagina avrebbe reso un evento a metà.
const CAMPI = CAMPI_EVENTO

function primeRighe(testo, max = 155) {   // 155: oltre, Google tronca la descrizione
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
        // `indicizzabile` e `minisito`: un evento di un sito che non vuole
        // farsi trovare non deve finire nei motori dalla porta di servizio —
        // la pagina dell'evento sta su un indirizzo globale, non sotto il sito.
        .select('name, slug, cover_url, logo_url, indicizzabile, minisito').eq('id', ev.entity_id).maybeSingle()
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
    // L'indirizzo ufficiale del sito a cui l'evento appartiene: il dominio del
    // cliente, o il suo sottodominio. Anche servendo da oltrenova.com, il
    // canonical deve puntare lì — l'evento è suo, non nostro.
    const dominio = (ev.entity_id ? await hostUfficiale(ev.entity_id) : null) || searchParams?._domain
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
      // ⚠️ L'evento di un sito nascosto resta fuori dai motori: l'indirizzo è
      // globale (`/eventi/…`), quindi il `noindex` del sito da solo non lo
      // coprirebbe. Un evento aziendale, che non ha entità, resta visibile.
      ...(ente && fuoriDaiMotori(ente, {}) && METADATA_NASCOSTA),
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
  let ospite = null
  if (evento?.entity_id) {
    const { data } = await supabaseAdmin.from('entita').select('name').eq('id', evento.entity_id).maybeSingle()
    ente = data
    // Nei dati strutturati l'indirizzo dell'evento è quello ufficiale del sito,
    // così Google vede lo stesso indirizzo che dichiara il canonical.
    ospite = await hostUfficiale(evento.entity_id)
  }
  if (!ospite) ospite = searchParams?._domain || null
  // I dati strutturati li scrive il SERVER: chi legge i link non esegue
  // JavaScript, e la pagina dell'evento è codice di browser.
  const schema = evento ? buildEventoSchema({
    evento, nomeEntita: ente?.name,
    url: (ospite ? `https://${ospite}` : 'https://www.oltrenova.com')
      + `${lang === 'en' ? '/en' : ''}/eventi/${evento.slug || evento.id}`,
    concluso: eventoConcluso(evento),
  }) : null

  const iniziale = await datiEventoPubblico(evento.id, lang, evento)

  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      {schema && (
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      )}
      {/* I dati arrivano dal SERVER: così titolo, testo e prezzo stanno
          nell'HTML. Prima la pagina li chiedeva dal browser e per un motore di
          ricerca era vuota — nessun H1, nessun testo. */}
      <EventoPage iniziale={iniziale} />
      <LanguageSwitcher lang={lang} />
    </Suspense>
  )
}
