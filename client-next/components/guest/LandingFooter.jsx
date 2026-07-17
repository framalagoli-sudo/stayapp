'use client'
import LegalInfo from './LegalInfo'
import { t, entityBasePath } from '@/lib/i18n'
import { isDarkColor } from '@/lib/color'
import { SocialIcon, SOCIAL_LABEL, socialKey, hasSocialIcon } from '@/lib/socialIcons'

const ENTITY_PREFIX = { struttura: 's', ristorante: 'r', attivita: 'a' }

// URL sicuro per href (blocca javascript:/data: da input tenant). I social/extra
// links sono impostati dal cliente → non fidati. Restituisce '#' se non valido.
function safeUrl(u) {
  const s = String(u || '').trim()
  return (/^(https?:|mailto:|tel:)/i.test(s) || s.startsWith('/')) ? s : '#'
}

export default function LandingFooter({ entity, mini, primary, heading, body, entityType, lang = 'it', domain = null }) {
  // Due sorgenti config: `footer_cfg` = editor attuale (SitoPage), `footer` =
  // schema legacy (vecchio MiniSitoPage). Preferisci footer_cfg; fallback a footer.
  const cfg    = mini?.footer_cfg || {}
  const legacy = mini?.footer || {}
  const hasCfg = !!mini?.footer_cfg
  if (legacy.show_footer === false) return null

  const layout = cfg.layout || legacy.layout || 'standard'   // minimal | standard | full
  // Stile: editor nuovo usa style dark/light; legacy usa colori espliciti.
  const styleDark = legacy.bg_color ? isDarkColor(legacy.bg_color) : (hasCfg ? cfg.style !== 'light' : true)
  const bg        = legacy.bg_color || (styleDark ? '#1a1a2e' : '#f6f6f8')
  const color     = legacy.text_color || (styleDark ? 'rgba(255,255,255,0.75)' : 'rgba(20,20,30,0.7)')
  const accent    = legacy.text_color || (styleDark ? '#fff' : '#1a1a2e')
  const borderCol = styleDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const brandLogo = (styleDark && entity.logo_dark_url) ? entity.logo_dark_url : entity.logo_url
  const social    = mini?.social || {}

  const showContact     = hasCfg ? (cfg.show_contact !== false) : true
  const showDescription = hasCfg ? (cfg.show_description !== false) : true
  const showSocial      = hasCfg ? (cfg.show_socials !== false) : (legacy.show_social !== false)
  const hasAddress = showContact && legacy.show_address !== false && entity.address
  const hasPhone   = showContact && legacy.show_phone   !== false && entity.phone
  const hasEmail   = showContact && legacy.show_email   !== false && entity.email
  const extraLinks = (cfg.extra_links?.length ? cfg.extra_links : legacy.extra_links) || []
  const copyright  = cfg.copyright || legacy.copyright_text
    || `© ${new Date().getFullYear()} ${entity.name}. ${t('all_rights', lang)}`

  const socialEntries = Object.entries(social).filter(([, v]) => v)
  const hasContact    = hasAddress || hasPhone || hasEmail
  const hasLinks      = (showSocial && socialEntries.length > 0) || extraLinks.length > 0
  const isMinimal     = layout === 'minimal'
  const prefix        = ENTITY_PREFIX[entityType] || entityType
  const base          = entityBasePath(prefix, entity.slug, domain, lang)

  return (
    <footer style={{ background: bg, fontFamily: body }}>
      <style>{`
        .lf-wrap  { max-width: 1100px; margin: 0 auto; padding: 48px 24px 0; }
        .lf-cols  { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; padding-bottom: 40px; border-bottom: 1px solid ${borderCol}; }
        .lf-copy  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 20px 0; font-size: 12px; }
        @media (max-width: 640px) {
          .lf-wrap { padding-top: 36px; padding-left: 20px; padding-right: 20px; }
          .lf-cols { gap: 28px; }
          .lf-copy { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>
      <div className="lf-wrap">
        {!isMinimal && (
        <div className="lf-cols">
          {/* Brand */}
          <div>
            {brandLogo && (
              <img src={brandLogo} alt={entity.name}
                style={{ height: 36, objectFit: 'contain', marginBottom: 12 }} />
            )}
            <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 18, color: accent, marginBottom: 8 }}>
              {entity.name}
            </div>
            {showDescription && entity.description && (
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color }}>
                {entity.description.length > 130 ? entity.description.slice(0, 130) + '…' : entity.description}
              </p>
            )}
          </div>

          {/* Contatti */}
          {hasContact && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: accent, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('contacts', lang)}
              </div>
              {hasAddress && <p style={{ fontSize: 13, margin: '0 0 8px', lineHeight: 1.5, color }}>{entity.address}</p>}
              {hasPhone   && <p style={{ fontSize: 13, margin: '0 0 8px', color }}>
                <a href={`tel:${entity.phone}`} style={{ color, textDecoration: 'none' }}>{entity.phone}</a>
              </p>}
              {hasEmail   && <p style={{ fontSize: 13, margin: 0, color }}>
                <a href={`mailto:${entity.email}`} style={{ color, textDecoration: 'none' }}>{entity.email}</a>
              </p>}
            </div>
          )}

          {/* Social + link */}
          {hasLinks && (
            <div>
              {extraLinks.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 11, color: accent, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {t('useful_links', lang)}
                  </div>
                  {extraLinks.map((l, i) => (
                    <p key={i} style={{ margin: '0 0 8px' }}>
                      <a href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer"
                        style={{ color, textDecoration: 'none', fontSize: 13 }}>
                        {l.label}
                      </a>
                    </p>
                  ))}
                </>
              )}
              {showSocial && socialEntries.length > 0 && (
                <div style={{ marginTop: extraLinks.length > 0 ? 20 : 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: accent, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {t('follow_us', lang)}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {socialEntries.map(([key, url]) => {
                      const k = socialKey(key)
                      const href = k === 'whatsapp' ? `https://wa.me/${String(url).replace(/\D/g, '')}` : safeUrl(url)
                      return (
                        <a key={key} href={href} target="_blank" rel="noopener noreferrer"
                          aria-label={SOCIAL_LABEL[k] || k} title={SOCIAL_LABEL[k] || k}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 38, height: 38, padding: hasSocialIcon(k) ? 0 : '0 14px', color, border: `1px solid ${color}`, borderRadius: hasSocialIcon(k) ? '50%' : 20, fontSize: 12, textDecoration: 'none', transition: 'opacity 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.6' }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                          {hasSocialIcon(k) ? <SocialIcon name={k} size={18} /> : (SOCIAL_LABEL[k] || key)}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Copyright bar */}
        <div className="lf-copy" style={{ color, opacity: 0.65 }}>
          <span>{copyright}</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href={`${base}/privacy`} style={{ color, textDecoration: 'none' }}>{t('privacy_policy', lang)}</a>
            <a href={`${base}/cookie`}  style={{ color, textDecoration: 'none' }}>{t('cookie_policy', lang)}</a>
          </div>
        </div>

        {/* Dati legali (obbligo di legge: P.IVA, sede, ecc.) */}
        <LegalInfo azienda={entity.azienda_legale} color={color} style={{ paddingBottom: 24, opacity: 0.55 }} />
      </div>
    </footer>
  )
}
