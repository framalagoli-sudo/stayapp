import React, { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import LandingStruttura from './LandingStruttura'
import {
  Home, Compass, Bell, Info, MessageCircle, Send,
  Images, LayoutGrid, Zap, Mountain, Calendar, Users, Euro,
  Wifi, Phone, Mail, MapPin, FileText,
  X, Check, ChevronRight,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import RequestForm from './RequestForm'
import ServicesTab from './ServicesTab'
import ActivitiesTab from './ActivitiesTab'
import ExcursionsTab from './ExcursionsTab'

// Genera o recupera session_id anonimo del guest
function getSessionId() {
  const key = 'chat_session_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
const SESSION_ID = getSessionId()

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

const BASE_NAV = [
  { key: 'home',      Icon: Home,          label: 'Home' },
  { key: 'esplora',   Icon: Compass,       label: 'Esplora' },
  { key: 'richiesta', Icon: Bell,          label: 'Richiesta' },
  { key: 'chat',      Icon: MessageCircle, label: 'Chat',    module: 'chat' },
  { key: 'info',      Icon: Info,          label: 'Info' },
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
  const [searchParams] = useSearchParams()
  const isQR = searchParams.get('qr') === '1'
  const [property,       setProperty]       = useState(null)
  const [upcomingEventi, setUpcomingEventi] = useState([])
  const [error,          setError]          = useState(null)
  const [nav,            setNav]            = useState('home')
  const [exploreChip,    setExploreChip]    = useState(null)
  const [compactBar,   setCompactBar]   = useState(false)
  const [showArrow,    setShowArrow]    = useState(true)
  const scrollRef  = useRef(null)
  const chipBarRef = useRef(null)

  useEffect(() => {
    apiFetch(`/api/guest/${slug}`)
      .then(prop => {
        setProperty(prop)
        apiFetch(`/api/guest/eventi?entity_tipo=struttura&entity_id=${prop.id}`)
          .then(setUpcomingEventi)
          .catch(() => {})
      })
      .catch(() => setError('Struttura non trovata.'))
  }, [slug])

  useEffect(() => {
    if (!property) return
    const t = { ...DEFAULT_THEME, ...(property.theme || {}) }
    loadFont(t.fontHeading)
    loadFont(t.fontBody)
  }, [property?.theme?.fontHeading, property?.theme?.fontBody])

  // Reset scroll + compact bar on tab change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setCompactBar(false)
  }, [nav])

  function handleScroll(e) {
    setCompactBar(e.target.scrollTop > 120)
  }

  function handleChipScroll(e) {
    const el = e.target
    setShowArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  if (error)     return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!property) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  if (!isQR && property.minisito?.active) return <LandingStruttura property={property} />

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

  const NAV_ITEMS = BASE_NAV.filter(item => !item.module || modules[item.module])

  function goExplore(chip) { setExploreChip(chip); setNav('esplora') }

  // Compute chips for Esplora (used both in chip bar and EsploraPage)
  const hasServices   = (property.services  || []).length > 0
  const hasGallery    = (property.gallery   || []).length > 0
  const hasActivities = (property.activities|| []).some(c => c.items?.some(i => i.active))
  const hasExcursions = (property.excursions|| []).some(e => e.active)
  const hasEventi     = upcomingEventi.length > 0
  const CHIPS = [
    hasGallery    && { key: 'galleria',   label: 'Galleria' },
    hasServices   && { key: 'servizi',    label: 'Servizi' },
    hasActivities && { key: 'attivita',   label: 'Attività' },
    hasExcursions && { key: 'escursioni', label: 'Escursioni' },
    hasEventi     && { key: 'eventi',     label: 'Eventi' },
  ].filter(Boolean)
  const activeChip = CHIPS.find(c => c.key === exploreChip) ? exploreChip : CHIPS[0]?.key

  // Full header (scrolls away inside g-scroll)
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
    <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
      <img src={property.cover_url} alt="cover"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 18px' }}>{headerContent}</div>
    </div>
  ) : (
    <div style={{
      background: theme.headerStyle === 'gradient'
        ? `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` : primary,
      padding: '28px 20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {headerContent}
    </div>
  )

  return (
    <>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; }
        .g-shell {
          display:flex; flex-direction:column;
          height:100vh; height:100dvh;
          overflow:hidden; background:${bgColor};
        }
        .g-app {
          flex:1; min-height:0;
          display:flex; flex-direction:column;
          width:100%; max-width:430px; margin:0 auto;
          background:${bgColor}; overflow:hidden;
        }
        .g-scroll { flex:1; min-height:0; overflow-y:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .g-scroll::-webkit-scrollbar { display:none; }
        .g-compact { flex-shrink:0; overflow:hidden; transition:max-height 0.22s ease; }
        .g-chips   { flex-shrink:0; background:${bgColor}; border-bottom:1px solid ${borderColor}; padding:10px 16px; }
        .g-nav {
          flex-shrink:0; display:flex;
          background:${navBg}; border-top:1px solid ${borderColor};
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .g-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:60px; border:none; background:none; cursor:pointer; padding:0; -webkit-tap-highlight-color:transparent; }
        .feature-card { transition:transform 0.14s ease; }
        .feature-card:active { transform:scale(0.96); }
        @media (min-width:769px) {
          .g-shell { background:linear-gradient(145deg,#0f0f1a 0%,#1c1c32 60%,#0f1a1a 100%); flex-direction:row; justify-content:center; align-items:center; }
          .g-app { flex:none; width:390px; height:812px; max-height:calc(100vh - 48px); border-radius:44px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.06); }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.22s ease; }
        .chip-bar { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .chip-bar::-webkit-scrollbar { display:none; }
      `}</style>

      <div className="g-shell">
        <div className="g-app" style={{ fontFamily: bodyFamily, color: textColor }}>

          {/* ── Compact name bar (appears after scroll) ── */}
          <div className="g-compact" style={{ maxHeight: compactBar ? 44 : 0 }}>
            <div style={{
              background: primary,
              height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
            }}>
              {property.logo_url && (
                <img src={property.logo_url} alt="logo"
                  style={{ height: 24, maxWidth: 60, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ color: '#fff', fontWeight: 700, fontFamily: headingFamily, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {property.name}
              </span>
            </div>
          </div>

          {/* ── Chip bar (always visible in Esplora) ── */}
          {nav === 'esplora' && CHIPS.length > 0 && (
            <div className="g-chips">
              <div style={{ position: 'relative' }}>
                <div ref={chipBarRef} className="chip-bar" onScroll={handleChipScroll}
                  style={{ paddingRight: showArrow && CHIPS.length > 2 ? 36 : 0 }}>
                  {CHIPS.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setExploreChip(key)} style={{
                      padding: '8px 16px', borderRadius: 20, cursor: 'pointer', flexShrink: 0,
                      fontSize: 13, fontWeight: activeChip === key ? 700 : 400,
                      border: `1.5px solid ${activeChip === key ? primary : borderColor}`,
                      background: activeChip === key ? primary : 'transparent',
                      color: activeChip === key ? '#fff' : subText,
                      transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
                {showArrow && CHIPS.length > 2 && (
                  <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 44,
                    background: `linear-gradient(to right, transparent, ${bgColor} 70%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    pointerEvents: 'none',
                  }}>
                    <ChevronRight size={18} strokeWidth={1.5} color={primary} style={{ opacity: 0.7 }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Scroll area ── */}
          <div ref={scrollRef} className="g-scroll" onScroll={handleScroll}>
            {AppHeader}
            <div key={nav} className="fade-up">
              {nav === 'home'      && <HomePage      property={property} upcomingEventi={upcomingEventi} modules={modules} onExplore={goExplore} {...sp} headingFamily={headingFamily} />}
              {nav === 'esplora'   && <EsploraPage   property={property} upcomingEventi={upcomingEventi} activeChip={activeChip} {...sp} headingFamily={headingFamily} />}
              {nav === 'richiesta' && <div style={{ padding: 20 }}><RequestForm propertyId={property.id} modules={modules} primary={primary} radius={radius} textColor={textColor} isDark={isDark} /></div>}
              {nav === 'chat'      && <ChatPage      propertyId={property.id} propertyName={property.name} {...sp} headingFamily={headingFamily} />}
              {nav === 'info'      && <InfoPage      property={property} modules={modules} {...sp} headingFamily={headingFamily} />}
            </div>
          </div>

          {/* ── Bottom nav ── */}
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
function HomePage({ property, upcomingEventi = [], modules, onExplore, primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor }) {
  const hasServices   = (property.services  || []).length > 0
  const hasGallery    = (property.gallery   || []).length > 0
  const hasActivities = (property.activities|| []).some(c => c.items?.some(i => i.active))
  const hasExcursions = (property.excursions|| []).some(e => e.active)
  const hasEventi     = upcomingEventi.length > 0

  const svcCount = property.services?.length || 0
  const actCount = (property.activities || []).reduce((n, c) => n + (c.items?.filter(i => i.active).length || 0), 0)
  const excCount = (property.excursions || []).filter(e => e.active).length
  const galCount = property.gallery?.length || 0

  const CARDS = [
    hasGallery    && { key: 'galleria',   Icon: Images,    label: 'Galleria',   sub: `${galCount} foto`,             photo: property.gallery?.[0] },
    hasServices   && { key: 'servizi',    Icon: LayoutGrid, label: 'Servizi',   sub: `${svcCount} disponibili`,      photo: null },
    hasActivities && { key: 'attivita',   Icon: Zap,        label: 'Attività',  sub: `${actCount} attività`,         photo: null },
    hasExcursions && { key: 'escursioni', Icon: Mountain,   label: 'Escursioni', sub: `${excCount} disponibili`,     photo: null },
    hasEventi     && { key: 'eventi',     Icon: Calendar,   label: 'Eventi',    sub: `${upcomingEventi.length} in programma`, photo: upcomingEventi[0]?.cover_url || null },
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

      {/* Scopri anche — entità collegate */}
      {property.collegamenti?.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: headingFamily, color: textColor, margin: '0 0 14px' }}>
            Scopri anche
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {property.collegamenti.map(c => {
              const href = c.tipo === 'ristorante' ? `/r/${c.slug}` : `/s/${c.slug}`
              const typeLabel = c.tipo === 'ristorante' ? 'Ristorante' : 'Struttura'
              const typeColor = c.tipo === 'ristorante' ? '#e63946' : primary
              return (
                <a key={c.id || c.slug} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: isDark ? cardBg : '#fff',
                  borderRadius: radius, padding: '14px 16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  border: isDark ? `1px solid ${borderColor}` : 'none',
                  textDecoration: 'none',
                }}>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${typeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 20 }}>{c.tipo === 'ristorante' ? '🍽️' : '🏨'}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: typeColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{typeLabel}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: 12, color: subText, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{c.description}</div>}
                  </div>
                  <ChevronRight size={18} strokeWidth={1.5} color={subText} />
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ESPLORA ──────────────────────────────────────────────────────────────────
function EsploraPage({ property, upcomingEventi = [], activeChip, primary, textColor, subText, isDark, radius, headingFamily }) {
  const [lightbox, setLightbox] = useState(null)
  const sp = { primary, textColor, subText, isDark, radius, headingFamily }

  if (!activeChip) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: subText }}>
        <Compass size={40} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
        <p style={{ margin: 0, fontSize: 15 }}>Nessun contenuto disponibile.</p>
      </div>
    )
  }

  return (
    <div>
      <div key={activeChip} className="fade-up" style={{ padding: '20px 16px 28px' }}>
        {activeChip === 'galleria'   && <GalleriaGrid gallery={property.gallery || []} radius={radius} onOpen={setLightbox} />}
        {activeChip === 'servizi'    && <ServicesTab services={property.services} {...sp} />}
        {activeChip === 'attivita'   && <ActivitiesTab activities={property.activities} propertyId={property.id} {...sp} />}
        {activeChip === 'escursioni' && <ExcursionsTab excursions={property.excursions} propertyId={property.id} {...sp} />}
        {activeChip === 'eventi'     && <EventiTab eventi={upcomingEventi} {...sp} />}
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

      {(property.amenities || []).length > 0 && (
        <InfoSection Icon={LayoutGrid} title="Dotazioni" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {property.amenities.map(a => (
              <span key={a} style={{ background: cardBg, color: textColor, fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 20, boxShadow: shadow }}>
                {a}
              </span>
            ))}
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

// ─── EventiTab ────────────────────────────────────────────────────────────────
function EventiTab({ eventi, primary, textColor, subText, isDark, radius }) {
  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {eventi.map(ev => (
        <div key={ev.id} style={{ background: isDark ? '#1e1e32' : '#fff', borderRadius: radius || 12, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
          {ev.cover_url && (
            <img src={ev.cover_url} alt={ev.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: textColor, marginBottom: 6 }}>{ev.title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: subText }}>
                <Calendar size={12} strokeWidth={1.5} color={primary} /> {fmtDate(ev.date_start)}
              </span>
              {ev.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: subText }}>
                  <MapPin size={12} strokeWidth={1.5} color={primary} /> {ev.location}
                </span>
              )}
              {ev.seats_total && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: subText }}>
                  <Users size={12} strokeWidth={1.5} color={primary} /> {ev.seats_total - ev.seats_booked} posti
                </span>
              )}
            </div>
            {ev.description && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: subText, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {ev.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: primary }}>
                {ev.price > 0 ? `€${ev.price}` : 'Gratuito'}
              </span>
              {(ev.packages || []).length > 0 && (
                <span style={{ fontSize: 11, color: subText }}>{ev.packages.length} {ev.packages.length === 1 ? 'pacchetto' : 'pacchetti'}</span>
              )}
            </div>
          </div>
        </div>
      ))}
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

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function ChatPage({ propertyId, propertyName, primary, textColor, subText, isDark, radius, cardBg, borderColor }) {
  const [messages,  setMessages]  = useState([])
  const [guestName, setGuestName] = useState(() => localStorage.getItem('chat_guest_name') || '')
  const [nameSet,   setNameSet]   = useState(() => !!localStorage.getItem('chat_guest_name'))
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [nameInput, setNameInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime: ricevi risposte dello staff in tempo reale
  useEffect(() => {
    const channel = supabase
      .channel(`chat-guest-${SESSION_ID}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `property_id=eq.${propertyId}`,
      }, (payload) => {
        const msg = payload.new
        if (msg.session_id === SESSION_ID) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [propertyId])

  async function loadMessages() {
    try {
      const data = await apiFetch(`/api/messages?property_id=${propertyId}&session_id=${SESSION_ID}`)
      setMessages(data)
    } catch {}
  }

  function saveName(e) {
    e.preventDefault()
    if (!nameInput.trim()) return
    localStorage.setItem('chat_guest_name', nameInput.trim())
    setGuestName(nameInput.trim())
    setNameSet(true)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)
    const body = input.trim()
    setInput('')
    try {
      const msg = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ property_id: propertyId, session_id: SESSION_ID, guest_name: guestName || null, sender: 'guest', body }),
      })
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
    } catch (err) {
      alert(err.message)
      setInput(body)
    } finally {
      setSending(false)
    }
  }

  const shadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)'

  // Chiedi il nome prima di chattare
  if (!nameSet) {
    return (
      <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={28} strokeWidth={1.5} color={primary} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, color: textColor }}>Chat con la reception</h2>
          <p style={{ margin: 0, fontSize: 14, color: subText }}>Siamo qui per aiutarti. Come ti chiami?</p>
        </div>
        <form onSubmit={saveName} style={{ width: '100%', maxWidth: 300 }}>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Il tuo nome (opzionale)"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${borderColor}`, fontSize: 15, boxSizing: 'border-box', background: cardBg, color: textColor, marginBottom: 10 }}
          />
          <button type="submit" style={{ width: '100%', padding: '12px', background: primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Inizia la chat
          </button>
          <button type="button" onClick={() => setNameSet(true)} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: subText, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
            Continua senza nome
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{propertyName} — Reception</div>
        <div style={{ fontSize: 11, color: subText, marginTop: 2 }}>
          {guestName ? `Ciao ${guestName}! ` : ''}Siamo qui per aiutarti.
        </div>
      </div>

      {/* Messaggi */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 32, color: subText }}>
            <MessageCircle size={36} strokeWidth={1.5} color={`${primary}40`} style={{ display: 'block', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontSize: 14 }}>Scrivi il tuo primo messaggio!</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'guest' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%',
              background: msg.sender === 'guest' ? primary : cardBg,
              color: msg.sender === 'guest' ? '#fff' : textColor,
              borderRadius: msg.sender === 'guest' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '10px 14px',
              boxShadow: msg.sender === 'staff' ? shadow : 'none',
              border: msg.sender === 'staff' ? `1px solid ${borderColor}` : 'none',
            }}>
              {msg.sender === 'staff' && (
                <div style={{ fontSize: 10, fontWeight: 700, color: primary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Reception
                </div>
              )}
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.body}</div>
              <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3, textAlign: msg.sender === 'guest' ? 'right' : 'left' }}>
                {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ padding: '10px 12px', borderTop: `1px solid ${borderColor}`, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Scrivi un messaggio…"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: `1px solid ${borderColor}`, fontSize: 14, background: cardBg, color: textColor, outline: 'none' }}
        />
        <button type="submit" disabled={sending || !input.trim()} style={{
          width: 44, height: 44, borderRadius: '50%', border: 'none',
          background: input.trim() ? primary : `${primary}40`,
          cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          <Send size={16} strokeWidth={2} color="#fff" />
        </button>
      </form>
    </div>
  )
}
