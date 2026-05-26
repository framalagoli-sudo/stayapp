import { useEffect, useRef, useState } from 'react'
import { Home, Layers, Images, Phone, MapPin, Mail, Clock, Send, Check } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import CookieBanner from '../../components/CookieBanner'
import ChatbotWidget from '../../components/ChatbotWidget'

const FONT_URLS = {
  playfair:    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  cormorant:   'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap',
  raleway:     'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap',
  montserrat:  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
  nunito:      'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  'dm-sans':   'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
  inter:       'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  lato:        'https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
}
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
const BORDER_RADII = { rounded: 16, mixed: 8, square: 0 }

function loadFont(key) {
  if (!key || !FONT_URLS[key]) return
  const id = `gfont-${key}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = FONT_URLS[key]
  document.head.appendChild(link)
}

function buildWaUrl(wa, name) {
  if (!wa) return null
  const clean = wa.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
  return `https://wa.me/${clean}?text=${encodeURIComponent(`Ciao! Ho visto ${name} e vorrei saperne di più. `)}`
}

export default function AttivitaPWA({ attivita }) {
  const mods = attivita.pwa?.modules || {}
  const theme = { primaryColor: '#1a1a2e', bgColor: '#ffffff', textColor: '#1a1a2e', fontHeading: 'playfair', fontBody: 'inter', borderStyle: 'mixed', ...(attivita.theme || {}) }
  const br = BORDER_RADII[theme.borderStyle] ?? 8
  const primary = theme.primaryColor

  useEffect(() => { loadFont(theme.fontHeading); loadFont(theme.fontBody) }, [theme.fontHeading, theme.fontBody])

  const NAV_ITEMS = [
    { key: 'home',     Icon: Home,   label: 'Home' },
    mods.servizi  !== false && { key: 'servizi',  Icon: Layers, label: 'Servizi' },
    mods.galleria !== false && { key: 'galleria', Icon: Images, label: 'Galleria' },
    mods.contatta !== false && { key: 'contatta', Icon: Phone,  label: 'Contatta' },
  ].filter(Boolean)

  const [tab, setTab] = useState('home')
  const scrollRef = useRef(null)

  useEffect(() => { scrollRef.current?.scrollTo(0, 0) }, [tab])

  const headingFont = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const bodyFont    = BODY_FAMILIES[theme.fontBody]       || BODY_FAMILIES.inter

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: theme.bgColor, color: theme.textColor,
      fontFamily: bodyFont, maxWidth: 480, margin: '0 auto',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
    }}>
      {/* scroll area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tab === 'home'     && <HomeTab     attivita={attivita} primary={primary} headingFont={headingFont} bodyFont={bodyFont} br={br} />}
        {tab === 'servizi'  && <ServiziTab  attivita={attivita} primary={primary} headingFont={headingFont} bodyFont={bodyFont} br={br} />}
        {tab === 'galleria' && <GalleriaTab attivita={attivita} primary={primary} headingFont={headingFont} br={br} />}
        {tab === 'contatta' && <ContattaTab attivita={attivita} primary={primary} headingFont={headingFont} bodyFont={bodyFont} br={br} />}
      </div>

      {/* bottom nav */}
      <nav style={{
        display: 'flex', borderTop: '1px solid #eee',
        background: '#fff', flexShrink: 0,
      }}>
        {NAV_ITEMS.map(({ key, Icon, label }) => {
          const active = tab === key
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, border: 'none', background: 'none', padding: '10px 4px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              cursor: 'pointer', color: active ? primary : '#aaa',
              transition: 'color 0.15s',
            }}>
              <Icon size={22} strokeWidth={1.5} color={active ? primary : '#aaa'} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
            </button>
          )
        })}
      </nav>

      <CookieBanner slug={attivita.slug} entityType="attivita" />
      {attivita.chatbot?.active && <ChatbotWidget chatbot={attivita.chatbot} fixed={false} />}
    </div>
  )
}

