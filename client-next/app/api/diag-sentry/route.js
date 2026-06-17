import * as Sentry from '@sentry/nextjs'

// Route diagnostica TEMPORANEA: testa se l'init MANUALE di Sentry funziona
// (l'auto-init via instrumentation/withSentryConfig non si aggancia su Next 14).
export async function GET() {
  let client = Sentry.getClient()
  let manualInit = false
  if (!client) {
    const dsn = (process.env.SENTRY_DSN || '').trim()
    if (dsn) {
      Sentry.init({ dsn, environment: 'production', tracesSampleRate: 0 })
      client = Sentry.getClient()
      manualInit = true
    }
  }
  const eventId = Sentry.captureException(
    new Error('OltreNova — test cattura Sentry server-side v3 (init manuale)')
  )
  await Sentry.flush(3000)
  return Response.json({
    ok: true,
    sentry_initialized: !!client,
    manual_init_used: manualInit,
    event_id: eventId || null,
  })
}
