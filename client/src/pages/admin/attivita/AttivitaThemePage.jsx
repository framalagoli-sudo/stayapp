import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'

const BG_COLORS = [
  { value: '#ffffff', label: 'Bianco' },
  { value: '#f8f6f2', label: 'Crema' },
  { value: '#f0f4f8', label: 'Azzurro chiaro' },
  { value: '#f5f0fa', label: 'Lavanda' },
  { value: '#1a1a2e', label: 'Notte' },
]
const TEXT_COLORS = [
  { value: '#1a1a2e', label: 'Scuro' },
  { value: '#ffffff', label: 'Chiaro' },
]
const HEADING_FONTS = [
  { key: 'playfair',   label: 'Playfair Display', family: "'Playfair Display', Georgia, serif",   desc: 'Elegante serif' },
  { key: 'cormorant',  label: 'Cormorant Garamond',family: "'Cormorant Garamond', Georgia, serif", desc: 'Lusso raffinato' },
  { key: 'raleway',    label: 'Raleway',           family: "'Raleway', system-ui, sans-serif",     desc: 'Geometrico slim' },
  { key: 'montserrat', label: 'Montserrat',        family: "'Montserrat', system-ui, sans-serif",  desc: 'Moderno forte' },
  { key: 'nunito',     label: 'Nunito',            family: "'Nunito', system-ui, sans-serif",      desc: 'Friendly rotondo' },
  { key: 'dm-sans',    label: 'DM Sans',           family: "'DM Sans', system-ui, sans-serif",     desc: 'Minimal contemporaneo' },
]
const BODY_FONTS = [
  { key: 'inter',     label: 'Inter',     family: "'Inter', system-ui, sans-serif",     desc: 'Leggibile, neutro' },
  { key: 'lato',      label: 'Lato',      family: "'Lato', system-ui, sans-serif",      desc: 'Caldo, umano' },
  { key: 'open-sans', label: 'Open Sans', family: "'Open Sans', system-ui, sans-serif", desc: 'Classico digitale' },
]
const BORDER_STYLES = [
  { key: 'rounded', label: 'Arrotondato', desc: '16px', radius: 16 },
  { key: 'mixed',   label: 'Misto',       desc: '8px',  radius: 8 },
  { key: 'square',  label: 'Squadrato',   desc: '0px',  radius: 0 },
]
const DEFAULT_THEME = {
  primaryColor: '#6b46c1', bgColor: '#ffffff', textColor: '#1a1a2e',
  fontHeading: 'montserrat', fontBody: 'inter', headerStyle: 'solid', borderStyle: 'mixed',
}
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Lato:wght@400;600&family=Open+Sans:wght@400;600&family=Playfair+Display:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=Raleway:wght@400;600&family=Montserrat:wght@400;600&family=Nunito:wght@400;600&family=DM+Sans:wght@400;600&display=swap'

function getHeadingFamily(key) { return HEADING_FONTS.find(f => f.key === key)?.family || HEADING_FONTS[0].family }
function getBodyFamily(key)    { return BODY_FONTS.find(f => f.key === key)?.family    || BODY_FONTS[0].family }
function getBorderRadius(key)  { return BORDER_STYLES.find(s => s.key === key)?.radius ?? 8 }

