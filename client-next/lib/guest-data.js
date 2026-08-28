import { supabaseAdmin } from './supabase-server'
import { getCollegamenti } from './guest-utils'
import { verificaTokenAnteprima } from './preview-token'
import { allaFormaStorica } from './entita'

// Query dirette a Supabase dai Server Components — nessun HTTP hop intermedio.
// Più sicure (nessun endpoint esposto chiamato internamente), più stabili
// (nessuna dipendenza da URL interni/VERCEL_URL), più veloci (nessun round-trip).

// Dati legali dell'azienda da mostrare nel footer del minisito (P.IVA, sede, REA…).
// Obbligo di legge per i siti business (D.Lgs. 70/2003, art. 2250 c.c.).
// Resiliente: se le colonne rea/capitale_sociale non esistono ancora (migration 061
// non eseguita), ripiega sui campi base senza rompere il minisito.
export async function getAziendaLegale(aziendaId) {
  if (!aziendaId) return null
  const full = 'ragione_sociale, partita_iva, indirizzo, citta, cap, provincia, pec, rea, capitale_sociale'
  const base = 'ragione_sociale, partita_iva, indirizzo, citta, cap, provincia, pec'
  let { data, error } = await supabaseAdmin.from('aziende').select(full).eq('id', aziendaId).single()
  if (error) {
    const r = await supabaseAdmin.from('aziende').select(base).eq('id', aziendaId).single()
    data = r.data || null
  }
  return data || null
}

// Le tre entità si leggono ora dalla tabella unificata. Cambia da dove arrivano
// i dati, non cosa contengono: `allaFormaStorica` restituisce gli stessi campi
// di prima (`modules`, `pwa`, `tipo` come settore) così pagine e componenti non
// si accorgono del passaggio. Ogni funzione porta con sé i campi che quel
// verticale mostra davvero — non `select('*')`, che porterebbe fuori anche la
// password del WiFi sulle pagine pubbliche.
// ⚠️ Sono ESATTAMENTE i campi che ogni verticale chiedeva prima, né uno di più.
// Unificare dà la possibilità di avere tutti i campi; non li accende da sola.
// Chiedendone qualcuno in più il sito cambierebbe da solo: aggiungendo `email`
// alle strutture, l'indirizzo è comparso sulla pagina di un cliente che non lo
// mostrava. Un passaggio infrastrutturale dev'essere invisibile — mostrare un
// campo nuovo è una decisione di prodotto, e si prende a parte.
// `email` è stata aggiunta alle strutture il 25/08 come scelta di prodotto
// (uniformare i tre verticali), non come effetto della migrazione. Non era solo
// estetica: la pagina privacy usa quell'indirizzo per far esercitare i diritti
// GDPR, e senza — se il titolare non ha compilato `privacy_data` — quella
// pagina restava priva di un contatto.
// I campi che le pagine pubbliche ricevono. **Una lista sola per tutti i tipi.**
//
// Erano tre liste diverse, ereditate da quando erano tre tabelle: una struttura
// non riceveva `menu`, un ristorante non riceveva `services`. Il risultato è
// che un hotel poteva riempire il menù dal pannello e poi non vederlo comparire
// sul proprio sito — l'interruttore c'era, il dato non arrivava.
//
// Restano fuori le credenziali del WiFi: le chiede soltanto chi rende l'app
// dell'ospite, con `getStruttura(slug, { ospite: true })`.
const CAMPI_ENTITA = [
  'id', 'azienda_id', 'tipo', 'settore', 'slug', 'name', 'description',
  'address', 'phone', 'email', 'schedule', 'whatsapp',
  'logo_url', 'logo_dark_url', 'cover_url', 'gallery', 'theme', 'minisito',
  'services', 'activities', 'excursions', 'menu', 'amenities', 'restaurant',
  'checkin_time', 'checkout_time', 'rules',
  'plan', 'moduli', 'privacy_data', 'chatbot',
].join(', ')

// L'app dell'ospite (dietro il QR della camera) è l'unica che vede le
// credenziali del WiFi.
const CAMPI_OSPITE = `${CAMPI_ENTITA}, wifi_name, wifi_password`

