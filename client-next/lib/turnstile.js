// Verifica server-side di Cloudflare Turnstile (CAPTCHA invisibile anti-bot/spam).
//
// INERTE finché TURNSTILE_SECRET_KEY non è impostata: così il codice si può
// deployare PRIMA di creare le chiavi nel dashboard Cloudflare, senza bloccare
// nessun form. Diventa attivo automaticamente quando la secret è presente.
export async function verifyTurnstile(token, ip) {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? '').trim()
  if (!secret) return { success: true, skipped: true } // non ancora configurato
  if (!token) return { success: false, error: 'missing-token' }

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    return { success: !!data.success, data }
  } catch {
    // FAIL-OPEN su errore di rete verso Cloudflare: non bloccare utenti legittimi
    // se il servizio CF è momentaneamente irraggiungibile.
    return { success: true, degraded: true }
  }
}
