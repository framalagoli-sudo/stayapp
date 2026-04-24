import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'
import { ExternalLink, Plus, Trash2, Waves, Sparkles, Utensils, Activity, Car, Wifi, Umbrella, Music, Wine, Coffee, Bell, Bus, Star, Mountain, Wind, Heart, Award, MapPin, Clock } from 'lucide-react'

const DEFAULT_SECTIONS = { gallery: true, menu_preview: true }
const DEFAULT_SOCIAL   = { instagram: '', facebook: '', tripadvisor: '', whatsapp: '' }
const DEFAULT = {
  active: false, tagline: '', booking_url: '', seo_title: '', seo_description: '',
  sections: DEFAULT_SECTIONS, social: DEFAULT_SOCIAL, highlights: [],
}

const HIGHLIGHT_ICONS = [
  { key: 'star',       Icon: Star,      label: 'Stella' },
  { key: 'heart',      Icon: Heart,     label: 'Cuore' },
  { key: 'award',      Icon: Award,     label: 'Premio' },
  { key: 'restaurant', Icon: Utensils,  label: 'Cucina' },
  { key: 'wine',       Icon: Wine,      label: 'Vini' },
  { key: 'breakfast',  Icon: Coffee,    label: 'Caffè' },
  { key: 'music',      Icon: Music,     label: 'Musica' },
  { key: 'location',   Icon: MapPin,    label: 'Posizione' },
  { key: 'time',       Icon: Clock,     label: 'Orario' },
  { key: 'parking',    Icon: Car,       label: 'Parcheggio' },
  { key: 'ac',         Icon: Wind,      label: 'Climatizzato' },
  { key: 'wifi',       Icon: Wifi,      label: 'Wi-Fi' },
  { key: 'reception',  Icon: Bell,      label: 'Servizio' },
  { key: 'shuttle',    Icon: Bus,       label: 'Navetta' },
]
const ICON_MAP = Object.fromEntries(HIGHLIGHT_ICONS.map(({ key, Icon }) => [key, Icon]))

