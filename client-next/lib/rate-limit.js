import { supabaseAdmin } from '@/lib/supabase-server'

// Estrae l'IP del client. Dietro Cloudflare + Vercel l'IP reale è in
// cf-connecting-ip / x-forwarded-for (il primo della lista).
export function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

// Rate limit condiviso via Postgres (funzione atomica check_rate_limit).
// FAIL-OPEN: se il DB/funzione non risponde, NON blocchiamo l'utente legittimo
// (preferiamo lasciar passare qualche richiesta che bloccare clienti veri).
export async function rateLimit(request, { name, limit, windowSec, ip }) {
  const clientIp = ip || getClientIp(request)
  const key = `${name}:${clientIp}`
  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSec,
    })
    if (error) return { allowed: true, degraded: true }
    return { allowed: data === true }
  } catch {
    return { allowed: true, degraded: true }
  }
}

// Risposta standard 429.
export function tooManyRequests() {
  return Response.json(
    { error: 'Troppe richieste. Riprova tra qualche minuto.' },
    { status: 429 }
  )
}
