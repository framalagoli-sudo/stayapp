'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAzienda } from '@/context/AziendaContext'
import { ChevronRight } from 'lucide-react'

const PROPERTY_SUBS = {
  info: 'Informazioni', modules: 'App Clienti', services: 'Servizi',
  gallery: 'Galleria', theme: 'Tema e colori', activities: 'Attività',
  excursions: 'Escursioni', sito: 'Sito web', privacy: 'Privacy & Policy', chatbot: 'Chatbot',
}
const RISTORANTE_SUB_LABELS = {
  info: 'Informazioni', moduli: 'App Clienti', menu: 'Menu',
  gallery: 'Galleria', theme: 'Tema e colori', minisito: 'Sito web', sito: 'Pagine CMS',
  privacy: 'Privacy & Policy', chatbot: 'Chatbot',
}
const ATTIVITA_SUB_LABELS = {
  info: 'Informazioni', moduli: 'App Clienti', gallery: 'Galleria', theme: 'Tema e colori',
  sito: 'Sito', privacy: 'Privacy & Policy', chatbot: 'Chatbot',
}
const TOP_LEVEL = {
  '/admin/analytics':    'Analytics',
  '/admin/security':     'Sicurezza account',
  '/admin/requests':     'Richieste',
  '/admin/prenotazioni': 'Prenotazioni',
  '/admin/booking':      'Booking',
  '/admin/contatti':     'Contatti',
  '/admin/newsletter':   'Newsletter',
  '/admin/blog':         'Blog & News',
  '/admin/eventi':       'Eventi',
  '/admin/staff':        'Collaboratori',
  '/admin/audit-log':    'Audit log',
  '/admin/demo':         'Richieste demo',
  '/admin/qrcode':       'QR Code',
  '/admin/aziende':      'Aziende',
  '/admin/properties':   'Strutture',
  '/admin/ristoranti':   'Ristoranti',
  '/admin/attivita':     'Attività',
  '/admin/users':        'Utenti',
  '/admin/chat':         'Chat',
}

function buildCrumbs(pathname, strutture, ristoranti, attivita) {
  const root = { label: 'Dashboard', to: '/admin' }
  if (pathname === '/admin') return []

  if (TOP_LEVEL[pathname]) return [root, { label: TOP_LEVEL[pathname], to: pathname }]

  // Blog categorie
  if (pathname === '/admin/blog/categories')
    return [root, { label: 'Blog & News', to: '/admin/blog' }, { label: 'Categorie', to: pathname }]

  // Booking sub-pages
  if (pathname.startsWith('/admin/booking/')) {
    const sub = pathname.replace('/admin/booking/', '')
    return [root, { label: 'Booking', to: '/admin/booking' }, { label: { risorse: 'Risorse', prenotazioni: 'Prenotazioni' }[sub] || sub, to: pathname }]
  }

  // Newsletter editor
  if (/^\/admin\/newsletter\/.+$/.test(pathname))
    return [root, { label: 'Newsletter', to: '/admin/newsletter' }, { label: 'Editor', to: pathname }]

  // Blog editor
  if (/^\/admin\/blog\/.+$/.test(pathname))
    return [root, { label: 'Blog & News', to: '/admin/blog' }, { label: 'Editor', to: pathname }]

  // Evento prenotazioni
  const evPrenotMatch = pathname.match(/^\/admin\/eventi\/([^/]+)\/prenotazioni$/)
  if (evPrenotMatch)
    return [root, { label: 'Eventi', to: '/admin/eventi' }, { label: 'Evento', to: `/admin/eventi/${evPrenotMatch[1]}` }, { label: 'Prenotazioni', to: pathname }]

  // Evento edit
  if (/^\/admin\/eventi\/.+$/.test(pathname))
    return [root, { label: 'Eventi', to: '/admin/eventi' }, { label: 'Modifica', to: pathname }]

  // Pagina editor
  if (/^\/admin\/pagine\/.+$/.test(pathname))
    return [root, { label: 'Editor pagina', to: pathname }]

  // Property sub-pages (legacy /admin/property/*)
  const propertyMatch = pathname.match(/^\/admin\/property\/(.+)$/)
  if (propertyMatch)
    return [root, { label: 'Struttura', to: '/admin/property/info' }, { label: PROPERTY_SUBS[propertyMatch[1]] || propertyMatch[1], to: pathname }]

  // Struttura
  const strutturaMatch = pathname.match(/^\/admin\/struttura\/([^/]+)\/(.+)$/)
  if (strutturaMatch) {
    const [, id, sub] = strutturaMatch
    const name = strutture.find(s => s.id === id)?.name || 'Struttura'
    return [root, { label: name, to: `/admin/struttura/${id}/info` }, { label: PROPERTY_SUBS[sub] || sub, to: pathname }]
  }

  // Ristorante
  const ristoranteMatch = pathname.match(/^\/admin\/ristoranti\/([^/]+)\/(.+)$/)
  if (ristoranteMatch) {
    const [, id, sub] = ristoranteMatch
    const name = ristoranti.find(r => r.id === id)?.name || 'Ristorante'
    return [root, { label: name, to: `/admin/ristoranti/${id}/info` }, { label: RISTORANTE_SUB_LABELS[sub] || sub, to: pathname }]
  }

  // Attività
  const attivitaMatch = pathname.match(/^\/admin\/attivita\/([^/]+)\/(.+)$/)
  if (attivitaMatch) {
    const [, id, sub] = attivitaMatch
    const name = (attivita || []).find(a => a.id === id)?.name || 'Attività'
    return [root, { label: name, to: `/admin/attivita/${id}/info` }, { label: ATTIVITA_SUB_LABELS[sub] || sub, to: pathname }]
  }

  return []
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const router = useRouter()
  const { strutture = [], ristoranti = [], attivita = [] } = useAzienda()

  const crumbs = buildCrumbs(pathname, strutture, ristoranti, attivita)
  if (crumbs.length <= 1) return null

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, fontSize: 13 }}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isLast ? (
              <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{crumb.label}</span>
            ) : (
              <button
                onClick={() => router.push(crumb.to)}
                style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 0, fontSize: 13 }}
              >
                {crumb.label}
              </button>
            )}
            {!isLast && <ChevronRight size={13} strokeWidth={1.5} color="#bbb" />}
          </span>
        )
      })}
    </nav>
  )
}
