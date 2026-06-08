'use client'
import { useEffect, useState } from 'react'
import { guestFetch } from '@/lib/api'
import LandingBlockRenderer from '@/components/LandingBlockRenderer'
import LandingFooter from '@/components/guest/LandingFooter'
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

export default function GuestSubPage({ entity, entityType, pagina, domain }) {
  const [pagine,       setPagine]       = useState([])
  const [openDropdown, setOpenDropdown] = useState(null)

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

  const hdrCfg         = mini.header || {}
  const navDark        = entityType === 'struttura' ? hdrCfg.style !== 'light' : hdrCfg.style === 'dark'
  const navBg          = navDark ? 'rgba(18,18,32,0.93)'    : 'rgba(255,255,255,0.95)'
  const navBorderColor = navDark ? 'rgba(255,255,255,0.08)' : '#eee'
  const navTextColor   = navDark ? 'rgba(255,255,255,0.8)'  : '#1a1a2e'

  const prefix     = ENTITY_PREFIX[entityType] || entityType
  const privacyUrl = `/${prefix}/${entity.slug}/privacy`
  const cookieUrl  = `/${prefix}/${entity.slug}/cookie`
  const homeUrl    = `/${prefix}/${entity.slug}`

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${body}; color: #1a1a2e; background: #fff; }
        .sub-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: ${navBg}; backdrop-filter: blur(12px);
          border-bottom: 1px solid ${navBorderColor}; padding: 0 32px;
          display: flex; align-items: center; justify-content: space-between; height: 64px;
        }
        .sub-content { padding-top: 64px; min-height: calc(100vh - 64px); }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 768px) {
          .sub-nav { padding: 0 16px; }
          .land-section { padding: 0 16px; }
        }
      `}</style>

      <nav className="sub-nav">
        <a href={homeUrl} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {entity.logo_url && <img src={entity.logo_url} alt="logo" style={{ height: 30, objectFit: 'contain' }} />}
          <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 15, color: navTextColor }}>{entity.name}</span>
        </a>
        {pagine.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {pagine.filter(p => !p.parent_id).map(p => {
              const subs = pagine.filter(c => c.parent_id === p.id)
              return (
                <div key={p.id} style={{ position: 'relative' }}
                  onMouseEnter={() => subs.length && setOpenDropdown(p.id)}
                  onMouseLeave={() => setOpenDropdown(null)}>
                  <a href={`/${prefix}/${entity.slug}/p/${p.slug}`}
                    style={{ color: navTextColor, textDecoration: 'none', fontSize: 13, padding: '6px 12px', borderRadius: 6, display: 'block', whiteSpace: 'nowrap',
                      fontWeight: p.slug === pagina.slug ? 700 : 400 }}>
                    {p.titolo}{subs.length > 0 && <span style={{ marginLeft: 4, opacity: 0.5 }}>▾</span>}
                  </a>
                  {subs.length > 0 && openDropdown === p.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: 180, background: '#1a1a2e', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', padding: '6px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200 }}>
                      {subs.map(s => (
                        <a key={s.id} href={`/${prefix}/${entity.slug}/p/${s.slug}`}
                          style={{ display: 'block', padding: '9px 16px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 13 }}>
                          {s.titolo}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div />
      </nav>

      <div className="sub-content">
        {pagina.blocks?.length > 0 ? (
          <LandingBlockRenderer
            blocks={pagina.blocks} entity={entity} entityType={entityType}
            mini={mini} primary={primary} heading={heading} body={body}
            slug={entity.slug} privacyUrl={privacyUrl}
            aziendaId={entity.azienda_id}
          />
        ) : (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px' }}>
            <h1 style={{ fontFamily: heading, fontSize: 36, fontWeight: 700, marginBottom: 16 }}>{pagina.titolo}</h1>
          </div>
        )}
      </div>

      <LandingFooter entity={entity} mini={mini} primary={primary} heading={heading} body={body} entityType={entityType} />

      <CookieBanner primaryColor={primary} privacyUrl={privacyUrl} cookieUrl={cookieUrl} />
      <WhatsAppButton
        whatsapp={entity.whatsapp || social.whatsapp}
        entityName={entity.name}
        fixed
        hasSibling={!!(entity.chatbot?.active_sito ?? entity.chatbot?.active)}
      />
      <ChatbotWidget
        chatbot={entity.chatbot ? { ...entity.chatbot, active: entity.chatbot.active_sito ?? entity.chatbot.active } : null}
        primaryColor={primary} fixed entityTipo={entityType} entityId={entity.id}
      />
    </>
  )
}
