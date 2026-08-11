// next-pwa RIMOSSO (era già `disable: true` dal 18/6, quindi inerte a runtime): il suo SW
// precacheava lo shell e serviva versioni stale dopo i deploy -> pagine bianche. Restava
// solo a trascinare workbox/clean-webpack-plugin in build (4 alert Dependabot high su
// brace-expansion) ed era il blocco principale all'upgrade di Next.
// Il service worker vivo è il kill-switch statico committato in public/sw.js, che NON
// dipende da next-pwa; PWARegister.js si limita a disiscrivere i SW residui.
// Per ri-abilitare la PWA installabile: config NetworkFirst per la navigazione, MAI
// precacheAndRoute dello shell HTML (è la causa delle pagine bianche).

// Content-Security-Policy "livello 1": restringe da DOVE possono arrivare gli
// script (vera difesa anti-XSS) e blocca il framing del sito (anti-clickjacking),
// restando permissiva su img/connect/frame per non rompere PWA, Supabase realtime,
// embed (mappe/video) e gli innumerevoli stili inline dell'app.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
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
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig
