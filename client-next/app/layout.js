import './globals.css'
import { headers } from 'next/headers'
import { AxiomWebVitals } from 'next-axiom'
import PWARegister from '@/components/PWARegister'

export const metadata = {
  metadataBase: new URL('https://www.oltrenova.com'),
  title: 'OltreNova',
  description: 'La piattaforma per il tuo business di servizi',
  manifest: '/manifest.json',
  // Favicon/icone brand OltreNova (simbolo pianeta, variante dark = fondo scuro).
  // Le pagine minisito possono sovrascrivere con il logo dell'entità nella loro generateMetadata.
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  // OG di default (la condivisione social di / e delle pagine senza OG proprio).
  // I minisiti hanno il loro openGraph con la cover dell'entità.
  openGraph: {
    title: 'OltreNova',
    description: 'La piattaforma per il tuo business di servizi',
    images: ['/og-image.png'],
    type: 'website',
    locale: 'it_IT',
  },
}

export default function RootLayout({ children }) {
  // Site Key Turnstile servita a RUNTIME via meta (no inlining build-time → immune
  // alla build cache che poteva farla sparire dal bundle). Vedi components/Turnstile.jsx.
  const turnstileKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()
  // Lingua impostata dal middleware (header x-stayapp-lang) per le pagine /en → <html lang> corretto in SSR.
  const lang = headers().get('x-stayapp-lang') === 'en' ? 'en' : 'it'
  return (
    <html lang={lang}>
      <head>
        <meta name="theme-color" content="#1a1a2e" />
        {turnstileKey && <meta name="cf-turnstile-sitekey" content={turnstileKey} />}
      </head>
      <body>
        {children}
        <AxiomWebVitals />
        <PWARegister />
      </body>
    </html>
  )
}
