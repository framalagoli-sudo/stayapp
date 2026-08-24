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
const CAMPI_STRUTTURA = 'id, azienda_id, tipo, settore, slug, name, description, address, phone, email, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, logo_dark_url, cover_url, plan, moduli, theme, services, gallery, restaurant, activities, excursions, minisito, privacy_data, chatbot'
const CAMPI_RISTORANTE = 'id, azienda_id, tipo, settore, slug, name, description, address, phone, email, schedule, logo_url, logo_dark_url, cover_url, theme, gallery, menu, moduli, minisito, privacy_data, chatbot'
const CAMPI_ATTIVITA = 'id, azienda_id, tipo, settore, slug, name, description, address, phone, email, schedule, logo_url, logo_dark_url, cover_url, theme, gallery, services, minisito, privacy_data, chatbot, moduli'

async function leggiEntita(slug, tipo, campi) {
  const { data, error } = await supabaseAdmin
    .from('entita').select(campi).eq('slug', slug).eq('tipo', tipo).eq('active', true).maybeSingle()
  if (error || !data) return null
  return allaFormaStorica(data)
}

export async function getStruttura(slug) {
  const data = await leggiEntita(slug, 'struttura', CAMPI_STRUTTURA)
  if (!data) return null
  const collegamenti = await getCollegamenti('struttura', data.id)
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, collegamenti, azienda_legale }
}

export async function getRistorante(slug) {
  const data = await leggiEntita(slug, 'ristorante', CAMPI_RISTORANTE)
  if (!data) return null
  const collegamenti = await getCollegamenti('ristorante', data.id)
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, collegamenti, azienda_legale }
}

export async function getAttivita(slug) {
  const data = await leggiEntita(slug, 'attivita', CAMPI_ATTIVITA)
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
