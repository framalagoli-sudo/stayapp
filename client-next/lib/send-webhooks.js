import { supabaseAdmin } from './supabase-server'
import { urlEsternoSicuro } from './url-sicuro'

export async function sendWebhooks(aziendaId, evento, payload) {
  if (!aziendaId) return
  try {
    const { data: hooks } = await supabaseAdmin.from('webhooks').select('id, url')
      .eq('azienda_id', aziendaId).eq('attivo', true).contains('eventi', [evento])
    if (!hooks?.length) return
    const body = JSON.stringify({ evento, timestamp: new Date().toISOString(), ...payload })
    await Promise.allSettled(hooks.map(async hook => {
      // Mai verso un indirizzo interno, anche se la riga è vecchia o il nome è
      // stato fatto puntare a 127.0.0.1 dopo la creazione (SSRF).
      const sicuro = await urlEsternoSicuro(hook.url)
      if (sicuro.errore) return
      return fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OltreNova-Event': evento },
        body,
        signal: AbortSignal.timeout(6000),
      }).catch(() => {})
    }))
  } catch {}
}
