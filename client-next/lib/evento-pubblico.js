import { supabaseAdmin } from './supabase-server'
import { localizeEntity } from './translate'
import { getAziendaLegale } from './guest-data'
import { trovaEvento } from './evento-indirizzo'

// I dati pubblici di un evento: quelli che vede chi apre la pagina.
//
// ⛔ Stavano dentro la route `/api/guest/eventi/[id]`, e la pagina dell'evento
// li chiedeva **dal browser**. Risultato misurato il 18/09/2026: nell'HTML
// servito non c'erano né il titolo in H1 né il testo — per un motore di ricerca
// la pagina di un evento era **vuota**. Le pagine pubbliche si servono dal
// server, ed è una regola che avevamo già: qui era saltata.
//
// Ora la logica sta in un punto solo e la usano tutte e due: la route (per chi
// aggiorna la lingua o prenota) e la pagina (per il primo caricamento).

// Le colonne dell'evento che il pubblico può vedere. Elencate una per una: con
// un `select('*')` una colonna aggiunta domani verrebbe pubblicata da sola.
export const CAMPI_EVENTO = [
  'id', 'slug', 'title', 'description', 'cover_url', 'formato_cover', 'cover_focal',
  'cta_label', 'cta_condizioni', 'mostra_prezzo', 'mostra_prezzo_pagina', 'prezzo_testo', 'prezzo_modo', 'telefono_obbligatorio',
  'date_start', 'date_end', 'location', 'price', 'seats_total', 'seats_booked', 'posti_riservati', 'packages',
  // ⚠️ Senza queste due la pagina non saprebbe che le prenotazioni sono chiuse:
  // si salverebbe nel pannello e non si vedrebbe sul sito — è già successo.
  'prenotazioni_chiuse', 'prenotazioni_chiuse_testo', 'lista_attesa',
  // Servono a ricostruire il piede di pagina del sito da cui arriva chi guarda.
  'entity_tipo', 'entity_id', 'azienda_id',
  // L'ora dell'evento è quella del posto: senza fuso la pagina la mostrerebbe
  // in quello di chi guarda, e chi prenota da lontano leggerebbe un altro orario.
  'aziende(fuso_orario)',
].join(', ')

// Il minimo per rendere il piede di pagina: chi è il titolare, come si torna al
// suo sito, che aspetto ha. Sono gli stessi dati che il minisito mostra già a
// chiunque — ma si chiedono lo stesso uno per uno, non con un asterisco.
const CAMPI_SITO = 'name, slug, tipo, logo_url, logo_dark_url, theme, minisito'

// `evento` già letto (per non cercarlo due volte quando chi chiama ce l'ha).
// Torna `null` se l'evento non esiste.
export async function datiEventoPubblico(id, lang = 'it', evento = null) {
  const data = evento || (await trovaEvento(id, CAMPI_EVENTO)).evento
  if (!data) return null

  const out = lang === 'en' ? await localizeEntity(data, 'evento', lang) : data

  // La pagina di un evento è una pagina pubblica di un cliente: senza i suoi
  // riferimenti legali e senza il link alla privacy resta scoperta, e per un
  // sito d'impresa quei dati sono un obbligo, non una decorazione.
  let sito = null
  if (data.entity_id) {
    const { data: ent } = await supabaseAdmin.from('entita')
      .select(CAMPI_SITO).eq('id', data.entity_id).eq('active', true).maybeSingle()
    if (ent) {
      // Del minisito servono due cose sole: come si presenta il piede e i
      // collegamenti social. Passarlo intero sarebbe comodo e sbagliato — è un
      // oggetto che cresce, e al primo campo riservato che ci finisce dentro
      // uscirebbe da qui senza che nessuno lo decida.
      const mini = ent.minisito || {}

      // Il menu in cima mostra le pagine pubblicate del sito, nell'ordine che il
      // cliente ha scelto. Colonne elencate: `pagine` contiene anche le bozze e
      // i loro contenuti, e da qui non deve uscire nient'altro.
      const { data: pagine } = await supabaseAdmin.from('pagine')
        .select('id, slug, titolo, parent_id, nel_menu, ordine')
        .eq('entity_tipo', data.entity_tipo).eq('entity_id', data.entity_id)
        .eq('status', 'pubblicata').neq('slug', '__home__')
        .order('ordine', { ascending: true })

      sito = {
        name: ent.name, slug: ent.slug, tipo: ent.tipo,
        logo_url: ent.logo_url, logo_dark_url: ent.logo_dark_url,
        theme: ent.theme || null,
        header_cfg: mini.header_cfg || mini.header || null,
        footer_cfg: mini.footer_cfg || null,
        logo_size: mini.logo_size || null,
        social: mini.social || null,
        pagine: (pagine || []).filter(p => p.nel_menu !== false),
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
  // Dell'unione con `aziende` esce solo il fuso, come campo semplice.
  const { azienda_id, aziende, ...pubblico } = out
  // `lingua` dice in che lingua sono questi dati: la pagina la confronta con
  // quella richiesta, e ripesca solo se non combaciano.
  return { ...pubblico, lingua: lang, fuso: aziende?.fuso_orario || null, sito }
}
