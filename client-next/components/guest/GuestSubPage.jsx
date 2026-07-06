'use client'
import { useEffect, useState } from 'react'
import { guestFetch } from '@/lib/api'
import { entityBasePath } from '@/lib/i18n'
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

export default function GuestSubPage({ entity, entityType, pagina, domain, lang = 'it' }) {
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

  const hdrCfg         = mini.header_cfg || mini.header || {}
  const navDark        = entityType === 'struttura' ? hdrCfg.style !== 'light' : hdrCfg.style === 'dark'
  const navBg          = navDark ? 'rgba(18,18,32,0.93)'    : 'rgba(255,255,255,0.95)'
  const navBorderColor = navDark ? 'rgba(255,255,255,0.08)' : '#eee'
  const navTextColor   = navDark ? 'rgba(255,255,255,0.8)'  : '#1a1a2e'
  const smartNav       = hdrCfg.scroll_behavior === 'smart'
  const [navHidden, setNavHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!smartNav) return
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < 80) setNavHidden(false)
      else if (y > last + 4) setNavHidden(true)
      else if (y < last - 4) setNavHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [smartNav])

  // Opzione B: la singola pagina può nascondere header/footer (es. landing).
  const hideHeader = pagina.hide_header === true
  const hideFooter = pagina.hide_footer === true

  const prefix     = ENTITY_PREFIX[entityType] || entityType
  const base       = entityBasePath(prefix, entity.slug, domain, lang)
  const privacyUrl = `${base}/privacy`
  const cookieUrl  = `${base}/cookie`
  const homeUrl    = base || '/'

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
        .sub-burger { display: none; background: none; border: none; cursor: pointer; color: ${navTextColor}; font-size: 22px; line-height: 1; padding: 6px; }
        .sub-mobile-menu { position: fixed; top: 64px; left: 0; right: 0; z-index: 99; background: ${navBg}; backdrop-filter: blur(12px); border-bottom: 1px solid ${navBorderColor}; padding: 8px 16px 16px; display: flex; flex-direction: column; }
        @media (min-width: 769px) { .sub-mobile-menu { display: none !important; } }
        @media (max-width: 768px) {
          .sub-nav { padding: 0 16px; }
          .land-section { padding: 0 16px; }
          .sub-nav-desktop { display: none !important; }
          .sub-burger { display: flex !important; align-items: center; }
        }
      `}</style>

      {!hideHeader && (<>
      <nav className="sub-nav" style={{ transform: navHidden ? 'translateY(-100%)' : 'translateY(0)', transition: 'transform 0.3s ease' }}>
        <a href={homeUrl} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {entity.logo_url && <img src={entity.logo_url} alt="logo" style={{ height: 30, objectFit: 'contain' }} />}
          <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 15, color: navTextColor }}>{entity.name}</span>
        </a>
        {pagine.length > 0 && (
          <div className="sub-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {pagine.filter(p => !p.parent_id).map(p => {
              const subs = pagine.filter(c => c.parent_id === p.id)
              return (
                <div key={p.id} style={{ position: 'relative' }}
                  onMouseEnter={() => subs.length && setOpenDropdown(p.id)}
                  onMouseLeave={() => setOpenDropdown(null)}>
                  <a href={`${base}/p/${p.slug}`}
                    style={{ color: navTextColor, textDecoration: 'none', fontSize: 13, padding: '6px 12px', borderRadius: 6, display: 'block', whiteSpace: 'nowrap',
                      fontWeight: p.slug === pagina.slug ? 700 : 400 }}>
                    {p.titolo}{subs.length > 0 && <span style={{ marginLeft: 4, opacity: 0.5 }}>▾</span>}
                  </a>
                  {subs.length > 0 && openDropdown === p.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: 180, background: '#1a1a2e', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', padding: '6px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200 }}>
                      {subs.map(s => (
                        <a key={s.id} href={`${base}/p/${s.slug}`}
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
        <button className="sub-burger" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">{mobileOpen ? '✕' : '☰'}</button>
      </nav>
      {mobileOpen && (
        <div className="sub-mobile-menu">
          {pagine.filter(p => !p.parent_id).map(p => (
            <a key={p.id} href={`${base}/p/${p.slug}`} onClick={() => setMobileOpen(false)}
              style={{ color: navTextColor, textDecoration: 'none', fontSize: 15, padding: '11px 4px', borderBottom: `1px solid ${navBorderColor}`, fontWeight: p.slug === pagina.slug ? 700 : 400 }}>{p.titolo}</a>
          ))}
        </div>
      )}
      </>)}

      <div className="sub-content" style={hideHeader ? { paddingTop: 0 } : undefined}>
        {pagina.blocks?.length > 0 ? (
          <LandingBlockRenderer
            blocks={pagina.blocks} entity={entity} entityType={entityType}
            mini={mini} primary={primary} secondary={theme.secondaryColor} heading={heading} body={body}
            slug={entity.slug} privacyUrl={privacyUrl}
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
