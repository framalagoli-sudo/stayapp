import { supabase } from './supabase.js'

// Fire-and-forget: chiama tutti i webhook attivi dell'azienda per un dato evento
export async function sendWebhooks(aziendaId, evento, payload) {
  if (!aziendaId) return
  try {
    const { data: hooks } = await supabase
      .from('webhooks')
      .select('id, url')
      .eq('azienda_id', aziendaId)
      .eq('attivo', true)
      .contains('eventi', [evento])

    if (!hooks?.length) return

    const body = JSON.stringify({ evento, timestamp: new Date().toISOString(), ...payload })

    await Promise.allSettled(hooks.map(hook =>
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OltreNova-Event': evento },
        body,
        signal: AbortSignal.timeout(6000),
      }).catch(() => {}) // ignora errori singoli
    ))
  } catch { /* non bloccare mai il chiamante */ }
}
