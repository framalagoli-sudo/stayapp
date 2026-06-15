import * as Sentry from '@sentry/nextjs'

// Inerte finché SENTRY_DSN non è impostata su Vercel → deploy sicuro.
const dsn = (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '').trim()

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || 'production',
  })
}
