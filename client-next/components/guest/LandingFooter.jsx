'use client'
import LegalInfo from './LegalInfo'

const SOCIAL_LABELS = {
  instagram:   'Instagram',
  facebook:    'Facebook',
  tripadvisor: 'TripAdvisor',
  whatsapp:    'WhatsApp',
}

const ENTITY_PREFIX = { struttura: 's', ristorante: 'r', attivita: 'a' }

export default function LandingFooter({ entity, mini, primary, heading, body, entityType }) {
  const footer = mini?.footer || {}
  if (footer.show_footer === false) return null

  const bg     = footer.bg_color   || '#1a1a2e'
  const color  = footer.text_color || 'rgba(255,255,255,0.75)'
  const accent = footer.text_color || '#fff'
  const social = mini?.social || {}

  const hasAddress = footer.show_address !== false && entity.address
  const hasPhone   = footer.show_phone   !== false && entity.phone
  const hasEmail   = footer.show_email   !== false && entity.email
  const showSocial = footer.show_social  !== false
  const extraLinks = footer.extra_links  || []
  const copyright  = footer.copyright_text
    || `© ${new Date().getFullYear()} ${entity.name}. Tutti i diritti riservati.`

  const socialEntries = Object.entries(social).filter(([, v]) => v)
  const hasContact    = hasAddress || hasPhone || hasEmail
  const hasLinks      = (showSocial && socialEntries.length > 0) || extraLinks.length > 0
  const prefix        = ENTITY_PREFIX[entityType] || entityType

  return (
    <footer style={{ background: bg, fontFamily: body }}>
      <style>{`
        .lf-wrap  { max-width: 1100px; margin: 0 auto; padding: 48px 24px 0; }
        .lf-cols  { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .lf-copy  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 20px 0; font-size: 12px; }
        @media (max-width: 640px) {
          .lf-wrap { padding-top: 36px; padding-left: 20px; padding-right: 20px; }
          .lf-cols { gap: 28px; }
          .lf-copy { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>
      <div className="lf-wrap">
        <div className="lf-cols">
          {/* Brand */}
          <div>
            {entity.logo_url && (
              <img src={entity.logo_url} alt={entity.name}
                style={{ height: 36, objectFit: 'contain', marginBottom: 12 }} />
            )}
            <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 18, color: accent, marginBottom: 8 }}>
              {entity.name}
            </div>
            {entity.description && (
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color }}>
                {entity.description.length > 130 ? entity.description.slice(0, 130) + '…' : entity.description}
              </p>
            )}
          </div>

          {/* Contatti */}
          {hasContact && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: accent, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Contatti
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
                    Link utili
                  </div>
                  {extraLinks.map((l, i) => (
                    <p key={i} style={{ margin: '0 0 8px' }}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
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
                    Seguici
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {socialEntries.map(([key, url]) => (
                      <a key={key}
                        href={key === 'whatsapp' ? `https://wa.me/${url.replace(/\D/g, '')}` : url}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color, textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20 }}>
                        {SOCIAL_LABELS[key] || key}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copyright bar */}
        <div className="lf-copy" style={{ color, opacity: 0.65 }}>
          <span>{copyright}</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href={`/${prefix}/${entity.slug}/privacy`} style={{ color, textDecoration: 'none' }}>Privacy Policy</a>
            <a href={`/${prefix}/${entity.slug}/cookie`}  style={{ color, textDecoration: 'none' }}>Cookie Policy</a>
          </div>
        </div>

        {/* Dati legali (obbligo di legge: P.IVA, sede, ecc.) */}
        <LegalInfo azienda={entity.azienda_legale} color={color} style={{ paddingBottom: 24, opacity: 0.55 }} />
      </div>
    </footer>
  )
}
