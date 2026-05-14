import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Star, Heart, Award, Wifi, Car, Waves, Sparkles, Utensils, Activity, Umbrella, Music, Wine, Coffee, Bell, Bus, Clock, Euro, Mountain, Wind, CheckCircle, ChevronDown } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import CookieBanner from '../../components/CookieBanner'
import ChatbotWidget from '../../components/ChatbotWidget'
import BookingWidget from '../../components/BookingWidget'

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
  star: Star, heart: Heart, award: Award, wifi: Wifi, parking: Car,
  pool: Waves, spa: Sparkles, restaurant: Utensils, gym: Activity,
  beach: Umbrella, mountain: Mountain, breakfast: Coffee, bar: Wine,
  shuttle: Bus, reception: Bell, ac: Wind, location: MapPin, time: Clock, music: Music,
}
function highlightIcon(key) { return HIGHLIGHT_LUCIDE[key] || Star }

function getEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`
  return null
}

// entityType: 'struttura' | 'ristorante' | 'attivita'
export default function PaginaPage({ entityType }) {
  const { slug, pageSlug } = useParams()
  const [entity, setEntity] = useState(null)
  const [page, setPage] = useState(null)
  const [pagine, setPagine] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [faqOpen, setFaqOpen] = useState({})

  useEffect(() => {
    load()
  }, [slug, pageSlug, entityType])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 80) }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function load() {
    setLoading(true)
    setNotFound(false)
    try {
      const guestPath = entityType === 'struttura' ? `/api/guest/${slug}`
        : entityType === 'ristorante' ? `/api/guest/r/${slug}`
        : `/api/guest/a/${slug}`
      const entityData = await apiFetch(guestPath)
      if (!entityData?.id) { setNotFound(true); setLoading(false); return }
      setEntity(entityData)

      const [pageData, pagineData] = await Promise.all([
        apiFetch(`/api/guest/pagina/${entityType}/${entityData.id}/${pageSlug}`),
        apiFetch(`/api/guest/pagine/${entityType}/${entityData.id}`),
      ])
      if (!pageData?.id) { setNotFound(true); setLoading(false); return }
      setPage(pageData)
      setPagine(Array.isArray(pagineData) ? pagineData : [])

      document.title = pageData.seo_title || pageData.titolo || entityData.name
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Caricamento...</div>
  if (notFound || !entity || !page) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16 }}>
      <div style={{ fontSize: 48 }}>404</div>
      <p style={{ color: '#666' }}>Pagina non trovata</p>
      <a href={entityType === 'struttura' ? `/s/${slug}` : entityType === 'ristorante' ? `/r/${slug}` : `/a/${slug}`}
        style={{ color: '#1a1a2e', textDecoration: 'underline' }}>← Torna al sito</a>
    </div>
  )

  const theme   = { primaryColor: '#00b5b5', fontHeading: 'playfair', fontBody: 'inter', ...(entity.theme || {}) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter

  loadFont(theme.fontHeading)
  loadFont(theme.fontBody)

  const mini       = entity.minisito || {}
  const headerCfg  = { style: 'dark', always_visible: false, logo_in_nav: true, show_cta: false, cta_text: 'Prenota ora', cta_url: '', show_phone: false, bg_color: '', ...(mini.header_cfg || {}) }
  const footerCfg  = { layout: 'standard', style: 'dark', copyright: '', show_socials: true, show_description: true, show_contact: true, extra_links: [], ...(mini.footer_cfg || {}) }
  const homeUrl    = entityType === 'struttura' ? `/s/${slug}` : entityType === 'ristorante' ? `/r/${slug}` : `/a/${slug}`
  const privacyUrl = `${homeUrl}/privacy`
  const pageBase   = entityType === 'struttura' ? `/s/${slug}/p/` : entityType === 'ristorante' ? `/r/${slug}/p/` : `/a/${slug}/p/`

  // Build nav: top-level pages + children
  const topLevel = pagine.filter(p => !p.parent_id)
  const children = (parentId) => pagine.filter(p => p.parent_id === parentId)

  const blocks = Array.isArray(page.blocks) ? page.blocks : []
  const aziendaId = entity.azienda_id

  function renderBlock(block) {
    const d = block.data || {}
    switch (block.type) {

      case 'about':
        if (!d.title && !d.text) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              {d.title && <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 24 }}>{d.title}</h2>}
              {d.text && <p style={{ fontSize: 17, lineHeight: 1.75, color: '#444', maxWidth: 720, whiteSpace: 'pre-line' }}>{d.text}</p>}
            </div>
          </section>
        )

      case 'foto_testo':
        if (!d.title && !d.text && !d.image_url) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="pp-section">
              <div className={`ft-grid${d.inverti ? ' inv' : ''}`}>
                {d.image_url && (
                  <div className="ft-img-col">
                    <img src={d.image_url} alt={d.title || ''} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '4/3' }} />
                  </div>
                )}
                <div className="ft-txt-col">
                  {d.title && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>{d.title}</h2>}
                  {d.text && <p style={{ fontSize: 16, lineHeight: 1.75, color: '#555', marginBottom: 24, whiteSpace: 'pre-line' }}>{d.text}</p>}
                  {d.button_label && d.button_url && (
                    <a href={d.button_url} style={{ display: 'inline-block', padding: '12px 28px', background: primary, color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>{d.button_label}</a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )

      case 'highlights': {
        const items = (d.items || []).filter(h => h.text)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '56px 0', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
            <div className="pp-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 40, color: '#1a1a2e' }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: 24 }}>
                {items.map(h => {
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
      }

      case 'stats': {
        const items = (d.items || []).filter(s => s.value && s.label)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '64px 0', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1a1a 100%)' }}>
            <div className="pp-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 48, color: '#fff' }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                {items.map((s, i) => (
                  <div key={s.id} style={{ textAlign: 'center', padding: '8px 24px', borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                    <div style={{ fontFamily: heading, fontSize: 'clamp(40px,5vw,64px)', fontWeight: 700, color: primary, lineHeight: 1, marginBottom: 10 }}>{s.value}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'cta_banner':
        if (!d.title) return null
        return (
          <section key={block.id} style={{ padding: '72px 24px', background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, textAlign: 'center' }}>
            <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{d.title}</h2>
            {d.subtitle && <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.88)', marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>{d.subtitle}</p>}
            {d.button_text && d.button_url && (
              <a href={d.button_url} style={{ display: 'inline-block', padding: '15px 36px', background: '#fff', color: primary, borderRadius: 50, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>{d.button_text}</a>
            )}
          </section>
        )

      case 'paragrafi': {
        const items = (d.items || []).filter(i => i.title || i.text)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28 }}>
                {items.map(it => {
                  const Icon = highlightIcon(it.icon)
                  return (
                    <div key={it.id} style={{ background: '#fafafa', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                      {it.image_url && <img src={it.image_url} alt={it.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />}
                      <div style={{ padding: 24 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <Icon size={20} strokeWidth={1.5} color={primary} />
                        </div>
                        {it.title && <h3 style={{ fontFamily: heading, fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{it.title}</h3>}
                        {it.text && <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{it.text}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'team': {
        const items = (d.items || []).filter(i => i.nome)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="pp-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
                {items.map(m => (
                  <div key={m.id} style={{ textAlign: 'center' }}>
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.nome} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 14, border: `3px solid ${primary}30` }} />
                      : <div style={{ width: 96, height: 96, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 32 }}>👤</div>
                    }
                    <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 4 }}>{m.nome}</div>
                    {m.ruolo && <div style={{ fontSize: 12, color: primary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{m.ruolo}</div>}
                    {m.bio && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{m.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'steps': {
        const items = (d.items || []).filter(i => i.title || i.text)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div className="steps-wrap">
                {items.map((step, idx) => {
                  const Icon = highlightIcon(step.icon)
                  return (
                    <div key={step.id} style={{ textAlign: 'center', padding: '0 8px' }}>
                      <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={28} strokeWidth={1.5} color={primary} />
                        </div>
                        <div style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: primary, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                      </div>
                      {step.title && <h3 style={{ fontFamily: heading, fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{step.title}</h3>}
                      {step.text && <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{step.text}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'video': {
        const embedUrl = getEmbedUrl(d.url)
        if (!embedUrl) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#000' }}>
            <div className="pp-section">
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
                <iframe src={embedUrl} title="video" frameBorder="0" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              </div>
            </div>
          </section>
        )
      }

      case 'testimonianze': {
        const items = (d.items || []).filter(t => t.text && t.author)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="pp-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                {items.map(t => (
                  <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                      {Array.from({ length: t.stars || 5 }).map((_, i) => <Star key={i} size={14} fill={primary} color={primary} strokeWidth={0} />)}
                    </div>
                    <p style={{ fontSize: 15, color: '#444', lineHeight: 1.65, marginBottom: 16, fontStyle: 'italic' }}>"{t.text}"</p>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{t.author}</div>
                    {t.role && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.role}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'faq': {
        const items = (d.items || []).filter(f => f.question && f.answer)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section" style={{ maxWidth: 720 }}>
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(f => {
                  const open = faqOpen[block.id + f.id]
                  return (
                    <div key={f.id} style={{ background: '#fafafa', borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                      <button onClick={() => setFaqOpen(prev => ({ ...prev, [block.id + f.id]: !open }))}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>{f.question}</span>
                        <ChevronDown size={18} strokeWidth={1.5} color='#888' style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                      </button>
                      {open && <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#555', lineHeight: 1.65 }}>{f.answer}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'newsletter':
        if (sections?.newsletter === false) return null
        return (
          <section key={block.id} style={{ padding: '72px 24px', background: `linear-gradient(135deg, ${primary}15 0%, #fff 100%)`, textAlign: 'center' }}>
            <div className="pp-section" style={{ maxWidth: 560 }}>
              {d.title && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{d.title}</h2>}
              {d.subtitle && <p style={{ fontSize: 16, color: '#666', marginBottom: 28 }}>{d.subtitle}</p>}
              <NewsletterForm aziendaId={aziendaId} primary={primary} privacyUrl={privacyUrl} />
            </div>
          </section>
        )

      case 'contatti':
        return (
          <section key={block.id} id="contatti-section" style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>Contatti</h2>
              <ContattiForm entity={entity} primary={primary} privacyUrl={privacyUrl} heading={heading} />
            </div>
          </section>
        )

      case 'show_map':
        if (!entity.address) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 400 }}>
                <iframe
                  title="Mappa"
                  width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(entity.address)}&output=embed`}
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )

      case 'gallery': {
        const gallery = (entity.gallery || []).slice(0, 9)
        if (!gallery.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              <div className="land-gallery">
                {gallery.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'booking':
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="pp-section">
              <BookingWidget entityId={entity.id} entityTipo={entityType} primary={primary} heading={heading} privacyUrl={privacyUrl} />
            </div>
          </section>
        )

      default:
        return null
    }
  }

  // Nav style derived from headerCfg
  const navIsDark = headerCfg.style === 'dark' || headerCfg.style === 'colored'
  const navBg = headerCfg.style === 'dark' ? 'rgba(18,18,32,0.95)'
    : headerCfg.style === 'light' ? 'rgba(255,255,255,0.96)'
    : headerCfg.style === 'colored' ? (headerCfg.bg_color || primary)
    : 'rgba(0,0,0,0.15)'
  const navTextColor = navIsDark ? 'rgba(255,255,255,0.85)' : '#1a1a2e'
  const navTextColorActive = navIsDark ? '#fff' : primary
  const navBorderColor = navIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const navVisible = headerCfg.always_visible || scrolled
  const navBtnPrimary = { padding: '8px 18px', borderRadius: 50, background: primary, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: 'none', cursor: 'pointer' }
  const navBtnSecondary = { padding: '8px 16px', borderRadius: 50, background: navIsDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', color: navIsDark ? '#fff' : '#1a1a2e', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: `1px solid ${navIsDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'}` }

  // Footer style
  const footerBg   = footerCfg.style === 'light' ? '#f4f4f7' : '#111'
  const footerText = footerCfg.style === 'light' ? '#666' : '#555'
  const footerLink = footerCfg.style === 'light' ? '#888' : '#aaa'
  const footerYear = new Date().getFullYear()
  const footerCopy = footerCfg.copyright || `© ${footerYear} ${entity.name} · Powered by StayApp`

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .pp-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .land-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .ft-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .ft-img-col { order: 0; }
        .ft-txt-col { order: 1; }
        .ft-grid.inv .ft-img-col { order: 1; }
        .ft-grid.inv .ft-txt-col { order: 0; }
        .steps-wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 32px; }
        .pp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: ${navBg}; backdrop-filter: blur(14px);
          border-bottom: 1px solid ${navBorderColor}; padding: 0 32px;
          display: flex; align-items: center; justify-content: space-between; height: 64px;
          transform: translateY(${navVisible ? '0' : '-100%'}); transition: transform 0.3s ease;
        }
        .pp-nav-links { display: flex; align-items: center; gap: 4px; }
        .pp-nav-link { color: ${navTextColor}; text-decoration: none; font-size: 13px; padding: 6px 12px; border-radius: 6px; white-space: nowrap; position: relative; }
        .pp-nav-link:hover, .pp-nav-link.active { color: ${navTextColorActive}; background: ${navIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; }
        .pp-dropdown { position: absolute; top: 100%; left: 0; min-width: 180px; background: ${navIsDark ? '#1a1a2e' : '#fff'}; border-radius: 10px; border: 1px solid ${navBorderColor}; padding: 6px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
        .pp-dropdown a { display: block; padding: 9px 16px; color: ${navTextColor}; text-decoration: none; font-size: 13px; }
        .pp-dropdown a:hover { background: ${navIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}; color: ${navTextColorActive}; }
        .pp-hero { padding: 120px 24px 72px; background: linear-gradient(135deg, #1a1a2e 0%, #0d1a2a 100%); }
        @media (max-width: 768px) {
          .land-gallery { grid-template-columns: repeat(2, 1fr); }
          .pp-nav { padding: 0 16px; }
          .pp-nav-links { display: none; }
          .pp-section { padding: 0 16px; }
          .ft-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .ft-img-col { order: 0 !important; }
          .ft-txt-col { order: 1 !important; }
        }
      `}</style>

      {/* Nav */}
      <nav className="pp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {headerCfg.logo_in_nav && entity.logo_url && (
            <img src={entity.logo_url} alt="logo" style={{ height: 28, objectFit: 'contain' }} />
          )}
          <a href={homeUrl} style={{ fontFamily: heading, fontWeight: 700, fontSize: 15, color: navTextColorActive, textDecoration: 'none' }}>{entity.name}</a>
        </div>
        <div className="pp-nav-links">
          <a href={homeUrl} className="pp-nav-link">Home</a>
          {topLevel.map(p => {
            const subs = children(p.id)
            const isCurrent = p.slug === pageSlug
            return (
              <div key={p.id} style={{ position: 'relative' }}
                onMouseEnter={() => subs.length && setOpenDropdown(p.id)}
                onMouseLeave={() => setOpenDropdown(null)}>
                <a href={`${pageBase}${p.slug}`} className={`pp-nav-link${isCurrent ? ' active' : ''}`}>
                  {p.titolo}
                  {subs.length > 0 && <span style={{ marginLeft: 4, opacity: 0.5 }}>▾</span>}
                </a>
                {subs.length > 0 && openDropdown === p.id && (
                  <div className="pp-dropdown">
                    {subs.map(s => <a key={s.id} href={`${pageBase}${s.slug}`}>{s.titolo}</a>)}
                  </div>
                )}
              </div>
            )
          })}
          {headerCfg.show_phone && entity.phone && (
            <a href={`tel:${entity.phone}`} style={{ ...navBtnSecondary, fontSize: 12 }}>{entity.phone}</a>
          )}
          {headerCfg.show_cta && headerCfg.cta_url && (
            <a href={headerCfg.cta_url} style={navBtnPrimary}>{headerCfg.cta_text || 'Prenota'}</a>
          )}
        </div>
      </nav>

      {/* Hero pagina */}
      <div className="pp-hero">
        <div className="pp-section">
          <a href={homeUrl} style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>← {entity.name}</a>
          <h1 style={{ fontFamily: heading, fontSize: 'clamp(32px,5vw,60px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginTop: 8 }}>{page.titolo}</h1>
          {page.seo_description && <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>{page.seo_description}</p>}
        </div>
      </div>

      {/* Blocchi */}
      {blocks.map(block => renderBlock(block))}

      {/* Footer */}
      <footer style={{ background: footerBg, padding: footerCfg.layout === 'minimal' ? '28px 24px' : '56px 24px 28px' }}>
        {footerCfg.layout === 'minimal' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: footerText, marginBottom: 10 }}>{footerCopy}</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={privacyUrl} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>Privacy Policy</a>
              <a href={`${homeUrl}/cookie`} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>Cookie Policy</a>
              {(footerCfg.extra_links || []).filter(l => l.label && l.url).map(l => (
                <a key={l.id} href={l.url} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>{l.label}</a>
              ))}
            </div>
          </div>
        ) : footerCfg.layout === 'full' ? (
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 48, marginBottom: 40 }}>
              {/* Col 1: logo + desc + socials */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  {entity.logo_url && <img src={entity.logo_url} alt="logo" style={{ height: 36, objectFit: 'contain' }} />}
                  <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 17, color: footerCfg.style === 'light' ? '#1a1a2e' : '#fff' }}>{entity.name}</span>
                </div>
                {footerCfg.show_description !== false && mini.tagline && (
                  <p style={{ fontSize: 13, color: footerLink, lineHeight: 1.6, marginBottom: 16, maxWidth: 280 }}>{mini.tagline}</p>
                )}
                {footerCfg.show_socials !== false && mini.social && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {mini.social.instagram && <a href={mini.social.instagram} target="_blank" rel="noopener noreferrer" style={{ color: footerLink, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Instagram</a>}
                    {mini.social.facebook  && <a href={mini.social.facebook}  target="_blank" rel="noopener noreferrer" style={{ color: footerLink, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Facebook</a>}
                    {mini.social.whatsapp  && <a href={mini.social.whatsapp}  target="_blank" rel="noopener noreferrer" style={{ color: footerLink, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>WhatsApp</a>}
                  </div>
                )}
              </div>
              {/* Col 2: nav links */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: footerLink, marginBottom: 14 }}>Menu</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href={homeUrl} style={{ color: footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>Home</a>
                  {topLevel.map(p => (
                    <a key={p.id} href={`${pageBase}${p.slug}`} style={{ color: p.slug === pageSlug ? primary : footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>{p.titolo}</a>
                  ))}
                </div>
              </div>
              {/* Col 3: contact */}
              {footerCfg.show_contact !== false && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: footerLink, marginBottom: 14 }}>Contatti</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entity.address && <span style={{ fontSize: 13, color: footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)' }}>{entity.address}</span>}
                    {entity.phone   && <a href={`tel:${entity.phone}`}   style={{ color: footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>{entity.phone}</a>}
                    {entity.email   && <a href={`mailto:${entity.email}`} style={{ color: footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>{entity.email}</a>}
                  </div>
                </div>
              )}
            </div>
            <div style={{ borderTop: `1px solid ${footerCfg.style === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`, paddingTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 11, color: footerLink }}>{footerCopy}</p>
              <div style={{ display: 'flex', gap: 14 }}>
                <a href={privacyUrl} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>Privacy Policy</a>
                <a href={`${homeUrl}/cookie`} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>Cookie Policy</a>
                {(footerCfg.extra_links || []).filter(l => l.label && l.url).map(l => (
                  <a key={l.id} href={l.url} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>{l.label}</a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* standard (default) — 2 col */
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, marginBottom: 36 }}>
              {/* Col 1: logo + desc + socials */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  {entity.logo_url && <img src={entity.logo_url} alt="logo" style={{ height: 32, objectFit: 'contain' }} />}
                  <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 16, color: footerCfg.style === 'light' ? '#1a1a2e' : '#fff' }}>{entity.name}</span>
                </div>
                {footerCfg.show_description !== false && mini.tagline && (
                  <p style={{ fontSize: 13, color: footerLink, lineHeight: 1.6, marginBottom: 14, maxWidth: 340 }}>{mini.tagline}</p>
                )}
                {footerCfg.show_socials !== false && mini.social && (
                  <div style={{ display: 'flex', gap: 14 }}>
                    {mini.social.instagram && <a href={mini.social.instagram} target="_blank" rel="noopener noreferrer" style={{ color: footerLink, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Instagram</a>}
                    {mini.social.facebook  && <a href={mini.social.facebook}  target="_blank" rel="noopener noreferrer" style={{ color: footerLink, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Facebook</a>}
                    {mini.social.whatsapp  && <a href={mini.social.whatsapp}  target="_blank" rel="noopener noreferrer" style={{ color: footerLink, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>WhatsApp</a>}
                  </div>
                )}
              </div>
              {/* Col 2: nav links */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: footerLink, marginBottom: 14 }}>Menu</div>
                <div style={{ display: 'grid', gridTemplateColumns: topLevel.length > 4 ? '1fr 1fr' : '1fr', gap: '8px 16px' }}>
                  <a href={homeUrl} style={{ color: footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>Home</a>
                  {topLevel.map(p => (
                    <a key={p.id} href={`${pageBase}${p.slug}`} style={{ color: p.slug === pageSlug ? primary : footerCfg.style === 'light' ? '#444' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>{p.titolo}</a>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${footerCfg.style === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`, paddingTop: 18, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 11, color: footerLink }}>{footerCopy}</p>
              <div style={{ display: 'flex', gap: 14 }}>
                <a href={privacyUrl} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>Privacy Policy</a>
                <a href={`${homeUrl}/cookie`} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>Cookie Policy</a>
                {(footerCfg.extra_links || []).filter(l => l.label && l.url).map(l => (
                  <a key={l.id} href={l.url} style={{ color: footerLink, textDecoration: 'none', fontSize: 11 }}>{l.label}</a>
                ))}
              </div>
            </div>
          </div>
        )}
      </footer>

      <CookieBanner primaryColor={primary} privacyUrl={privacyUrl} cookieUrl={`${homeUrl}/cookie`} />
      <ChatbotWidget chatbot={entity.chatbot} primaryColor={primary} fixed />
    </>
  )
}

