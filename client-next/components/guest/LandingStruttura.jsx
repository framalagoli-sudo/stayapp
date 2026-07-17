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

export default function LandingStruttura({ property, initialHomeBlocks, domain, lang = 'it' }) {
  const [upcomingEventi, setUpcomingEventi] = useState([])
  const [pagine,         setPagine]         = useState([])
  const [recensioni,     setRecensioni]     = useState([])
  const [homeBlocks,     setHomeBlocks]     = useState(initialHomeBlocks)

  useEffect(() => {
    if (!property?.id) return
    const key = `pv_${property.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    guestFetch('/api/guest/pageview', { method: 'POST', body: JSON.stringify({ entity_tipo: 'struttura', entity_id: property.id }) }).catch(() => {})
  }, [property?.id])

  useEffect(() => {
    guestFetch(`/api/guest/eventi?entity_tipo=struttura&entity_id=${property.id}&lang=${lang}`)
      .then(d => Array.isArray(d) && setUpcomingEventi(d)).catch(() => {})
    guestFetch(`/api/guest/pagine/struttura/${property.id}`)
      .then(d => Array.isArray(d) && setPagine(d)).catch(() => {})
    guestFetch(`/api/guest/recensioni/struttura/${property.id}`)
      .then(d => Array.isArray(d) && setRecensioni(d)).catch(() => {})
    if (initialHomeBlocks === undefined) {
      guestFetch(`/api/guest/pagina/struttura/${property.id}/__home__`)
        .then(d => setHomeBlocks(d?.id && Array.isArray(d.blocks) && d.blocks.length ? d.blocks : null))
        .catch(() => setHomeBlocks(null))
    }
  }, [property.id])

  const theme   = { primaryColor: '#00b5b5', fontHeading: 'playfair', fontBody: 'inter', ...resolveSiteTheme(property) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const mini    = property.minisito || {}
  const showPwaLink = mini.show_pwa_link !== false
  const social  = mini.social || {}
  const base    = entityBasePath('s', property.slug, domain, lang)


  useEffect(() => {
    loadFont(theme.fontHeading)
    loadFont(theme.fontBody)
    document.title = mini.seo_title || property.name
    setMeta('description', mini.seo_description || property.description || '')
    setMeta('og:title',    mini.seo_title || property.name)
    setMeta('og:image',    property.cover_url || '')
    setMeta('og:type',     'website')
    if (mini.google_site_verification) setMeta('google-site-verification', mini.google_site_verification)
    const cleanupTracking = injectTracking(mini.tracking_cfg || {})
    const sitemapEl = Object.assign(document.createElement('link'), { rel: 'sitemap', type: 'application/xml', href: `/api/sitemap/struttura/${property.slug}` })
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
    const c1 = injectJsonLd('ld-entity', buildEntitySchema({ entity: property, tipo: 'struttura', recensioni, eventi: upcomingEventi }))
    const c2 = faqItems.length ? injectJsonLd('ld-faq', buildFaqSchema(faqItems)) : null
    return () => { c1(); c2?.() }
  }, [recensioni, upcomingEventi])

  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    el.setAttribute('content', content)
  }

  const pwaUrl     = domain ? `https://${domain}?qr=1` : `/s/${property.slug}?qr=1`
  const bookingUrl = mini.booking_url || null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up   { animation: fadeUp 0.7s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.7s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.4s ease both; }
        @media (max-width: 768px) { .land-section { padding: 0 16px; } }
      `}</style>

      <SiteNav entity={property} mini={mini} pagine={pagine} prefix="s"
        primary={primary} secondary={theme.secondaryColor} heading={heading} lang={lang} domain={domain}
        pwa={showPwaLink ? { url: pwaUrl, label: 'App ospiti' } : null} bookingUrl={bookingUrl} />

      {homeBlocks === undefined ? null : homeBlocks ? (
        <LandingBlockRenderer
          blocks={homeBlocks} entity={property} entityType="struttura"
          mini={mini} primary={primary} secondary={theme.secondaryColor} heading={heading} body={body}
          slug={property.slug} privacyUrl={`${base}/privacy`} base={base}
          aziendaId={property.azienda_id} lang={lang}
        />
      ) : null}

      <LandingFooter entity={property} mini={mini} primary={primary} heading={heading} body={body} entityType="struttura" lang={lang} domain={domain} />

      <CookieBanner
        primaryColor={primary}
        privacyUrl={property.slug ? `${base}/privacy` : null}
        cookieUrl={property.slug  ? `${base}/cookie`  : null}
        lang={lang}
      />
      <WhatsAppButton
        whatsapp={property.whatsapp || social.whatsapp}
        entityName={property.name}
        fixed
        hasSibling={!!(property.chatbot?.active_sito ?? property.chatbot?.active)}
      />
      <ChatbotWidget chatbot={property.chatbot ? { ...property.chatbot, active: property.chatbot.active_sito ?? property.chatbot.active } : null} primaryColor={primary} fixed entityTipo="struttura" entityId={property.id} lang={lang} />
    </>
  )
}

