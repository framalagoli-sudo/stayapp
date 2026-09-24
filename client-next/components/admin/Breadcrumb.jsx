'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAzienda } from '@/context/AziendaContext'
import { ChevronRight } from 'lucide-react'
import { SEZIONI, VOCI } from './menu-pannello'

// I nomi vengono dal menu (menu-pannello.js): la pagina che nel menu si chiama
// «Sito web» non deve chiamarsi «Pagine CMS» qui sopra. Prima c'erano tre
// dizionari, uno per tipo di entità, e ciascuno la chiamava in modo diverso.
const ALTRE_SEZIONI = { modules: SEZIONI.moduli.label, minisito: SEZIONI.sito.label, pagine: 'Pagine', activities: 'Attività', excursions: 'Escursioni' }
const nomeSezione = (sub) => SEZIONI[sub]?.label || ALTRE_SEZIONI[sub] || sub

const TOP_LEVEL = {
  ...Object.fromEntries(Object.values(VOCI).filter(v => v.to).map(v => [v.to, v.label])),
  '/admin/booking': 'Calendario',
}

function buildCrumbs(pathname, strutture, ristoranti, attivita) {
  const root = { label: 'Dashboard', to: '/admin' }
  if (pathname === '/admin') return []

  if (TOP_LEVEL[pathname]) return [root, { label: TOP_LEVEL[pathname], to: pathname }]

  // Blog categorie
  if (pathname === '/admin/blog/categories')
    return [root, { label: VOCI.blog.label, to: '/admin/blog' }, { label: 'Categorie', to: pathname }]

  // Booking sub-pages
  if (pathname.startsWith('/admin/booking/')) {
    const sub = pathname.replace('/admin/booking/', '')
    return [root, { label: VOCI.booking.label, to: '/admin/booking' }, { label: { risorse: 'Risorse', prenotazioni: 'Prenotazioni' }[sub] || sub, to: pathname }]
  }

  // Newsletter editor
  if (/^\/admin\/newsletter\/.+$/.test(pathname))
    return [root, { label: 'Newsletter', to: '/admin/newsletter' }, { label: 'Editor', to: pathname }]

  // Blog editor
  if (/^\/admin\/blog\/.+$/.test(pathname))
    return [root, { label: VOCI.blog.label, to: '/admin/blog' }, { label: 'Editor', to: pathname }]

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
    return [root, { label: 'Struttura', to: '/admin/property/info' }, { label: nomeSezione(propertyMatch[1]), to: pathname }]

  // Struttura
  const strutturaMatch = pathname.match(/^\/admin\/struttura\/([^/]+)\/(.+)$/)
  if (strutturaMatch) {
    const [, id, sub] = strutturaMatch
    const name = strutture.find(s => s.id === id)?.name || 'Struttura'
    return [root, { label: name, to: `/admin/struttura/${id}/sito` }, { label: nomeSezione(sub), to: pathname }]
  }

  // Ristorante
  const ristoranteMatch = pathname.match(/^\/admin\/ristoranti\/([^/]+)\/(.+)$/)
  if (ristoranteMatch) {
    const [, id, sub] = ristoranteMatch
    const name = ristoranti.find(r => r.id === id)?.name || 'Ristorante'
    return [root, { label: name, to: `/admin/ristoranti/${id}/sito` }, { label: nomeSezione(sub), to: pathname }]
  }

  // Attività
  const attivitaMatch = pathname.match(/^\/admin\/attivita\/([^/]+)\/(.+)$/)
  if (attivitaMatch) {
    const [, id, sub] = attivitaMatch
    const name = (attivita || []).find(a => a.id === id)?.name || 'Attività'
    return [root, { label: name, to: `/admin/attivita/${id}/sito` }, { label: nomeSezione(sub), to: pathname }]
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
