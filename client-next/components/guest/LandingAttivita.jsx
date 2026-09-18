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
import { HEADING_FAMILIES, BODY_FAMILIES, caricaFont as loadFont } from '@/lib/fonts'
import { eScuro, variabiliSuperficie } from '@/lib/superficie'



export default function LandingAttivita({ attivita, initialHomeBlocks, domain, lang = 'it' }) {
  const [upcomingEventi, setUpcomingEventi] = useState([])
  const [pagine,         setPagine]         = useState([])
  const [recensioni,     setRecensioni]     = useState([])
  const [homeBlocks,     setHomeBlocks]     = useState(initialHomeBlocks)

  useEffect(() => {
    if (!attivita?.id) return
    const key = `pv_${attivita.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    guestFetch('/api/guest/pageview', { method: 'POST', body: JSON.stringify({ entity_tipo: 'attivita', entity_id: attivita.id }) }).catch(() => {})
  }, [attivita?.id])

  useEffect(() => {
    guestFetch(`/api/guest/eventi?entity_tipo=attivita&entity_id=${attivita.id}&lang=${lang}`)
      .then(d => Array.isArray(d) && setUpcomingEventi(d)).catch(() => {})
    guestFetch(`/api/guest/pagine/attivita/${attivita.id}`)
      .then(d => Array.isArray(d) && setPagine(d)).catch(() => {})
    guestFetch(`/api/guest/recensioni/attivita/${attivita.id}`)
      .then(d => Array.isArray(d) && setRecensioni(d)).catch(() => {})
    if (initialHomeBlocks === undefined) {
      guestFetch(`/api/guest/pagina/attivita/${attivita.id}/__home__`)
        .then(d => setHomeBlocks(d?.id && Array.isArray(d.blocks) && d.blocks.length ? d.blocks : null))
        .catch(() => setHomeBlocks(null))
    }
  }, [attivita.id])

  const theme   = { primaryColor: '#6b46c1', fontHeading: 'playfair', fontBody: 'inter', ...resolveSiteTheme(attivita) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  // Fondo e testo del sito vengono dal tema: erano scritti a mano, quindi un
  // tema scuro non poteva funzionare. Senza valori nel tema restano quelli storici.
  const fondo = theme.bgColor || '#ffffff'
  const testo = theme.textColor || '#1a1a2e'
  const scuro = eScuro(fondo)
  const varSup = Object.entries(variabiliSuperficie(scuro)).map(([k, v]) => `${k}: ${v};`).join(' ')
  const mini    = attivita.minisito || {}
  const social  = mini.social || {}
  const base    = entityBasePath('a', attivita.slug, domain, lang)


  useEffect(() => {
    loadFont(theme.fontHeading)
    loadFont(theme.fontBody)
    document.title = mini.seo_title || attivita.name
    setMeta('description', mini.seo_description || attivita.description || '')
    setMeta('og:title',    mini.seo_title || attivita.name)
    setMeta('og:image',    attivita.cover_url || '')
    setMeta('og:type',     'website')
    if (mini.google_site_verification) setMeta('google-site-verification', mini.google_site_verification)
    const cleanupTracking = injectTracking(mini.tracking_cfg || {})
    const sitemapEl = Object.assign(document.createElement('link'), { rel: 'sitemap', type: 'application/xml', href: `/api/sitemap/attivita/${attivita.slug}` })
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
    const c1 = injectJsonLd('ld-entity', buildEntitySchema({ entity: attivita, tipo: 'attivita', recensioni, eventi: upcomingEventi }))
    const c2 = faqItems.length ? injectJsonLd('ld-faq', buildFaqSchema(faqItems)) : null
    return () => { c1(); c2?.() }
  }, [recensioni, upcomingEventi])

  function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    el.setAttribute('content', content)
  }

  const bookingUrl = mini.booking_url || null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: ${testo}; background: ${fondo}; }
        :root { ${varSup} }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 768px) { .land-section { padding: 0 16px; } }
      `}</style>

      <SiteNav entity={attivita} mini={mini} pagine={pagine} prefix="a"
        primary={primary} secondary={theme.secondaryColor} heading={heading} lang={lang} domain={domain}
        pwa={null} bookingUrl={bookingUrl} />

      {homeBlocks === undefined ? null : homeBlocks ? (
        <LandingBlockRenderer
          blocks={homeBlocks} entity={attivita} entityType="attivita"
          mini={mini} primary={primary} secondary={theme.secondaryColor} heading={heading} body={body}
          slug={attivita.slug} privacyUrl={`${base}/privacy`} base={base}
          aziendaId={attivita.azienda_id} lang={lang}
        />
      ) : null}

      <LandingFooter entity={attivita} mini={mini} primary={primary} heading={heading} body={body} entityType="attivita" lang={lang} domain={domain} />

      <CookieBanner
        primaryColor={primary}
        privacyUrl={attivita.slug ? `${base}/privacy` : null}
        cookieUrl={attivita.slug  ? `${base}/cookie`  : null}
        lang={lang}
      />
      <WhatsAppButton
        whatsapp={social.whatsapp}
        entityName={attivita.name}
        fixed
        hasSibling={!!(attivita.chatbot?.active_sito ?? attivita.chatbot?.active)}
      />
      <ChatbotWidget chatbot={attivita.chatbot ? { ...attivita.chatbot, active: attivita.chatbot.active_sito ?? attivita.chatbot.active } : null} primaryColor={primary} fixed entityTipo="attivita" entityId={attivita.id} lang={lang} />
    </>
  )
}
