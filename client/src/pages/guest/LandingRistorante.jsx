import { useEffect, useState } from 'react'
import { MapPin, Phone, Mail, Clock, ChevronDown, Utensils, Wine, Coffee, Music, Car, Wind, Wifi, Bell, Bus, Star, Heart, Award, Calendar, Users, Plus, Minus } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import CookieBanner from '../../components/CookieBanner'

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

const HIGHLIGHT_LUCIDE = {
  star: Star, heart: Heart, award: Award, restaurant: Utensils, wine: Wine,
  breakfast: Coffee, music: Music, location: MapPin, time: Clock,
  parking: Car, ac: Wind, wifi: Wifi, reception: Bell, shuttle: Bus,
}
function highlightIcon(key) { return HIGHLIGHT_LUCIDE[key] || Star }

const SOCIAL_CONFIG = [
  { key: 'instagram',   label: 'Instagram',   color: '#E1306C' },
  { key: 'facebook',    label: 'Facebook',    color: '#1877F2' },
  { key: 'tripadvisor', label: 'TripAdvisor', color: '#00AA6C' },
  { key: 'whatsapp',    label: 'WhatsApp',    color: '#25D366' },
]

function SocialLink({ href, label, color }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ padding: '7px 16px', borderRadius: 50, background: color, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: 0.3 }}>
      {label}
    </a>
  )
}

function getEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`
  return null
}

const DEFAULT_ORDER = [
  'highlights', 'stats', 'about', 'video', 'cta_banner',
  'testimonianze', 'promozioni', 'menu_speciali', 'menu_preview',
  'eventi', 'news', 'gallery', 'faq', 'show_map', 'contatti', 'newsletter',
]

export default function LandingRistorante({ ristorante }) {
  const [scrolled,       setScrolled]       = useState(false)
  const [lightbox,       setLightbox]       = useState(null)
  const [upcomingEventi, setUpcomingEventi] = useState([])
  const [newsArticoli,   setNewsArticoli]   = useState([])

  useEffect(() => {
    apiFetch(`/api/guest/eventi?entity_tipo=ristorante&entity_id=${ristorante.id}`)
      .then(d => Array.isArray(d) && setUpcomingEventi(d))
      .catch(() => {})
    apiFetch(`/api/blog/public?azienda_id=${ristorante.azienda_id}&entity_tipo=ristorante&entity_id=${ristorante.id}&limit=6`)
      .then(d => Array.isArray(d) && setNewsArticoli(d))
      .catch(() => {})
  }, [ristorante.id])

  const theme   = { primaryColor: '#e63946', fontHeading: 'playfair', fontBody: 'inter', ...(ristorante.theme || {}) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const mini    = ristorante.minisito || {}
  const sections = { ...(mini.sections || {}) }
  const social   = mini.social || {}
  const socialLinks = SOCIAL_CONFIG.filter(s => social[s.key])

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
  const highlights = (mini.highlights || []).filter(h => h.text)
  const gallery    = (ristorante.gallery || []).slice(0, 9)
  const menu       = ristorante.menu || []
  const testimonianze = (mini.testimonianze || []).filter(t => t.text && t.author)
  const faq           = (mini.faq           || []).filter(f => f.question && f.answer)

  const now           = new Date()
  const stats         = (mini.stats        || []).filter(s => s.value && s.label)
  const promozioni    = (mini.promozioni   || []).filter(p => p.title && (!p.expires_at || new Date(p.expires_at) >= now))
  const menuSpeciali  = (mini.menu_speciali|| []).filter(m => m.name)
  const videoEmbedUrl = getEmbedUrl(mini.video_url)
  const ctaBanner     = mini.cta_banner || {}

  const hasInfo = ristorante.phone || ristorante.email || ristorante.address || ristorante.schedule

  const savedOrder = mini.section_order || []
  const sectionOrder = savedOrder.length
    ? [...savedOrder, ...DEFAULT_ORDER.filter(k => !savedOrder.includes(k))]
    : DEFAULT_ORDER

  function renderSection(key) {
    if (sections[key] === false) return null
    switch (key) {
      case 'highlights':
        if (!highlights.length) return null
        return (
          <section key="highlights" style={{ padding: '56px 0', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
            <div className="land-section">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(highlights.length, 3)}, 1fr)`, gap: 24 }}>
                {highlights.map(h => {
                  const Icon = highlightIcon(h.icon)
                  return (
                    <div key={h.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={24} strokeWidth={1.5} color={primary} />
                      </div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 }}>{h.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )

      case 'stats':
        if (!stats.length) return null
        return (
          <section key="stats" style={{ padding: '64px 0', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1a1a 100%)' }}>
            <div className="land-section">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 0 }}>
                {stats.map((s, i) => (
                  <div key={s.id} style={{
                    textAlign: 'center', padding: '8px 24px',
                    borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}>
                    <div style={{ fontFamily: heading, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, color: primary, lineHeight: 1, marginBottom: 10 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'about':
        if (!ristorante.description) return null
        return (
          <section key="about" style={{ padding: '80px 0' }}>
            <div className="land-section" style={{ maxWidth: 800, textAlign: 'center' }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, marginBottom: 24 }}>
                La nostra cucina
              </h2>
              <p style={{ fontSize: 18, lineHeight: 1.8, color: '#555' }}>{ristorante.description}</p>
            </div>
          </section>
        )

      case 'video':
        if (!videoEmbedUrl) return null
        return (
          <section key="video" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section" style={{ maxWidth: 960 }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                Scopri {ristorante.name}
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 40, fontSize: 15 }}>Guarda il video e lasciati ispirare</p>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
                <iframe
                  src={videoEmbedUrl}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )

      case 'cta_banner':
        if (!ctaBanner.active || !ctaBanner.title) return null
        return (
          <section key="cta_banner" style={{ padding: '88px 24px', background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, textAlign: 'center' }}>
            <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, color: '#fff', marginBottom: 16, lineHeight: 1.15 }}>
              {ctaBanner.title}
            </h2>
            {ctaBanner.subtitle && (
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', marginBottom: 40, maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
                {ctaBanner.subtitle}
              </p>
            )}
            {ctaBanner.cta_label && ctaBanner.cta_url && (
              <a href={ctaBanner.cta_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '16px 44px', background: '#fff', color: primary, borderRadius: 50, fontSize: 17, fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                {ctaBanner.cta_label}
              </a>
            )}
          </section>
        )

      case 'testimonianze':
        if (!testimonianze.length) return null
        return (
          <section key="testimonianze" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                Cosa dicono i nostri clienti
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>
                Recensioni reali di chi ha cenato da noi
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {testimonianze.map(t => (
                  <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 40, lineHeight: 1, color: primary, opacity: 0.25, fontFamily: 'Georgia, serif', marginBottom: -8 }}>"</div>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#444', flex: 1 }}>{t.text}</p>
                    <div>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ color: n <= (t.rating || 5) ? '#f59e0b' : '#e0e0e0', fontSize: 16 }}>★</span>
                        ))}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{t.author}</div>
                      {t.location && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{t.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'promozioni':
        if (!promozioni.length) return null
        return (
          <section key="promozioni" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                Offerte speciali
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>
                Promozioni esclusive per i nostri clienti
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {promozioni.map(p => (
                  <div key={p.id} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${primary}` }}>
                    <div style={{ padding: '28px 24px' }}>
                      {p.badge && (
                        <span style={{ display: 'inline-block', background: `${primary}18`, color: primary, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>
                          {p.badge}
                        </span>
                      )}
                      <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' }}>{p.title}</h3>
                      {p.text && <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>{p.text}</p>}
                      {p.expires_at && (
                        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>
                          Valida fino al {new Date(p.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                      {p.cta_label && p.cta_url && (
                        <a href={p.cta_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-block', padding: '11px 24px', background: primary, color: '#fff', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                          {p.cta_label}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'menu_speciali':
        if (!menuSpeciali.length) return null
        return (
          <section key="menu_speciali" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                Menu degustazione
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>
                Esperienze gastronomiche curate dallo chef
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {menuSpeciali.map(m => (
                  <div key={m.id} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ padding: '28px', background: 'linear-gradient(135deg, #1a1a2e 0%, #2a1a20 100%)' }}>
                      {m.badge && (
                        <span style={{ display: 'inline-block', background: primary, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                          {m.badge}
                        </span>
                      )}
                      <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>{m.name}</h3>
                      {m.description && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{m.description}</p>}
                      {m.price && (
                        <div style={{ marginTop: 20 }}>
                          <span style={{ fontFamily: heading, fontSize: 36, fontWeight: 800, color: primary }}>{m.price}</span>
                          {m.price_label && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>/ {m.price_label}</span>}
                        </div>
                      )}
                    </div>
                    {(m.portate || []).filter(Boolean).length > 0 && (
                      <div style={{ padding: '24px 28px', background: '#fff' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Le portate</div>
                        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {(m.portate || []).filter(Boolean).map((portata, i) => (
                            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, color: '#444' }}>
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: `${primary}18`, color: primary, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {i + 1}
                              </span>
                              {portata}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'menu_preview':
        if (!menu.length) return null
        return (
          <section key="menu_preview" style={{ padding: '80px 0', background: '#f9f9fb' }}>
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
        )

      case 'eventi':
        if (!upcomingEventi.length) return null
        return (
          <section key="eventi" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                Prossimi eventi
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>
                {upcomingEventi.length} {upcomingEventi.length === 1 ? 'evento in programma' : 'eventi in programma'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
                {upcomingEventi.slice(0, 6).map(ev => {
                  const dateStr = new Date(ev.date_start).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                  return (
                    <a key={ev.id} href={`/eventi/${ev.id}`} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.14s ease, box-shadow 0.14s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}>
                      {ev.cover_url
                        ? <img src={ev.cover_url} alt={ev.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ height: 100, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={36} strokeWidth={1.5} color={primary} />
                          </div>
                      }
                      <div style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{ev.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                            <Calendar size={12} strokeWidth={1.5} color={primary} /> {dateStr}
                          </span>
                          {ev.location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                              <MapPin size={12} strokeWidth={1.5} color={primary} /> {ev.location}
                            </span>
                          )}
                          {ev.seats_total && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                              <Users size={12} strokeWidth={1.5} color={primary} /> {ev.seats_total - ev.seats_booked} posti
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: primary }}>
                            {ev.price > 0 ? `€${ev.price}` : 'Gratuito'}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: primary }}>Prenota →</span>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </section>
        )

      case 'news':
        if (!newsArticoli.length) return null
        return (
          <section key="news" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>News & Aggiornamenti</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Le ultime novità</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {newsArticoli.map(art => (
                  <a key={art.id} href={`/blog/${art.slug}`}
                    style={{ background: '#f9f9fb', borderRadius: 14, overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.14s ease, box-shadow 0.14s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)' }}>
                    {art.cover_url && <img src={art.cover_url} alt={art.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      {art.published_at && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{new Date(art.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#1a1a2e' }}>{art.title}</div>
                      {art.excerpt && <div style={{ fontSize: 13, color: '#777', lineHeight: 1.5 }}>{art.excerpt}</div>}
                      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: primary }}>Leggi →</div>
                    </div>
                  </a>
                ))}
              </div>
              {newsArticoli.length >= 6 && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <a href={`/blog?azienda_id=${ristorante.azienda_id}`}
                    style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 50, border: `2px solid ${primary}`, color: primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    Vedi tutti gli articoli →
                  </a>
                </div>
              )}
            </div>
          </section>
        )

      case 'contatti':
        if (!ristorante.phone && !ristorante.email) return null
        return (
          <section key="contatti" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section" style={{ maxWidth: 640 }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Contattaci</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Siamo a tua disposizione per qualsiasi informazione</p>
              <ContactForm entityTipo="ristorante" entityId={ristorante.id} primary={primary} heading={heading} />
            </div>
          </section>
        )

      case 'newsletter':
        return (
          <section key="newsletter" style={{ padding: '80px 0', background: primary }}>
            <div className="land-section" style={{ maxWidth: 560, textAlign: 'center' }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                {mini.newsletter_title || 'Resta aggiornato'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 36 }}>
                {mini.newsletter_subtitle || 'Iscriviti per ricevere offerte esclusive e novità.'}
              </p>
              <NewsletterForm aziendaId={ristorante.azienda_id} primary={primary} />
            </div>
          </section>
        )

      case 'gallery':
        if (!gallery.length) return null
        return (
          <section key="gallery" style={{ padding: '80px 0' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 40, textAlign: 'center' }}>Galleria</h2>
              <div className="land-gallery">
                {gallery.map((url, i) => (
                  <img key={url + i} src={url} alt="" onClick={() => setLightbox(url)} />
                ))}
              </div>
            </div>
          </section>
        )

      case 'faq':
        if (!faq.length) return null
        return (
          <section key="faq" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section" style={{ maxWidth: 760 }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                Domande frequenti
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>
                Tutto quello che devi sapere prima di venirci a trovare
              </p>
              <FaqAccordion faq={faq} primary={primary} />
            </div>
          </section>
        )

      case 'show_map':
        if (!ristorante.address) return null
        return (
          <section key="show_map" style={{ lineHeight: 0 }}>
            <iframe
              title="mappa"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(ristorante.address)}&output=embed&z=15`}
              width="100%" height="380"
              style={{ border: 'none', display: 'block' }}
              loading="lazy"
              allowFullScreen
            />
          </section>
        )

      default: return null
    }
  }

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

      {sectionOrder.map(renderSection)}

      {/* Contatti */}
      {hasInfo && (
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
      <footer style={{ background: '#111', padding: '28px 24px', textAlign: 'center' }}>
        {socialLinks.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {socialLinks.map(({ key, label, color }) => (
              <SocialLink key={key} href={social[key]} label={label} color={color} />
            ))}
          </div>
        )}
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

      <CookieBanner primaryColor={primary} privacyUrl={mini.privacy_url || null} />
    </>
  )
}

function NewsletterForm({ aziendaId, primary }) {
  const [nome,     setNome]     = useState('')
  const [email,    setEmail]    = useState('')
  const [telefono, setTelefono] = useState('')
  const [state,    setState]    = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    setState('loading')
    try {
      await fetch('/api/contatti/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azienda_id: aziendaId, nome, email, telefono, fonte: 'minisito' }),
      })
      setState('success')
    } catch { setState('error') }
  }

  if (state === 'success') return (
    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '24px', color: '#fff' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
      <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Iscrizione completata!</p>
      <p style={{ opacity: 0.8, fontSize: 14 }}>Ti terremo aggiornato sulle nostre novità.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Il tuo nome"
        style={{ padding: '13px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }} />
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="La tua email"
        style={{ padding: '13px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }} />
      <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Telefono (opzionale)"
        style={{ padding: '13px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }} />
      {state === 'error' && <p style={{ color: '#ffe', fontSize: 13 }}>Errore. Riprova.</p>}
      <button type="submit" disabled={state === 'loading'}
        style={{ padding: '14px', background: '#fff', color: primary, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
        {state === 'loading' ? 'Iscrizione…' : 'Iscriviti'}
      </button>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Nessuno spam. Puoi cancellarti in qualsiasi momento.</p>
    </form>
  )
}

function ContactForm({ entityTipo, entityId, primary }) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [state,   setState]   = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    setState('loading')
    try {
      await fetch('/api/guest/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, name, email, message }),
      })
      setState('success')
    } catch { setState('error') }
  }

  if (state === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <p style={{ fontWeight: 700, fontSize: 18, color: primary, marginBottom: 8 }}>Messaggio inviato!</p>
        <p style={{ color: '#888' }}>Ti risponderemo il prima possibile.</p>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 15, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }
  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '36px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <input value={name} onChange={e => setName(e.target.value)} required placeholder="Il tuo nome" style={inputStyle} />
      <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="La tua email" style={inputStyle} />
      <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder="Il tuo messaggio…" style={{ ...inputStyle, resize: 'vertical' }} />
      {state === 'error' && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 12 }}>Errore nell'invio. Riprova.</p>}
      <button type="submit" disabled={state === 'loading'}
        style={{ width: '100%', padding: '14px', background: primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
        {state === 'loading' ? 'Invio…' : 'Invia messaggio'}
      </button>
    </form>
  )
}

function FaqAccordion({ faq, primary }) {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      {faq.map((item, i) => {
        const isOpen = open === item.id
        return (
          <div key={item.id} style={{ borderBottom: i < faq.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <button onClick={() => setOpen(isOpen ? null : item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 24px', background: isOpen ? `${primary}08` : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', flex: 1 }}>{item.question}</span>
              {isOpen
                ? <Minus size={18} strokeWidth={2} color={primary} style={{ flexShrink: 0 }} />
                : <Plus  size={18} strokeWidth={2} color={primary} style={{ flexShrink: 0 }} />
              }
            </button>
            {isOpen && (
              <div style={{ padding: '0 24px 20px', fontSize: 15, color: '#555', lineHeight: 1.7, background: `${primary}08` }}>
                {item.answer}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const navBtnPrimary   = { padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: 'none', color: '#fff' }
const navBtnSecondary = { padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: '#1a1a2e', border: '1px solid #ddd' }
