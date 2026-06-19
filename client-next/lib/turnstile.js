// Verifica server-side di Cloudflare Turnstile (CAPTCHA invisibile anti-bot/spam).
//
// INERTE finché TURNSTILE_SECRET_KEY non è impostata: così il codice si può
// deployare PRIMA di creare le chiavi nel dashboard Cloudflare, senza bloccare
// nessun form. Diventa attivo automaticamente quando la secret è presente.
export async function verifyTurnstile(token, ip) {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? '').trim()
  if (!secret) return { success: true, skipped: true } // non ancora configurato

  // Bypass per gli smoke test CI: token = TURNSTILE_TEST_BYPASS (secret server-only,
  // stesso modello di CRON_SECRET). Permette ai test automatici di inviare i form
  // senza un browser, lasciando Turnstile attivo per tutti gli altri.
  const bypass = (process.env.TURNSTILE_TEST_BYPASS ?? '').trim()
  if (bypass && token === bypass) return { success: true, bypass: true }

  // SOFT (non blocca, logga soltanto) di default. L'enforcement vero si attiva con
  // TURNSTILE_STRICT=1. LEVA D'EMERGENZA PRIORITARIA: TURNSTILE_SOFT=1 forza il soft
  // anche se STRICT è attivo → kill-switch istantaneo se il widget desse problemi.
  // (La Site Key ora è servita a runtime via meta tag → niente più rotture da build cache.)
  const killSwitch = (process.env.TURNSTILE_SOFT ?? '').trim() === '1'
  const soft = killSwitch || (process.env.TURNSTILE_STRICT ?? '').trim() !== '1'

  if (!token) {
    if (soft) { console.error('[turnstile] SOFT: token mancante (widget non ha prodotto token)'); return { success: true, softfail: 'missing-token' } }
    return { success: false, error: 'missing-token' }
  }

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    if (!data.success) {
      console.error('[turnstile] verify FAIL — error-codes:', JSON.stringify(data['error-codes'] || []), 'hostname:', data.hostname || '?')
      if (soft) return { success: true, softfail: data['error-codes'] }
    }
    return { success: !!data.success, data }
  } catch (e) {
    // FAIL-OPEN su errore di rete verso Cloudflare: non bloccare utenti legittimi.
    console.error('[turnstile] errore rete siteverify:', e.message)
    return { success: true, degraded: true }
  }
}