function ThemePreview({ theme, attivita }) {
  const primary = theme.primaryColor
  const bg = theme.bgColor
  const text = theme.textColor
  const radius = getBorderRadius(theme.borderStyle)
  const headingFamily = getHeadingFamily(theme.fontHeading)
  const bodyFamily = getBodyFamily(theme.fontBody)
  const isDark = bg === '#1a1a2e'
  const cardBg = isDark ? '#2a2a3e' : '#f5f5f5'

  return (
    <div style={{ position: 'sticky', top: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10, textAlign: 'center' }}>Anteprima live</div>
      <div style={{ width: 200, margin: '0 auto', border: '6px solid #1a1a2e', borderRadius: 32, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', background: bg, fontFamily: bodyFamily }}>
        <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, padding: '14px 10px 12px', textAlign: 'center' }}>
          {attivita?.logo_url && (
            <img src={attivita.logo_url} alt="" style={{ maxHeight: 18, maxWidth: 70, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
          )}
          <div style={{ fontFamily: headingFamily, fontWeight: 700, fontSize: 11, color: '#fff' }}>
            {attivita?.name || 'La tua attività'}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{attivita?.tipo || 'Attività'}</div>
        </div>
        <div style={{ padding: '10px 10px 14px', background: bg, color: text }}>
          <div style={{ fontSize: 9, fontFamily: headingFamily, fontWeight: 700, marginBottom: 8, color: text }}>Servizi</div>
          {['Consulenza', 'Trattamento', 'Pacchetto VIP'].map(s => (
            <div key={s} style={{ background: cardBg, borderRadius: radius / 2, padding: '6px 8px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: primary, flexShrink: 0 }} />
              <div style={{ fontSize: 8, color: text }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AttivitaThemePage() {
  const { id } = useParams()
  const { attivita, loading, save } = useAttivita(id)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = FONTS_URL
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!attivita) return <p style={errorStyle}>Attività non trovata.</p>

  const theme = { ...DEFAULT_THEME, ...(attivita.theme || {}) }

  function updateTheme(patch) {
    save({ theme: { ...theme, ...patch } }).catch(() => {})
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gridTemplateColumns: '1fr 240px', gap: 32, alignItems: 'start' }}>
      <div>
        <h2 style={titleStyle}>Aspetto e tema</h2>
        <p style={descStyle}>Personalizza colori, font e stile della pagina. L'anteprima si aggiorna in tempo reale.</p>

        <div style={cardStyle}>
          <Section label="Colore principale">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="color" value={theme.primaryColor}
                onChange={e => save({ theme: { ...theme, primaryColor: e.target.value } }).catch(() => {})}
                onBlur={e => updateTheme({ primaryColor: e.target.value })}
                style={{ width: 52, height: 52, border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', padding: 3, background: 'none' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{theme.primaryColor.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Header, accenti</div>
              </div>
            </div>
          </Section>

          <Section label="Sfondo app">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {BG_COLORS.map(({ value, label }) => (
                <button key={value} type="button" title={label}
                  onClick={() => updateTheme({ bgColor: value })}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', background: value, border: theme.bgColor === value ? `3px solid ${theme.primaryColor}` : '2px solid #ddd' }} />
              ))}
            </div>
          </Section>

          <Section label="Colore testo">
            <div style={{ display: 'flex', gap: 8 }}>
              {TEXT_COLORS.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => updateTheme({ textColor: value })}
                  style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: value, color: value === '#ffffff' ? '#333' : '#fff', border: theme.textColor === value ? `2px solid ${theme.primaryColor}` : '2px solid #ddd', fontWeight: theme.textColor === value ? 700 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Font titoli">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {HEADING_FONTS.map(({ key, label, family, desc }) => {
                const isSel = theme.fontHeading === key
                return (
                  <button key={key} type="button" onClick={() => updateTheme({ fontHeading: key })}
                    style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`, background: isSel ? `${theme.primaryColor}12` : '#fafafa' }}>
                    <div style={{ fontFamily: family, fontSize: 15, fontWeight: 600, color: '#222', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="Font testo">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {BODY_FONTS.map(({ key, label, family, desc }) => {
                const isSel = theme.fontBody === key
                return (
                  <button key={key} type="button" onClick={() => updateTheme({ fontBody: key })}
                    style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`, background: isSel ? `${theme.primaryColor}12` : '#fafafa' }}>
                    <div style={{ fontFamily: family, fontSize: 14, fontWeight: 600, color: '#222', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section label="Stile bordi" style={{ marginBottom: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {BORDER_STYLES.map(({ key, label, desc }) => {
                const isSel = theme.borderStyle === key
                return (
                  <button key={key} type="button" onClick={() => updateTheme({ borderStyle: key })}
                    style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`, background: isSel ? `${theme.primaryColor}12` : '#fafafa' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>
        </div>
      </div>

      <div style={{ paddingTop: 68 }}>
        <ThemePreview theme={theme} attivita={attivita} />
      </div>
    </div>
  )
}

function Section({ label, children, style }) {
  return (
    <div style={{ marginBottom: 24, ...style }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
