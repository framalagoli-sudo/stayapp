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

  // Enforcement attivo di default. LEVA D'EMERGENZA: impostando TURNSTILE_SOFT=1
  // su Vercel, Turnstile smette di bloccare (logga solo il motivo) senza perdere
  // lead — utile se un domani il widget desse problemi. Le altre difese (honeypot,
  // rate-limit, spam filter) restano comunque sempre attive.
  const soft = (process.env.TURNSTILE_SOFT ?? '').trim() === '1'

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
