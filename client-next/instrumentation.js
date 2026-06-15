// Next.js instrumentation hook → inizializza Sentry lato server/edge.
// Richiede experimental.instrumentationHook in next.config.js (Next 14).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
