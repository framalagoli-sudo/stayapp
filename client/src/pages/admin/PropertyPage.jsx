import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { apiFetch, uploadMedia } from '../../lib/api'
import ServicesSection from './ServicesSection'
import GallerySection from './GallerySection'
import RestaurantSection from './RestaurantSection'

const FIELDS = [
  { key: 'name', label: 'Nome struttura', type: 'text' },
  { key: 'description', label: 'Descrizione', type: 'textarea' },
  { key: 'address', label: 'Indirizzo', type: 'text' },
  { key: 'phone', label: 'Telefono', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'wifi_name', label: 'Nome WiFi', type: 'text' },
  { key: 'wifi_password', label: 'Password WiFi', type: 'text' },
  { key: 'checkin_time', label: 'Check-in', type: 'text', placeholder: 'es. 14:00' },
  { key: 'checkout_time', label: 'Check-out', type: 'text', placeholder: 'es. 11:00' },
  { key: 'rules', label: 'Regole della struttura', type: 'textarea' },
]

const MODULE_DEFS = [
  { key: 'info',         label: 'Informazioni struttura',  desc: "Tab Info nell'app ospite" },
  { key: 'wifi',         label: 'WiFi',                    desc: 'Tab WiFi con credenziali' },
  { key: 'reception',    label: 'Richieste alla reception', desc: "Tab Richiesta nell'app ospite" },
  { key: 'housekeeping', label: 'Housekeeping / Pulizie',  desc: 'Richieste di pulizia camera' },
]

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

const DEFAULT_THEME = {
  primaryColor: '#00b5b5',
  bgColor: '#ffffff',
  textColor: '#1a1a2e',
  fontHeading: 'playfair',
  fontBody: 'inter',
  headerStyle: 'solid',
  borderStyle: 'mixed',
}

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
  { key: 'playfair',   label: 'Playfair Display', family: "'Playfair Display', Georgia, serif",         desc: 'Elegante serif' },
  { key: 'cormorant',  label: 'Cormorant Garamond',family: "'Cormorant Garamond', Georgia, serif",       desc: 'Lusso raffinato' },
  { key: 'raleway',    label: 'Raleway',           family: "'Raleway', system-ui, sans-serif",            desc: 'Geometrico slim' },
  { key: 'montserrat', label: 'Montserrat',        family: "'Montserrat', system-ui, sans-serif",         desc: 'Moderno forte' },
  { key: 'nunito',     label: 'Nunito',            family: "'Nunito', system-ui, sans-serif",             desc: 'Friendly rotondo' },
  { key: 'dm-sans',    label: 'DM Sans',           family: "'DM Sans', system-ui, sans-serif",            desc: 'Minimal contemporaneo' },
]

const BODY_FONTS = [
  { key: 'inter',      label: 'Inter',      family: "'Inter', system-ui, sans-serif",   desc: 'Leggibile, neutro' },
  { key: 'lato',       label: 'Lato',       family: "'Lato', system-ui, sans-serif",    desc: 'Caldo, umano' },
  { key: 'open-sans',  label: 'Open Sans',  family: "'Open Sans', system-ui, sans-serif", desc: 'Classico digitale' },
]

const HEADER_STYLES = [
  { key: 'solid',    label: 'Solido',    desc: 'Header colorato' },
  { key: 'gradient', label: 'Gradiente', desc: 'Da colore a trasparente' },
  { key: 'cover',    label: 'Cover',     desc: 'Foto di sfondo' },
]

const BORDER_STYLES = [
  { key: 'rounded', label: 'Arrotondato', desc: '16px', radius: 16 },
  { key: 'mixed',   label: 'Misto',       desc: '8px',  radius: 8  },
  { key: 'square',  label: 'Squadrato',   desc: '0px',  radius: 0  },
]

const ADMIN_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Lato:wght@400;600&family=Open+Sans:wght@400;600&family=Playfair+Display:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=Raleway:wght@400;600&family=Montserrat:wght@400;600&family=Nunito:wght@400;600&family=DM+Sans:wght@400;600&display=swap'

function getHeadingFamily(key) {
  return HEADING_FONTS.find(f => f.key === key)?.family || HEADING_FONTS[0].family
}
function getBodyFamily(key) {
  return BODY_FONTS.find(f => f.key === key)?.family || BODY_FONTS[0].family
}
function getBorderRadius(key) {
  return BORDER_STYLES.find(s => s.key === key)?.radius ?? 8
}


