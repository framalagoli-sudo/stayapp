import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import LandingRistorante from './LandingRistorante'
import CookieBanner from '../../components/CookieBanner'
import { Utensils, Info, Images, Phone, Mail, MapPin, Clock, X, ChevronRight, CalendarCheck, Check, MessageCircle, ArrowLeft } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import ChatbotWidget from '../../components/ChatbotWidget'
import BookingWidget from '../../components/BookingWidget'

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_THEME = {
  primaryColor: '#e63946', bgColor: '#ffffff', textColor: '#1a1a2e',
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

function buildWaUrl(wa, name) {
  if (!wa) return null
  const clean = wa.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
  return `https://wa.me/${clean}?text=${encodeURIComponent(`Ciao! Vorrei un tavolo da ${name}. `)}`
}

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RestaurantApp() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const isQR = searchParams.get('qr') === '1'
  const [ristorante, setRistorante] = useState(null)
  const [error, setError] = useState(null)
  const [nav, setNav] = useState('menu')
  const [compactBar, setCompactBar] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    apiFetch(`/api/guest/r/${slug}`)
      .then(setRistorante)
      .catch(() => setError('Ristorante non trovato.'))
  }, [slug])

  useEffect(() => {
    if (!ristorante) return
    const t = { ...DEFAULT_THEME, ...(ristorante.theme || {}) }
    loadFont(t.fontHeading)
    loadFont(t.fontBody)
  }, [ristorante?.theme?.fontHeading, ristorante?.theme?.fontBody])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setCompactBar(false)
  }, [nav])

  function handleScroll(e) {
    setCompactBar(e.target.scrollTop > 120)
  }

  if (error)      return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!ristorante) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  const pwaOn  = ristorante.modules?.pwa_active !== false  // default true
  const miniOn = !!ristorante.minisito?.active

  if (miniOn && (!isQR || !pwaOn)) return <LandingRistorante ristorante={ristorante} />
  if (!pwaOn) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', textAlign: 'center', padding: 40 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>Contenuto non disponibile</p>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Questo servizio è temporaneamente offline.</p>
    </div>
  )

  const theme         = { ...DEFAULT_THEME, ...(ristorante.theme || {}) }
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

  const hasGallery  = (ristorante.gallery || []).length > 0
  const rModules    = { pwa_active: true, gallery: true, allergens: true, info: true, booking: true, ...(ristorante.modules || {}) }
  const sp = { primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor, showAllergens: rModules.allergens }

  const NAV_ITEMS = [
    { key: 'menu',    Icon: Utensils,      label: 'Menu' },
    ...(rModules.booking  ? [{ key: 'prenota',  Icon: CalendarCheck, label: 'Prenota' }]  : []),
    ...(rModules.info     ? [{ key: 'info',     Icon: Info,          label: 'Info' }]     : []),
    ...(rModules.gallery && hasGallery ? [{ key: 'galleria', Icon: Images, label: 'Galleria' }] : []),
    ...(ristorante.chatbot?.active ? [{ key: 'chatbot', Icon: MessageCircle, label: 'Chat' }] : []),
  ]

  // Header
  const headerContent = (
    <div style={{ textAlign: 'center' }}>
      {ristorante.logo_url && (
        <img key={ristorante.logo_url} src={ristorante.logo_url} alt="logo"
          style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
      )}
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: headingFamily, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
        {ristorante.name}
      </h1>
      {ristorante.schedule && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 }}>
          <Clock size={12} strokeWidth={2} color="rgba(255,255,255,0.8)" />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{ristorante.schedule}</span>
        </div>
      )}
    </div>
  )

  const AppHeader = ristorante.cover_url ? (
    <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
      <img src={ristorante.cover_url} alt="cover"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>{headerContent}</div>
    </div>
  ) : (
    <div style={{
      background: theme.headerStyle === 'gradient'
        ? `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` : primary,
      padding: '32px 20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {headerContent}
    </div>
  )

  return (
    <>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; }
        .r-shell {
          display:flex; flex-direction:column;
          height:100vh; height:100dvh;
          overflow:hidden; background:${bgColor};
        }
        .r-app {
          flex:1; min-height:0;
          display:flex; flex-direction:column;
          width:100%; max-width:430px; margin:0 auto;
          background:${bgColor}; overflow:hidden;
        }
        .r-scroll { flex:1; min-height:0; overflow-y:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .r-scroll::-webkit-scrollbar { display:none; }
        .r-compact { flex-shrink:0; overflow:hidden; transition:max-height 0.22s ease; }
        .r-nav {
          flex-shrink:0; display:flex;
          background:${navBg}; border-top:1px solid ${borderColor};
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .r-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:60px; border:none; background:none; cursor:pointer; padding:0; -webkit-tap-highlight-color:transparent; }
        @media (min-width:769px) {
          .r-shell { background:linear-gradient(145deg,#0f0f1a 0%,#1c1020 60%,#0f1a1a 100%); flex-direction:row; justify-content:center; align-items:center; }
          .r-app { flex:none; width:390px; height:812px; max-height:calc(100vh - 48px); border-radius:44px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.06); }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.22s ease; }
      `}</style>

      <CookieBanner primaryColor={primary} privacyUrl={`/r/${slug}/privacy`} cookieUrl={`/r/${slug}/cookie`} />
      <div className="r-shell">
        <div className="r-app" style={{ fontFamily: bodyFamily, color: textColor }}>

          {/* Compact bar */}
          <div className="r-compact" style={{ maxHeight: compactBar ? 44 : 0 }}>
            <div style={{ background: primary, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
              {ristorante.logo_url && (
                <img src={ristorante.logo_url} alt="logo"
                  style={{ height: 24, maxWidth: 60, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ color: '#fff', fontWeight: 700, fontFamily: headingFamily, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ristorante.name}
              </span>
            </div>
          </div>

          {/* Chatbot tab (always mounted per preservare stato messaggi) */}
          {ristorante.chatbot?.active && (
            <div style={{ flex: 1, minHeight: 0, display: nav === 'chatbot' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatbotWidget chatbot={ristorante.chatbot} primaryColor={primary} entityTipo="ristorante" entityId={ristorante.id} embedded={true} />
            </div>
          )}

          {/* Scroll area */}
          <div ref={scrollRef} className="r-scroll" onScroll={handleScroll}
            style={{ display: nav === 'chatbot' ? 'none' : undefined }}>
            {AppHeader}
            <div key={nav} className="fade-up">
              {nav === 'menu'    && <MenuTab    menu={ristorante.menu || []}        {...sp} headingFamily={headingFamily} />}
              {nav === 'prenota' && <PrenotaTab ristorante={ristorante}             {...sp} />}
              {nav === 'info'    && <InfoTab    ristorante={ristorante}             {...sp} />}
              {nav === 'galleria'&& <GalleriaTab gallery={ristorante.gallery || []} {...sp} />}
            </div>
          </div>

          {/* Bottom nav */}
          <nav className="r-nav">
            {NAV_ITEMS.map(({ key, Icon, label }) => (
              <button key={key} type="button" className="r-nav-btn" onClick={() => setNav(key)}>
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

// ─── MENU ─────────────────────────────────────────────────────────────────────
function MenuTab({ menu, primary, textColor, subText, isDark, radius, headingFamily, cardBg, surfaceBg, borderColor, showAllergens }) {
  const isCatalogo = menu.length > 0 && menu[0].type === 'catalogo'
  const [selectedId, setSelectedId] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  if (!menu.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: subText }}>
        <Utensils size={40} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
        <p style={{ margin: 0, fontSize: 15 }}>Menu non ancora disponibile.</p>
      </div>
    )
  }

  function renderCategorySection(cat) {
    return (
      <section key={cat.id} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: borderColor }} />
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: headingFamily, color: primary, textTransform: 'uppercase', letterSpacing: 1.2, flexShrink: 0 }}>
            {cat.name}
          </h2>
          <div style={{ flex: 1, height: 1, background: borderColor }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(cat.items || []).map(item => (
            <MenuItem
              key={item.id}
              item={item}
              primary={primary}
              textColor={textColor}
              subText={subText}
              isDark={isDark}
              radius={radius}
              cardBg={cardBg}
              borderColor={borderColor}
              showAllergens={showAllergens}
              onOpenPhoto={item.photo_url ? () => setLightbox(item.photo_url) : null}
            />
          ))}
        </div>
      </section>
    )
  }

  function renderLightbox() {
    if (!lightbox) return null
    return (
      <div onClick={() => setLightbox(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
        <img src={lightbox} alt=""
          style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain', display: 'block' }} />
        <button onClick={() => setLightbox(null)}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} strokeWidth={2} color="#fff" />
        </button>
      </div>
    )
  }

  // ── Multi-catalogo ─────────────────────────────────────────────────────────
  if (isCatalogo) {
    const selected = menu.find(c => c.id === selectedId)

    if (!selected) {
      // Home: macro-buttons per ogni catalogo
      return (
        <div style={{ padding: '20px 16px 28px' }}>
          <h2 style={{ fontFamily: headingFamily, fontSize: 18, fontWeight: 700, color: textColor, margin: '0 0 16px' }}>
            Scegli il menu
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {menu.map(c => {
              const itemCount = (c.categories || []).reduce((n, cat) => n + (cat.items?.length || 0), 0)
              return (
                <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '18px 20px', background: cardBg, borderRadius: radius || 14,
                    border: `1px solid ${borderColor}`, cursor: 'pointer', textAlign: 'left',
                    boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Utensils size={22} strokeWidth={1.5} color={primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: textColor, fontFamily: headingFamily }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: subText, marginTop: 2 }}>
                      {itemCount} {itemCount === 1 ? 'piatto' : 'piatti'}
                    </div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.5} color={subText} />
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    // Dettaglio catalogo selezionato
    const categories = selected.categories || []
    return (
      <div>
        {/* Back bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
          <button type="button" onClick={() => setSelectedId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: primary, fontWeight: 600, fontSize: 13, padding: 0 }}>
            <ArrowLeft size={16} strokeWidth={2} color={primary} />
            Menu
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: textColor, fontFamily: headingFamily }}>
            {selected.name}
          </span>
        </div>

        <div style={{ padding: '20px 16px 28px' }}>
          {categories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: subText }}>
              <Utensils size={36} strokeWidth={1.5} color={primary} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.35 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Nessun piatto disponibile in questa sezione.</p>
            </div>
          )}
          {categories.map(cat => renderCategorySection(cat))}
        </div>

        {renderLightbox()}
      </div>
    )
  }

  // ── Single menu (legacy) ───────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 28px' }}>
      {menu.map(cat => renderCategorySection(cat))}
      {renderLightbox()}
    </div>
  )
}

const ALLERGEN_ICONS = {
  glutine: '🌾', crostacei: '🦐', uova: '🥚', pesce: '🐟', arachidi: '🥜',
  soia: '🫘', latte: '🥛', frutta_guscio: '🌰', sedano: '🥬', senape: '🟡',
  sesamo: '🌿', anidride_solforosa: '🍷', lupini: '🫛', molluschi: '🦑',
}

function parseAllergens(str) {
  if (!str) return []
  return str.split(/[,;/]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
}

function AllergenBadge({ name, primary }) {
  const icon = Object.entries(ALLERGEN_ICONS).find(([k]) => name.includes(k))?.[1]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: `${primary}15`, color: primary, border: `1px solid ${primary}30`,
      whiteSpace: 'nowrap',
    }}>
      {icon && <span>{icon}</span>}
      {name}
    </span>
  )
}

function MenuItem({ item, primary, textColor, subText, isDark, radius, cardBg, borderColor, onOpenPhoto, showAllergens }) {
  const shadow = isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.06)'
  const allergens = showAllergens ? parseAllergens(item.allergens) : []

  return (
    <div style={{ background: cardBg, borderRadius: radius, overflow: 'hidden', boxShadow: shadow, border: `1px solid ${borderColor}`, display: 'flex', gap: 0 }}>
      {item.photo_url && (
        <div
          onClick={onOpenPhoto}
          style={{ width: 90, flexShrink: 0, position: 'relative', cursor: onOpenPhoto ? 'pointer' : 'default' }}
        >
          <img src={item.photo_url} alt={item.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: item.description ? 4 : 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: textColor, lineHeight: 1.3 }}>{item.name}</div>
          {item.price && (
            <div style={{ fontSize: 15, fontWeight: 700, color: primary, flexShrink: 0 }}>
              €{Number(item.price) % 1 === 0 ? Number(item.price) : Number(item.price).toFixed(2)}
            </div>
          )}
        </div>
        {item.description && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: subText, lineHeight: 1.5 }}>{item.description}</p>
        )}
        {allergens.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allergens.map(a => <AllergenBadge key={a} name={a} primary={primary} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── INFO ─────────────────────────────────────────────────────────────────────
function InfoTab({ ristorante, primary, textColor, subText, isDark, radius, headingFamily, cardBg, borderColor }) {
  const shadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.07)'

  return (
    <div style={{ padding: '20px 16px 28px' }}>

      {ristorante.description && (
        <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, borderRadius: 20, padding: '20px 22px', marginBottom: 24, boxShadow: `0 8px 28px ${primary}44` }}>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7 }}>
            {ristorante.description}
          </p>
        </div>
      )}

      {ristorante.schedule && (
        <InfoSection Icon={Clock} title="Orari" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ background: cardBg, borderRadius: 16, padding: '16px 20px', boxShadow: shadow }}>
            <p style={{ margin: 0, fontSize: 14, color: textColor, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {ristorante.schedule}
            </p>
          </div>
        </InfoSection>
      )}

      {(ristorante.phone || ristorante.email || ristorante.address || ristorante.minisito?.social?.whatsapp) && (
        <InfoSection Icon={MapPin} title="Contatti" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          {ristorante.minisito?.social?.whatsapp && (() => {
            const waUrl = buildWaUrl(ristorante.minisito.social.whatsapp, ristorante.name)
            return waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#25D366', color: '#fff', borderRadius: 14, padding: '14px 20px',
                textDecoration: 'none', fontWeight: 700, fontSize: 15, marginBottom: 12,
                boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Chatta su WhatsApp
              </a>
            ) : null
          })()}
          <div style={{ background: cardBg, borderRadius: 16, overflow: 'hidden', boxShadow: shadow }}>
            {ristorante.phone && (
              <ContactRow Icon={Phone} label="Telefono" value={ristorante.phone} href={`tel:${ristorante.phone}`} primary={primary} textColor={textColor} subText={subText} border={borderColor} />
            )}
            {ristorante.email && (
              <ContactRow Icon={Mail} label="Email" value={ristorante.email} href={`mailto:${ristorante.email}`} primary={primary} textColor={textColor} subText={subText} border={borderColor} />
            )}
            {ristorante.address && (
              <ContactRow Icon={MapPin} label="Indirizzo" value={ristorante.address} href={`https://maps.google.com/?q=${encodeURIComponent(ristorante.address)}`} primary={primary} textColor={textColor} subText={subText} border="transparent" />
            )}
          </div>
        </InfoSection>
      )}

      {/* Scopri anche — entità collegate */}
      {ristorante.collegamenti?.length > 0 && (
        <InfoSection Icon={ChevronRight} title="Scopri anche" primary={primary} headingFamily={headingFamily} textColor={textColor}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ristorante.collegamenti.map(c => {
              const href = c.tipo === 'ristorante' ? `/r/${c.slug}` : `/s/${c.slug}`
              const typeLabel = c.tipo === 'ristorante' ? 'Ristorante' : 'Struttura'
              const typeColor = c.tipo === 'struttura' ? primary : '#e63946'
              return (
                <a key={c.slug} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: cardBg, borderRadius: radius, padding: '14px 16px',
                  boxShadow: shadow, textDecoration: 'none',
                  border: isDark ? `1px solid ${borderColor}` : 'none',
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
                    <div style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{c.name}</div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.5} color={subText} />
                </a>
              )
            })}
          </div>
        </InfoSection>
      )}

      <div style={{ textAlign: 'center', paddingTop: 20, borderTop: `1px solid ${borderColor}`, marginTop: 8 }}>
        <a href={`/r/${ristorante.slug}/privacy`} style={{ fontSize: 12, color: subText, marginRight: 16, textDecoration: 'none' }}>Privacy Policy</a>
        <a href={`/r/${ristorante.slug}/cookie`} style={{ fontSize: 12, color: subText, textDecoration: 'none' }}>Cookie Policy</a>
      </div>

    </div>
  )
}

