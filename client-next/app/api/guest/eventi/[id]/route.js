import { supabaseAdmin } from '@/lib/supabase-server'
import { localizeEntity } from '@/lib/translate'
import { getAziendaLegale } from '@/lib/guest-data'

// Copre la traduzione Haiku dell'evento al primo caricamento EN (cache miss).
export const maxDuration = 30

// Le colonne dell'evento che il pubblico può vedere. Elencate una per una: con
// un `select('*')` una colonna aggiunta domani verrebbe pubblicata da sola.
const CAMPI_EVENTO = [
  'id', 'slug', 'title', 'description', 'cover_url', 'formato_cover', 'cover_focal',
  'cta_label', 'cta_condizioni', 'mostra_prezzo', 'mostra_prezzo_pagina', 'prezzo_testo',
  'date_start', 'date_end', 'location', 'price', 'seats_total', 'seats_booked', 'packages',
  // Servono a ricostruire il piede di pagina del sito da cui arriva chi guarda.
  'entity_tipo', 'entity_id', 'azienda_id',
].join(', ')

// Il minimo per rendere il piede di pagina: chi è il titolare, come si torna al
// suo sito, che aspetto ha. Sono gli stessi dati che il minisito mostra già a
// chiunque — ma si chiedono lo stesso uno per uno, non con un asterisco.
const CAMPI_SITO = 'name, slug, tipo, logo_url, logo_dark_url, theme, minisito'

export async function GET(request, props) {
  const params = await props.params
  try {
    const { data, error } = await supabaseAdmin.from('eventi')
      .select(CAMPI_EVENTO)
      .eq('id', params.id).eq('published', true).eq('active', true).single()
    if (error || !data) return Response.json({ error: 'Evento non trovato' }, { status: 404 })

    const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
    const out = lang === 'en' ? await localizeEntity(data, 'evento', lang) : data

    // La pagina di un evento è una pagina pubblica di un cliente: senza i suoi
    // riferimenti legali e senza il link alla privacy resta scoperta, e per un
    // sito d'impresa quei dati sono un obbligo, non una decorazione.
    let sito = null
    if (data.entity_id) {
      const { data: ent } = await supabaseAdmin.from('entita')
        .select(CAMPI_SITO).eq('id', data.entity_id).eq('active', true).maybeSingle()
      if (ent) {
        sito = {
          name: ent.name, slug: ent.slug, tipo: ent.tipo,
          logo_url: ent.logo_url, logo_dark_url: ent.logo_dark_url,
          theme: ent.theme || null, minisito: ent.minisito || null,
          azienda_legale: data.azienda_id ? await getAziendaLegale(data.azienda_id) : null,
        }
      }
    }
    // Un evento aziendale non è appeso a nessuna entità: restano comunque i dati
    // legali dell'azienda, che sono la parte che la legge pretende.
    if (!sito && data.azienda_id) {
      sito = { azienda_legale: await getAziendaLegale(data.azienda_id) }
    }

    // `azienda_id` serviva solo a cercare i dati legali qui sopra: non esce.
    const { azienda_id, ...pubblico } = out
    return Response.json({ ...pubblico, sito })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