// ─── Live Preview ─────────────────────────────────────────────────────────────
function ThemePreview({ theme, property }) {
  const primary   = theme.primaryColor
  const bg        = theme.bgColor
  const textColor = theme.textColor
  const radius    = getBorderRadius(theme.borderStyle)
  const headingFamily = getHeadingFamily(theme.fontHeading)
  const bodyFamily    = getBodyFamily(theme.fontBody)
  const isDark    = bg === '#1a1a2e'

  const cardBg  = isDark ? '#2a2a3e' : '#f5f5f5'
  const subText = isDark ? '#aaa' : '#666'

  function HeaderArea() {
    const name = property?.name || 'Nome struttura'
    const identity = (
      <div style={{ textAlign: 'center' }}>
        {property?.logo_url && (
          <img key={property.logo_url} src={property.logo_url} alt="logo"
            style={{ maxHeight: 28, maxWidth: 80, objectFit: 'contain', display: 'block', margin: '0 auto 5px' }} />
        )}
        <div style={{ fontFamily: headingFamily, fontWeight: 700, fontSize: 12, color: '#fff' }}>{name}</div>
      </div>
    )

    if (property?.cover_url) {
      return (
        <div style={{ position: 'relative', height: 72, overflow: 'hidden', flexShrink: 0 }}>
          <img src={property.cover_url} alt="cover"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.6) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 10px 8px' }}>
            {identity}
          </div>
        </div>
      )
    }

    const headerBg = theme.headerStyle === 'gradient'
      ? `linear-gradient(135deg, ${primary} 0%, ${primary}99 100%)`
      : primary
    return (
      <div style={{ background: headerBg, padding: '14px 10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {identity}
      </div>
    )
  }

  return (
    <div style={{ position: 'sticky', top: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10, textAlign: 'center' }}>Anteprima live</div>
      {/* Phone frame */}
      <div style={{
        width: 200, margin: '0 auto',
        border: '6px solid #1a1a2e', borderRadius: 32,
        overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        background: bg, fontFamily: bodyFamily,
      }}>
        <HeaderArea />

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`, background: bg }}>
          {['Info', 'WiFi', 'Richiesta'].map((t, i) => (
            <div key={t} style={{
              flex: 1, padding: '7px 0', fontSize: 8, textAlign: 'center', fontWeight: i === 0 ? 700 : 400,
              color: i === 0 ? primary : subText,
              borderBottom: i === 0 ? `2px solid ${primary}` : '2px solid transparent',
            }}>{t}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '10px 10px 14px', background: bg, color: textColor }}>
          <div style={{ fontSize: 9, fontFamily: headingFamily, fontWeight: 700, marginBottom: 8, color: textColor }}>
            Informazioni
          </div>
          <div style={{ background: cardBg, borderRadius: radius / 2, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ fontSize: 7, color: subText }}>Check-in</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: textColor }}>14:00</div>
          </div>
          <div style={{ background: cardBg, borderRadius: radius / 2, padding: '8px 10px', marginBottom: 10 }}>
            <div style={{ fontSize: 7, color: subText }}>Check-out</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: textColor }}>11:00</div>
          </div>
          <div style={{
            background: primary, color: '#fff', textAlign: 'center',
            padding: '6px', borderRadius: radius / 2, fontSize: 8, fontWeight: 600,
          }}>
            Invia richiesta
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertyPage() {
  const { profile } = useAuth()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [togglingKey, setTogglingKey] = useState(null)
  const [uploading, setUploading] = useState({})

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = ADMIN_FONTS_URL
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  useEffect(() => {
    if (profile?.property_id) fetchProperty()
  }, [profile])

  async function fetchProperty() {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('id', profile.property_id)
      .single()
    if (data) setForm(data)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const allowed = FIELDS.map(f => f.key)
    const updates = Object.fromEntries(Object.entries(form).filter(([k]) => allowed.includes(k)))
    try {
      await apiFetch(`/api/properties/${profile.property_id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e.message || 'Errore nel salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  async function handleModuleToggle(key) {
    const currentModules = { ...DEFAULT_MODULES, ...(form.modules || {}) }
    const newModules = { ...currentModules, [key]: !currentModules[key] }
    setForm(f => ({ ...f, modules: newModules }))
    setTogglingKey(key)
    try {
      await apiFetch(`/api/properties/${profile.property_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ modules: newModules }),
      })
    } catch (e) {
      setForm(f => ({ ...f, modules: currentModules }))
      alert(`Errore nel salvataggio del modulo: ${e.message}`)
    } finally {
      setTogglingKey(null)
    }
  }

  async function handleThemeSave(newTheme) {
    setForm(f => ({ ...f, theme: newTheme }))
    try {
      await apiFetch(`/api/properties/${profile.property_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ theme: newTheme }),
      })
    } catch (e) {
      alert(`Errore nel salvataggio del tema: ${e.message}`)
    }
  }

  async function handleUpload(field, file) {
    if (!file) return
    setUploading(u => ({ ...u, [field]: true }))
    try {
      const type = field === 'logo_url' ? 'logo' : 'cover'
      const { url } = await uploadMedia(`/api/upload/${type}`, file)
      setForm(f => ({ ...f, [field]: url }))
    } catch (e) {
      alert(`Errore upload: ${e.message}`)
    } finally {
      setUploading(u => ({ ...u, [field]: false }))
    }
  }

  async function handleJsonSave(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    try {
      await apiFetch(`/api/properties/${profile.property_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      })
    } catch (e) {
      alert(`Errore nel salvataggio: ${e.message}`)
    }
  }

  async function removeMedia(field) {
    const type = field === 'logo_url' ? 'logo' : 'cover'
    setForm(f => ({ ...f, [field]: null }))
    try {
      await apiFetch(`/api/upload/${type}`, { method: 'DELETE' })
    } catch (e) {
      alert(`Errore rimozione: ${e.message}`)
    }
  }

  const modules = { ...DEFAULT_MODULES, ...(form.modules || {}) }
  const theme   = { ...DEFAULT_THEME, ...(form.theme || {}) }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* Left column: all controls */}
      <div>
        <h2 style={{ marginTop: 0, gridColumn: '1/-1' }}>La mia struttura</h2>

        {/* Dati struttura */}
        <form onSubmit={handleSave} style={cardStyle}>
          <h3 style={cardTitleStyle}>Dati struttura</h3>
          {FIELDS.map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{label}</label>
              {type === 'textarea' ? (
                <textarea
                  value={form[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={3}
                  style={textareaStyle}
                />
              ) : (
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
          {saveError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{saveError}</p>}
          <button type="submit" disabled={saving} style={primaryBtnStyle}>
            {saving ? 'Salvataggio…' : saved ? 'Salvato!' : 'Salva'}
          </button>
        </form>

        {/* Moduli */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Moduli attivi</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Attiva o disattiva le funzionalità visibili agli ospiti.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {MODULE_DEFS.map(({ key, label, desc }, i) => {
              const isOn = modules[key]
              const isToggling = togglingKey === key
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < MODULE_DEFS.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => !isToggling && handleModuleToggle(key)}
                    disabled={isToggling}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', padding: 0,
                      background: isOn ? '#1a1a2e' : '#ddd',
                      position: 'relative', cursor: isToggling ? 'default' : 'pointer',
                      flexShrink: 0, transition: 'background 0.2s', opacity: isToggling ? 0.6 : 1,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: isOn ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', display: 'block',
                    }} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Servizi */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Servizi</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Aggiungi i servizi disponibili per gli ospiti con icona e orari.</p>
          <ServicesSection
            services={form.services || []}
            onChange={v => handleJsonSave('services', v)}
          />
        </div>

        {/* Galleria */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Galleria foto</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Aggiungi fino a 10 foto della struttura visibili nell'app ospite.</p>
          <GallerySection
            gallery={form.gallery || []}
            onChange={v => handleJsonSave('gallery', v)}
          />
        </div>

        {/* Ristorante */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Ristorante / Menù</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Crea il menù digitale con categorie e piatti.</p>
          <RestaurantSection
            restaurant={form.restaurant || { active: false, categories: [] }}
            onChange={v => handleJsonSave('restaurant', v)}
          />
        </div>

        {/* Aspetto e tema */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Aspetto e tema</h3>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888' }}>Personalizza l'aspetto dell'app ospite. Le modifiche sono visibili nell'anteprima a destra.</p>

          {/* Primary color */}
          <Section label="Colore principale">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="color"
                value={theme.primaryColor}
                onChange={e => setForm(f => ({ ...f, theme: { ...theme, primaryColor: e.target.value } }))}
                onBlur={e => handleThemeSave({ ...theme, primaryColor: e.target.value })}
                style={{ width: 52, height: 52, border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', padding: 3, background: 'none' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{theme.primaryColor.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Header, pulsanti, tab attivi</div>
              </div>
            </div>
          </Section>

          {/* BG color */}
          <Section label="Sfondo app">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {BG_COLORS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => handleThemeSave({ ...theme, bgColor: value })}
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    background: value,
                    border: theme.bgColor === value ? `3px solid ${theme.primaryColor}` : '2px solid #ddd',
                  }}
                />
              ))}
            </div>
          </Section>

          {/* Text color */}
          <Section label="Colore testo">
            <div style={{ display: 'flex', gap: 8 }}>
              {TEXT_COLORS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleThemeSave({ ...theme, textColor: value })}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    background: value, color: value === '#ffffff' ? '#333' : '#fff',
                    border: theme.textColor === value ? `2px solid ${theme.primaryColor}` : '2px solid #ddd',
                    fontWeight: theme.textColor === value ? 700 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Heading font */}
          <Section label="Font titoli">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {HEADING_FONTS.map(({ key, label, family, desc }) => {
                const isSel = theme.fontHeading === key
                return (
                  <button key={key} type="button"
                    onClick={() => handleThemeSave({ ...theme, fontHeading: key })}
                    style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`,
                      background: isSel ? `${theme.primaryColor}12` : '#fafafa',
                    }}
                  >
                    <div style={{ fontFamily: family, fontSize: 15, fontWeight: 600, color: '#222', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Body font */}
          <Section label="Font testo">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {BODY_FONTS.map(({ key, label, family, desc }) => {
                const isSel = theme.fontBody === key
                return (
                  <button key={key} type="button"
                    onClick={() => handleThemeSave({ ...theme, fontBody: key })}
                    style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`,
                      background: isSel ? `${theme.primaryColor}12` : '#fafafa',
                    }}
                  >
                    <div style={{ fontFamily: family, fontSize: 14, fontWeight: 600, color: '#222', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Header style */}
          <Section label="Stile header">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {HEADER_STYLES.map(({ key, label, desc }) => {
                const isSel = theme.headerStyle === key
                return (
                  <button key={key} type="button"
                    onClick={() => handleThemeSave({ ...theme, headerStyle: key })}
                    style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`,
                      background: isSel ? `${theme.primaryColor}12` : '#fafafa',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Border style */}
          <Section label="Stile bordi">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {BORDER_STYLES.map(({ key, label, desc, radius }) => {
                const isSel = theme.borderStyle === key
                return (
                  <button key={key} type="button"
                    onClick={() => handleThemeSave({ ...theme, borderStyle: key })}
                    style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${isSel ? theme.primaryColor : '#e8e8e8'}`,
                      background: isSel ? `${theme.primaryColor}12` : '#fafafa',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Logo upload */}
          <Section label="Logo struttura">
            {form.logo_url && (
              <div style={{ marginBottom: 10, padding: 12, background: '#f5f5f5', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <img
                  key={form.logo_url}
                  src={form.logo_url}
                  alt="logo"
                  style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', display: 'block' }}
                />
                <button type="button" onClick={() => removeMedia('logo_url')}
                  style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Rimuovi
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ padding: '8px 16px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333' }}>
                {uploading.logo_url ? 'Upload…' : form.logo_url ? 'Cambia logo' : 'Carica logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handleUpload('logo_url', e.target.files[0])} />
              </label>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#aaa' }}>Consigliato: 300×100 px, max 200 KB, PNG con sfondo trasparente</p>
          </Section>

          {/* Cover photo upload */}
          <Section label="Foto di copertina" style={{ marginBottom: 0 }}>
            {form.cover_url && (
              <div style={{ marginBottom: 10, position: 'relative' }}>
                <img
                  key={form.cover_url}
                  src={form.cover_url}
                  alt="cover"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid #ddd' }}
                />
                <button type="button" onClick={() => removeMedia('cover_url')}
                  style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 10px' }}>
                  Rimuovi
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ padding: '8px 16px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333' }}>
                {uploading.cover_url ? 'Upload…' : form.cover_url ? 'Cambia foto' : 'Carica foto'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handleUpload('cover_url', e.target.files[0])} />
              </label>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#aaa' }}>Consigliato: 1200×400 px, max 1 MB — usata per gli stili header "Gradiente" e "Cover"</p>
          </Section>
        </div>
      </div>

      {/* Right column: sticky preview */}
      <div>
        <h2 style={{ marginTop: 0, visibility: 'hidden' }}>Preview</h2>
        <ThemePreview theme={theme} property={form} />
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Section({ label, children, style }) {
  return (
    <div style={{ marginBottom: 24, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

const cardStyle = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }
const cardTitleStyle = { marginTop: 0, marginBottom: 20, fontSize: 15 }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const textareaStyle = { ...inputStyle, resize: 'vertical' }
const primaryBtnStyle = { padding: '10px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
