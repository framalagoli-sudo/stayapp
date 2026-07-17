'use client'
import { useEffect, useState } from 'react'
import { guestFetch } from '@/lib/api'
import { entityBasePath } from '@/lib/i18n'
import LandingBlockRenderer from '@/components/LandingBlockRenderer'
import LandingFooter from '@/components/guest/LandingFooter'
import SiteNav from '@/components/guest/SiteNav'
import CookieBanner from '@/components/CookieBanner'
import ChatbotWidget from '@/components/ChatbotWidget'
import WhatsAppButton from '@/components/WhatsAppButton'

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
const DEFAULT_PRIMARY = { struttura: '#00b5b5', ristorante: '#e63946', attivita: '#6b46c1' }
const ENTITY_PREFIX   = { struttura: 's', ristorante: 'r', attivita: 'a' }

export default function GuestSubPage({ entity, entityType, pagina, domain, lang = 'it' }) {
  const [pagine, setPagine] = useState([])

  useEffect(() => {
    guestFetch(`/api/guest/pagine/${entityType}/${entity.id}`)
      .then(d => Array.isArray(d) && setPagine(d)).catch(() => {})
  }, [entity.id, entityType])

  useEffect(() => {
    document.title = pagina.seo_title || `${pagina.titolo} — ${entity.name}`
  }, [pagina.titolo, entity.name, pagina.seo_title])

  const theme   = { primaryColor: DEFAULT_PRIMARY[entityType], fontHeading: 'playfair', fontBody: 'inter', ...(entity.theme || {}) }
  const primary = theme.primaryColor
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const body    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter
  const mini    = entity.minisito || {}
  const social  = mini.social || {}

  // Opzione B: la singola pagina può nascondere header/footer (es. landing).
  const hideHeader = pagina.hide_header === true
  const hideFooter = pagina.hide_footer === true

  const prefix     = ENTITY_PREFIX[entityType] || entityType
  const base       = entityBasePath(prefix, entity.slug, domain, lang)
  const privacyUrl = `${base}/privacy`
  const cookieUrl  = `${base}/cookie`

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .sub-content { padding-top: 64px; min-height: calc(100vh - 64px); }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 768px) { .land-section { padding: 0 16px; } }
      `}</style>

      {!hideHeader && (
        <SiteNav entity={entity} mini={mini} pagine={pagine} prefix={prefix}
          primary={primary} secondary={theme.secondaryColor} heading={heading} lang={lang} domain={domain}
          currentSlug={pagina.slug} />
      )}

      <div className="sub-content" style={hideHeader ? { paddingTop: 0 } : undefined}>
        {pagina.blocks?.length > 0 ? (
          <LandingBlockRenderer
            blocks={pagina.blocks} entity={entity} entityType={entityType}
            mini={mini} primary={primary} secondary={theme.secondaryColor} heading={heading} body={body}
            slug={entity.slug} privacyUrl={privacyUrl} base={base}
            aziendaId={entity.azienda_id} lang={lang}
          />
        ) : (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px' }}>
            <h1 style={{ fontFamily: heading, fontSize: 36, fontWeight: 700, marginBottom: 16 }}>{pagina.titolo}</h1>
          </div>
        )}
      </div>

      {!hideFooter && <LandingFooter entity={entity} mini={mini} primary={primary} heading={heading} body={body} entityType={entityType} lang={lang} domain={domain} />}

      <CookieBanner primaryColor={primary} privacyUrl={privacyUrl} cookieUrl={cookieUrl} lang={lang} />
      <WhatsAppButton
        whatsapp={entity.whatsapp || social.whatsapp}
        entityName={entity.name}
        fixed
        hasSibling={!!(entity.chatbot?.active_sito ?? entity.chatbot?.active)}
      />
      <ChatbotWidget
        chatbot={entity.chatbot ? { ...entity.chatbot, active: entity.chatbot.active_sito ?? entity.chatbot.active } : null}
        primaryColor={primary} fixed entityTipo={entityType} entityId={entity.id} lang={lang}
      />
    </>
  )
}
