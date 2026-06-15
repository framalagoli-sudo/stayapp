import * as Sentry from '@sentry/nextjs'

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

// Cattura gli errori nelle route API/server (500, eccezioni non gestite) → Sentry.
// Inerte se Sentry non è inizializzato (manca SENTRY_DSN).
export const onRequestError = Sentry.captureRequestError
