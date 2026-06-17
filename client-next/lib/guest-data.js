import { supabaseAdmin } from './supabase-server'
import { getCollegamenti } from './guest-utils'

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

export async function getStruttura(slug) {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('id, azienda_id, slug, name, description, address, phone, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions, minisito, privacy_data, chatbot')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  if (error || !data) return null
  const collegamenti = await getCollegamenti('struttura', data.id)
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, collegamenti, azienda_legale }
}

export async function getRistorante(slug) {
  const { data, error } = await supabaseAdmin
    .from('ristoranti')
    .select('id, azienda_id, slug, name, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, menu, modules, minisito, privacy_data, chatbot')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  if (error || !data) return null
  const collegamenti = await getCollegamenti('ristorante', data.id)
  const azienda_legale = await getAziendaLegale(data.azienda_id)
  return { ...data, collegamenti, azienda_legale }
}

export async function getAttivita(slug) {
  const { data, error } = await supabaseAdmin
    .from('attivita')
    .select('id, azienda_id, slug, name, tipo, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, services, minisito, privacy_data, chatbot, pwa')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  if (error || !data) return null
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

export async function getPagina(tipo, entityId, pageSlug, preview = false) {
  let q = supabaseAdmin
    .from('pagine')
    .select('*')
    .eq('entity_tipo', tipo)
    .eq('entity_id', entityId)
    .eq('slug', pageSlug)
  if (!preview) q = q.eq('status', 'pubblicata')
  const { data, error } = await q.single()
  if (error || !data) return null
  return data
}
