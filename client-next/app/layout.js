import './globals.css'
import PWARegister from '@/components/PWARegister'

export const metadata = {
  title: 'OltreNova',
  description: 'La piattaforma per il tuo business di servizi',
  manifest: '/manifest.json',
  // Favicon brand OltreNova (prima c'era il default di create-next-app = logo Next/Vercel).
  // Le pagine minisito possono sovrascrivere con il logo dell'entità nella loro generateMetadata.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <meta name="theme-color" content="#1a1a2e" />
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