// ─── GALLERIA ─────────────────────────────────────────────────────────────────
function GalleriaTab({ gallery, primary, radius }) {
  const [lightbox, setLightbox] = useState(null)

  return (
    <div style={{ padding: '20px 16px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {gallery.map((url, i) => (
          <img key={url + i} src={url} alt=""
            onClick={() => setLightbox(url)}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: radius, cursor: 'pointer', display: 'block' }} />
        ))}
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

// ─── PRENOTA ──────────────────────────────────────────────────────────────────
function PrenotaTab({ ristorante, primary, textColor, subText, isDark, radius, headingFamily, cardBg, surfaceBg, borderColor }) {
  const bookingUrl = ristorante.minisito?.booking_url
  if (bookingUrl) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <CalendarCheck size={48} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.85 }} />
        <h2 style={{ fontFamily: headingFamily, fontSize: 20, fontWeight: 700, color: textColor, margin: '0 0 8px' }}>
          Prenota un tavolo
        </h2>
        <p style={{ fontSize: 14, color: subText, margin: '0 0 24px', lineHeight: 1.6 }}>
          Scegli il giorno e l'orario che preferisci.
        </p>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '14px 36px', background: primary, color: '#fff', borderRadius: 50, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: `0 6px 24px ${primary}44` }}>
          Prenota ora →
        </a>
      </div>
    )
  }
  return (
    <div style={{ padding: '20px 16px 28px' }}>
      <h2 style={{ fontFamily: headingFamily, fontSize: 20, fontWeight: 700, color: textColor, margin: '0 0 4px' }}>
        Prenota un tavolo
      </h2>
      <p style={{ fontSize: 14, color: subText, margin: '0 0 24px' }}>
        Scegli il servizio e il giorno che preferisci.
      </p>
      <BookingWidget entityTipo="ristorante" entityId={ristorante.id} primaryColor={primary} />
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function InfoSection({ Icon, title, primary, headingFamily, textColor, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
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
