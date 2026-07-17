'use client'
import { useEffect, useState } from 'react'
import { guestFetch } from '@/lib/api'
import { injectTracking } from '@/lib/tracking'
import { injectJsonLd, buildEntitySchema, buildFaqSchema } from '@/lib/geoSchema'
import CookieBanner from '@/components/CookieBanner'
import ChatbotWidget from '@/components/ChatbotWidget'
import WhatsAppButton from '@/components/WhatsAppButton'
import LandingBlockRenderer from '@/components/LandingBlockRenderer'
import LandingFooter from '@/components/guest/LandingFooter'
import LangToggle from '@/components/guest/LangToggle'
import SiteNav from '@/components/guest/SiteNav'
import { resolveSiteTheme } from '@/lib/siteTheme'
import { entityBasePath } from '@/lib/i18n'

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

export default function LandingRistorante({ ristorante, initialHomeBlocks, domain, lang = 'it' }) {
  const [navVisible,     setNavVisible]     = useState(true)
  const [mobileOpen,     setMobileOpen]     = useState(false)
  const [upcomingEventi, setUpcomingEventi] = useState([])
  const [pagine,         setPagine]         = useState([])
  const [openDropdown,   setOpenDropdown]   = useState(null)
  const [recensioni,     setRecensioni]     = useState([])
  const [homeBlocks,     setHomeBlocks]     = useState(initialHomeBlocks)

  useEffect(() => {
    if (!ristorante?.id) return
    const key = `pv_${ristorante.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    guestFetch('/api/guest/pageview', { method: 'POST', body: JSON.stringify({ entity_tipo: 'ristorante', entity_id: ristorante.id }) }).catch(() => {})
  }, [ristorante?.id])

  useEffect(() => {
    guestFetch(`/api/guest/eventi?entity_tipo=ristorante&entity_id=${ristorante.id}&lang=${lang}`)
      .then(d => Array.isArray(d) && setUpcomingEventi(d)).catch(() => {})
    guestFetch(`/api/guest/pagine/ristorante/${ristorante.id}`)
      .then(d => Array.isArray(d) && setPagine(d)).catch(() => {})
    guestFetch(`/api/guest/recensioni/ristorante/${ristorante.id}`)
      .then(d => Array.isArray(d) && setRecensioni(d)).catch(() => {})
    if (initialHomeBlocks === undefined) {
      guestFetch(`/api/guest/pagina/ristorante/${ristorante.id}/__home__`)
        .then(d => setHomeBlocks(d?.id && Array.isArray(d.blocks) && d.blocks.length ? d.blocks : null))
        .catch(() => setHomeBlocks(null))
    }
  }, [ristorante.id])

  const theme      = { primaryColor: '#e63946', fontHeading: 'playfair', fontBody: 'inter', textColor: '#1a1a2e', borderStyle: 'mixed', ...resolveSiteTheme(ristorante) }
  const primary    = theme.primaryColor
  const heading    = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body       = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const mini       = ristorante.minisito || {}
  const showPwaLink = mini.show_pwa_link !== false
  const social     = mini.social || {}
  const base       = entityBasePath('r', ristorante.slug, domain, lang)

  const hdrCfg         = mini.header_cfg || mini.header || {}
  const navDark        = hdrCfg.style === 'dark'
  const navLogo        = (navDark && ristorante.logo_dark_url) ? ristorante.logo_dark_url : ristorante.logo_url
  const logoH          = { small: 24, medium: 32, large: 48 }[mini.logo_size] || 32
  const navAlwaysVisible = hdrCfg.always_visible === true
  const smartNav       = hdrCfg.scroll_behavior === 'smart'
  const navBg          = navDark ? 'rgba(18,18,32,0.93)'   : 'rgba(255,255,255,0.95)'
  const navBorderColor = navDark ? 'rgba(255,255,255,0.08)' : '#eee'
  const navTextColor   = navDark ? 'rgba(255,255,255,0.8)' : '#1a1a2e'

  useEffect(() => {
    loadFont(theme.fontHeading)
    loadFont(theme.fontBody)
    document.title = mini.seo_title || ristorante.name
    setMeta('description', mini.seo_description || ristorante.description || '')
    setMeta('og:title',    mini.seo_title || ristorante.name)
    setMeta('og:image',    ristorante.cover_url || '')
    setMeta('og:type',     'restaurant')
    if (mini.google_site_verification) setMeta('google-site-verification', mini.google_site_verification)
    const cleanupTracking = injectTracking(mini.tracking_cfg || {})
    const sitemapEl = Object.assign(document.createElement('link'), { rel: 'sitemap', type: 'application/xml', href: `/api/sitemap/ristorante/${ristorante.slug}` })
    document.head.appendChild(sitemapEl)
    let faviconEl = null
    if (mini.favicon_url) {
      faviconEl = document.querySelector("link[rel~='icon']")
      const prevHref = faviconEl?.href
      if (!faviconEl) { faviconEl = document.createElement('link'); faviconEl.rel = 'icon'; document.head.appendChild(faviconEl) }
      faviconEl.href = mini.favicon_url
      faviconEl._prevHref = prevHref
    }
    return () => {
      document.title = 'OltreNova'
      cleanupTracking()
      sitemapEl.remove()
      if (faviconEl) faviconEl.href = faviconEl._prevHref || '/favicon.ico'
    }
  }, [])

  useEffect(() => {
    const faqItems = (mini.faq || []).filter(f => f.question && f.answer)
    const c1 = injectJsonLd('ld-entity', buildEntitySchema({ entity: ristorante, tipo: 'ristorante', recensioni, eventi: upcomingEventi }))
    const c2 = faqItems.length ? injectJsonLd('ld-faq', buildFaqSchema(faqItems)) : null
    return () => { c1(); c2?.() }
  }, [recensioni, upcomingEventi])

  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    el.setAttribute('content', content)
  }

  useEffect(() => {
    if (navAlwaysVisible) { setNavVisible(true); return }
    let last = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (smartNav) {
        if (y < 80) setNavVisible(true)                // in cima: visibile (sopra l'hero)
        else if (y > last + 4) setNavVisible(false)     // scroll giù: nascondi
        else if (y < last - 4) setNavVisible(true)      // scroll su: mostra
      } else {
        setNavVisible(true)                              // default: sempre visibile (logo in cima)
      }
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [smartNav, navAlwaysVisible])

  const pwaUrl     = domain ? `https://${domain}?qr=1` : `/r/${ristorante.slug}?qr=1`
  const bookingUrl = mini.booking_url || null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .land-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: ${navBg}; backdrop-filter: blur(12px);
          border-bottom: 1px solid ${navBorderColor}; padding: 0 32px;
          display: flex; align-items: center; justify-content: space-between; height: 64px;
          transform: translateY(${navVisible ? '0' : '-100%'}); transition: transform 0.3s ease;
        }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .land-burger { display: none; background: none; border: none; cursor: pointer; color: ${navTextColor}; font-size: 22px; line-height: 1; padding: 6px; }
        .land-mobile-menu { position: fixed; top: 64px; left: 0; right: 0; z-index: 99; background: ${navBg}; backdrop-filter: blur(12px); border-bottom: 1px solid ${navBorderColor}; padding: 8px 16px 16px; display: flex; flex-direction: column; }
        @media (min-width: 769px) { .land-mobile-menu { display: none !important; } }
        @media (max-width: 768px) {
          .land-nav { padding: 0 16px; }
          .land-section { padding: 0 16px; }
          .land-nav-desktop { display: none !important; }
          .land-burger { display: flex !important; align-items: center; }
        }
      `}</style>

      <SiteNav entity={ristorante} mini={mini} pagine={pagine} prefix="r"
        primary={primary} secondary={theme.secondaryColor} heading={heading} lang={lang} domain={domain}
        pwa={showPwaLink ? { url: pwaUrl, label: 'Vedi menu' } : null} bookingUrl={bookingUrl} />

      {homeBlocks === undefined ? null : homeBlocks ? (
        <LandingBlockRenderer
          blocks={homeBlocks} entity={ristorante} entityType="ristorante"
          mini={mini} primary={primary} secondary={theme.secondaryColor} heading={heading} body={body}
          slug={ristorante.slug} privacyUrl={`${base}/privacy`} base={base}
          aziendaId={ristorante.azienda_id} lang={lang}
        />
      ) : null}

      <LandingFooter entity={ristorante} mini={mini} primary={primary} heading={heading} body={body} entityType="ristorante" lang={lang} domain={domain} />

      <CookieBanner
        primaryColor={primary}
        privacyUrl={ristorante.slug ? `${base}/privacy` : null}
        cookieUrl={ristorante.slug  ? `${base}/cookie`  : null}
        lang={lang}
      />
      <WhatsAppButton
        whatsapp={social.whatsapp}
        entityName={ristorante.name}
        fixed
        hasSibling={!!(ristorante.chatbot?.active_sito ?? ristorante.chatbot?.active)}
      />
      <ChatbotWidget chatbot={ristorante.chatbot ? { ...ristorante.chatbot, active: ristorante.chatbot.active_sito ?? ristorante.chatbot.active } : null} primaryColor={primary} fixed entityTipo="ristorante" entityId={ristorante.id} lang={lang} />
    </>
  )
}

