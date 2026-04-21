import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import RequestForm from './RequestForm'
import ServicesTab from './ServicesTab'
import RestaurantTab from './RestaurantTab'
import ActivitiesTab from './ActivitiesTab'

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

const DEFAULT_THEME = {
  primaryColor: '#00b5b5',
  bgColor: '#ffffff',
  textColor: '#1a1a2e',
  fontHeading: 'playfair',
  fontBody: 'inter',
  headerStyle: 'solid',
  borderStyle: 'mixed',
}

const FONT_URLS = {
  // heading fonts
  playfair:   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  cormorant:  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap',
  raleway:    'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
  nunito:     'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  'dm-sans':  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
  // body fonts
  inter:      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  lato:       'https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&display=swap',
  'open-sans':'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
}

const HEADING_FAMILIES = {
  playfair:   "'Playfair Display', Georgia, serif",
  cormorant:  "'Cormorant Garamond', Georgia, serif",
  raleway:    "'Raleway', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  nunito:     "'Nunito', system-ui, sans-serif",
  'dm-sans':  "'DM Sans', system-ui, sans-serif",
}

const BODY_FAMILIES = {
  inter:      "'Inter', system-ui, sans-serif",
  lato:       "'Lato', system-ui, sans-serif",
  'open-sans':"'Open Sans', system-ui, sans-serif",
}

const BORDER_RADII = { rounded: 16, mixed: 8, square: 0 }

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

