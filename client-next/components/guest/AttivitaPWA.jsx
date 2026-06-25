'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import LandingAttivita from './LandingAttivita'
import CookieBanner from '@/components/CookieBanner'
import InstallBanner from './InstallBanner'
import InstallButton from './InstallButton'
import {
  Home, Compass, Bell, Info, MessageCircle,
  Images, Layers, Calendar, Phone, Mail, MapPin, Clock,
  X, Check, ChevronRight, Send,
} from 'lucide-react'
import { guestFetch } from '@/lib/api'
import { t as tr } from '@/lib/i18n'
import Turnstile from '@/components/Turnstile'
import ChatbotWidget from '@/components/ChatbotWidget'
import ChatChoice from '@/components/ChatChoice'

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_THEME = {
  primaryColor: '#1a1a2e', bgColor: '#ffffff', textColor: '#1a1a2e',
  fontHeading: 'playfair', fontBody: 'inter', headerStyle: 'solid', borderStyle: 'mixed',
}
const FONT_URLS = {
  playfair:    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  cormorant:   'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap',
  raleway:     'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap',
  montserrat:  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
  nunito:      'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  'dm-sans':   'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
  inter:       'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  lato:        'https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
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
  inter:       "'Inter', system-ui, sans-serif",
  lato:        "'Lato', system-ui, sans-serif",
  'open-sans': "'Open Sans', system-ui, sans-serif",
}
const BORDER_RADII = { rounded: 16, mixed: 8, square: 0 }

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

