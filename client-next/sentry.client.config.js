import * as Sentry from '@sentry/nextjs'

// Init client-side: attivo solo se NEXT_PUBLIC_SENTRY_DSN è impostata (pubblica).
// Oggi non lo è → inerte. La cattura errori SERVER usa SENTRY_DSN (vedi sentry.server.config).
const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN || '').trim()

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'production',
  })
}