export default function RistoranteMiniSitoPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, save } = useRistorante(id)
  const [form, setForm] = useState(DEFAULT)

  useEffect(() => {
    if (ristorante) {
      const s = ristorante.minisito || {}
      setForm({
        ...DEFAULT, ...s,
        sections:   { ...DEFAULT_SECTIONS, ...(s.sections   || {}) },
        social:     { ...DEFAULT_SOCIAL,   ...(s.social     || {}) },
        highlights: s.highlights || [],
      })
    }
  }, [ristorante])

  function patch(key, value) {
    const updated = { ...form, [key]: value }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }

  function patchSection(key, value) {
    const updated = { ...form, sections: { ...form.sections, [key]: value } }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }

  function addHighlight() {
    const updated = { ...form, highlights: [...(form.highlights || []), { id: crypto.randomUUID(), icon: 'star', text: '' }] }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }

  function updateHighlight(id, patch) {
    const updated = { ...form, highlights: form.highlights.map(h => h.id === id ? { ...h, ...patch } : h) }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }

  function removeHighlight(id) {
    const updated = { ...form, highlights: form.highlights.filter(h => h.id !== id) }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }

  function handleSubmit(e) {
    e.preventDefault()
    save({ minisito: form }).catch(() => {})
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  const landingUrl = `${window.location.origin}/r/${ristorante.slug}`

  const SECTION_ITEMS = [
    { key: 'gallery',      label: 'Galleria foto',    hint: `${(ristorante.gallery || []).length} foto caricate` },
    { key: 'menu_preview', label: 'Anteprima menu',   hint: `${(ristorante.menu    || []).length} categorie nel menu` },
  ]

  const SOCIAL_ITEMS = [
    { key: 'instagram',   label: 'Instagram',   placeholder: 'https://instagram.com/nomeprofilo' },
    { key: 'facebook',    label: 'Facebook',    placeholder: 'https://facebook.com/nomepagina' },
    { key: 'tripadvisor', label: 'TripAdvisor', placeholder: 'https://tripadvisor.it/Restaurant-...' },
    { key: 'whatsapp',    label: 'WhatsApp',    placeholder: 'https://wa.me/39...' },
  ]

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Minisito pubblico</h2>
        {form.active && ristorante.slug && (
          <a href={landingUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#e63946', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: '#e6394610', borderRadius: 8 }}>
            <ExternalLink size={13} strokeWidth={2} />
            Anteprima
          </a>
        )}
      </div>
      <p style={descStyle}>
        Una landing page pubblica e indicizzabile da Google. Quando attivo, chi visita l'URL del ristorante
        vede il minisito invece dell'app menu.
      </p>

      {/* Toggle attivo */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Minisito attivo</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
              {form.active ? `Visibile su ${landingUrl}` : 'Disattivo — i visitatori vedono il menu digitale'}
            </div>
          </div>
          <Toggle value={form.active} onChange={v => patch('active', v)} color="#e63946" />
        </div>
      </div>

      {/* Contenuto + SEO */}
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h3 style={sectionTitle}>Contenuto</h3>

        <div style={fieldWrap}>
          <label style={lblStyle}>Tagline</label>
          <input
            value={form.tagline}
            onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="es. Cucina tradizionale toscana dal 1985"
            style={inputStyle}
          />
        </div>

        <div style={fieldWrap}>
          <label style={lblStyle}>Link prenotazione tavolo</label>
          <input
            type="url"
            value={form.booking_url}
            onChange={e => setForm(f => ({ ...f, booking_url: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="https://www.thefork.it/ristorante/..."
            style={inputStyle}
          />
          <span style={hintStyle}>TheFork, sito proprietario, ecc. Appare come pulsante "Prenota un tavolo".</span>
        </div>

        <h3 style={{ ...sectionTitle, marginTop: 24 }}>SEO</h3>

        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo pagina (SEO title)</label>
          <input
            value={form.seo_title}
            onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder={`${ristorante.name} — Ristorante a ${ristorante.address || '...'}`}
            style={inputStyle}
          />
          <span style={hintStyle}>{form.seo_title.length}/60 caratteri consigliati</span>
        </div>

        <div style={{ ...fieldWrap, marginBottom: 0 }}>
          <label style={lblStyle}>Descrizione (meta description)</label>
          <textarea
            value={form.seo_description}
            onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            rows={3}
            placeholder="Breve descrizione che appare nei risultati di Google…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <span style={hintStyle}>{form.seo_description.length}/160 caratteri consigliati</span>
        </div>

        <button type="submit" disabled={saving} style={{ ...saveBtn, marginTop: 20 }}>
          {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva'}
        </button>
      </form>

      {/* Sezioni visibili */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Sezioni visibili</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Scegli quali contenuti mostrare. Vengono presi automaticamente dall'app.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {SECTION_ITEMS.map(({ key, label, hint }, i) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: i < SECTION_ITEMS.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{hint}</div>
              </div>
              <Toggle value={form.sections[key] !== false} onChange={v => patchSection(key, v)} color="#e63946" />
            </div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Punti di forza</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Fino a 6 card con icona e testo visualizzate in evidenza nel minisito (es. "Cucina a km zero", "Vini naturali").
        </p>
        {(form.highlights || []).map(h => {
          const Icon = ICON_MAP[h.icon] || Star
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <select
                value={h.icon}
                onChange={e => updateHighlight(h.id, { icon: e.target.value })}
                style={{ padding: '8px 6px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', cursor: 'pointer', flexShrink: 0 }}
              >
                {HIGHLIGHT_ICONS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff0f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={1.5} color="#e63946" />
              </div>
              <input
                value={h.text}
                onChange={e => { const t = e.target.value; setForm(f => ({ ...f, highlights: f.highlights.map(x => x.id === h.id ? { ...x, text: t } : x) })) }}
                onBlur={() => save({ minisito: form }).catch(() => {})}
                placeholder="es. Cucina a km zero, ingredienti locali"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => removeHighlight(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', flexShrink: 0, padding: 4 }}>
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          )
        })}
        {(form.highlights || []).length < 6 && (
          <button onClick={addHighlight} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#e63946', background: '#fff0f1', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi punto di forza
          </button>
        )}
      </div>

      {/* Social */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Social e link utili</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Appaiono come pulsanti nel footer del minisito. Lascia vuoti quelli non utilizzati.
        </p>
        {SOCIAL_ITEMS.map(({ key, label, placeholder }, i) => (
          <div key={key} style={{ marginBottom: i < SOCIAL_ITEMS.length - 1 ? 16 : 0 }}>
            <label style={lblStyle}>{label}</label>
            <input
              type="url"
              value={form.social[key]}
              onChange={e => setForm(f => ({ ...f, social: { ...f.social, [key]: e.target.value } }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder={placeholder}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Toggle({ value, onChange, color }) {
  return (
    <button type="button" onClick={() => onChange(!value)} style={{
      width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
      background: value ? color : '#ddd', position: 'relative', flexShrink: 0,
      transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', top: 4,
        left: value ? 28 : 4,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 20px', color: '#888', fontSize: 14, lineHeight: 1.6 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }
const sectionTitle = { margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#444' }
const fieldWrap    = { marginBottom: 18 }
const lblStyle     = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle   = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const hintStyle    = { fontSize: 11, color: '#aaa', marginTop: 4, display: 'block' }
const saveBtn      = { padding: '10px 28px', background: '#e63946', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