function buildWaUrl(wa, name) {
  if (!wa) return null
  const clean = wa.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
  return `https://wa.me/${clean}?text=${encodeURIComponent(`Ciao! Ho visto ${name} e vorrei saperne di più. `)}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AttivitaPWA({ attivita: attivitaProp, forceSlug, domain = null } = {}) {
  const { slug: paramSlug } = useParams()
  const slug = forceSlug || paramSlug
  const searchParams = useSearchParams()
  const router = useRouter()
  const isQR = searchParams?.get('qr') === '1'

  // Can be called directly (slug route) or via AttivitaApp (attivita prop)
  const [attivita,   setAttivita]   = useState(attivitaProp || null)
  const [error,      setError]      = useState(null)
  const [nav,        setNav]        = useState(() => searchParams.get('tab') || 'home')
  const [chatMode,   setChatMode]   = useState(null)
  const [exploreChip, setExploreChip] = useState(null)
  const [compactBar, setCompactBar] = useState(false)
  const [showArrow,  setShowArrow]  = useState(true)
  const scrollRef  = useRef(null)
  const chipBarRef = useRef(null)
  const [lang, setLang] = useState('it')

  // Lingua: scelta salvata, altrimenti autodetect browser. Default IT.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pwa_lang')
      if (saved === 'en' || saved === 'it') { setLang(saved); return }
    } catch {}
    if ((navigator.language || '').toLowerCase().startsWith('en')) setLang('en')
  }, [])
  function changeLang(l) { setLang(l); try { localStorage.setItem('pwa_lang', l) } catch {} }

  // Ricarica i dati nella lingua scelta. IT col prop server = nessun fetch (invariato).
  useEffect(() => {
    if (attivitaProp && lang === 'it') { setAttivita(attivitaProp); return }
    if (!slug) return
    guestFetch(`/api/guest/a/${slug}?lang=${lang}`)
      .then(setAttivita)
      .catch(() => setError(tr('not_found', lang)))
  }, [slug, lang])

  useEffect(() => {
    if (!attivita) return
    document.title = attivita.name
    return () => { document.title = 'OltreNova — Oltre il solito sito.' }
  }, [attivita?.name])

  useEffect(() => {
    if (!attivita) return
    const t = { ...DEFAULT_THEME, ...(attivita.theme || {}) }
    loadFont(t.fontHeading)
    loadFont(t.fontBody)
  }, [attivita?.theme?.fontHeading, attivita?.theme?.fontBody])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setCompactBar(false)
  }, [nav])

  function handleScroll(e)     { setCompactBar(e.target.scrollTop > 120) }
  function handleChipScroll(e) {
    const el = e.target
    setShowArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  if (error)    return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!attivita) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{tr('loading', lang)}</div>

  const pwaOn  = attivita.pwa?.active === true
  const miniOn = attivita.minisito?.active !== false

  // When accessed without QR and minisito is on, show landing
  if (!attivitaProp && miniOn && (!isQR || !pwaOn)) return <LandingAttivita attivita={attivita} />
  if (!attivitaProp && !pwaOn) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', textAlign: 'center', padding: 40 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>{tr('content_unavailable', lang)}</p>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>{tr('content_offline', lang)}</p>
    </div>
  )

  const theme         = { ...DEFAULT_THEME, ...(attivita.theme || {}) }
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

  const aMods = { ...(attivita.pwa?.modules || {}) }
  const hasGallery  = (attivita.gallery || []).length > 0
  const hasServizi  = (attivita.services || []).length > 0
  const sp = { primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor, lang }

  const homeSections = aMods.home_sections || {}
  const CHIPS = [
    hasServizi  && homeSections.servizi  !== false && { key: 'servizi',  label: tr('services_title', lang) },
    hasGallery  && homeSections.galleria !== false && { key: 'galleria', label: tr('gallery', lang) },
  ].filter(Boolean)
  const activeChip = CHIPS.find(c => c.key === exploreChip) ? exploreChip : CHIPS[0]?.key

  function switchTab(key) {
    if (key !== 'chatbot') setChatMode(null)
    setNav(key)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    router.replace(url.pathname + '?' + url.searchParams.toString(), { scroll: false })
  }
  function goExplore(chip) { setExploreChip(chip); switchTab('esplora') }

  const headerContent = (
    <div style={{ textAlign: 'center' }}>
      {attivita.logo_url && (
        <img key={attivita.logo_url} src={attivita.logo_url} alt="logo"
          style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
      )}
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: headingFamily, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
        {attivita.name}
      </h1>
      {attivita.tipo && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{attivita.tipo}</div>
      )}
    </div>
  )

  const langToggle = (
    <button onClick={() => changeLang(lang === 'en' ? 'it' : 'en')}
      aria-label={lang === 'en' ? 'Passa all’italiano' : 'Switch to English'}
      style={{ position: 'absolute', top: 12, left: 12, zIndex: 6, display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
      {lang === 'en' ? '🇮🇹 IT' : '🇬🇧 EN'}
    </button>
  )

  const AppHeader = attivita.cover_url ? (
    <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
      <img src={attivita.cover_url} alt="cover"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>{headerContent}</div>
      {langToggle}
      <InstallButton primaryColor={primary} entityName={attivita.name} />
    </div>
  ) : (
    <div style={{
      position: 'relative',
      background: theme.headerStyle === 'gradient'
        ? `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` : primary,
      padding: '32px 20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {headerContent}
      {langToggle}
      <InstallButton primaryColor={primary} entityName={attivita.name} />
    </div>
  )

  const NAV_ITEMS = [
    { key: 'home',     Icon: Home,    label: tr('nav_home', lang) },
    { key: 'esplora',  Icon: Compass, label: tr('nav_explore', lang) },
    { key: 'richiesta', Icon: Bell,   label: tr('nav_request', lang) },
    { key: 'info',     Icon: Info,    label: tr('nav_info', lang) },
    ...((attivita.chatbot?.active_app ?? attivita.chatbot?.active) ? [{ key: 'chatbot', Icon: MessageCircle, label: tr('nav_chat', lang) }] : []),
  ]

  return (
    <>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; }
        .a-shell {
          display:flex; flex-direction:column;
          height:100vh; height:100dvh;
          overflow:hidden; background:${bgColor};
        }
        .a-app {
          flex:1; min-height:0;
          display:flex; flex-direction:column;
          width:100%; max-width:430px; margin:0 auto;
          background:${bgColor}; overflow:hidden;
        }
        .a-scroll { flex:1; min-height:0; overflow-y:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .a-scroll::-webkit-scrollbar { display:none; }
        .a-compact { flex-shrink:0; overflow:hidden; transition:max-height 0.22s ease; }
        .a-chips   { flex-shrink:0; background:${bgColor}; border-bottom:1px solid ${borderColor}; padding:10px 16px; }
        .a-nav {
          flex-shrink:0; display:flex;
          background:${navBg}; border-top:1px solid ${borderColor};
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .a-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:60px; border:none; background:none; cursor:pointer; padding:0; -webkit-tap-highlight-color:transparent; }
        .feature-card { transition:transform 0.14s ease; }
        .feature-card:active { transform:scale(0.96); }
        @media (min-width:769px) {
          .a-shell { background:linear-gradient(145deg,#0f0f1a 0%,#1c1c32 60%,#0f1a1a 100%); flex-direction:row; justify-content:center; align-items:center; }
          .a-app { flex:none; width:390px; height:812px; max-height:calc(100vh - 48px); border-radius:44px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.06); }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.22s ease; }
        .chip-bar { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .chip-bar::-webkit-scrollbar { display:none; }
      `}</style>

      <CookieBanner primaryColor={primary} privacyUrl={`/a/${attivita.slug}/privacy`} cookieUrl={`/a/${attivita.slug}/cookie`} lang={lang} />
      <InstallBanner primaryColor={primary} entityName={attivita.name} />
      <div className="a-shell">
        <div className="a-app" style={{ fontFamily: bodyFamily, color: textColor }}>

          {/* Compact bar */}
          <div className="a-compact" style={{ maxHeight: compactBar ? 44 : 0 }}>
            <div style={{ background: primary, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
              {attivita.logo_url && (
                <img src={attivita.logo_url} alt="logo" style={{ height: 24, maxWidth: 60, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ color: '#fff', fontWeight: 700, fontFamily: headingFamily, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attivita.name}
              </span>
            </div>
          </div>

          {/* Chip bar (Esplora) */}
          {nav === 'esplora' && CHIPS.length > 0 && (
            <div className="a-chips">
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
                  <div onClick={() => chipBarRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, background: `linear-gradient(to right, transparent, ${bgColor} 70%)`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }}>
                    <ChevronRight size={18} strokeWidth={1.5} color={primary} style={{ opacity: 0.7 }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chatbot (always mounted) */}
          {(attivita.chatbot?.active_app ?? attivita.chatbot?.active) && (
            <div style={{ flex: 1, minHeight: 0, display: nav === 'chatbot' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
              {attivita.minisito?.social?.whatsapp && chatMode !== 'chatbot' ? (
                <ChatChoice
                  whatsapp={attivita.minisito.social.whatsapp}
                  entityName={attivita.name}
                  primary={primary}
                  onChatbot={() => setChatMode('chatbot')}
                />
              ) : (
                <ChatbotWidget chatbot={attivita.chatbot} primaryColor={primary} entityTipo="attivita" entityId={attivita.id} embedded={true} />
              )}
            </div>
          )}

          {/* Scroll area */}
          <div ref={scrollRef} className="a-scroll" onScroll={handleScroll}
            style={{ display: nav === 'chatbot' ? 'none' : undefined }}>
            {AppHeader}
            <div key={nav} className="fade-up">
              {nav === 'home'      && <AHomePage      attivita={attivita} aMods={aMods} hasGallery={hasGallery} hasServizi={hasServizi} onExplore={goExplore} domain={domain} {...sp} headingFamily={headingFamily} />}
              {nav === 'esplora'   && <AEsploraPage   attivita={attivita} activeChip={activeChip} {...sp} headingFamily={headingFamily} />}
              {nav === 'richiesta' && <ARichiestaTab  attivita={attivita} {...sp} headingFamily={headingFamily} />}
              {nav === 'info'      && <AInfoPage      attivita={attivita} {...sp} headingFamily={headingFamily} />}
            </div>
          </div>

          {/* Bottom nav */}
          <nav className="a-nav">
            {NAV_ITEMS.map(({ key, Icon, label }) => (
              <button key={key} type="button" className="a-nav-btn" onClick={() => switchTab(key)}>
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
function AHomePage({ attivita, aMods, hasGallery, hasServizi, onExplore, domain = null, primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, borderColor, lang = 'it' }) {
  const galCount = (attivita.gallery || []).length
  const svcCount = (attivita.services || []).length
  const homeSections = aMods.home_sections || {}

  const allCards = {
    servizi:  hasServizi  && { key: 'servizi',  Icon: Layers,   label: tr('services_title', lang),  sub: `${svcCount} ${lang === 'en' ? 'available' : 'disponibili'}`,   photo: null },
    galleria: hasGallery  && { key: 'galleria', Icon: Images,   label: tr('gallery', lang), sub: `${galCount} ${lang === 'en' ? 'photos' : 'foto'}`,           photo: attivita.gallery?.[0]?.url || attivita.gallery?.[0] },
  }
  const defaultOrder = ['servizi', 'galleria']
  const homeOrder = (aMods.home_section_order?.length ? aMods.home_section_order : defaultOrder)
  const CARDS = homeOrder
    .filter(k => allCards[k] && homeSections[k] !== false)
    .map(k => allCards[k])
    .filter(Boolean)

  return (
    <div style={{ padding: '20px 16px 28px' }}>

      {/* Welcome card */}
      {(attivita.description || attivita.schedule || attivita.address) && (
        <div style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
          borderRadius: 20, padding: '22px 24px', marginBottom: 28,
          boxShadow: `0 8px 32px ${primary}44`,
        }}>
          {attivita.description && (
            <p style={{ margin: (attivita.schedule || attivita.address) ? '0 0 14px' : 0, fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6 }}>
              {attivita.description}
            </p>
          )}
          {attivita.schedule && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: attivita.address ? 8 : 0 }}>
              <Clock size={14} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{attivita.schedule}</span>
            </div>
          )}
          {attivita.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{attivita.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Feature cards */}
      {CARDS.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: headingFamily, color: textColor, margin: '0 0 14px' }}>{tr('nav_explore', lang)}</h2>
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

      {CARDS.length === 0 && !attivita.description && (
        <p style={{ textAlign: 'center', color: subText, marginTop: 48, fontSize: 15 }}>{tr('welcome', lang)}</p>
      )}

      {/* Scopri anche */}
      {attivita.collegamenti?.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: headingFamily, color: textColor, margin: '0 0 14px' }}>{tr('discover_also', lang)}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attivita.collegamenti.map(c => {
              // Su dominio custom: link cross-entità assoluti al dominio principale.
              const base = domain ? 'https://www.oltrenova.com' : ''
              const href = base + (c.tipo === 'ristorante' ? `/r/${c.slug}` : c.tipo === 'attivita' ? `/a/${c.slug}` : `/s/${c.slug}`)
              const typeLabel = c.tipo === 'ristorante' ? tr('label_ristorante', lang) : c.tipo === 'attivita' ? tr('label_attivita', lang) : tr('label_struttura', lang)
              const shadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'
              return (
                <a key={c.slug} href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, background: isDark ? cardBg : '#fff', borderRadius: radius, padding: '14px 16px', boxShadow: shadow, textDecoration: 'none', border: isDark ? `1px solid ${borderColor}` : 'none' }}>
                  {c.logo_url
                    ? <img src={c.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 10, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 20 }}>🏢</span></div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{typeLabel}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{c.name}</div>
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
function AEsploraPage({ attivita, activeChip, primary, textColor, subText, isDark, radius, headingFamily, cardBg, borderColor, lang = 'it' }) {
  const [lightbox, setLightbox] = useState(null)

  if (!activeChip) return (
    <div style={{ padding: 40, textAlign: 'center', color: subText }}>
      <Compass size={40} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
      <p style={{ margin: 0, fontSize: 15 }}>{tr('no_content', lang)}</p>
    </div>
  )

  const gallery = attivita.gallery || []

  return (
    <div>
      <div key={activeChip} className="fade-up" style={{ padding: '20px 16px 28px' }}>
        {activeChip === 'servizi' && (
          <AServiziContent attivita={attivita} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} headingFamily={headingFamily} cardBg={cardBg} borderColor={borderColor} lang={lang} />
        )}
        {activeChip === 'galleria' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {gallery.map((img, i) => {
              const url = typeof img === 'string' ? img : img.url
              return (
                <img key={url + i} src={url} alt=""
                  onClick={() => setLightbox(url)}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: radius, cursor: 'pointer', display: 'block' }} />
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain', display: 'block' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2} color="#fff" />
          </button>
        </div>
      )}
    </div>
  )
}

function AServiziContent({ attivita, primary, textColor, subText, isDark, radius, cardBg, borderColor, lang = 'it' }) {
  const servizi = attivita.services || []
  const shadow = isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.07)'

  if (!servizi.length) return (
    <div style={{ textAlign: 'center', color: subText, paddingTop: 32 }}>
      <Layers size={36} strokeWidth={1.5} color={primary} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.35 }} />
      <p style={{ margin: 0, fontSize: 14 }}>{tr('no_services', lang)}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {servizi.map((s, i) => (
        <div key={s.id || i} style={{ background: cardBg, borderRadius: radius, padding: '16px 18px', boxShadow: shadow, borderLeft: `3px solid ${primary}`, border: isDark ? `1px solid ${borderColor}` : undefined }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: textColor, marginBottom: s.description || s.price ? 4 : 0 }}>{s.name}</div>
          {s.description && <p style={{ margin: '0 0 6px', fontSize: 13, color: subText, lineHeight: 1.5 }}>{s.description}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {s.price != null && s.price !== '' && (
              <span style={{ fontSize: 13, fontWeight: 700, color: primary }}>€{s.price}</span>
            )}
            {s.hours && (
              <span style={{ fontSize: 12, color: subText, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} strokeWidth={1.5} color={subText} />{s.hours}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── RICHIESTA ────────────────────────────────────────────────────────────────
function ARichiestaTab({ attivita, primary, textColor, subText, isDark, radius, headingFamily, cardBg, borderColor, lang = 'it' }) {
  const [form,    setForm]    = useState({ nome: '', email: '', messaggio: '' })
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const waUrl = buildWaUrl(attivita.minisito?.social?.whatsapp, attivita.name)
  const inp = { width: '100%', padding: '11px 13px', borderRadius: radius, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#ddd'}`, background: isDark ? 'rgba(255,255,255,0.07)' : '#fff', color: textColor, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim() || !form.email.trim() || !form.messaggio.trim()) { setError(tr('fill_fields', lang)); return }
    setSending(true); setError(null)
    try {
      await guestFetch('/api/guest/contact', {
        method: 'POST',
        body: JSON.stringify({ ...form, entity_tipo: 'attivita', entity_id: attivita.id, entity_slug: attivita.slug, turnstileToken }),
      })
      setSent(true)
    } catch (e) { setError(e.message || 'Errore nell\'invio.') }
    finally { setSending(false) }
  }

  return (
    <div style={{ padding: '20px 16px 28px' }}>
      <h2 style={{ fontFamily: headingFamily, fontSize: 20, fontWeight: 700, color: textColor, margin: '0 0 8px' }}>{tr('contact_btn', lang)}</h2>
      <p style={{ fontSize: 14, color: subText, margin: '0 0 20px', lineHeight: 1.5 }}>{tr('request_intro', lang)}</p>

      {/* CTA rapide */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {attivita.phone && (
          <a href={`tel:${attivita.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: radius, border: `1.5px solid ${primary}`, color: primary, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            <Phone size={15} strokeWidth={1.5} color={primary} /> {tr('call', lang)}
          </a>
        )}
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: radius, background: '#25d366', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            <Send size={15} strokeWidth={1.5} color="#fff" /> WhatsApp
          </a>
        )}
        {attivita.email && (
          <a href={`mailto:${attivita.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: radius, border: `1.5px solid ${borderColor}`, color: subText, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            <Send size={15} strokeWidth={1.5} color={subText} /> Email
          </a>
        )}
      </div>

      {sent ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Check size={26} color="#059669" strokeWidth={2} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, color: textColor, margin: '0 0 4px' }}>{tr('request_sent', lang)}</p>
          <p style={{ color: subText, fontSize: 13, margin: 0 }}>{tr('request_sent_sub', lang)}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 5 }}>{tr('name', lang)}</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder={tr('name_ph', lang)} style={inp} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 5 }}>{tr('email', lang)}</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={tr('email_ph', lang)} style={inp} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 5 }}>{tr('message', lang)}</label>
            <textarea value={form.messaggio} onChange={e => setForm(f => ({ ...f, messaggio: e.target.value }))} rows={4} placeholder={tr('message_ph', lang)} style={{ ...inp, resize: 'vertical' }} />
          </div>
          {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <Turnstile onToken={setTurnstileToken} />
          <button type="submit" disabled={sending}
            style={{ width: '100%', padding: 14, background: primary, color: '#fff', border: 'none', borderRadius: radius, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {sending ? tr('sending', lang) : tr('send_message', lang)}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── INFO ─────────────────────────────────────────────────────────────────────
function AInfoPage({ attivita, primary, textColor, subText, isDark, radius, headingFamily, cardBg, borderColor, lang = 'it' }) {
  const shadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)'

  return (
    <div style={{ padding: '20px 16px 28px' }}>

      {attivita.schedule && (
        <AInfoSection Icon={Clock} title={tr('hours_title', lang)} primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ background: cardBg, borderRadius: 16, padding: '16px 20px', boxShadow: shadow }}>
            <p style={{ margin: 0, fontSize: 14, color: textColor, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{attivita.schedule}</p>
          </div>
        </AInfoSection>
      )}

      {(attivita.phone || attivita.email || attivita.address) && (
        <AInfoSection Icon={MapPin} title={tr('contacts', lang)} primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ background: cardBg, borderRadius: 16, overflow: 'hidden', boxShadow: shadow }}>
            {attivita.phone   && <AContactRow Icon={Phone}  label={tr('phone_label', lang)}  value={attivita.phone}   href={`tel:${attivita.phone}`}              primary={primary} textColor={textColor} subText={subText} border={borderColor} />}
            {attivita.email   && <AContactRow Icon={Mail}   label={tr('email', lang)}     value={attivita.email}   href={`mailto:${attivita.email}`}            primary={primary} textColor={textColor} subText={subText} border={borderColor} />}
            {attivita.address && <AContactRow Icon={MapPin} label={tr('address_label', lang)} value={attivita.address} href={`https://maps.google.com/?q=${encodeURIComponent(attivita.address)}`} primary={primary} textColor={textColor} subText={subText} border="transparent" />}
          </div>
        </AInfoSection>
      )}

      <div style={{ textAlign: 'center', paddingTop: 20, borderTop: `1px solid ${borderColor}`, marginTop: 8 }}>
        <a href={`/a/${attivita.slug}/privacy`} style={{ fontSize: 12, color: subText, marginRight: 16, textDecoration: 'none' }}>{tr('privacy_policy', lang)}</a>
        <a href={`/a/${attivita.slug}/cookie`}  style={{ fontSize: 12, color: subText, textDecoration: 'none' }}>{tr('cookie_policy', lang)}</a>
      </div>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function AInfoSection({ Icon, title, primary, headingFamily, textColor, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, fontFamily: headingFamily, color: textColor, margin: '0 0 12px' }}>
        <Icon size={18} strokeWidth={1.5} color={primary} />{title}
      </h2>
      {children}
    </section>
  )
}

function AContactRow({ Icon, label, value, href, primary, textColor, subText, border }) {
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
