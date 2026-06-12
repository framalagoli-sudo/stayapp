import './globals.css'
import PWARegister from '@/components/PWARegister'

export const metadata = {
  title: 'OltreNova',
  description: 'La piattaforma per il tuo business di servizi',
  manifest: '/manifest.json',
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
