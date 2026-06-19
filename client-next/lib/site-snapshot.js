import { supabaseAdmin } from './supabase-server'

// Colonne config "del sito" per tipo entità — esattamente quelle editabili dall'admin,
// escluso `active` (lo stato di pubblicazione non va ripristinato da uno snapshot di contenuto).
export const SNAP = {
  struttura: {
    table: 'properties',
    cols: ['name', 'description', 'address', 'phone', 'whatsapp', 'email', 'wifi_name', 'wifi_password',
      'checkin_time', 'checkout_time', 'rules', 'amenities', 'modules', 'theme', 'logo_url', 'cover_url',
      'services', 'gallery', 'restaurant', 'activities', 'excursions', 'minisito', 'privacy_data', 'chatbot'],
  },
  ristorante: {
    table: 'ristoranti',
    cols: ['name', 'description', 'address', 'phone', 'email', 'schedule', 'theme', 'logo_url', 'cover_url',
      'gallery', 'menu', 'modules', 'minisito', 'privacy_data', 'chatbot'],
  },
  attivita: {
    table: 'attivita',
    cols: ['name', 'tipo', 'description', 'address', 'phone', 'email', 'schedule', 'theme', 'logo_url',
      'cover_url', 'gallery', 'services', 'minisito', 'privacy_data', 'chatbot', 'pwa'],
  },
}

// Cattura lo stato attuale: colonne config dell'entità + tutte le sue pagine CMS.
export async function captureSnapshot(entity_tipo, entity_id) {
  const cfg = SNAP[entity_tipo]
  if (!cfg) return null
  const { data: entity } = await supabaseAdmin
    .from(cfg.table)
    .select(['azienda_id', ...cfg.cols].join(','))
    .eq('id', entity_id)
    .single()
  if (!entity) return null

  const entity_data = {}
  for (const c of cfg.cols) entity_data[c] = entity[c]

  const { data: pagine } = await supabaseAdmin
    .from('pagine').select('*')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)

  return { azienda_id: entity.azienda_id, entity_data, pagine_data: pagine || [] }
}

// Applica uno snapshot: riscrive le colonne config e SOSTITUISCE le pagine.
export async function applySnapshot(entity_tipo, entity_id, entity_data, pagine_data) {
  const cfg = SNAP[entity_tipo]
  if (!cfg) throw new Error('Tipo entità non valido')

  // 1. Colonne config (solo quelle ammesse — difesa da dati manomessi nello snapshot)
  const updates = {}
  for (const c of cfg.cols) if (entity_data && c in entity_data) updates[c] = entity_data[c]
  if (Object.keys(updates).length) {
    const { error } = await supabaseAdmin.from(cfg.table).update(updates).eq('id', entity_id)
    if (error) throw new Error('Ripristino entità: ' + error.message)
  }

  // 2. Pagine: cancella le attuali, reinserisci quelle dello snapshot.
  await supabaseAdmin.from('pagine').delete().eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
  const rows = (pagine_data || []).map((p) => ({ ...p, entity_tipo, entity_id }))
  if (rows.length) {
    // Inserisci prima senza parent_id (la FK self-reference fallirebbe se un figlio
    // precede il padre nell'array), poi ripristina i parent in seconda passata.
    const noParent = rows.map(({ parent_id, ...r }) => ({ ...r, parent_id: null }))
    const { error } = await supabaseAdmin.from('pagine').insert(noParent)
    if (error) throw new Error('Ripristino pagine: ' + error.message)
    for (const p of rows) {
      if (p.parent_id) await supabaseAdmin.from('pagine').update({ parent_id: p.parent_id }).eq('id', p.id)
    }
  }
}
