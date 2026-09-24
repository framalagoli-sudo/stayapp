import { supabaseAdmin } from '@/lib/supabase-server'

// Quanto un'azienda usa ogni funzione di livello azienda: righe nel database.
//
// Una misura sola, per due domande: la pagina «Funzioni e profili» (chi usa
// cosa, tutte le aziende) e l'applicazione di una categoria, che NON deve
// spegnere una funzione che l'azienda ha usato. Contate in due posti, le due
// risposte divergerebbero alla prima tabella aggiunta da una parte sola.
//
// «Usata» = almeno una riga. Non dice se la usa bene né se la usa ancora.

// Dove si misura l'uso di ogni funzione. `via` dice come la tabella si lega
// all'azienda: direttamente (azienda_id), oppure passando dall'entità o
// dall'evento.
export const MISURE = {
  richieste:        [{ tabella: 'requests',          via: 'property_id' }],
  prenotazioni:     [{ tabella: 'prenotazioni' }],
  booking:          [{ tabella: 'risorse' }],
  contatti:         [{ tabella: 'contatti' }],
  preventivi:       [{ tabella: 'preventivi' }],
  recensioni:       [{ tabella: 'recensioni' }],
  survey:           [{ tabella: 'survey_risposte' }],
  chat:             [{ tabella: 'messages',          via: 'property_id' }],
  form_builder:     [{ tabella: 'form_builder' }, { tabella: 'form_submissions' }],
  blog:             [{ tabella: 'articoli' }],
  eventi:           [{ tabella: 'eventi' }, { tabella: 'event_bookings', via: 'event_id' }],
  offerte:          [{ tabella: 'offerte' }],
  newsletter:       [{ tabella: 'newsletters' }],
  whatsapp:         [{ tabella: 'whatsapp_account' }, { tabella: 'whatsapp_campagna' }],
  automazioni:      [{ tabella: 'automazioni' }],
  piano_editoriale: [{ tabella: 'piano_editoriale' }, { tabella: 'pe_campagne' }],
  loyalty:          [{ tabella: 'loyalty_programs' }, { tabella: 'gift_cards' }],
  shop:             [{ tabella: 'prodotti' }, { tabella: 'ordini' }],
  analytics:        [{ tabella: 'page_views',        via: 'entity_id' }],
  // Content Studio non ha una tabella sua: la strategia che produce si salva
  // sull'azienda (content_strategy), le bozze finiscono nel piano editoriale.
}

// ⚠️ La colonna nasce `{}` (migration 037): «non vuota» è vero per tutti.
// Usata vuol dire che dentro c'è una strategia, cioè almeno un campo.
const haStrategia = (s) => !!s && typeof s === 'object' && Object.keys(s).length > 0

// PostgREST restituisce al massimo 1000 righe per richiesta: una lettura sola
// sotto-conterebbe in silenzio le tabelle che crescono (le visite, per prime).
async function leggiTutto(tabella, colonna) {
  const righe = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabaseAdmin.from(tabella).select(colonna).range(da, da + 999)
    if (error) throw new Error(`${tabella}: ${error.message}`)
    righe.push(...data)
    if (data.length < 1000) return righe
  }
}

// Tutte le aziende: { uso: { [aziendaId]: { [funzione]: righe } }, nonMisurate }.
// Si legge soltanto la colonna che lega la riga all'azienda: nessun dato.
export async function usoDiTutte(aziende, entita, eventi) {
  const aziendaDi = {
    property_id: Object.fromEntries(entita.map(e => [e.id, e.azienda_id])),
    entity_id: Object.fromEntries(entita.map(e => [e.id, e.azienda_id])),
    event_id: Object.fromEntries(eventi.map(e => [e.id, e.azienda_id])),
  }
  const uso = Object.fromEntries(aziende.map(a => [a.id, {}]))
  const nonMisurate = []
  for (const [funzione, misure] of Object.entries(MISURE)) {
    for (const { tabella, via } of misure) {
      let righe
      try { righe = await leggiTutto(tabella, via || 'azienda_id') }
      catch { nonMisurate.push(tabella); continue }
      for (const r of righe) {
        const az = via ? aziendaDi[via][r[via]] : r.azienda_id
        if (!az || !uso[az]) continue
        uso[az][funzione] = (uso[az][funzione] || 0) + 1
      }
    }
  }
  for (const a of aziende) if (haStrategia(a.content_strategy)) uso[a.id].content_studio = 1
  return { uso, nonMisurate }
}

// Una sola azienda: { [funzione]: righe }. Si conta, non si legge.
// ⚠️ Se una tabella non si lascia contare la funzione risulta USATA: nel dubbio
// si tiene accesa. Spegnere per un errore di lettura farebbe sparire dal menu
// qualcosa che il cliente usa.
export async function usoDiUna(aziendaId) {
  const [{ data: ent }, { data: ev }, { data: az }] = await Promise.all([
    supabaseAdmin.from('entita').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('eventi').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('aziende').select('content_strategy').eq('id', aziendaId).maybeSingle(),
  ])
  const ids = { property_id: (ent || []).map(e => e.id), entity_id: (ent || []).map(e => e.id), event_id: (ev || []).map(e => e.id) }
  const uso = {}
  for (const [funzione, misure] of Object.entries(MISURE)) {
    for (const { tabella, via } of misure) {
      if (via && !ids[via].length) continue
      let q = supabaseAdmin.from(tabella).select('*', { count: 'exact', head: true })
      q = via ? q.in(via, ids[via]) : q.eq('azienda_id', aziendaId)
      const { count, error } = await q
      const n = error ? 1 : (count || 0)
      if (n) uso[funzione] = (uso[funzione] || 0) + n
    }
  }
  if (haStrategia(az?.content_strategy)) uso.content_studio = 1
  return uso
}
