import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Star, Heart, Award, Wifi, Car, Waves, Sparkles, Utensils, Activity, Umbrella, Music, Wine, Coffee, Bell, Bus, Clock, Euro, Mountain, Wind, CheckCircle, ChevronDown, Menu, X, Calendar, Users } from 'lucide-react'
import { guestFetch } from '../../lib/api'
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

const SERVICE_ICONS = {
  pool: Waves, spa: Sparkles, restaurant: Utensils, gym: Activity,
  parking: Car, wifi: Wifi, beach: Umbrella, bar: Wine,
  breakfast: Coffee, reception: Bell, shuttle: Bus, ac: Wind,
  location: MapPin, time: Clock, music: Music, award: Award,
}
function serviceIcon(key) { return SERVICE_ICONS[key] || Star }

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
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === '1'
  const [entity, setEntity] = useState(null)
  const [page, setPage] = useState(null)
  const [pagine, setPagine] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState({})
  const [eventi, setEventi] = useState([])
  const [articoli, setArticoli] = useState([])

  useEffect(() => {
    load()
  }, [slug, pageSlug, entityType])

  useEffect(() => {
    if (!entity?.id) return
    guestFetch(`/api/guest/eventi?entity_tipo=${entityType}&entity_id=${entity.id}`)
      .then(d => Array.isArray(d) && setEventi(d.slice(0, 6)))
      .catch(() => {})
    guestFetch(`/api/blog/public?azienda_id=${entity.azienda_id}&entity_tipo=${entityType}&entity_id=${entity.id}&limit=6`)
      .then(d => Array.isArray(d) && setArticoli(d))
      .catch(() => {})
  }, [entity?.id])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 80) }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setMobileMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  async function load() {
    setLoading(true)
    setNotFound(false)
    try {
      const guestPath = entityType === 'struttura' ? `/api/guest/${slug}`
        : entityType === 'ristorante' ? `/api/guest/r/${slug}`
        : `/api/guest/a/${slug}`
      const entityData = await guestFetch(guestPath)
      if (!entityData?.id) { setNotFound(true); setLoading(false); return }
      setEntity(entityData)

      const previewParam = isPreview ? '?preview=1' : ''
      const [pageData, pagineData] = await Promise.all([
        guestFetch(`/api/guest/pagina/${entityType}/${entityData.id}/${pageSlug}${previewParam}`),
        guestFetch(`/api/guest/pagine/${entityType}/${entityData.id}`),
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

      case 'hero': {
        const heightMap = { full: '100vh', large: '85vh', medium: '65vh' }
        const h = heightMap[d.height || 'large'] || '85vh'
        const bgImg = d.bg_image_url || entity.cover_url
        return (
          <section key={block.id} style={{ position: 'relative', minHeight: h, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgImg ? 'transparent' : `linear-gradient(135deg, #1a1a2e 0%, #0d1a2a 100%)`, overflow: 'hidden' }}>
            {bgImg && <img src={bgImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${d.overlay_opacity ?? 0.5})` }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '80px 24px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
              {d.title && <h1 style={{ fontFamily: heading, fontSize: 'clamp(36px,6vw,72px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>{d.title}</h1>}
              {d.tagline && <p style={{ fontSize: 'clamp(16px,2.5vw,22px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, maxWidth: 640, margin: '0 auto 40px' }}>{d.tagline}</p>}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                {d.cta1_text && d.cta1_url && (
                  <a href={d.cta1_url} style={{ display: 'inline-block', padding: '16px 36px', background: primary, color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 17, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>{d.cta1_text}</a>
                )}
                {d.cta2_text && d.cta2_url && (
                  <a href={d.cta2_url} style={{ display: 'inline-block', padding: '16px 36px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 50, fontWeight: 600, fontSize: 17, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>{d.cta2_text}</a>
                )}
              </div>
            </div>
          </section>
        )
      }

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

      case 'services': {
        const services = (entity.services || []).filter(s => s.name)
        if (!services.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 48, textAlign: 'center', color: '#1a1a2e' }}>I nostri servizi</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
                {services.map(s => {
                  const Icon = serviceIcon(s.icon)
                  return (
                    <div key={s.id} style={{ background: '#fff', borderRadius: 16, padding: '24px 16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      <Icon size={28} strokeWidth={1.5} color={primary} style={{ marginBottom: 10 }} />
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>{s.name}</div>
                      {s.hours && <div style={{ fontSize: 12, color: '#888' }}>{s.hours}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'activities': {
        const actItems = (entity.activities || [])
          .flatMap(cat => (cat.items || []).filter(i => i.active !== false).map(i => ({ ...i, category: cat.category })))
        if (!actItems.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>Attività</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{actItems.length} {actItems.length === 1 ? 'attività disponibile' : 'attività disponibili'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {actItems.map(item => (
                  <div key={item.id} style={{ background: '#fafafa', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                    {item.photo_url && <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      {item.category && <div style={{ fontSize: 11, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{item.category}</div>}
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>{item.name}</div>
                      {item.description && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{item.description}</p>}
                      {item.location && <div style={{ fontSize: 12, color: '#888', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} strokeWidth={1.5} color={primary} />{item.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'excursions': {
        const excItems = (entity.excursions || []).filter(e => e.active !== false && e.name)
        if (!excItems.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>Escursioni</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{excItems.length} {excItems.length === 1 ? 'escursione disponibile' : 'escursioni disponibili'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {excItems.map(exc => (
                  <div key={exc.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                    {exc.photo_url && <img src={exc.photo_url} alt={exc.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>{exc.name}</div>
                      {exc.description && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: '0 0 10px' }}>{exc.description}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#888' }}>
                        {exc.duration && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} strokeWidth={1.5} color={primary} />{exc.duration}</span>}
                        {exc.price > 0 && <span style={{ fontWeight: 700, color: primary, fontSize: 14 }}>€{exc.price}</span>}
                        {exc.seats && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} strokeWidth={1.5} color={primary} />Max {exc.seats}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'promozioni': {
        const now = new Date()
        const promo = (mini.promozioni || []).filter(p => p.title && (!p.expires_at || new Date(p.expires_at) >= now))
        if (!promo.length) return null
        const ctaHref = mini.booking_url || homeUrl
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>Offerte speciali</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Promozioni esclusive per i nostri ospiti</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {promo.map(p => {
                  const promoUrl = p.cta_url?.trim() && p.cta_url !== '#' ? p.cta_url.trim() : ctaHref
                  const isExternal = promoUrl?.startsWith('http') || promoUrl?.startsWith('tel:') || promoUrl?.startsWith('mailto:')
                  const hasDetail = p.description_full || (p.gallery || []).length > 0
                  const offerteBase = entityType === 'struttura' ? `/s/${slug}/offerte/` : entityType === 'ristorante' ? `/r/${slug}/offerte/` : `/a/${slug}/offerte/`
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${primary}`, display: 'flex', flexDirection: 'column' }}>
                      {p.cover_url && <img src={p.cover_url} alt={p.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
                          {p.badge && <span style={{ display: 'inline-block', background: `${primary}18`, color: primary, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' }}>{p.badge}</span>}
                          {p.price_original && p.price_discounted && (() => {
                            const pct = Math.round((1 - parseFloat(p.price_discounted) / parseFloat(p.price_original)) * 100)
                            return pct > 0 ? <span style={{ display: 'inline-block', background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>-{pct}%</span> : null
                          })()}
                        </div>
                        <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' }}>{p.title}</h3>
                        {p.text && <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, marginBottom: 16, flex: 1 }}>{p.text}</p>}
                        {(p.price_original || p.price_discounted) && (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                            <span style={{ fontFamily: heading, fontSize: 28, fontWeight: 800, color: primary }}>€{p.price_discounted || p.price_original}</span>
                            {p.price_discounted && p.price_original && <span style={{ fontSize: 16, color: '#aaa', textDecoration: 'line-through' }}>€{p.price_original}</span>}
                          </div>
                        )}
                        {p.expires_at && <div style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>Valida fino al {new Date(p.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                        <div style={{ marginTop: 'auto' }}>
                          {hasDetail ? (
                            <a href={`${offerteBase}${p.id}`} style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: primary, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                              {p.cta_label || 'Scopri di più'}
                            </a>
                          ) : (p.cta_label && p.cta_url) ? (
                            <a href={promoUrl} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: primary, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                              {p.cta_label}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'pacchetti': {
        const packs = (mini.pacchetti || []).filter(p => p.name)
        if (!packs.length) return null
        const pacchettiBase = entityType === 'struttura' ? `/s/${slug}/pacchetti/` : entityType === 'ristorante' ? `/r/${slug}/pacchetti/` : `/a/${slug}/pacchetti/`
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>Pacchetti e soggiorni</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Scegli il soggiorno pensato per te</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {packs.map(p => {
                  const hasDetail = p.description_full || (p.gallery || []).length > 0
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                      {p.cover_url && <img src={p.cover_url} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                      <div style={{ padding: '28px 28px 0' }}>
                        {p.badge && <span style={{ display: 'inline-block', background: primary, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>{p.badge}</span>}
                        <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#1a1a2e' }}>{p.name}</h3>
                        {p.tagline && <p style={{ fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 1.5 }}>{p.tagline}</p>}
                        {p.price && (
                          <div style={{ marginBottom: 24, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
                            <span style={{ fontFamily: heading, fontSize: 40, fontWeight: 800, color: primary }}>{p.price}</span>
                            {p.price_label && <span style={{ fontSize: 14, color: '#aaa', marginLeft: 6 }}>/ {p.price_label}</span>}
                          </div>
                        )}
                      </div>
                      {(p.includes || []).filter(Boolean).length > 0 && (
                        <div style={{ padding: '0 28px 24px', flex: 1 }}>
                          {!p.price && <div style={{ height: 1, background: '#f0f0f0', margin: '0 0 20px' }} />}
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(p.includes || []).filter(Boolean).map((item, i) => (
                              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#444' }}>
                                <span style={{ color: primary, fontWeight: 700, fontSize: 15, lineHeight: 1.3, flexShrink: 0 }}>✓</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                        {hasDetail && (
                          <a href={`${pacchettiBase}${p.id}`} style={{ display: 'block', textAlign: 'center', padding: '12px', background: 'transparent', color: primary, border: `2px solid ${primary}`, borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Scopri di più</a>
                        )}
                        {p.cta_label && p.cta_url && (
                          <a href={p.cta_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '13px', background: primary, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>{p.cta_label}</a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'eventi': {
        if (!eventi.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>Prossimi eventi</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{eventi.length} {eventi.length === 1 ? 'evento in programma' : 'eventi in programma'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {eventi.map(ev => {
                  const dateStr = new Date(ev.date_start).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                  return (
                    <a key={ev.id} href={`/eventi/${ev.id}`} style={{ background: '#fafafa', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #f0f0f0' }}>
                      {ev.cover_url
                        ? <img src={ev.cover_url} alt={ev.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ height: 100, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={36} strokeWidth={1.5} color={primary} /></div>
                      }
                      <div style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 8 }}>{ev.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}><Calendar size={12} strokeWidth={1.5} color={primary} />{dateStr}</span>
                          {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}><MapPin size={12} strokeWidth={1.5} color={primary} />{ev.location}</span>}
                          {ev.seats_total && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}><Users size={12} strokeWidth={1.5} color={primary} />{ev.seats_total - ev.seats_booked} posti</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: primary }}>{ev.price > 0 ? `€${ev.price}` : 'Gratuito'}</span>
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
      }

      case 'news': {
        if (!articoli.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="pp-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>News & Aggiornamenti</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>Le ultime novità</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {articoli.map(art => (
                  <a key={art.id} href={`/blog/${art.slug}?back=${encodeURIComponent(window.location.pathname)}`}
                    style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    {art.cover_url && <img src={art.cover_url} alt={art.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      {art.published_at && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{new Date(art.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 8 }}>{art.title}</div>
                      {art.excerpt && <div style={{ fontSize: 13, color: '#777', lineHeight: 1.5 }}>{art.excerpt}</div>}
                      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: primary }}>Leggi →</div>
                    </div>
                  </a>
                ))}
              </div>
              {articoli.length >= 6 && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <a href={`/blog?azienda_id=${entity.azienda_id}`} style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 50, border: `2px solid ${primary}`, color: primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    Vedi tutti gli articoli →
                  </a>
                </div>
              )}
            </div>
          </section>
        )
      }

      case 'form_builder':
        if (!d.form_token) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="pp-section" style={{ maxWidth: 620 }}>
              {d.titolo_sezione && (
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 40 }}>
                  {d.titolo_sezione}
                </h2>
              )}
              <FormBuilderBlock token={d.form_token} primary={primary} />
            </div>
          </section>
        )

      case 'clienti': {
        const items = (d.items || []).filter(it => it.logo_url)
        if (!items.length) return null
        const doubled = [...items, ...items]
        const dur = `${Math.max(15, items.length * 3)}s`
        return (
          <section key={block.id} style={{ padding: '64px 0', background: '#fff', overflow: 'hidden' }}>
            {d.titolo && (
              <div className="pp-section" style={{ marginBottom: 40 }}>
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo}</h2>
              </div>
            )}
            <div style={{ position: 'relative', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
              <div className="pp-logo-track" style={{ animationDuration: dur }}>
                {doubled.map((it, i) => (
                  <div key={i} className="pp-logo-item">
                    {it.link_url
                      ? <a href={it.link_url} target="_blank" rel="noopener noreferrer"><img src={it.logo_url} alt="" /></a>
                      : <img src={it.logo_url} alt="" />
                    }
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

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
  const footerCopy = footerCfg.copyright || `© ${footerYear} ${entity.name} · Powered by OltreNova`

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
        .pp-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; color: ${navTextColorActive}; line-height: 0; }
        .pp-hero { padding: 120px 24px 72px; background: linear-gradient(135deg, #1a1a2e 0%, #0d1a2a 100%); }
        @media (max-width: 768px) {
          .land-gallery { grid-template-columns: repeat(2, 1fr); }
          .pp-nav { padding: 0 16px; transform: translateY(0) !important; }
          .pp-nav-links { display: none; }
          .pp-hamburger { display: flex; }
          .pp-section { padding: 0 16px; }
          .ft-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .ft-img-col { order: 0 !important; }
          .ft-txt-col { order: 1 !important; }
          .pp-hero { padding: 88px 16px 56px; }
        }
        @keyframes pp-logo-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pp-logo-track { display: flex; gap: 48px; width: max-content; animation: pp-logo-scroll linear infinite; align-items: center; padding: 16px 24px; }
        .pp-logo-item img { height: 48px; max-width: 140px; object-fit: contain; filter: grayscale(100%) opacity(0.5); transition: filter 0.35s ease; display: block; }
        .pp-logo-item img:hover { filter: grayscale(0%) opacity(1); }
        .pp-logo-item a { display: block; }
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
        {/* Hamburger — visibile solo mobile */}
        <button className="pp-hamburger" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Menu">
          {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </nav>

      {/* ── Mobile menu overlay ── */}
      <div
        onClick={e => { if (e.target === e.currentTarget) setMobileMenuOpen(false) }}
        style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: navBg, backdropFilter: 'blur(20px)',
          paddingTop: 64,
          display: 'flex', flexDirection: 'column',
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? 'all' : 'none',
          transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
          overflowY: 'auto',
        }}
      >
        {/* Voci menu */}
        <div style={{ flex: 1, padding: '20px 28px 0' }}>
          {/* Home */}
          <a href={homeUrl} onClick={() => setMobileMenuOpen(false)}
            style={{ display: 'block', fontFamily: heading, fontSize: 30, fontWeight: 700, lineHeight: 1.2,
              color: navTextColorActive, textDecoration: 'none',
              padding: '16px 0', borderBottom: `1px solid ${navBorderColor}` }}>
            Home
          </a>

          {topLevel.map(p => {
            const subs = children(p.id)
            const isCurrent = p.slug === pageSlug
            return (
              <div key={p.id}>
                <a href={`${pageBase}${p.slug}`} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', fontFamily: heading, fontSize: 30, fontWeight: 700, lineHeight: 1.2,
                    color: isCurrent ? primary : navTextColorActive, textDecoration: 'none',
                    padding: '16px 0', borderBottom: `1px solid ${navBorderColor}` }}>
                  {p.titolo}
                  {isCurrent && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: primary, marginLeft: 10, verticalAlign: 'middle' }} />}
                </a>
                {subs.map(s => (
                  <a key={s.id} href={`${pageBase}${s.slug}`} onClick={() => setMobileMenuOpen(false)}
                    style={{ display: 'block', fontSize: 16, color: navTextColor, textDecoration: 'none',
                      padding: '11px 0 11px 20px', borderBottom: `1px solid ${navBorderColor}`,
                      opacity: 0.75 }}>
                    ↳ {s.titolo}
                  </a>
                ))}
              </div>
            )
          })}
        </div>

        {/* Fondo menu: CTA + contatti + policy */}
        <div style={{ padding: '28px 28px 40px', marginTop: 8 }}>
          {headerCfg.show_cta && headerCfg.cta_url && (
            <a href={headerCfg.cta_url} onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'block', padding: '16px', background: primary, color: '#fff',
                borderRadius: 14, textAlign: 'center', fontWeight: 700, fontSize: 17,
                textDecoration: 'none', marginBottom: 20 }}>
              {headerCfg.cta_text || 'Prenota ora'}
            </a>
          )}
          {headerCfg.show_phone && entity.phone && (
            <a href={`tel:${entity.phone}`}
              style={{ display: 'block', fontSize: 15, color: navTextColor, textDecoration: 'none',
                marginBottom: 14, opacity: 0.7 }}>
              📞 {entity.phone}
            </a>
          )}
          <div style={{ display: 'flex', gap: 20, opacity: 0.45 }}>
            <a href={privacyUrl} style={{ color: navTextColorActive, textDecoration: 'none', fontSize: 12 }}>Privacy Policy</a>
            <a href={`${homeUrl}/cookie`} style={{ color: navTextColorActive, textDecoration: 'none', fontSize: 12 }}>Cookie Policy</a>
          </div>
        </div>
      </div>

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
      <ChatbotWidget chatbot={entity.chatbot} primaryColor={primary} fixed entityTipo={entityType} entityId={entity?.id} />
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
      await guestFetch('/api/contatti/subscribe', {
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
      await guestFetch('/api/guest/contact', {
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

const API_BASE_FB = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function FormBuilderBlock({ token, primary }) {
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [dati, setDati]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(`${API_BASE_FB}/api/form-builder/public/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setForm(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  function setField(id, value) { setDati(d => ({ ...d, [id]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const mancanti = (form?.campi || []).filter(c => c.required && !dati[c.id]?.toString().trim())
    if (mancanti.length) { setError(`Obbligatori: ${mancanti.map(c => c.label).join(', ')}`); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch(`${API_BASE_FB}/api/form-builder/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dati),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Errore invio')
      if (body.redirect_url) window.location.href = body.redirect_url
      else setSuccess(true)
    } catch (e) { setError(e.message) }
    setSubmitting(false)
  }

  const inp = { padding: '11px 14px', border: '1px solid #ddd', borderRadius: 10, fontSize: 15, outline: 'none', width: '100%', display: 'block', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (loading) return <p style={{ color: '#888', textAlign: 'center' }}>Caricamento form…</p>
  if (error && !form) return <p style={{ color: '#c53030', textAlign: 'center' }}>{error}</p>
  if (success) return <p style={{ color: '#2d7a2d', fontWeight: 600, textAlign: 'center', padding: '32px 0' }}>✓ Messaggio inviato! Grazie.</p>

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {form?.descrizione && <p style={{ fontSize: 14, color: '#666', margin: '0 0 8px' }}>{form.descrizione}</p>}
      {(form?.campi || []).map(c => (
        <div key={c.id}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 }}>
            {c.label}{c.required && <span style={{ color: '#c53030' }}> *</span>}
          </label>
          {c.tipo === 'textarea' ? (
            <textarea value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} placeholder={c.placeholder} rows={4} style={{ ...inp, resize: 'vertical' }} />
          ) : c.tipo === 'select' ? (
            <select value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} style={inp}>
              <option value="">— Seleziona —</option>
              {(c.opzioni || []).map((op, i) => <option key={i} value={op}>{op}</option>)}
            </select>
          ) : c.tipo === 'checkbox' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#555' }}>
              <input type="checkbox" checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)} style={{ width: 16, height: 16 }} />
              {c.placeholder || 'Sì'}
            </label>
          ) : (
            <input type={c.tipo} value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} placeholder={c.placeholder} style={inp} />
          )}
        </div>
      ))}
      {error && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{error}</p>}
      <button type="submit" disabled={submitting}
        style={{ padding: '13px', background: primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer' }}>
        {submitting ? 'Invio…' : 'Invia'}
      </button>
    </form>
  )
}