// ─── Tab: Home ────────────────────────────────────────────────────────────────
function HomeTab({ attivita, primary, headingFont, bodyFont, br }) {
  return (
    <div>
      {/* Hero */}
      {attivita.cover_url ? (
        <div style={{ position: 'relative', height: 220 }}>
          <img src={attivita.cover_url} alt={attivita.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))' }} />
          {attivita.logo_url && (
            <img src={attivita.logo_url} alt="logo" style={{
              position: 'absolute', bottom: 16, left: 16,
              height: 52, maxWidth: 120, objectFit: 'contain',
              borderRadius: 8, background: 'rgba(255,255,255,0.9)', padding: 6,
            }} />
          )}
        </div>
      ) : (
        <div style={{ background: primary, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {attivita.logo_url
            ? <img src={attivita.logo_url} alt="logo" style={{ maxHeight: 80, maxWidth: 160, objectFit: 'contain' }} />
            : <span style={{ color: '#fff', fontFamily: headingFont, fontSize: 24, fontWeight: 700 }}>{attivita.name}</span>}
        </div>
      )}

      <div style={{ padding: 20 }}>
        <h1 style={{ fontFamily: headingFont, fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#1a1a2e' }}>{attivita.name}</h1>
        {attivita.tipo && <p style={{ margin: '0 0 16px', fontSize: 13, color: primary, fontWeight: 600 }}>{attivita.tipo}</p>}

        {attivita.description && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#555', margin: '0 0 20px' }}>{attivita.description}</p>
        )}

        {/* Info rapide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {attivita.schedule && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Clock size={16} strokeWidth={1.5} color={primary} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: '#555' }}>{attivita.schedule}</span>
            </div>
          )}
          {attivita.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={16} strokeWidth={1.5} color={primary} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: '#555' }}>{attivita.address}</span>
            </div>
          )}
          {attivita.phone && (
            <a href={`tel:${attivita.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <Phone size={16} strokeWidth={1.5} color={primary} />
              <span style={{ fontSize: 13, color: '#555' }}>{attivita.phone}</span>
            </a>
          )}
          {attivita.email && (
            <a href={`mailto:${attivita.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <Mail size={16} strokeWidth={1.5} color={primary} />
              <span style={{ fontSize: 13, color: '#555' }}>{attivita.email}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Servizi ─────────────────────────────────────────────────────────────
function ServiziTab({ attivita, primary, headingFont, bodyFont, br }) {
  const servizi = attivita.services || []

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>Servizi</h2>

      {servizi.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessun servizio configurato.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {servizi.map((s, i) => (
            <div key={s.id || i} style={{
              background: '#fff', borderRadius: br, padding: '16px 18px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
              borderLeft: `3px solid ${primary}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: s.description || s.price ? 4 : 0 }}>{s.name}</div>
              {s.description && <p style={{ margin: '0 0 6px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>{s.description}</p>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {s.price != null && s.price !== '' && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: primary }}>€{s.price}</span>
                )}
                {s.hours && (
                  <span style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} strokeWidth={1.5} />{s.hours}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Galleria ────────────────────────────────────────────────────────────
function GalleriaTab({ attivita, primary, headingFont, br }) {
  const gallery = attivita.gallery || []
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>Galleria</h2>

      {gallery.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessuna foto disponibile.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {gallery.map((img, i) => (
            <img
              key={img.url || i}
              src={img.url}
              alt={img.caption || `Foto ${i + 1}`}
              onClick={() => setSelected(img)}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: br, cursor: 'pointer', display: 'block' }}
            />
          ))}
        </div>
      )}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <img src={selected.url} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}

// ─── Tab: Contatta ────────────────────────────────────────────────────────────
function ContattaTab({ attivita, primary, headingFont, bodyFont, br }) {
  const [form, setForm] = useState({ nome: '', email: '', messaggio: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const waUrl = buildWaUrl(attivita.minisito?.social?.whatsapp, attivita.name)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim() || !form.email.trim() || !form.messaggio.trim()) {
      setError('Compila tutti i campi.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await apiFetch('/api/guest/contact', {
        method: 'POST',
        body: JSON.stringify({ ...form, entity_tipo: 'attivita', entity_id: attivita.id, entity_slug: attivita.slug }),
      })
      setSent(true)
    } catch (e) {
      setError(e.message || 'Errore nell\'invio.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Contatta</h2>

      {/* CTA rapide */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {attivita.phone && (
          <a href={`tel:${attivita.phone}`} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: br, border: `1.5px solid ${primary}`,
            color: primary, fontWeight: 600, fontSize: 13, textDecoration: 'none',
          }}>
            <Phone size={15} strokeWidth={1.5} /> Chiama
          </a>
        )}
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: br, background: '#25d366',
            color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none',
          }}>
            <Send size={15} strokeWidth={1.5} /> WhatsApp
          </a>
        )}
        {attivita.email && (
          <a href={`mailto:${attivita.email}`} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: br, border: '1.5px solid #ddd',
            color: '#555', fontWeight: 600, fontSize: 13, textDecoration: 'none',
          }}>
            <Mail size={15} strokeWidth={1.5} /> Email
          </a>
        )}
      </div>

      {/* Form messaggio */}
      {sent ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Check size={26} color="#059669" strokeWidth={2} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>Messaggio inviato!</p>
          <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Ti risponderemo al più presto.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={lblStyle}>Nome</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Il tuo nome" style={inputStyle(br)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lblStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="La tua email" style={inputStyle(br)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>Messaggio</label>
            <textarea value={form.messaggio} onChange={e => setForm(f => ({ ...f, messaggio: e.target.value }))}
              rows={4} placeholder="Come possiamo aiutarti?" style={{ ...inputStyle(br), resize: 'vertical' }} />
          </div>
          {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <button type="submit" disabled={sending} style={{
            width: '100%', padding: '13px', background: primary, color: '#fff',
            border: 'none', borderRadius: br, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            {sending ? 'Invio…' : 'Invia messaggio'}
          </button>
        </form>
      )}
    </div>
  )
}

const lblStyle  = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle = (br) => ({
  width: '100%', padding: '11px 13px', borderRadius: br,
  border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box',
  fontFamily: 'inherit',
})
