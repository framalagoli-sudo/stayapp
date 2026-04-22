import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Home, Compass, Bell, Info,
  Images, LayoutGrid, Utensils, Zap, Mountain,
  Wifi, Phone, Mail, MapPin, FileText,
  X, Check,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import RequestForm from './RequestForm'
import ServicesTab from './ServicesTab'
import RestaurantTab from './RestaurantTab'
import ActivitiesTab from './ActivitiesTab'
import ExcursionsTab from './ExcursionsTab'

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}
const DEFAULT_THEME = {
  primaryColor: '#00b5b5', bgColor: '#ffffff', textColor: '#1a1a2e',
  fontHeading: 'playfair', fontBody: 'inter', headerStyle: 'solid', borderStyle: 'mixed',
}
const FONT_URLS = {
  playfair:   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  cormorant:  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap',
  raleway:    'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
  nunito:     'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  'dm-sans':  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
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

const NAV_ITEMS = [
  { key: 'home',     Icon: Home,    label: 'Home' },
  { key: 'esplora',  Icon: Compass, label: 'Esplora' },
  { key: 'richiesta',Icon: Bell,    label: 'Richiesta' },
  { key: 'info',     Icon: Info,    label: 'Info' },
]

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GuestApp() {
  const { slug } = useParams()
  const [property,    setProperty]    = useState(null)
  const [error,       setError]       = useState(null)
  const [nav,         setNav]         = useState('home')
  const [exploreChip, setExploreChip] = useState(null)

  useEffect(() => {
    apiFetch(`/api/guest/${slug}`)
      .then(setProperty)
      .catch(() => setError('Struttura non trovata.'))
  }, [slug])

  useEffect(() => {
    if (!property) return
    const t = { ...DEFAULT_THEME, ...(property.theme || {}) }
    loadFont(t.fontHeading)
    loadFont(t.fontBody)
  }, [property?.theme?.fontHeading, property?.theme?.fontBody])

  if (error)     return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!property) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  const modules       = { ...DEFAULT_MODULES, ...(property.modules || {}) }
  const theme         = { ...DEFAULT_THEME,   ...(property.theme   || {}) }
  const primary       = theme.primaryColor
  const bgColor       = theme.bgColor
  const textColor     = theme.textColor
  const headingFamily = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const bodyFamily    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const radius        = BORDER_RADII[theme.borderStyle]     ?? 8
  const isDark        = bgColor === '#1a1a2e'
  const subText       = isDark ? '#aaa' : '#777'
  const cardBg        = isDark ? '#1e1e32' : '#fff'
  const surfaceBg     = isDark ? '#252538' : '#f7f7f9'
  const navBg         = isDark ? '#12121f' : '#ffffff'
  const borderColor   = isDark ? '#2a2a3e' : '#efefef'

  const sp = { primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor }

  function goExplore(chip) { setExploreChip(chip); setNav('esplora') }

  // Header
  const headerContent = (
    <div style={{ textAlign: 'center' }}>
      {property.logo_url && (
        <img key={property.logo_url} src={property.logo_url} alt="logo"
          style={{ maxHeight: 100, maxWidth: 220, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
      )}
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: headingFamily, color: '#fff',
        textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
        {property.name}
      </h1>
    </div>
  )

  const AppHeader = property.cover_url ? (
    <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
      <img src={property.cover_url} alt="cover"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 18px' }}>{headerContent}</div>
    </div>
  ) : (
    <div style={{
      background: theme.headerStyle === 'gradient'
        ? `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` : primary,
      padding: '28px 20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {headerContent}
    </div>
  )

  return (
    <>
      <style>{`
        .g-shell { display:flex; flex-direction:column; min-height:100vh; background:${bgColor}; }
        .g-app   { flex:1; display:flex; flex-direction:column; width:100%; max-width:430px; margin:0 auto; background:${bgColor}; }
        .g-scroll { flex:1; overflow-y:auto; scrollbar-width:none; }
        .g-scroll::-webkit-scrollbar { display:none; }
        .g-nav   { flex-shrink:0; display:flex; background:${navBg}; border-top:1px solid ${borderColor}; padding-bottom:env(safe-area-inset-bottom); }
        .g-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:60px; border:none; background:none; cursor:pointer; padding:0; }
        .feature-card { transition:transform 0.14s ease, box-shadow 0.14s ease; }
        .feature-card:active { transform:scale(0.96); }
        @media (min-width:769px) {
          .g-shell { background:linear-gradient(145deg,#0f0f1a 0%,#1c1c32 60%,#0f1a1a 100%); flex-direction:row; justify-content:center; align-items:flex-start; padding:36px 20px 48px; }
          .g-app { flex:none; width:390px; height:calc(100vh - 84px); border-radius:44px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.06); }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.22s ease; }
        .gallery-scroll { overflow-x:auto; scrollbar-width:none; }
        .gallery-scroll::-webkit-scrollbar { display:none; }
        .chip-bar::-webkit-scrollbar { display:none; }
      `}</style>

      <div className="g-shell">
        <div className="g-app" style={{ fontFamily: bodyFamily, color: textColor }}>

          {AppHeader}

          <div key={nav} className="g-scroll fade-up">
            {nav === 'home'     && <HomePage      property={property} modules={modules} onExplore={goExplore} {...sp} headingFamily={headingFamily} />}
            {nav === 'esplora'  && <EsploraPage   property={property} chip={exploreChip} setChip={setExploreChip} {...sp} headingFamily={headingFamily} />}
            {nav === 'richiesta'&& <div style={{ padding: 20 }}><RequestForm propertyId={property.id} modules={modules} primary={primary} radius={radius} textColor={textColor} isDark={isDark} /></div>}
            {nav === 'info'     && <InfoPage       property={property} modules={modules} {...sp} headingFamily={headingFamily} />}
          </div>

          <nav className="g-nav">
            {NAV_ITEMS.map(({ key, Icon, label }) => (
              <button key={key} type="button" className="g-nav-btn" onClick={() => setNav(key)}>
                <Icon size={22} strokeWidth={1.5} color={primary} style={{ opacity: nav === key ? 1 : 0.4 }} />
                <span style={{ fontSize: 10, fontWeight: nav === key ? 700 : 400, color: nav === key ? primary : subText, lineHeight: 1 }}>
                  {label}
                </span>
              </button>
            ))}
          </nav>

        </div>
      </div>
    </>
  )
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomePage({ property, modules, onExplore, primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor }) {
  const hasServices   = (property.services  || []).length > 0
  const hasRestaurant = property.restaurant?.active
  const hasGallery    = (property.gallery   || []).length > 0
  const hasActivities = (property.activities|| []).some(c => c.items?.some(i => i.active))
  const hasExcursions = (property.excursions|| []).some(e => e.active)

  const svcCount = property.services?.length || 0
  const actCount = (property.activities || []).reduce((n, c) => n + (c.items?.filter(i => i.active).length || 0), 0)
  const excCount = (property.excursions || []).filter(e => e.active).length
  const galCount = property.gallery?.length || 0
  const catCount = property.restaurant?.categories?.length || 0

  const CARDS = [
    hasGallery    && { key: 'galleria',   Icon: Images,     label: 'Galleria',   sub: `${galCount} foto`,                             photo: property.gallery?.[0] },
    hasServices   && { key: 'servizi',    Icon: LayoutGrid, label: 'Servizi',    sub: `${svcCount} disponibili`,                      photo: null },
    hasRestaurant && { key: 'ristorante', Icon: Utensils,   label: 'Ristorante', sub: catCount ? `${catCount} categorie` : 'Menù',   photo: null },
    hasActivities && { key: 'attivita',   Icon: Zap,        label: 'Attività',   sub: `${actCount} attività`,                        photo: null },
    hasExcursions && { key: 'escursioni', Icon: Mountain,   label: 'Escursioni', sub: `${excCount} disponibili`,                     photo: null },
  ].filter(Boolean)

  return (
    <div style={{ padding: '20px 16px 28px' }}>

      {/* Welcome card */}
      {(property.checkin_time || property.checkout_time || property.description) && (
        <div style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
          borderRadius: 20, padding: '22px 24px', marginBottom: 28,
          boxShadow: `0 8px 32px ${primary}44`,
        }}>
          {property.description && (
            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6 }}>
              {property.description}
            </p>
          )}
          {(property.checkin_time || property.checkout_time) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {property.checkin_time && (
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Check-in</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: headingFamily, lineHeight: 1 }}>{property.checkin_time}</div>
                </div>
              )}
              {property.checkout_time && (
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Check-out</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: headingFamily, lineHeight: 1 }}>{property.checkout_time}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feature cards */}
      {CARDS.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: headingFamily, color: textColor, margin: '0 0 14px' }}>Esplora</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {CARDS.map(({ key, Icon, label, sub, photo }, i) => {
              const isAlone = i === CARDS.length - 1 && CARDS.length % 2 !== 0
              return (
                <div key={key} className="feature-card" onClick={() => onExplore(key)} style={{
                  gridColumn: isAlone ? 'span 2' : undefined,
                  borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                  minHeight: isAlone ? 100 : 140,
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '14px 16px', position: 'relative',
                  background: photo ? 'transparent' : isDark ? '#1e1e32' : `${primary}0d`,
                  boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.35)' : '0 2px 16px rgba(0,0,0,0.07)',
                  border: isDark ? `1px solid ${borderColor}` : 'none',
                }}>
                  {photo && (
                    <>
                      <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.65) 100%)' }} />
                    </>
                  )}
                  <div style={{ position: 'relative' }}>
                    <Icon size={isAlone ? 28 : 34} strokeWidth={1.5} color={photo ? '#fff' : primary} style={{ marginBottom: 8, display: 'block' }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: photo ? '#fff' : textColor, lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 12, color: photo ? 'rgba(255,255,255,0.75)' : subText, marginTop: 3 }}>{sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {CARDS.length === 0 && !property.checkin_time && !property.checkout_time && (
        <p style={{ textAlign: 'center', color: subText, marginTop: 48, fontSize: 15 }}>Benvenuto!</p>
      )}
    </div>
  )
}

// ─── ESPLORA ──────────────────────────────────────────────────────────────────
function EsploraPage({ property, chip, setChip, primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor }) {
  const [lightbox, setLightbox] = useState(null)

  const hasServices   = (property.services  || []).length > 0
  const hasRestaurant = property.restaurant?.active
  const hasGallery    = (property.gallery   || []).length > 0
  const hasActivities = (property.activities|| []).some(c => c.items?.some(i => i.active))
  const hasExcursions = (property.excursions|| []).some(e => e.active)

  const CHIPS = [
    hasGallery    && { key: 'galleria',   label: 'Galleria' },
    hasServices   && { key: 'servizi',    label: 'Servizi' },
    hasRestaurant && { key: 'ristorante', label: 'Ristorante' },
    hasActivities && { key: 'attivita',   label: 'Attività' },
    hasExcursions && { key: 'escursioni', label: 'Escursioni' },
  ].filter(Boolean)

  const activeChip = CHIPS.find(c => c.key === chip) ? chip : CHIPS[0]?.key

  if (!CHIPS.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: subText }}>
        <Compass size={40} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
        <p style={{ margin: 0, fontSize: 15 }}>Nessun contenuto disponibile.</p>
      </div>
    )
  }

  const sp = { primary, textColor, subText, isDark, radius, headingFamily }

  return (
    <div>
      {/* Sticky chip bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: bgColor, borderBottom: `1px solid ${borderColor}`, padding: '12px 16px' }}>
        <div className="chip-bar" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CHIPS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setChip(key)} style={{
              padding: '8px 16px', borderRadius: 20, cursor: 'pointer', flexShrink: 0,
              fontSize: 13, fontWeight: activeChip === key ? 700 : 400,
              border: `1.5px solid ${activeChip === key ? primary : borderColor}`,
              background: activeChip === key ? primary : 'transparent',
              color: activeChip === key ? '#fff' : subText,
              transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Section content */}
      <div key={activeChip} className="fade-up" style={{ padding: '20px 16px 28px' }}>
        {activeChip === 'galleria'   && <GalleriaGrid gallery={property.gallery || []} radius={radius} onOpen={setLightbox} />}
        {activeChip === 'servizi'    && <ServicesTab services={property.services} {...sp} />}
        {activeChip === 'ristorante' && <RestaurantTab restaurant={property.restaurant} {...sp} />}
        {activeChip === 'attivita'   && <ActivitiesTab activities={property.activities} propertyId={property.id} {...sp} />}
        {activeChip === 'escursioni' && <ExcursionsTab excursions={property.excursions} propertyId={property.id} {...sp} />}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <img src={lightbox} alt=""
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain', display: 'block' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2} color="#fff" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── INFO ─────────────────────────────────────────────────────────────────────
function InfoPage({ property, modules, primary, textColor, subText, isDark, radius, headingFamily, cardBg, borderColor }) {
  const [copied, setCopied] = useState(false)
  const shadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)'

  function copyPassword() {
    navigator.clipboard.writeText(property.wifi_password || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ padding: '20px 16px 28px' }}>

      {modules.wifi && property.wifi_name && (
        <InfoSection Icon={Wifi} title="WiFi" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ background: cardBg, borderRadius: 16, padding: 20, boxShadow: shadow }}>
            <div style={{ fontSize: 11, color: subText, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Rete</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: textColor, marginBottom: 16 }}>{property.wifi_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: subText, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Password</div>
                <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: 2, color: textColor }}>{property.wifi_password}</div>
              </div>
              <button onClick={copyPassword}
                style={{ padding: '10px 20px', background: copied ? '#22c55e' : primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                {copied
                  ? <><Check size={14} strokeWidth={2.5} style={{ verticalAlign: 'middle', marginRight: 3 }} />Copiata</>
                  : 'Copia'}
              </button>
            </div>
          </div>
        </InfoSection>
      )}

      {(property.phone || property.email || property.address) && (
        <InfoSection Icon={MapPin} title="Contatti" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ background: cardBg, borderRadius: 16, overflow: 'hidden', boxShadow: shadow }}>
            {property.phone && (
              <ContactRow Icon={Phone} label="Telefono" value={property.phone} href={`tel:${property.phone}`} primary={primary} textColor={textColor} subText={subText} border={borderColor} />
            )}
            {property.email && (
              <ContactRow Icon={Mail} label="Email" value={property.email} href={`mailto:${property.email}`} primary={primary} textColor={textColor} subText={subText} border={borderColor} />
            )}
            {property.address && (
              <ContactRow Icon={MapPin} label="Indirizzo" value={property.address} href={`https://maps.google.com/?q=${encodeURIComponent(property.address)}`} primary={primary} textColor={textColor} subText={subText} border="transparent" />
            )}
          </div>
        </InfoSection>
      )}

      {property.rules && (
        <InfoSection Icon={FileText} title="Regole della struttura" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ background: cardBg, borderRadius: 16, padding: 20, boxShadow: shadow }}>
            <p style={{ margin: 0, fontSize: 14, color: subText, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {property.rules}
            </p>
          </div>
        </InfoSection>
      )}

    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function GalleriaGrid({ gallery, radius, onOpen }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {gallery.map((url, i) => (
        <img key={url + i} src={url} alt=""
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: radius, cursor: 'pointer', display: 'block' }}
          onClick={() => onOpen(url)} />
      ))}
    </div>
  )
}

function InfoSection({ Icon, title, primary, headingFamily, textColor, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, fontFamily: headingFamily, color: textColor, margin: '0 0 12px' }}>
        <Icon size={18} strokeWidth={1.5} color={primary} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function ContactRow({ Icon, label, value, href, primary, textColor, subText, border }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: `1px solid ${border}`, textDecoration: 'none' }}>
      <Icon size={20} strokeWidth={1.5} color={primary} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
      <span style={{ fontSize: 18, color: primary, flexShrink: 0, opacity: 0.6 }}>›</span>
    </a>
  )
}
