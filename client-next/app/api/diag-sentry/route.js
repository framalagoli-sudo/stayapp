import * as Sentry from '@sentry/nextjs'

// Route diagnostica TEMPORANEA: dice se Sentry è inizializzato lato server e
// se l'evento viene catturato. Da rimuovere dopo la verifica.
export async function GET() {
  const client = Sentry.getClient()
  const dsnEnvPresent = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
  const eventId = Sentry.captureException(
    new Error('OltreNova — test cattura Sentry server-side v2 (diagnostico)')
  )
  await Sentry.flush(3000) // attende l'invio prima del freeze serverless
  return Response.json({
    ok: true,
    sentry_initialized: !!client,
    dsn_env_present: dsnEnvPresent,
    event_id: eventId || null,
  })
}
