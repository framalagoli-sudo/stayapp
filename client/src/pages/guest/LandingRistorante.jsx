import { useEffect, useState } from 'react'
import { MapPin, Phone, Mail, Clock, ChevronDown } from 'lucide-react'

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

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

export default function LandingRistorante({ ristorante }) {
  const [scrolled,  setScrolled]  = useState(false)
  const [lightbox,  setLightbox]  = useState(null)

  const theme   = { primaryColor: '#e63946', fontHeading: 'playfair', fontBody: 'inter', ...(ristorante.theme || {}) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const mini    = ristorante.minisito || {}

  useEffect(() => {
    loadFont(theme.fontHeading)
    loadFont(theme.fontBody)
    document.title = mini.seo_title || ristorante.name
    setMeta('description', mini.seo_description || ristorante.description || '')
    setMeta('og:title',    mini.seo_title || ristorante.name)
    setMeta('og:image',    ristorante.cover_url || '')
    setMeta('og:type',     'restaurant')
    return () => { document.title = 'StayApp' }
  }, [])

  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    el.setAttribute('content', content)
  }

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 80) }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const pwaUrl     = `${window.location.pathname}?qr=1`
  const bookingUrl = mini.booking_url || null
  const tagline    = mini.tagline || ''
  const gallery    = (ristorante.gallery || []).slice(0, 9)
  const menu       = ristorante.menu || []

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .land-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-bottom: 1px solid #eee; padding: 0 32px;
          display: flex; align-items: center; justify-content: space-between; height: 64px;
          transform: translateY(${scrolled ? '0' : '-100%'}); transition: transform 0.3s ease;
        }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .land-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .land-gallery img { width: 100%; aspect-ratio: 4/3; object-fit: cover; cursor: pointer; border-radius: 4px; transition: opacity 0.2s; }
        .land-gallery img:hover { opacity: 0.9; }
        @media (max-width: 768px) {
          .land-gallery { grid-template-columns: repeat(2, 1fr); }
          .land-nav { padding: 0 16px; }
          .land-section { padding: 0 16px; }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up   { animation: fadeUp 0.7s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.7s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.4s ease both; }
      `}</style>

      {/* Sticky nav */}
      <nav className="land-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {ristorante.logo_url && <img src={ristorante.logo_url} alt="logo" style={{ height: 32, objectFit: 'contain' }} />}
          <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 16 }}>{ristorante.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={pwaUrl} style={navBtnSecondary}>Vedi menu</a>
          {bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...navBtnPrimary, background: primary }}>
              Prenota
            </a>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 520, overflow: 'hidden' }}>
        {ristorante.cover_url
          ? <img src={ristorante.cover_url} alt="cover" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${primary} 0%, ${primary}99 100%)` }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)' }} />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          {ristorante.logo_url && (
            <img src={ristorante.logo_url} alt="logo" className="fade-up"
              style={{ maxHeight: 72, maxWidth: 180, objectFit: 'contain', marginBottom: 24, filter: 'brightness(0) invert(1)' }} />
          )}
          <h1 className="fade-up-2" style={{ fontFamily: heading, fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 16, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
            {ristorante.name}
          </h1>
          {tagline && (
            <p className="fade-up-3" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', color: 'rgba(255,255,255,0.88)', maxWidth: 560, lineHeight: 1.5, marginBottom: 12 }}>
              {tagline}
            </p>
          )}
          {ristorante.schedule && (
            <p className="fade-up-3" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>
              <Clock size={14} strokeWidth={2} />
              {ristorante.schedule}
            </p>
          )}
          <div className="fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {bookingUrl && (
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '14px 32px', background: primary, color: '#fff', borderRadius: 50, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: `0 8px 32px ${primary}66` }}>
                Prenota un tavolo
              </a>
            )}
            <a href={pwaUrl}
              style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 50, fontSize: 16, fontWeight: 600, textDecoration: 'none', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}>
              Vedi il menu
            </a>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>Scopri</span>
          <ChevronDown size={20} color="rgba(255,255,255,0.6)" strokeWidth={1.5} />
        </div>
      </section>

      {/* About */}
      {ristorante.description && (
        <section style={{ padding: '80px 0' }}>
          <div className="land-section" style={{ maxWidth: 800, textAlign: 'center' }}>
            <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, marginBottom: 24 }}>
              La nostra cucina
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.8, color: '#555' }}>{ristorante.description}</p>
          </div>
        </section>
      )}

      {/* Anteprima menu */}
      {menu.length > 0 && (
        <section style={{ padding: '80px 0', background: '#f9f9fb' }}>
          <div className="land-section">
            <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
              Il menu
            </h2>
            <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>
              {menu.length} {menu.length === 1 ? 'categoria' : 'categorie'} · {menu.reduce((n, c) => n + (c.items?.length || 0), 0)} piatti
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
              {menu.slice(0, 6).map(cat => (
                <div key={cat.id} style={{ background: '#fff', borderRadius: 14, padding: '20px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: `3px solid ${primary}` }}>
                  <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{cat.name}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{cat.items?.length || 0} piatti</div>
                  {cat.items?.slice(0, 2).map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13, color: '#444', flex: 1, marginRight: 8 }}>{item.name}</span>
                      {item.price && <span style={{ fontSize: 13, fontWeight: 700, color: primary, flexShrink: 0 }}>€{item.price}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <a href={pwaUrl} style={{ padding: '13px 32px', background: primary, color: '#fff', borderRadius: 50, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                Menu completo
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Galleria */}
      {gallery.length > 0 && (
        <section style={{ padding: '80px 0' }}>
          <div className="land-section">
            <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 40, textAlign: 'center' }}>Galleria</h2>
            <div className="land-gallery">
              {gallery.map((url, i) => (
                <img key={url + i} src={url} alt="" onClick={() => setLightbox(url)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contatti */}
      {(ristorante.phone || ristorante.email || ristorante.address || ristorante.schedule) && (
        <section style={{ padding: '80px 0', background: '#1a1a2e', color: '#fff' }}>
          <div className="land-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48 }}>
            <div>
              <h2 style={{ fontFamily: heading, fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Vieni a trovarci</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ristorante.schedule && (
                  <div style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                    <Clock size={18} strokeWidth={1.5} color={primary} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ whiteSpace: 'pre-line' }}>{ristorante.schedule}</span>
                  </div>
                )}
                {ristorante.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(ristorante.address)}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15 }}>
                    <MapPin size={18} strokeWidth={1.5} color={primary} style={{ flexShrink: 0, marginTop: 2 }} />
                    {ristorante.address}
                  </a>
                )}
                {ristorante.phone && (
                  <a href={`tel:${ristorante.phone}`} style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15 }}>
                    <Phone size={18} strokeWidth={1.5} color={primary} style={{ flexShrink: 0 }} />
                    {ristorante.phone}
                  </a>
                )}
                {ristorante.email && (
                  <a href={`mailto:${ristorante.email}`} style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15 }}>
                    <Mail size={18} strokeWidth={1.5} color={primary} style={{ flexShrink: 0 }} />
                    {ristorante.email}
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Riserva il tuo tavolo o consulta il menu digitale.
              </p>
              {bookingUrl && (
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '13px 28px', background: primary, color: '#fff', borderRadius: 50, fontSize: 15, fontWeight: 700, textDecoration: 'none', width: 'fit-content' }}>
                  Prenota un tavolo
                </a>
              )}
              <a href={pwaUrl} style={{ display: 'inline-block', padding: '13px 28px', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 50, fontSize: 15, fontWeight: 600, textDecoration: 'none', width: 'fit-content' }}>
                Menu digitale
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ background: '#111', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#555' }}>
          © {new Date().getFullYear()} {ristorante.name} · Powered by StayApp
        </p>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '92vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}

const navBtnPrimary   = { padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: 'none', color: '#fff' }
const navBtnSecondary = { padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: '#1a1a2e', border: '1px solid #ddd' }