// Le attività e le escursioni ora vivono in `offerte`, ma le pagine e i
// componenti continuano a leggerle come le hanno sempre lette: un elenco di
// gruppi per le attività, un elenco piatto per le escursioni. Si cambia **la
// sorgente, non il contratto** — è quello che ha reso invisibile il passaggio
// alla tabella unica delle entità, e vale qui uguale.
//
// Quando anche le pagine parleranno di «offerte», questa funzione si toglie.
// È un debito dichiarato, con una scadenza.
// Le colonne delle offerte che possono finire nell'HTML pubblico.
//
// ⚠️ Elencate una per una, e ognuna guardata: questa lista esce dal sito e la
// legge chiunque. Restano **fuori** di proposito:
//   `azienda_id`, `prodotto_id`, `origine`, `origine_id` — riferimenti interni;
//   `avvisa_titolare`, `conferma_ospite`, `conferma_auto` — come lavora il
//     cliente, non riguarda chi compra;
//   `disponibilita`, `chiusure`, `anticipo_ore`, `cancellazione_ore` — le sue
//     regole di lavoro, e le chiusure dicono quando è via;
//   `posti_occupati` — quante ne ha vendute: si espone quanti **restano**, che
//     è quello che serve a chi guarda, non quante ne ha fatte.
const CAMPI_OFFERTA_PUBBLICI =
  'id, titolo, descrizione, categoria, impegno, cover_url, formato_cover, cover_focal, colore, ' +
  'luogo, prezzo, valuta, mostra_prezzo, prezzo_testo, cta_label, cta_condizioni, ' +
  'data_inizio, data_fine, posti_totali, posti_occupati, ordine, origine'

async function nellaFormaStorica(entityId) {
  const { data } = await supabaseAdmin.from('offerte')
    .select(CAMPI_OFFERTA_PUBBLICI)
    .eq('entity_id', entityId).eq('attiva', true).eq('pubblicata', true)
    .order('ordine', { ascending: true })

  if (!data?.length) return null   // niente offerte migrate: si tengono i campi vecchi

  const activities = []
  for (const o of data.filter(x => x.origine === 'attivita')) {
    const nomeGruppo = o.categoria || 'Attività'
    let gruppo = activities.find(g => g.category === nomeGruppo)
    if (!gruppo) { gruppo = { id: nomeGruppo, category: nomeGruppo, items: [] }; activities.push(gruppo) }
    gruppo.items.push({
      id: o.id, name: o.titolo, description: o.descrizione || '',
      location: o.luogo || '', photo_url: o.cover_url || '',
      // «prenotabile» era l'interruttore che faceva comparire il pulsante:
      // adesso è l'impegno, e questi due valori sono la stessa informazione.
      bookable: o.impegno !== 'chiedi', active: true,
    })
  }

  // Tutto il resto — comprese le offerte create dal pannello, che non hanno
  // un'origine perché non vengono da nessuna migrazione — finisce nell'elenco
  // completo, quello con foto, prezzo, posti e pulsante.
  // ⚠️ Prima qui c'era un filtro `origine IN (...)`: le offerte nuove non lo
  // soddisfacevano e sparivano. Si salvavano e non si vedevano.
  const excursions = data.filter(x => x.origine !== 'attivita').map(o => ({
    id: o.id, name: o.titolo, description: o.descrizione || '',
    price: Number(o.prezzo) || 0, seats: o.posti_totali ?? null,
    meeting_point: o.luogo || '', photo_url: o.cover_url || '',
    dates: o.data_inizio ? new Date(o.data_inizio).toLocaleDateString('it-IT') : '',
    // Durata e «cosa include» erano due campi separati: la migrazione li ha
    // messi insieme nelle condizioni, e qui si rimettono dove le pagine li cercano.
    duration: (o.cta_condizioni || '').match(/Durata:\s*(.+)/)?.[1] || '',
    includes: (o.cta_condizioni || '').match(/Include:\s*(.+)/)?.[1] || '',
    active: true,
  }))

  // Le offerte anche **come sono**, per il blocco «Offerte» del sito: quello
  // che il cliente crea oggi non ha più bisogno di travestirsi da escursione
  // per comparire.
  //
  // ⚠️ `posti_occupati` non esce: si trasforma in quanti ne **restano**, che è
  // ciò che serve a chi guarda. Quante ne ha vendute è un fatto suo.
  // ⚠️ `origine` serve **qui sopra**, per dividere attività ed escursioni: non
  // deve arrivare al browser. È una classificazione nostra, nata dalla
  // migrazione, e nell'HTML pubblico è rumore che racconta come lavoriamo.
  const offerte = data.map(({ posti_occupati, origine, ...o }) => ({
    ...o,
    rimasti: o.posti_totali == null ? null : Math.max(0, o.posti_totali - (posti_occupati || 0)),
  }))

  return { activities, excursions, offerte }
}

