import { logError } from '@/lib/observability'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'

// Riceve i crash lato client dall'error boundary (app/error.js) e li registra
// nei Runtime Logs di Vercel. Pubblico → rate-limit + cap dimensioni per non
// trasformarlo in un vettore di spam/abuso. Nessun alert email (i crash client
// sono rumorosi): visibilità sì, notifica no.
export async function POST(request) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'client-error', limit: 30, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    let body = {}
    try { body = await request.json() } catch {}

    const message = String(body?.message || 'client error').slice(0, 500)
    await logError('client', message, {
      name: String(body?.name || '').slice(0, 100),
      path: String(body?.path || '').slice(0, 300),
      stack: String(body?.stack || '').slice(0, 4000),
      ip,
    })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: true })
  }
}
