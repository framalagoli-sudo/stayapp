import { supabaseAdmin } from './supabase-server'

// Quale numero WhatsApp usa un'entità.
//
// Dal 16/09/2026 un'azienda può avere più numeri (migration 122): uno per
// entità, più eventualmente uno «generale» con `entity_id` NULL per chi non ne
// ha uno proprio. Prima la domanda aveva una risposta sola e ogni punto del
// codice se la scriveva da sé con `.maybeSingle()` su `azienda_id` — che con
// due numeri **fallisce**, perché la riga non è più unica. Quindi la domanda si
// fa qui, in un posto solo.

const COLONNE = 'id, azienda_id, entity_id, waba_id, phone_number_id, numero_visualizzato, stato, access_token_cifrato, quality_rating, limite_messaggi, collegato_il, ultima_verifica, dettaglio'

// Il numero dell'entità se ce l'ha, altrimenti quello dell'azienda. `null` se
// non c'è nessun collegamento.
export async function accountPerEntita(aziendaId, entityId = null) {
  if (!aziendaId) return null
  const { data } = await supabaseAdmin
    .from('whatsapp_account').select(COLONNE).eq('azienda_id', aziendaId)
  const righe = data || []
  if (entityId) {
    const suo = righe.find(r => r.entity_id === entityId)
    if (suo) return suo
  }
  return righe.find(r => !r.entity_id) || null
}

// Tutti i numeri collegati di un'azienda (il pannello li elenca).
export async function accountDellAzienda(aziendaId) {
  if (!aziendaId) return []
  const { data } = await supabaseAdmin
    .from('whatsapp_account').select(COLONNE).eq('azienda_id', aziendaId).order('created_at')
  return data || []
}

// Il collegamento con Meta è uno per azienda: qualsiasi riga porta il token e il
// WABA buoni. Serve a chi deve solo parlare con Meta (es. lo stato dei modelli),
// non a chi deve inviare da un numero preciso.
export async function collegamentoDellAzienda(aziendaId) {
  const righe = await accountDellAzienda(aziendaId)
  return righe.find(r => r.waba_id && r.access_token_cifrato) || null
}
