const { withSentryConfig } = require('@sentry/nextjs')
// next-pwa DISABILITATO: il suo SW precacheava lo shell e serviva versioni stale dopo
// i deploy -> pagine bianche (Chrome bianco / Edge ok). Al suo posto un kill-switch SW
// statico in public/sw.js che si auto-distrugge. La PWA installabile si potrà ri-abilitare
// in futuro con una config NetworkFirst sicura. Vedi public/sw.js e PWARegister.js.
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: true,
  register: false,
  skipWaiting: true,
})

// Content-Security-Policy "livello 1": restringe da DOVE possono arrivare gli
// script (vera difesa anti-XSS) e blocca il framing del sito (anti-clickjacking),
// restando permissiva su img/connect/frame per non rompere PWA, Supabase realtime,
// embed (mappe/video) e gli innumerevoli stili inline dell'app.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://va.vercel-scripts.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "media-src 'self' https: data: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true, // abilita instrumentation.js (init Sentry server/edge)
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'tdoehiyssmsccpzelgxb.supabase.co' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
}

// withSentryConfig wrappa SOPRA next-pwa: gestisce l'inizializzazione corretta
// del SDK in tutti i runtime (server/edge/client) su Vercel serverless — cosa che
// il solo instrumentation.js non faceva. Upload source-map disattivato (niente
// auth token necessario): vogliamo solo la cattura errori.
module.exports = withSentryConfig(withPWA(nextConfig), {
  org: 'oltrenova',
  project: 'javascript-nextjs',
  silent: true,
  sourcemaps: { disable: true },
})