export default function GuestApp() {
  const { slug } = useParams()
  const [property, setProperty] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(null)

  useEffect(() => {
    fetch(`/api/guest/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setProperty)
      .catch(() => setError('Struttura non trovata.'))
  }, [slug])

  useEffect(() => {
    if (!property) return
    const t = { ...DEFAULT_THEME, ...(property.theme || {}) }
    loadFont(t.fontHeading)
    loadFont(t.fontBody)
  }, [property?.theme?.fontHeading, property?.theme?.fontBody])

  useEffect(() => {
    if (!property) return
    const m = { ...DEFAULT_MODULES, ...(property.modules || {}) }
    const hasRequests = m.reception || m.housekeeping
    const actionsActive = (property.activities || []).some(c => c.items?.some(i => i.active))
    if (m.info)                            { setTab('info');       return }
    if ((property.services || []).length)  { setTab('services');   return }
    if (property.restaurant?.active)       { setTab('restaurant'); return }
    if (actionsActive)                     { setTab('activities'); return }
    if (m.wifi)                            { setTab('wifi');       return }
    if (hasRequests)                       { setTab('request');    return }
  }, [property])

  if (error) return <div style={{ padding: 32, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!property) return <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  const modules = { ...DEFAULT_MODULES, ...(property.modules || {}) }
  const theme   = { ...DEFAULT_THEME, ...(property.theme || {}) }

  const primary       = theme.primaryColor
  const bgColor       = theme.bgColor
  const textColor     = theme.textColor
  const headingFamily = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const bodyFamily    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const radius        = BORDER_RADII[theme.borderStyle]     ?? 8
  const isDark        = bgColor === '#1a1a2e'
  const subText       = isDark ? '#aaa' : '#666'

  const hasRequests    = modules.reception || modules.housekeeping
  const hasServices    = (property.services || []).length > 0
  const hasRestaurant  = property.restaurant?.active
  const hasActivities  = (property.activities || []).some(cat =>
    cat.items?.some(item => item.active)
  )

  const allTabs = [
    { key: 'info',       label: 'Info',       visible: modules.info },
    { key: 'services',   label: 'Servizi',    visible: hasServices },
    { key: 'restaurant', label: 'Ristorante', visible: hasRestaurant },
    { key: 'activities', label: 'Attività',   visible: hasActivities },
    { key: 'wifi',       label: 'WiFi',       visible: modules.wifi },
    { key: 'request',    label: 'Richiesta',  visible: hasRequests },
  ]
  const visibleTabs = allTabs.filter(t => t.visible)

  function Header() {
    // Bottom identity block: logo (if present) + name, always centered
    const identity = (
      <div style={{ textAlign: 'center' }}>
        {property.logo_url && (
          <img
            key={property.logo_url}
            src={property.logo_url}
            alt="logo"
            style={{ maxHeight: 120, maxWidth: 240, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }}
          />
        )}
        <h1 style={{
          margin: 0, fontSize: 20, fontWeight: 700,
          fontFamily: headingFamily, color: '#fff',
          textShadow: property.cover_url ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
        }}>
          {property.name}
        </h1>
      </div>
    )

    // With cover photo: image fills header, gradient overlay from bottom, identity pinned at bottom
    if (property.cover_url) {
      return (
        <div style={{
          position: 'relative', height: 220, overflow: 'hidden', flexShrink: 0,
        }}>
          <img
            src={property.cover_url}
            alt="cover"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* gradient overlay: transparent top → dark bottom */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.6) 100%)',
          }} />
          {/* identity at bottom of overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '0 20px 20px',
          }}>
            {identity}
          </div>
        </div>
      )
    }

    // No cover photo: solid primary color, identity centered vertically
    const headerBg = theme.headerStyle === 'gradient'
      ? `linear-gradient(135deg, ${primary} 0%, ${primary}bb 100%)`
      : primary

    return (
      <div style={{
        background: headerBg, padding: '32px 20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {identity}
      </div>
    )
  }

  return (
    <>
      <style>{`
        .guest-shell {
          min-height: 100vh;
          background: ${bgColor};
        }
        .guest-app {
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
          min-height: 100vh;
        }
        @media (min-width: 769px) {
          .guest-shell {
            background: linear-gradient(145deg, #0f0f1a 0%, #1c1c32 60%, #0f1a1a 100%);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 36px 20px 48px;
          }
          .guest-app {
            min-height: auto;
            border-radius: 44px;
            overflow: hidden;
            box-shadow:
              0 32px 80px rgba(0,0,0,0.7),
              0 0 0 1px rgba(255,255,255,0.06),
              inset 0 0 0 1px rgba(255,255,255,0.03);
            max-height: calc(100vh - 72px);
            overflow-y: auto;
            scrollbar-width: none;
          }
          .guest-app::-webkit-scrollbar { display: none; }
          .guest-tabs-sticky { position: sticky !important; top: 0 !important; }
        }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-content { animation: tabFadeIn 0.18s ease; }
        .gallery-scroll { overflow-x: auto; scrollbar-width: none; }
        .gallery-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="guest-shell">
        <div
          className="guest-app"
          style={{
            '--primary': primary,
            '--radius': `${radius}px`,
            fontFamily: bodyFamily,
            background: bgColor,
            color: textColor,
          }}
        >
          <Header />

          {/* Tabs */}
          {visibleTabs.length > 1 && (
            <div
              className="guest-tabs-sticky"
              style={{
                display: 'flex', borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                background: bgColor, position: 'sticky', top: 0, zIndex: 10,
              }}
            >
              {visibleTabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    flex: 1, padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: tab === key ? 700 : 400,
                    color: tab === key ? primary : subText,
                    borderBottom: tab === key ? `2px solid ${primary}` : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: '20px' }}>
            {visibleTabs.length === 0
              ? <p style={{ textAlign: 'center', color: subText, marginTop: 32 }}>Nessun servizio disponibile al momento.</p>
              : <div key={tab} className="tab-content">
                  {tab === 'info'       && <InfoTab property={property} primary={primary} textColor={textColor} subText={subText} headingFamily={headingFamily} isDark={isDark} radius={radius} />}
                  {tab === 'services'   && <ServicesTab services={property.services} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} />}
                  {tab === 'restaurant' && <RestaurantTab restaurant={property.restaurant} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} headingFamily={headingFamily} />}
                  {tab === 'activities' && <ActivitiesTab activities={property.activities} propertyId={property.id} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} />}
                  {tab === 'wifi'       && <WifiTab property={property} primary={primary} textColor={textColor} subText={subText} headingFamily={headingFamily} isDark={isDark} radius={radius} />}
                  {tab === 'request'    && <RequestForm propertyId={property.id} modules={modules} primary={primary} radius={radius} textColor={textColor} isDark={isDark} />}
                </div>
            }
          </div>
        </div>
      </div>
    </>
  )
}

function InfoTab({ property, primary, textColor, subText, headingFamily, isDark, radius }) {
  const [lightbox, setLightbox] = useState(null)
  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'
  const gallery    = property.gallery || []

  return (
    <div>
      {/* Description */}
      {property.description && (
        <p style={{ color: subText, lineHeight: 1.7, fontSize: 14, margin: '0 0 20px' }}>
          {property.description}
        </p>
      )}

      {/* Gallery horizontal scroll */}
      {gallery.length > 0 && (
        <div style={{ margin: '0 -20px 24px', padding: '0 20px' }}>
          <div className="gallery-scroll" style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
            {gallery.map((url, i) => (
              <img key={url} src={url} alt=""
                style={{ height: 160, width: 240, flexShrink: 0, borderRadius: radius, objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                onClick={() => setLightbox(url)} />
            ))}
          </div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {property.address && (
          <InfoCard label="📍 Indirizzo" value={property.address} textColor={textColor} cardBg={cardBg} cardShadow={cardShadow} radius={radius} />
        )}
        {(property.checkin_time || property.checkout_time) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {property.checkin_time  && <InfoCard label="🏨 Check-in"  value={property.checkin_time}  textColor={textColor} cardBg={cardBg} cardShadow={cardShadow} radius={radius} />}
            {property.checkout_time && <InfoCard label="🚪 Check-out" value={property.checkout_time} textColor={textColor} cardBg={cardBg} cardShadow={cardShadow} radius={radius} />}
          </div>
        )}
        {property.phone && (
          <InfoCard label="📞 Telefono" value={<a href={`tel:${property.phone}`} style={{ color: primary }}>{property.phone}</a>} textColor={textColor} cardBg={cardBg} cardShadow={cardShadow} radius={radius} />
        )}
      </div>

      {/* Rules */}
      {property.rules && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10, marginTop: 0, fontFamily: headingFamily, color: textColor }}>
            Regole della struttura
          </h3>
          <p style={{ color: subText, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
            {property.rules}
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }}
        >
          <img src={lightbox} alt=""
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', display: 'block' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function WifiTab({ property, primary, textColor, subText, headingFamily, isDark, radius }) {
  const [copied, setCopied] = useState(false)
  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'

  function copyPassword() {
    navigator.clipboard.writeText(property.wifi_password || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 16, fontFamily: headingFamily, color: textColor }}>
        📶 Connessione WiFi
      </h3>
      {property.wifi_name ? (
        <div style={{ background: cardBg, borderRadius: radius, padding: 20, boxShadow: cardShadow }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Rete</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: textColor }}>{property.wifi_name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Password</div>
              <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: 2, color: textColor }}>{property.wifi_password}</div>
            </div>
            <button
              onClick={copyPassword}
              style={{ padding: '10px 20px', background: copied ? '#22c55e' : primary, color: '#fff', border: 'none', borderRadius: radius / 2 || 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
            >
              {copied ? '✓ Copiata' : 'Copia'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: subText }}>Informazioni WiFi non disponibili.</p>
      )}
    </div>
  )
}

function InfoCard({ label, value, textColor, cardBg, cardShadow, radius }) {
  return (
    <div style={{ background: cardBg, borderRadius: radius, padding: '14px 16px', boxShadow: cardShadow }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: textColor }}>{value}</div>
    </div>
  )
}
