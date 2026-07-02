'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRistorante } from '../../../hooks/useRistorante'
import { apiFetch } from '../../../lib/api'
import FontPairPicker from '@/components/admin/FontPairPicker'
import { HEADING_FONTS, BODY_FONTS, getHeadingFamily, getBodyFamily, FONTS_URL } from '@/lib/fonts'
import { BG_COLORS, TEXT_COLORS, BORDER_STYLES, getBorderRadius } from '@/lib/themeOptions'

const DEFAULT_THEME = {
  primaryColor: '#e63946', secondaryColor: '', bgColor: '#ffffff', textColor: '#1a1a2e',
  fontHeading: 'playfair', fontBody: 'inter', headerStyle: 'solid', borderStyle: 'mixed',
}

function ThemePreview({ theme, ristorante }) {
  const primary = theme.primaryColor
  const bg = theme.bgColor
  const text = theme.textColor
  const radius = getBorderRadius(theme.borderStyle)
  const headingFamily = getHeadingFamily(theme.fontHeading)
  const bodyFamily = getBodyFamily(theme.fontBody)
  const isDark = bg === '#1a1a2e'
  const cardBg = isDark ? '#2a2a3e' : '#f5f5f5'
  const subText = isDark ? '#aaa' : '#666'

  const headerBg = `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`

  return (
    <div style={{ position: 'sticky', top: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10, textAlign: 'center' }}>Anteprima live</div>
      <div style={{ width: 200, margin: '0 auto', border: '6px solid #1a1a2e', borderRadius: 32, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', background: bg, fontFamily: bodyFamily }}>
        {/* Header */}
        <div style={{ background: headerBg, padding: '14px 10px 12px', textAlign: 'center' }}>
          {ristorante?.logo_url && (
            <img src={ristorante.logo_url} alt="" style={{ maxHeight: 18, maxWidth: 70, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
          )}
          <div style={{ fontFamily: headingFamily, fontWeight: 700, fontSize: 11, color: '#fff' }}>
            {ristorante?.name || 'Il tuo ristorante'}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Ristorante · Dal 1990</div>
        </div>
        {/* Body */}
        <div style={{ padding: '10px 10px 14px', background: bg, color: text }}>
          <div style={{ fontSize: 9, fontFamily: headingFamily, fontWeight: 700, marginBottom: 8, color: text }}>Menu</div>
          {[['Antipasti', 'Bruschetta al pomodoro', '6€'], ['Primi', 'Spaghetti alla carbonara', '14€']].map(([cat, dish, price]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{cat}</div>
              <div style={{ background: cardBg, borderRadius: radius / 2, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 8, color: text }}>{dish}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: primary }}>{price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RistoranteThemePage() {
  const { id } = useParams()
  const { ristorante, loading, save } = useRistorante(id)
  const [entities, setEntities] = useState([])
  const [copying,  setCopying]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = FONTS_URL
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  useEffect(() => {
    if (!ristorante) return
    Promise.all([
      apiFetch('/api/properties'),
      apiFetch('/api/ristoranti'),
    ]).then(([props, rests]) => {
      const others = [
        ...(props || []).map(p => ({ ...p, _tipo: 'struttura' })),
        ...(rests || []).filter(r => r.id !== id).map(r => ({ ...r, _tipo: 'ristorante' })),
      ]
      setEntities(others)
    }).catch(() => {})
  }, [ristorante?.id])

  async function copyThemeFrom(entity) {
    if (!entity.theme) return
    setCopying(true)
    try {
      await save({ theme: entity.theme })
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
    finally { setCopying(false) }
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  const theme = { ...DEFAULT_THEME, ...(ristorante.theme || {}) }

  function updateTheme(patch) {
    save({ theme: { ...theme, ...patch } }).catch(() => {})
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gridTemplateColumns: '1fr 240px', gap: 32, alignItems: 'start' }}>
      <div>
        <h2 style={titleStyle}>Aspetto e tema</h2>
        <p style={descStyle}>Personalizza colori, font e stile dell'app del ristorante. L'anteprima si aggiorna in tempo reale.</p>

        {entities.length > 0 && (
          <div style={{ background: '#f0f7ff', border: '1px solid #c3dafe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2b4a8a', flexShrink: 0 }}>Copia stile da:</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {entities.map(e => (
                <button key={e.id} type="button" disabled={copying}
                  onClick={() => copyThemeFrom(e)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: copying ? 'wait' : 'pointer', border: '1.5px solid #93c5fd', background: '#fff', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                  {e.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>({e._tipo})</span>
                </button>
              ))}
            </div>
            {copied && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Stile copiato!</span>}
          </div>
        )}

        <div style={cardStyle}>
          <Section label="Colore principale">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="color" value={theme.primaryColor}
                onChange={e => save({ theme: { ...theme, primaryColor: e.target.value } }).catch(() => {})}
                onBlur={e => updateTheme({ primaryColor: e.target.value })}
                style={{ width: 52, height: 52, border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', padding: 3, background: 'none' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{theme.primaryColor.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Header, prezzi, accenti</div>
              </div>
            </div>
          </Section>

          <Section label="Colore accento (secondario)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="color" value={theme.secondaryColor || theme.primaryColor}
                onChange={e => save({ theme: { ...theme, secondaryColor: e.target.value } }).catch(() => {})}
                onBlur={e => updateTheme({ secondaryColor: e.target.value })}
                style={{ width: 52, height: 52, border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', padding: 3, background: 'none' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{(theme.secondaryColor || theme.primaryColor).toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Badge e dettagli (vuoto = come principale)</div>
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

          <Section label="Abbinamenti consigliati">
            <FontPairPicker theme={theme} updateTheme={updateTheme} />
          </Section>

          <Section label="Font titoli">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
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
        <ThemePreview theme={theme} ristorante={ristorante} />
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
