import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'
import { ExternalLink, Plus, Trash2, Waves, Sparkles, Utensils, Activity, Car, Wifi, Umbrella, Music, Wine, Coffee, Bell, Bus, Star, Mountain, Wind, Heart, Award, MapPin, Clock } from 'lucide-react'

const DEFAULT_SECTIONS = { gallery: true, menu_preview: true }
const DEFAULT_SOCIAL   = { instagram: '', facebook: '', tripadvisor: '', whatsapp: '' }
const DEFAULT = {
  active: false, tagline: '', booking_url: '', seo_title: '', seo_description: '',
  video_url: '',
  sections: DEFAULT_SECTIONS, social: DEFAULT_SOCIAL, highlights: [],
  stats: [], promozioni: [], testimonianze: [], faq: [],
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
        sections:      { ...DEFAULT_SECTIONS, ...(s.sections   || {}) },
        social:        { ...DEFAULT_SOCIAL,   ...(s.social     || {}) },
        highlights:    s.highlights    || [],
        stats:         s.stats         || [],
        promozioni:    s.promozioni    || [],
        testimonianze: s.testimonianze || [],
        faq:           s.faq           || [],
        video_url:     s.video_url     || '',
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

  function addStat() {
    const updated = { ...form, stats: [...(form.stats || []), { id: crypto.randomUUID(), value: '', label: '' }] }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updateStat(id, p) {
    const updated = { ...form, stats: form.stats.map(s => s.id === id ? { ...s, ...p } : s) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removeStat(id) {
    const updated = { ...form, stats: form.stats.filter(s => s.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function addPromo() {
    const updated = { ...form, promozioni: [...(form.promozioni || []), { id: crypto.randomUUID(), badge: '', title: '', text: '', cta_label: '', cta_url: '', expires_at: '' }] }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updatePromo(id, p) {
    const updated = { ...form, promozioni: form.promozioni.map(x => x.id === id ? { ...x, ...p } : x) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removePromo(id) {
    const updated = { ...form, promozioni: form.promozioni.filter(x => x.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }

  function addTestimonianza() {
    const updated = { ...form, testimonianze: [...(form.testimonianze || []), { id: crypto.randomUUID(), author: '', location: '', rating: 5, text: '' }] }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updateTestimonianza(id, patch) {
    const updated = { ...form, testimonianze: form.testimonianze.map(t => t.id === id ? { ...t, ...patch } : t) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removeTestimonianza(id) {
    const updated = { ...form, testimonianze: form.testimonianze.filter(t => t.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }

  function addFaq() {
    const updated = { ...form, faq: [...(form.faq || []), { id: crypto.randomUUID(), question: '', answer: '' }] }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updateFaq(id, patch) {
    const updated = { ...form, faq: form.faq.map(f => f.id === id ? { ...f, ...patch } : f) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removeFaq(id) {
    const updated = { ...form, faq: form.faq.filter(f => f.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }

  function handleSubmit(e) {
    e.preventDefault()
    save({ minisito: form }).catch(() => {})
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  const landingUrl = `${window.location.origin}/r/${ristorante.slug}`

  const SECTION_ITEMS = [
    { key: 'gallery',      label: 'Galleria foto',  hint: `${(ristorante.gallery || []).length} foto caricate` },
    { key: 'menu_preview', label: 'Anteprima menu', hint: `${(ristorante.menu    || []).length} categorie nel menu` },
    { key: 'show_map',     label: 'Mappa',           hint: ristorante.address ? `Mappa di: ${ristorante.address}` : 'Aggiungi un indirizzo nelle informazioni ristorante' },
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
          <label style={lblStyle}>Video (YouTube o Vimeo)</label>
          <input type="url" value={form.video_url}
            onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="https://www.youtube.com/watch?v=..."
            style={inputStyle} />
          <span style={hintStyle}>Incolla il link del video. Appare come sezione dedicata nel minisito.</span>
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

      {/* Stats */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Numeri in evidenza</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Fino a 4 numeri mostrati in una banda d'impatto (es. "500+ Coperti a settimana", "Michelin 2024").
        </p>
        {(form.stats || []).map(s => (
          <StatItem key={s.id} item={s} onPatch={p => updateStat(s.id, p)} onRemove={() => removeStat(s.id)} />
        ))}
        {(form.stats || []).length < 4 && (
          <button onClick={addStat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#e63946', background: '#fff0f1', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi numero
          </button>
        )}
      </div>

      {/* Promozioni */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Offerte e promozioni</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Card promo con CTA. Se imposti una scadenza, la card sparisce automaticamente dopo quella data.
        </p>
        {(form.promozioni || []).map(p => (
          <PromoItem key={p.id} item={p} accentColor="#e63946" onPatch={x => updatePromo(p.id, x)} onRemove={() => removePromo(p.id)} />
        ))}
        <button onClick={addPromo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#e63946', background: '#fff0f1', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
          <Plus size={14} strokeWidth={2.5} /> Aggiungi offerta
        </button>
      </div>

      {/* Testimonianze */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Testimonianze clienti</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Inserisci recensioni reali dei tuoi clienti. Vengono mostrate come card nel minisito.
        </p>
        {(form.testimonianze || []).map(t => (
          <TestimonianzaItem key={t.id} item={t} accentColor="#e63946"
            onPatch={p => updateTestimonianza(t.id, p)}
            onRemove={() => removeTestimonianza(t.id)} />
        ))}
        {(form.testimonianze || []).length < 10 && (
          <button onClick={addTestimonianza} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#e63946', background: '#fff0f1', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi testimonianza
          </button>
        )}
      </div>

      {/* FAQ */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Domande frequenti (FAQ)</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Rispondi alle domande più comuni. Appaiono come accordion nel minisito.
        </p>
        {(form.faq || []).map((f, i) => (
          <FaqItem key={f.id} item={f}
            onPatch={p => updateFaq(f.id, p)}
            onRemove={() => removeFaq(f.id)}
            borderBottom={i < form.faq.length - 1} />
        ))}
        <button onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#e63946', background: '#fff0f1', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 12 }}>
          <Plus size={14} strokeWidth={2.5} /> Aggiungi domanda
        </button>
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

function StatItem({ item, onPatch, onRemove }) {
  const [value, setValue] = useState(item.value)
  const [label, setLabel] = useState(item.label)
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <input value={value} onChange={e => setValue(e.target.value)} onBlur={() => onPatch({ value })}
        placeholder="es. 500+" style={{ ...inputStyle, flex: '0 0 110px', fontWeight: 700, textAlign: 'center' }} />
      <input value={label} onChange={e => setLabel(e.target.value)} onBlur={() => onPatch({ label })}
        placeholder="es. Coperti a settimana" style={{ ...inputStyle, flex: 1 }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4, flexShrink: 0 }}>
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}

function PromoItem({ item, onPatch, onRemove }) {
  const [badge,     setBadge]     = useState(item.badge)
  const [title,     setTitle]     = useState(item.title)
  const [text,      setText]      = useState(item.text)
  const [ctaLabel,  setCtaLabel]  = useState(item.cta_label)
  const [ctaUrl,    setCtaUrl]    = useState(item.cta_url)
  const [expiresAt, setExpiresAt] = useState(item.expires_at)
  return (
    <div style={{ background: '#f9f9fb', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Badge (opzionale)</label>
          <input value={badge} onChange={e => setBadge(e.target.value)} onBlur={() => onPatch({ badge })}
            placeholder="es. Offerta limitata" style={inputStyle} />
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Scadenza (opzionale)</label>
          <input type="date" value={expiresAt} onChange={e => { setExpiresAt(e.target.value); onPatch({ expires_at: e.target.value }) }}
            style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Titolo offerta *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => onPatch({ title })}
          placeholder="es. Menu degustazione primavera" style={{ ...inputStyle, fontWeight: 600 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Descrizione</label>
        <input value={text} onChange={e => setText(e.target.value)} onBlur={() => onPatch({ text })}
          placeholder="es. 5 portate con abbinamento vini selezionati" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: '0 0 160px' }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Testo pulsante</label>
          <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} onBlur={() => onPatch({ cta_label: ctaLabel })}
            placeholder="es. Prenota ora" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Link pulsante</label>
          <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} onBlur={() => onPatch({ cta_url: ctaUrl })}
            placeholder="https://..." style={inputStyle} />
        </div>
      </div>
      <button onClick={onRemove} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, padding: 0 }}>
        <Trash2 size={13} strokeWidth={1.5} /> Rimuovi offerta
      </button>
    </div>
  )
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: n <= value ? '#f59e0b' : '#ddd', fontSize: 18, lineHeight: 1 }}>
          ★
        </button>
      ))}
    </div>
  )
}

function TestimonianzaItem({ item, onPatch, onRemove, accentColor = '#1a1a2e' }) {
  const [author,   setAuthor]   = useState(item.author)
  const [location, setLocation] = useState(item.location)
  const [text,     setText]     = useState(item.text)
  return (
    <div style={{ background: '#f9f9fb', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Nome cliente</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} onBlur={() => onPatch({ author })}
            placeholder="es. Marco R." style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Provenienza (opzionale)</label>
          <input value={location} onChange={e => setLocation(e.target.value)} onBlur={() => onPatch({ location })}
            placeholder="es. Milano" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 6 }}>Valutazione</label>
        <StarRating value={item.rating} onChange={r => onPatch({ rating: r })} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Testo recensione</label>
        <textarea value={text} onChange={e => setText(e.target.value)} onBlur={() => onPatch({ text })}
          rows={3} placeholder="es. Cucina straordinaria, atmosfera unica…"
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <button onClick={onRemove} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, padding: 0 }}>
        <Trash2 size={13} strokeWidth={1.5} /> Rimuovi
      </button>
    </div>
  )
}

function FaqItem({ item, onPatch, onRemove, borderBottom }) {
  const [question, setQuestion] = useState(item.question)
  const [answer,   setAnswer]   = useState(item.answer)
  return (
    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: borderBottom ? '1px solid #f0f0f0' : 'none' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} onBlur={() => onPatch({ question })}
            placeholder="es. È possibile prenotare il tavolo online?" style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }} />
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} onBlur={() => onPatch({ answer })}
            rows={2} placeholder="es. Sì, puoi prenotare tramite il pulsante in alto o chiamarci direttamente."
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 6, flexShrink: 0, marginTop: 2 }}>
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
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
