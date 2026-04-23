import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Utensils, Info, Images, Phone, Mail, MapPin, Clock, X, ChevronRight } from 'lucide-react'
import { apiFetch } from '../../lib/api'

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

  const hasGallery = (ristorante.gallery || []).length > 0
  const sp = { primary, textColor, subText, isDark, radius, headingFamily, bgColor, cardBg, surfaceBg, borderColor }

  const NAV_ITEMS = [
    { key: 'menu',    Icon: Utensils, label: 'Menu' },
    { key: 'info',    Icon: Info,     label: 'Info' },
    ...(hasGallery ? [{ key: 'galleria', Icon: Images, label: 'Galleria' }] : []),
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
          .r-shell { background:linear-gradient(145deg,#1a0a0a 0%,#2e1010 60%,#1a0a0a 100%); flex-direction:row; justify-content:center; align-items:center; }
          .r-app { flex:none; width:390px; height:812px; max-height:calc(100vh - 48px); border-radius:44px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.06); }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.22s ease; }
      `}</style>

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

          {/* Scroll area */}
          <div ref={scrollRef} className="r-scroll" onScroll={handleScroll}>
            {AppHeader}
            <div key={nav} className="fade-up">
              {nav === 'menu'    && <MenuTab    menu={ristorante.menu || []}    {...sp} />}
              {nav === 'info'    && <InfoTab    ristorante={ristorante}          {...sp} />}
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
function MenuTab({ menu, primary, textColor, subText, isDark, radius, headingFamily, cardBg, surfaceBg, borderColor }) {
  const [lightbox, setLightbox] = useState(null)

  if (!menu.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: subText }}>
        <Utensils size={40} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
        <p style={{ margin: 0, fontSize: 15 }}>Menu non ancora disponibile.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px 28px' }}>
      {menu.map(cat => (
        <section key={cat.id} style={{ marginBottom: 28 }}>
          {/* Category header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: borderColor }} />
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: headingFamily, color: primary, textTransform: 'uppercase', letterSpacing: 1.2, flexShrink: 0 }}>
              {cat.name}
            </h2>
            <div style={{ flex: 1, height: 1, background: borderColor }} />
          </div>

          {/* Items */}
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
                onOpenPhoto={item.photo_url ? () => setLightbox(item.photo_url) : null}
              />
            ))}
          </div>
        </section>
      ))}

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

function MenuItem({ item, primary, textColor, subText, isDark, radius, cardBg, borderColor, onOpenPhoto }) {
  const shadow = isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.06)'

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
          <p style={{ margin: '0 0 6px', fontSize: 13, color: subText, lineHeight: 1.5 }}>{item.description}</p>
        )}
        {item.allergens && (
          <div style={{ fontSize: 11, color: subText, opacity: 0.7 }}>
            Allergeni: {item.allergens}
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

      {(ristorante.phone || ristorante.email || ristorante.address) && (
        <InfoSection Icon={MapPin} title="Contatti" primary={primary} headingFamily={headingFamily} textColor={textColor}>
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