async function leggiEntita(slug, tipo, campi) {
  const { data, error } = await supabaseAdmin
    .from('entita').select(campi).eq('slug', slug).eq('tipo', tipo).eq('active', true).maybeSingle()
  if (error || !data) return null
  const storica = allaFormaStorica(data)

  // Se questa entità ha offerte migrate, valgono quelle. Altrimenti restano i
  // campi vecchi: durante il passaggio le due sorgenti convivono, e nessuno
  // resta senza contenuti perché la migrazione non lo ha ancora raggiunto.
  const daOfferte = await nellaFormaStorica(storica.id)
  if (!daOfferte) return { ...storica, offerte: [] }
  return {
    ...storica,
    offerte: daOfferte.offerte,
    ...('activities' in storica ? { activities: daOfferte.activities } : {}),
    ...('excursions' in storica ? { excursions: daOfferte.excursions } : {}),
  }
}

export async function getStruttura(slug, { ospite = false } = {}) {
  const data = await leggiEntita(slug, 'struttura', ospite ? CAMPI_OSPITE : CAMPI_ENTITA)
  if (!data) return null
  const collegamenti = await getCollegamenti('struttura', data.id)
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, collegamenti, azienda_legale }
}

export async function getRistorante(slug) {
  const data = await leggiEntita(slug, 'ristorante', CAMPI_ENTITA)
  if (!data) return null
  const collegamenti = await getCollegamenti('ristorante', data.id)
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, collegamenti, azienda_legale }
}

export async function getAttivita(slug) {
  const data = await leggiEntita(slug, 'attivita', CAMPI_ENTITA)
  if (!data) return null
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, azienda_legale }
}

export async function getArticolo(slug) {
  const { data, error } = await supabaseAdmin
    .from('articoli')
    .select('id, title, slug, excerpt, content, cover_url, author, published_at, category_id, entity_tipo, entity_id, azienda_id')
    .eq('slug', slug).eq('published', true).eq('active', true).single()
  if (error || !data) return null
  return data
}

// Carica un elemento di vetrina per il dettaglio pubblico. Seleziona SOLO le
// colonne pubbliche: dati_privati NON viene mai letto qui (gating). Aggiunge il
// preset della vetrina (serve alle etichette dei campi lato pubblico).
// `anteprima`: stesso token firmato di getPagina — senza, solo elementi pubblicati.
export async function getElementoVetrina(tipo, entityId, itemSlug, anteprima = null) {
  let q = supabaseAdmin
    .from('vetrina_elementi')
    .select('id, vetrina_id, titolo, slug, copertina_url, valore_primario, stato_pubblico, dati, immagini, status, seo_title, seo_description, og_image_url')
    .eq('entity_tipo', tipo)
    .eq('entity_id', entityId)
    .eq('slug', itemSlug)
  if (!verificaTokenAnteprima(anteprima, tipo, entityId)) q = q.eq('status', 'pubblicata')
  const { data, error } = await q.single()
  if (error || !data) return null
  const { data: vetrina } = await supabaseAdmin.from('vetrine').select('preset, titolo').eq('id', data.vetrina_id).single()
  return { ...data, preset: vetrina?.preset || 'progetti_immobiliari', vetrina_titolo: vetrina?.titolo || '' }
}

// `anteprima` è il token firmato che l'editor mette nell'URL: senza una firma
// valida per QUESTA entità si vedono solo le pagine pubblicate.
export async function getPagina(tipo, entityId, pageSlug, anteprima = null) {
  let q = supabaseAdmin
    .from('pagine')
    .select('*')
    .eq('entity_tipo', tipo)
    .eq('entity_id', entityId)
    .eq('slug', pageSlug)
  if (!verificaTokenAnteprima(anteprima, tipo, entityId)) q = q.eq('status', 'pubblicata')
  const { data, error } = await q.single()
  if (error || !data) return null
  return data
}