function NewsletterForm({ aziendaId, primary, privacyUrl }) {
  const [email, setEmail] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [state, setState] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!privacy) return
    setState('loading')
    try {
      await apiFetch('/api/contatti/subscribe', {
        method: 'POST',
        body: JSON.stringify({ azienda_id: aziendaId, email, fonte: 'minisito' }),
      })
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') return <p style={{ color: '#2d7a2d', fontWeight: 600 }}>Controlla la tua email per confermare l'iscrizione.</p>
  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="La tua email"
          style={{ flex: 1, padding: '12px 16px', borderRadius: 50, border: '1px solid #ddd', fontSize: 15, outline: 'none' }} />
        <button type="submit" disabled={!privacy || state === 'loading'}
          style={{ padding: '12px 24px', borderRadius: 50, background: privacy ? primary : '#ccc', color: '#fff', border: 'none', cursor: privacy ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 15 }}>
          {state === 'loading' ? '...' : 'Iscriviti'}
        </button>
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#666', cursor: 'pointer' }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Acconsento al trattamento dei dati personali. <a href={privacyUrl} style={{ color: primary }}>Privacy Policy</a></span>
      </label>
    </form>
  )
}

function ContattiForm({ entity, primary, privacyUrl, heading }) {
  const [form, setForm] = useState({ nome: '', email: '', messaggio: '' })
  const [privacy, setPrivacy] = useState(false)
  const [state, setState] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!privacy) return
    setState('loading')
    try {
      await apiFetch('/api/guest/contact', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: 'struttura', entity_id: entity.id, ...form }),
      })
      setState('done')
    } catch {
      setState('error')
    }
  }

  const inp = { padding: '11px 14px', border: '1px solid #ddd', borderRadius: 10, fontSize: 15, outline: 'none', width: '100%', display: 'block' }

  if (state === 'done') return <p style={{ color: '#2d7a2d', fontWeight: 600, textAlign: 'center' }}>Messaggio inviato! Ti risponderemo presto.</p>
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input required placeholder="Nome e cognome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inp} />
      <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
      <textarea required rows={4} placeholder="Messaggio" value={form.messaggio} onChange={e => setForm(f => ({ ...f, messaggio: e.target.value }))} style={{ ...inp, resize: 'vertical' }} />
      <label style={{ display: 'flex', gap: 8, fontSize: 12, color: '#666', cursor: 'pointer', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Acconsento al trattamento dei dati. <a href={privacyUrl} style={{ color: primary }}>Privacy Policy</a></span>
      </label>
      <button type="submit" disabled={!privacy || state === 'loading'}
        style={{ padding: '13px', background: privacy ? primary : '#ccc', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: privacy ? 'pointer' : 'not-allowed' }}>
        {state === 'loading' ? 'Invio...' : 'Invia messaggio'}
      </button>
    </form>
  )
}
