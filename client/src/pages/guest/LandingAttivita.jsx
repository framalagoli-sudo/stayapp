import { useEffect, useRef, useState } from 'react'
import { MapPin, Phone, Mail, ChevronDown, Waves, Sparkles, Utensils, Activity, Car, Wifi, Umbrella, Music, Wine, Coffee, Bell, Bus, Star, Clock, Euro, Heart, Award, Mountain, Wind, Calendar, Users, Plus, Minus } from 'lucide-react'
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
  inter:       "'Inter', system-ui, sans-serif",
  lato:        "'Lato', system-ui, sans-serif",
  'open-sans': "'Open Sans', system-ui, sans-serif",
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

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

const SERVICE_LUCIDE = {
  pool: Waves, spa: Sparkles, restaurant: Utensils, gym: Activity,
  parking: Car, wifi: Wifi, beach: Umbrella, entertainment: Music,
  bar: Wine, breakfast: Coffee, reception24: Bell, shuttle: Bus,
}
function serviceIcon(key) { return SERVICE_LUCIDE[key] || Star }

const HIGHLIGHT_LUCIDE = {
  star: Star, heart: Heart, award: Award, wifi: Wifi, parking: Car,
  pool: Waves, spa: Sparkles, restaurant: Utensils, gym: Activity,
  beach: Umbrella, mountain: Mountain, breakfast: Coffee, bar: Wine,
  shuttle: Bus, reception: Bell, ac: Wind, location: MapPin, time: Clock, music: Music,
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
      style={{ padding: '7px 16px', borderRadius: 50, background: color, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
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
  'testimonianze', 'promozioni', 'servizi',
  'eventi', 'news', 'gallery', 'faq', 'show_map', 'contatti', 'newsletter',
]

export default function LandingAttivita({ attivita }) {
  const [scrolled,       setScrolled]       = useState(false)
  const [lightbox,       setLightbox]       = useState(null)
  const [upcomingEventi, setUpcomingEventi] = useState([])
  const [newsArticoli,   setNewsArticoli]   = useState([])
  const aboutRef = useRef(null)

  useEffect(() => {
    apiFetch(`/api/guest/eventi?entity_tipo=attivita&entity_id=${attivita.id}`)
      .then(d => Array.isArray(d) && setUpcomingEventi(d)).catch(() => {})
    apiFetch(`/api/blog/public?azienda_id=${attivita.azienda_id}&entity_tipo=attivita&entity_id=${attivita.id}&limit=6`)
      .then(d => Array.isArray(d) && setNewsArticoli(d)).catch(() => {})
  }, [attivita.id])

  const theme   = { primaryColor: '#6b46c1', fontHeading: 'playfair', fontBody: 'inter', ...(attivita.theme || {}) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const mini    = attivita.minisito || {}
  const sections    = { ...(mini.sections || {}) }
  const social      = mini.social || {}
  const socialLinks = SOCIAL_CONFIG.filter(s => social[s.key])

  useEffect(() => {
    loadFont(theme.fontHeading); loadFont(theme.fontBody)
    document.title = mini.seo_title || attivita.name
    setMeta('description', mini.seo_description || attivita.description || '')
    setMeta('og:title', mini.seo_title || attivita.name)
    setMeta('og:image', attivita.cover_url || '')
    setMeta('og:type', 'website')
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

  const bookingUrl = mini.booking_url || null
  const tagline    = mini.tagline || ''
  const highlights = (mini.highlights || []).filter(h => h.text)
  const gallery    = (attivita.gallery  || []).slice(0, 9)
  const services   = (attivita.services || []).slice(0, 6)
  const now        = new Date()
  const stats         = (mini.stats        || []).filter(s => s.value && s.label)
  const promozioni    = (mini.promozioni   || []).filter(p => p.title && (!p.expires_at || new Date(p.expires_at) >= now))
  const testimonianze = (mini.testimonianze|| []).filter(t => t.text && t.author)
  const faq           = (mini.faq          || []).filter(f => f.question && f.answer)
  const videoEmbedUrl = getEmbedUrl(mini.video_url)
  const ctaBanner     = mini.cta_banner || {}
  const hasInfo       = attivita.phone || attivita.email || attivita.address || attivita.schedule

  const savedOrder  = mini.section_order || []
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
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{h.text}</div>
                      {h.sub && <div style={{ fontSize: 13, color: '#888' }}>{h.sub}</div>}
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
          <section key="stats" style={{ padding: '64px 0', background: `${primary}08` }}>
            <div className="land-section">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 32, textAlign: 'center' }}>
                {stats.map(s => (
                  <div key={s.id}>
                    <div style={{ fontFamily: heading, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: primary, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'about':
        if (!attivita.description) return null
        return (
          <section key="about" ref={aboutRef} style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section" style={{ display: 'grid', gridTemplateColumns: attivita.cover_url ? '1fr 1fr' : '1fr', gap: 64, alignItems: 'center', maxWidth: attivita.cover_url ? 1100 : 760 }}>
              <div>
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 700, marginBottom: 20, lineHeight: 1.2 }}>{attivita.name}</h2>
                <p style={{ fontSize: 16, color: '#555', lineHeight: 1.8, marginBottom: 24 }}>{attivita.description}</p>
                {attivita.schedule && <p style={{ fontSize: 14, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} strokeWidth={1.5} color={primary} /> {attivita.schedule}</p>}
              </div>
              {attivita.cover_url && <img src={attivita.cover_url} alt={attivita.name} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 420 }} />}
            </div>
          </section>
        )

      case 'video':
        if (!videoEmbedUrl) return null
        return (
          <section key="video" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section" style={{ maxWidth: 860 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe src={videoEmbedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen title="video" />
              </div>
            </div>
          </section>
        )

      case 'cta_banner':
        if (!ctaBanner.active || !ctaBanner.title) return null
        return (
          <section key="cta_banner" style={{ padding: '64px 0', background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
            <div className="land-section" style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{ctaBanner.title}</h2>
              {ctaBanner.subtitle && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 28 }}>{ctaBanner.subtitle}</p>}
              {ctaBanner.cta_url && ctaBanner.cta_label && (
                <a href={ctaBanner.cta_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '14px 36px', background: '#fff', color: primary, borderRadius: 50, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
                  {ctaBanner.cta_label}
                </a>
              )}
            </div>
          </section>
        )

      case 'testimonianze':
        if (!testimonianze.length) return null
        return (
          <section key="testimonianze" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 48, textAlign: 'center' }}>Cosa dicono di noi</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {testimonianze.map(t => (
                  <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                      {Array.from({ length: t.rating || 5 }).map((_, i) => <Star key={i} size={14} fill={primary} color={primary} strokeWidth={0} />)}
                    </div>
                    <p style={{ fontSize: 15, color: '#444', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>"{t.text}"</p>
                    <div style={{ fontWeight: 700, fontSize: 13, color: primary }}>{t.author}</div>
                    {t.role && <div style={{ fontSize: 12, color: '#aaa' }}>{t.role}</div>}
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
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 48, textAlign: 'center' }}>Offerte speciali</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {promozioni.map(p => (
                  <div key={p.id} style={{ border: `2px solid ${primary}`, borderRadius: 16, padding: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 16, right: 16, background: primary, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>OFFERTA</div>
                    <h3 style={{ fontFamily: heading, fontSize: 20, fontWeight: 700, marginBottom: 8, paddingRight: 64 }}>{p.title}</h3>
                    {p.description && <p style={{ fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 1.6 }}>{p.description}</p>}
                    {p.discount && <div style={{ fontSize: 22, fontWeight: 800, color: primary }}>{p.discount}</div>}
                    {p.expires_at && <div style={{ fontSize: 12, color: '#aaa', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} strokeWidth={1.5} /> Fino al {new Date(p.expires_at).toLocaleDateString('it-IT')}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'servizi':
        if (!services.length) return null
        return (
          <section key="servizi" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 48, textAlign: 'center' }}>I nostri servizi</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                {services.map(s => {
                  const Icon = serviceIcon(s.icon)
                  return (
                    <div key={s.id} style={{ background: '#f9f9fb', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Icon size={22} strokeWidth={1.5} color={primary} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{s.name}</div>
                      {s.description && <div style={{ fontSize: 13, color: '#777', lineHeight: 1.5 }}>{s.description}</div>}
                      {s.hours && <div style={{ fontSize: 12, color: primary, marginTop: 8, fontWeight: 600 }}>{s.hours}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )

      case 'eventi':
        if (!upcomingEventi.length) return null
        return (
          <section key="eventi" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Prossimi eventi</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Non perdere le nostre iniziative</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {upcomingEventi.map(ev => (
                  <a key={ev.id} href={`/eventi/${ev.id}`} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'block', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    {ev.cover_url && <img src={ev.cover_url} alt={ev.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: '#888' }}>
                        <Calendar size={12} strokeWidth={1.5} color={primary} />
                        {new Date(ev.date_start).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{ev.title}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: primary }}>{ev.price > 0 ? `€${ev.price}` : 'Gratuito'}</div>
                    </div>
                  </a>
                ))}
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
                  <a key={art.id} href={`/blog/${art.slug}`} style={{ background: '#f9f9fb', borderRadius: 14, overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
                  <a href={`/blog?azienda_id=${attivita.azienda_id}`}
                    style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 50, border: `2px solid ${primary}`, color: primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    Vedi tutti gli articoli →
                  </a>
                </div>
              )}
            </div>
          </section>
        )

      case 'gallery':
        if (!gallery.length) return null
        return (
          <section key="gallery" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 40, textAlign: 'center' }}>Galleria</h2>
              <div className="land-gallery">
                {gallery.map((url, i) => <img key={url + i} src={url} alt="" onClick={() => setLightbox(url)} />)}
              </div>
            </div>
          </section>
        )

      case 'faq':
        if (!faq.length) return null
        return (
          <section key="faq" style={{ padding: '80px 0', background: '#fff' }}>
            <div className="land-section" style={{ maxWidth: 760 }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Domande frequenti</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Tutto quello che vuoi sapere</p>
              <FaqAccordion faq={faq} primary={primary} />
            </div>
          </section>
        )

      case 'show_map':
        if (!attivita.address) return null
        return (
          <section key="show_map" style={{ height: 360 }}>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(attivita.address)}&output=embed&z=15`}
              style={{ width: '100%', height: '100%', border: 'none' }} loading="lazy" title="mappa" />
          </section>
        )

      case 'contatti':
        if (!attivita.phone && !attivita.email) return null
        return (
          <section key="contatti" style={{ padding: '80px 0', background: '#f9f9fb' }}>
            <div className="land-section" style={{ maxWidth: 640 }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Contattaci</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Siamo a tua disposizione</p>
              <ContactForm entityTipo="attivita" entityId={attivita.id} primary={primary} privacyUrl={`/a/${attivita.slug}/privacy`} />
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
              <NewsletterForm aziendaId={attivita.azienda_id} primary={primary} privacyUrl={`/a/${attivita.slug}/privacy`} />
            </div>
          </section>
        )

      default: return null
    }
  }

  const navBtnPrimary   = { padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: 'none', color: '#fff' }
  const navBtnSecondary = { padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: '#1a1a2e', border: '1px solid #ddd' }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .land-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-bottom: 1px solid #eee; padding: 0 32px;
          display: flex; align-items: center; justify-content: space-between; height: 64px;
          transform: translateY(${scrolled ? '0' : '-100%'}); transition: transform 0.3s ease;
        }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .land-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .land-gallery img { width: 100%; aspect-ratio: 4/3; object-fit: cover; cursor: pointer; border-radius: 4px; }
        @media (max-width: 768px) {
          .land-gallery { grid-template-columns: repeat(2, 1fr); }
          .land-nav { padding: 0 16px; }
          .land-section { padding: 0 16px; }
        }
      `}</style>

      <nav className="land-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {attivita.logo_url && <img src={attivita.logo_url} alt="logo" style={{ height: 32, objectFit: 'contain' }} />}
          <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 16 }}>{attivita.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {bookingUrl && <a href={bookingUrl} target="_blank" rel="noopener noreferrer" style={{ ...navBtnPrimary, background: primary }}>Prenota</a>}
        </div>
      </nav>

      <section style={{ position: 'relative', height: '100vh', minHeight: 560, overflow: 'hidden' }}>
        {attivita.cover_url
          ? <img src={attivita.cover_url} alt="cover" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${primary} 0%, ${primary}99 100%)` }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          {attivita.logo_url && <img src={attivita.logo_url} alt="logo" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', marginBottom: 24, filter: 'brightness(0) invert(1)' }} />}
          <h1 style={{ fontFamily: heading, fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 16 }}>{attivita.name}</h1>
          {tagline && <p style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', color: 'rgba(255,255,255,0.88)', maxWidth: 600, lineHeight: 1.5, marginBottom: 36 }}>{tagline}</p>}
          {attivita.tipo && attivita.tipo !== 'attività' && (
            <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: '#fff', marginBottom: 24, backdropFilter: 'blur(8px)', textTransform: 'capitalize' }}>{attivita.tipo}</span>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {bookingUrl && <a href={bookingUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '14px 32px', background: primary, color: '#fff', borderRadius: 50, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>Prenota ora</a>}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          onClick={() => aboutRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>Scopri</span>
          <ChevronDown size={20} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
        </div>
      </section>

      {sectionOrder.map(renderSection)}

      {hasInfo && (
        <section style={{ padding: '80px 0', background: '#1a1a2e', color: '#fff' }}>
          <div className="land-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48 }}>
            <div>
              <h2 style={{ fontFamily: heading, fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Dove siamo</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {attivita.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(attivita.address)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15 }}><MapPin size={18} strokeWidth={1.5} color={primary} style={{ flexShrink: 0 }} />{attivita.address}</a>}
                {attivita.phone && <a href={`tel:${attivita.phone}`} style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15 }}><Phone size={18} strokeWidth={1.5} color={primary} />{attivita.phone}</a>}
                {attivita.email && <a href={`mailto:${attivita.email}`} style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15 }}><Mail size={18} strokeWidth={1.5} color={primary} />{attivita.email}</a>}
                {attivita.schedule && <div style={{ display: 'flex', gap: 12, color: 'rgba(255,255,255,0.8)', fontSize: 15 }}><Clock size={18} strokeWidth={1.5} color={primary} style={{ flexShrink: 0 }} />{attivita.schedule}</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      <footer style={{ background: '#111', padding: '28px 24px', textAlign: 'center' }}>
        {socialLinks.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {socialLinks.map(({ key, label, color }) => <SocialLink key={key} href={social[key]} label={label} color={color} />)}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#555' }}>© {new Date().getFullYear()} {attivita.name} · Powered by StayApp</p>
        {attivita.slug && (
          <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
            <a href={`/a/${attivita.slug}/privacy`} style={{ color: '#aaa', textDecoration: 'none', marginRight: 12 }}>Privacy Policy</a>
            <a href={`/a/${attivita.slug}/cookie`}  style={{ color: '#aaa', textDecoration: 'none' }}>Cookie Policy</a>
          </p>
        )}
      </footer>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '92vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}

      <CookieBanner
        primaryColor={primary}
        privacyUrl={attivita.slug ? `/a/${attivita.slug}/privacy` : null}
        cookieUrl={attivita.slug  ? `/a/${attivita.slug}/cookie`  : null}
      />
    </>
  )
}

function NewsletterForm({ aziendaId, primary, privacyUrl }) {
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [telefono, setTelefono] = useState(''); const [privacy, setPrivacy] = useState(false); const [state, setState] = useState('idle')
  async function handleSubmit(e) {
    e.preventDefault(); if (!privacy) return; setState('loading')
    try { await fetch('/api/contatti/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ azienda_id: aziendaId, nome, email, telefono, fonte: 'minisito' }) }); setState('success') } catch { setState('error') }
  }
  if (state === 'success') return (<div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '24px', color: '#fff' }}><div style={{ fontSize: 32, marginBottom: 10 }}>✓</div><p style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Iscrizione completata!</p></div>)
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Il tuo nome" style={{ padding: '13px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }} />
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="La tua email" style={{ padding: '13px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }} />
      <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Telefono (opzionale)" style={{ padding: '13px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} required style={{ marginTop: 3, flexShrink: 0, accentColor: '#fff' }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>Ho letto e accetto la{' '}{privacyUrl ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 700 }}>Privacy Policy</a> : 'Privacy Policy'}{' '}ai sensi del GDPR.</span>
      </label>
      <button type="submit" disabled={state === 'loading' || !privacy} style={{ padding: '14px', background: privacy ? '#fff' : 'rgba(255,255,255,0.4)', color: primary, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: privacy ? 'pointer' : 'default', marginTop: 4, transition: 'background 0.2s' }}>{state === 'loading' ? 'Iscrizione…' : 'Iscriviti'}</button>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Nessuno spam. Puoi cancellarti in qualsiasi momento.</p>
    </form>
  )
}

function ContactForm({ entityTipo, entityId, primary, privacyUrl }) {
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [privacy, setPrivacy] = useState(false); const [state, setState] = useState('idle')
  async function handleSubmit(e) {
    e.preventDefault(); if (!privacy) return; setState('loading')
    try { await fetch('/api/guest/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, name: nome, email, message }) }); setState('success') } catch { setState('error') }
  }
  if (state === 'success') return (<div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 48, marginBottom: 16 }}>✓</div><p style={{ fontWeight: 700, fontSize: 18, color: primary }}>Messaggio inviato!</p></div>)
  const inp = { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 15, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }
  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '36px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Il tuo nome" style={inp} />
      <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="La tua email" style={inp} />
      <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder="Il tuo messaggio…" style={{ ...inp, resize: 'vertical' }} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} required style={{ marginTop: 2, accentColor: primary, flexShrink: 0 }} />
        <span>Ho letto e accetto la{' '}{privacyUrl ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary, fontWeight: 600 }}>Privacy Policy</a> : 'Privacy Policy'}{' '}ai sensi del GDPR.</span>
      </label>
      <button type="submit" disabled={state === 'loading' || !privacy} style={{ width: '100%', padding: '14px', background: privacy ? primary : '#ccc', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: privacy ? 'pointer' : 'default', transition: 'background 0.2s' }}>{state === 'loading' ? 'Invio…' : 'Invia messaggio'}</button>
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
            <button onClick={() => setOpen(isOpen ? null : item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 24px', background: isOpen ? `${primary}08` : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', flex: 1 }}>{item.question}</span>
              {isOpen ? <Minus size={18} strokeWidth={2} color={primary} /> : <Plus size={18} strokeWidth={2} color={primary} />}
            </button>
            {isOpen && <div style={{ padding: '0 24px 20px', fontSize: 15, color: '#555', lineHeight: 1.7, background: `${primary}08` }}>{item.answer}</div>}
          </div>
        )
      })}
    </div>
  )
}
