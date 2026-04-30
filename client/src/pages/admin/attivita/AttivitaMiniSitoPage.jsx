import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'
import { uploadMedia } from '../../../lib/api'
import { ExternalLink, Star, Heart, Award, Wifi, Car, Sparkles, Activity, Umbrella, Music, Wine, Coffee, Bell, Bus, Wind, MapPin, Clock, Mountain, Users } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const PRIMARY = '#6b46c1'
const DEFAULT_SECTIONS      = { gallery: true, servizi: true }
const DEFAULT_SOCIAL        = { instagram: '', facebook: '', tripadvisor: '', whatsapp: '' }
const DEFAULT_CTA_BANNER    = { active: false, title: '', subtitle: '', cta_label: '', cta_url: '' }
const DEFAULT_SECTION_ORDER = [
  'highlights', 'stats', 'about', 'foto_testo', 'paragrafi', 'team', 'steps', 'video', 'cta_banner',
  'testimonianze', 'promozioni', 'servizi',
  'eventi', 'news', 'gallery', 'faq', 'show_map', 'contatti', 'newsletter',
]
const DEFAULT = {
  active: false, tagline: '', booking_url: '', seo_title: '', seo_description: '',
  video_url: '', section_order: [],
  sections: DEFAULT_SECTIONS, social: DEFAULT_SOCIAL, highlights: [],
  stats: [], promozioni: [], testimonianze: [], faq: [],
  cta_banner: DEFAULT_CTA_BANNER,
  foto_testo: [], paragrafi_titolo: '', paragrafi: [],
  team_titolo: '', team: [], steps_titolo: '', steps: [],
}

const HIGHLIGHT_ICONS = [
  { key: 'star',       Icon: Star,      label: 'Stella' },
  { key: 'heart',      Icon: Heart,     label: 'Cuore' },
  { key: 'award',      Icon: Award,     label: 'Premio' },
  { key: 'sparkles',   Icon: Sparkles,  label: 'Qualità' },
  { key: 'activity',   Icon: Activity,  label: 'Attività' },
  { key: 'wifi',       Icon: Wifi,      label: 'Wi-Fi' },
  { key: 'parking',    Icon: Car,       label: 'Parcheggio' },
  { key: 'beach',      Icon: Umbrella,  label: 'Spiaggia' },
  { key: 'mountain',   Icon: Mountain,  label: 'Natura' },
  { key: 'music',      Icon: Music,     label: 'Animazione' },
  { key: 'wine',       Icon: Wine,      label: 'Bar' },
  { key: 'coffee',     Icon: Coffee,    label: 'Caffè' },
  { key: 'reception',  Icon: Bell,      label: 'Servizio' },
  { key: 'shuttle',    Icon: Bus,       label: 'Navetta' },
  { key: 'ac',         Icon: Wind,      label: 'Aria cond.' },
  { key: 'location',   Icon: MapPin,    label: 'Posizione' },
  { key: 'time',       Icon: Clock,     label: 'Orario' },
]
const ICON_MAP = Object.fromEntries(HIGHLIGHT_ICONS.map(({ key, Icon }) => [key, Icon]))

export default function AttivitaMiniSitoPage() {
  const { id } = useParams()
  const { attivita, loading, saving, saved, save } = useAttivita(id)
  const [form, setForm] = useState(DEFAULT)

  useEffect(() => {
    if (attivita) {
      const s = attivita.minisito || {}
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
        cta_banner:    { ...DEFAULT_CTA_BANNER, ...(s.cta_banner || {}) },
        section_order: s.section_order || [],
        foto_testo:    s.foto_testo    || [],
        paragrafi_titolo: s.paragrafi_titolo || '',
        paragrafi:     s.paragrafi    || [],
        team_titolo:   s.team_titolo  || '',
        team:          s.team         || [],
        steps_titolo:  s.steps_titolo || '',
        steps:         s.steps        || [],
      })
    }
  }, [attivita])

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
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updateHighlight(id, patch) {
    const updated = { ...form, highlights: form.highlights.map(h => h.id === id ? { ...h, ...patch } : h) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removeHighlight(id) {
    const updated = { ...form, highlights: form.highlights.filter(h => h.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
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

  function patchBanner(key, value) {
    const updated = { ...form, cta_banner: { ...form.cta_banner, [key]: value } }
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!attivita) return <p style={errorStyle}>Attività non trovata.</p>

  const landingUrl = `${window.location.origin}/a/${attivita.slug}`

  const savedOrder = form.section_order || []
  const sectionOrder = savedOrder.length
    ? [...savedOrder, ...DEFAULT_SECTION_ORDER.filter(k => !savedOrder.includes(k))]
    : DEFAULT_SECTION_ORDER

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIdx = sectionOrder.indexOf(active.id)
      const newIdx = sectionOrder.indexOf(over.id)
      const newOrder = arrayMove(sectionOrder, oldIdx, newIdx)
      const updated = { ...form, section_order: newOrder }
      setForm(updated)
      save({ minisito: updated }).catch(() => {})
    }
  }

  const SECTION_ITEMS = [
    { key: 'foto_testo',    label: 'Blocchi foto + testo',   hint: `${(form.foto_testo || []).length} blocchi configurati` },
    { key: 'paragrafi',     label: 'Paragrafi con icona',   hint: `${(form.paragrafi || []).length} paragrafi — ${form.paragrafi_titolo || 'titolo non impostato'}` },
    { key: 'team',          label: 'Il team',               hint: `${(form.team || []).length} membri — ${form.team_titolo || 'Il nostro team'}` },
    { key: 'steps',         label: 'Come funziona (steps)', hint: `${(form.steps || []).length} passi — ${form.steps_titolo || 'Come funziona'}` },
    { key: 'highlights',    label: 'Punti di forza',       hint: `${(form.highlights || []).length} punti configurati` },
    { key: 'stats',         label: 'Numeri in evidenza',   hint: `${(form.stats || []).length} numeri configurati` },
    { key: 'about',         label: 'Chi siamo',            hint: attivita.description ? 'Dalla descrizione attività' : 'Aggiungi una descrizione nelle info attività' },
    { key: 'video',         label: 'Video',                hint: form.video_url ? 'Video configurato' : 'Aggiungi un link video nella sezione Contenuto' },
    { key: 'cta_banner',    label: 'Banner CTA',           hint: form.cta_banner?.active ? 'Attivo' : 'Disattivo — attivalo nel card Banner CTA' },
    { key: 'testimonianze', label: 'Testimonianze',        hint: `${(form.testimonianze || []).length} testimonianze configurate` },
    { key: 'promozioni',    label: 'Offerte e promozioni', hint: `${(form.promozioni || []).length} offerte configurate` },
    { key: 'servizi',       label: 'Servizi',              hint: `${(attivita.services || []).length} servizi configurati` },
    { key: 'eventi',        label: 'Prossimi eventi',      hint: 'eventi pubblicati e associati all\'attività' },
    { key: 'news',          label: 'News & Articoli',      hint: 'articoli blog pubblicati e associati all\'attività' },
    { key: 'gallery',       label: 'Galleria foto',        hint: `${(attivita.gallery || []).length} foto caricate` },
    { key: 'faq',           label: 'FAQ',                  hint: `${(form.faq || []).length} domande configurate` },
    { key: 'show_map',      label: 'Mappa',                hint: attivita.address ? `Mappa di: ${attivita.address}` : 'Aggiungi un indirizzo nelle informazioni' },
    { key: 'contatti',      label: 'Form di contatto',     hint: attivita.email ? `Messaggi inviati a ${attivita.email}` : "Aggiungi un'email nelle info attività per ricevere i messaggi" },
    { key: 'newsletter',    label: 'Iscrizione newsletter', hint: 'Raccoglie nome, email e telefono dei visitatori' },
  ]

  const SOCIAL_ITEMS = [
    { key: 'instagram',   label: 'Instagram',   placeholder: 'https://instagram.com/nomeprofilo' },
    { key: 'facebook',    label: 'Facebook',    placeholder: 'https://facebook.com/nomepagina' },
    { key: 'tripadvisor', label: 'TripAdvisor', placeholder: 'https://tripadvisor.it/...' },
    { key: 'whatsapp',    label: 'WhatsApp',    placeholder: 'https://wa.me/39...' },
  ]

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Minisito pubblico</h2>
        {form.active && attivita.slug && (
          <a href={landingUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: PRIMARY, fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: `${PRIMARY}10`, borderRadius: 8 }}>
            <ExternalLink size={13} strokeWidth={2} />
            Anteprima
          </a>
        )}
      </div>
      <p style={descStyle}>
        Una landing page pubblica e indicizzabile da Google. Quando attivo, chi visita l'URL dell'attività
        vede il minisito invece dell'app.
      </p>

      {/* Toggle attivo */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Minisito attivo</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
              {form.active ? `Visibile su ${landingUrl}` : "Disattivo — i visitatori vedono la pagina dell'attività"}
            </div>
          </div>
          <Toggle value={form.active} onChange={v => patch('active', v)} color={PRIMARY} />
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
            placeholder="es. La tua spa di fiducia dal 2010"
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
          <label style={lblStyle}>Link prenotazione / CTA principale</label>
          <input
            type="url"
            value={form.booking_url}
            onChange={e => setForm(f => ({ ...f, booking_url: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="https://..."
            style={inputStyle}
          />
          <span style={hintStyle}>Appare come pulsante "Prenota" o "Contattaci" nell'header.</span>
        </div>

        <h3 style={{ ...sectionTitle, marginTop: 24 }}>SEO</h3>

        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo pagina (SEO title)</label>
          <input
            value={form.seo_title}
            onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder={`${attivita.name} — ${attivita.tipo || 'Attività'} a ${attivita.address || '...'}`}
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

      {/* Sezioni e ordine */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Sezioni e ordine</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Trascina le sezioni per riordinarle. Usa il toggle per mostrarle o nasconderle.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            {sectionOrder.map((key, i) => {
              const item = SECTION_ITEMS.find(s => s.key === key)
              if (!item) return null
              return (
                <SortableSectionRow
                  key={key} id={key}
                  label={item.label} hint={item.hint}
                  visible={form.sections[key] !== false}
                  onToggle={v => patchSection(key, v)}
                  color={PRIMARY}
                  isLast={i === sectionOrder.length - 1}
                />
              )
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Highlights */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Punti di forza</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Fino a 6 card con icona e testo visualizzate in evidenza (es. "Personale specializzato", "Certificazione ISO").
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
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${PRIMARY}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={1.5} color={PRIMARY} />
              </div>
              <input
                value={h.text}
                onChange={e => { const t = e.target.value; setForm(f => ({ ...f, highlights: f.highlights.map(x => x.id === h.id ? { ...x, text: t } : x) })) }}
                onBlur={() => save({ minisito: form }).catch(() => {})}
                placeholder="es. Personale certificato"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={() => removeHighlight(h.id)}
                style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          )
        })}
        {(form.highlights || []).length < 6 && (
          <button type="button" onClick={addHighlight}
            style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Aggiungi punto
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Numeri in evidenza</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Cifre che comunicano esperienza (es. "15 anni di attività", "500+ clienti soddisfatti").
        </p>
        {(form.stats || []).map(s => (
          <div key={s.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <input value={s.value}
              onChange={e => { const v = e.target.value; setForm(f => ({ ...f, stats: f.stats.map(x => x.id === s.id ? { ...x, value: v } : x) })) }}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="15+" style={{ ...inputStyle, width: 80, flexShrink: 0 }} />
            <input value={s.label}
              onChange={e => { const v = e.target.value; setForm(f => ({ ...f, stats: f.stats.map(x => x.id === s.id ? { ...x, label: v } : x) })) }}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="Anni di attività" style={{ ...inputStyle, flex: 1 }} />
            <button type="button" onClick={() => removeStat(s.id)}
              style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
        ))}
        {(form.stats || []).length < 6 && (
          <button type="button" onClick={addStat}
            style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Aggiungi numero
          </button>
        )}
      </div>

      {/* Promozioni */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Offerte e promozioni</h3>
        {(form.promozioni || []).map(p => (
          <div key={p.id} style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={p.badge} onChange={e => updatePromo(p.id, { badge: e.target.value })} placeholder="Badge (es. -20%)" style={{ ...inputStyle, width: 110 }} />
              <input value={p.title} onChange={e => updatePromo(p.id, { title: e.target.value })} placeholder="Titolo offerta" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => removePromo(p.id)} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
            <textarea value={p.text} onChange={e => updatePromo(p.id, { text: e.target.value })} placeholder="Descrizione offerta…" rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={p.cta_label} onChange={e => updatePromo(p.id, { cta_label: e.target.value })} placeholder="Testo bottone" style={{ ...inputStyle, flex: 1 }} />
              <input value={p.cta_url} onChange={e => updatePromo(p.id, { cta_url: e.target.value })} placeholder="URL bottone" style={{ ...inputStyle, flex: 2 }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <input type="date" value={p.expires_at} onChange={e => updatePromo(p.id, { expires_at: e.target.value })} style={{ ...inputStyle, width: 180 }} />
              <span style={hintStyle}>Data scadenza (opzionale)</span>
            </div>
          </div>
        ))}
        <button type="button" onClick={addPromo}
          style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi offerta
        </button>
      </div>

      {/* CTA Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>Banner CTA</h3>
          <Toggle value={form.cta_banner?.active} onChange={v => patchBanner('active', v)} color={PRIMARY} />
        </div>
        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo</label>
          <input value={form.cta_banner?.title || ''} onChange={e => patchBanner('title', e.target.value)} placeholder="es. Prenota il tuo appuntamento" style={inputStyle} />
        </div>
        <div style={fieldWrap}>
          <label style={lblStyle}>Sottotitolo</label>
          <input value={form.cta_banner?.subtitle || ''} onChange={e => patchBanner('subtitle', e.target.value)} placeholder="es. Disponibilità limitata" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={lblStyle}>Testo bottone</label>
            <input value={form.cta_banner?.cta_label || ''} onChange={e => patchBanner('cta_label', e.target.value)} placeholder="Prenota ora" style={inputStyle} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={lblStyle}>URL bottone</label>
            <input type="url" value={form.cta_banner?.cta_url || ''} onChange={e => patchBanner('cta_url', e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Testimonianze */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Testimonianze</h3>
        {(form.testimonianze || []).map(t => (
          <div key={t.id} style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={t.author} onChange={e => updateTestimonianza(t.id, { author: e.target.value })} placeholder="Nome cliente" style={{ ...inputStyle, flex: 1 }} />
              <input value={t.location} onChange={e => updateTestimonianza(t.id, { location: e.target.value })} placeholder="es. Milano" style={{ ...inputStyle, width: 130 }} />
              <select value={t.rating} onChange={e => updateTestimonianza(t.id, { rating: Number(e.target.value) })}
                style={{ padding: '8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, flexShrink: 0 }}>
                {[5, 4, 3].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
              </select>
              <button type="button" onClick={() => removeTestimonianza(t.id)} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
            <textarea value={t.text} onChange={e => updateTestimonianza(t.id, { text: e.target.value })} placeholder="Testo della testimonianza…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ))}
        <button type="button" onClick={addTestimonianza}
          style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi testimonianza
        </button>
      </div>

      {/* FAQ */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>FAQ</h3>
        {(form.faq || []).map(f => (
          <div key={f.id} style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={f.question} onChange={e => updateFaq(f.id, { question: e.target.value })} placeholder="Domanda…" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => removeFaq(f.id)} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
            <textarea value={f.answer} onChange={e => updateFaq(f.id, { answer: e.target.value })} placeholder="Risposta…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ))}
        <button type="button" onClick={addFaq}
          style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi FAQ
        </button>
      </div>

      {/* Blocchi foto + testo */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Blocchi foto + testo</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Immagine 50% + testo 50%. Su mobile foto sopra, testo sotto.
        </p>
        {(form.foto_testo || []).map((block, idx) => (
          <FotoTestoItemAtt key={block.id} item={block} attivitaId={attivita.id}
            onPatch={p => {
              const updated = { ...form, foto_testo: form.foto_testo.map(b => b.id === block.id ? { ...b, ...p } : b) }
              setForm(updated); save({ minisito: updated }).catch(() => {})
            }}
            onRemove={() => {
              const updated = { ...form, foto_testo: form.foto_testo.filter(b => b.id !== block.id) }
              setForm(updated); save({ minisito: updated }).catch(() => {})
            }}
            borderBottom={idx < form.foto_testo.length - 1}
          />
        ))}
        <button type="button" onClick={() => {
          const updated = { ...form, foto_testo: [...(form.foto_testo || []), { id: crypto.randomUUID(), titolo: '', testo: '', image_url: '', inverti: false }] }
          setForm(updated); save({ minisito: updated }).catch(() => {})
        }} style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi blocco
        </button>
      </div>

      {/* Paragrafi con icona */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Paragrafi con icona</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Card con icona + titolo + testo. Es: specializzazioni, servizi offerti, corsi disponibili.
        </p>
        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo sezione</label>
          <input value={form.paragrafi_titolo}
            onChange={e => setForm(f => ({ ...f, paragrafi_titolo: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="es. I nostri servizi / Le nostre specializzazioni"
            style={inputStyle} />
        </div>
        {(form.paragrafi || []).map(p => (
          <ParagrafoItemAtt key={p.id} item={p} attivitaId={attivita.id} icons={HIGHLIGHT_ICONS}
            onPatch={patch => {
              const updated = { ...form, paragrafi: form.paragrafi.map(x => x.id === p.id ? { ...x, ...patch } : x) }
              setForm(updated); save({ minisito: updated }).catch(() => {})
            }}
            onRemove={() => {
              const updated = { ...form, paragrafi: form.paragrafi.filter(x => x.id !== p.id) }
              setForm(updated); save({ minisito: updated }).catch(() => {})
            }}
          />
        ))}
        <button type="button" onClick={() => {
          const updated = { ...form, paragrafi: [...(form.paragrafi || []), { id: crypto.randomUUID(), icon: 'star', titolo: '', testo: '', image_url: '' }] }
          setForm(updated); save({ minisito: updated }).catch(() => {})
        }} style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi paragrafo
        </button>
      </div>

      {/* Team */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Il team</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Presenta i professionisti della tua attività: guide, istruttori, specialisti, staff.
        </p>
        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo sezione</label>
          <input value={form.team_titolo}
            onChange={e => setForm(f => ({ ...f, team_titolo: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="es. Il nostro team / I nostri esperti"
            style={inputStyle} />
        </div>
        {(form.team || []).map(m => (
          <TeamMemberItemAtt key={m.id} item={m} attivitaId={attivita.id}
            onPatch={patch => {
              const updated = { ...form, team: form.team.map(x => x.id === m.id ? { ...x, ...patch } : x) }
              setForm(updated); save({ minisito: updated }).catch(() => {})
            }}
            onRemove={() => {
              const updated = { ...form, team: form.team.filter(x => x.id !== m.id) }
              setForm(updated); save({ minisito: updated }).catch(() => {})
            }}
          />
        ))}
        <button type="button" onClick={() => {
          const updated = { ...form, team: [...(form.team || []), { id: crypto.randomUUID(), nome: '', ruolo: '', bio: '', photo_url: '' }] }
          setForm(updated); save({ minisito: updated }).catch(() => {})
        }} style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi membro
        </button>
      </div>

      {/* Steps */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Come funziona (steps)</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Passi numerati con icona. Es: prenotazione → check-in → esperienza → feedback.
        </p>
        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo sezione</label>
          <input value={form.steps_titolo}
            onChange={e => setForm(f => ({ ...f, steps_titolo: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="es. Come funziona / Il tuo percorso"
            style={inputStyle} />
        </div>
        {(form.steps || []).map((step, idx) => (
          <div key={step.id} style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
              <select value={step.icon} onChange={e => { const updated = { ...form, steps: form.steps.map(x => x.id === step.id ? { ...x, icon: e.target.value } : x) }; setForm(updated); save({ minisito: updated }).catch(() => {}) }}
                style={{ padding: '7px 6px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', flex: '0 0 auto' }}>
                {HIGHLIGHT_ICONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
              </select>
              <input value={step.titolo}
                onChange={e => { const v = e.target.value; setForm(f => ({ ...f, steps: f.steps.map(x => x.id === step.id ? { ...x, titolo: v } : x) })) }}
                onBlur={() => save({ minisito: form }).catch(() => {})}
                placeholder="es. Prenota online" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => {
                const updated = { ...form, steps: form.steps.filter(x => x.id !== step.id) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
            <textarea value={step.testo}
              onChange={e => { const v = e.target.value; setForm(f => ({ ...f, steps: f.steps.map(x => x.id === step.id ? { ...x, testo: v } : x) })) }}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="Breve descrizione…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ))}
        <button type="button" onClick={() => {
          const updated = { ...form, steps: [...(form.steps || []), { id: crypto.randomUUID(), icon: 'star', titolo: '', testo: '' }] }
          setForm(updated); save({ minisito: updated }).catch(() => {})
        }} style={{ padding: '8px 16px', background: `${PRIMARY}10`, color: PRIMARY, border: `1px dashed ${PRIMARY}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Aggiungi step
        </button>
      </div>

      {/* Social */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Social e link</h3>
        {SOCIAL_ITEMS.map(({ key, label, placeholder }) => (
          <div key={key} style={fieldWrap}>
            <label style={lblStyle}>{label}</label>
            <input type="url" value={form.social?.[key] || ''}
              onChange={e => setForm(f => ({ ...f, social: { ...f.social, [key]: e.target.value } }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder={placeholder} style={inputStyle} />
          </div>
        ))}
      </div>
    </div>
  )
}

function FotoTestoItemAtt({ item, attivitaId, onPatch, onRemove, borderBottom }) {
  const [titolo, setTitolo] = useState(item.titolo || '')
  const [testo,  setTesto]  = useState(item.testo  || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=attivita&entity_id=${attivitaId}`, file)
      onPatch({ image_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }
  return (
    <div style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee', paddingBottom: borderBottom ? 14 : 14 }}>
      <input value={titolo} onChange={e => setTitolo(e.target.value)} onBlur={() => onPatch({ titolo })}
        placeholder="Titolo (opzionale)" style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onPatch({ testo })}
        rows={3} placeholder="Testo descrittivo…" style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }} />
      {item.image_url && <img src={item.image_url} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8, display: 'block' }} />}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ fontSize: 12, padding: '5px 12px', background: `${PRIMARY}10`, color: PRIMARY, border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
          {uploading ? '…' : item.image_url ? 'Cambia immagine' : 'Carica immagine'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={item.inverti || false} onChange={e => onPatch({ inverti: e.target.checked })} style={{ accentColor: PRIMARY }} />
          Foto a destra
        </label>
        {item.image_url && <button type="button" onClick={() => onPatch({ image_url: '' })} style={{ fontSize: 11, padding: '3px 8px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Rimuovi foto</button>}
        <button type="button" onClick={onRemove} style={{ marginLeft: 'auto', padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
    </div>
  )
}

function ParagrafoItemAtt({ item, attivitaId, icons, onPatch, onRemove }) {
  const [titolo, setTitolo] = useState(item.titolo || '')
  const [testo,  setTesto]  = useState(item.testo  || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=attivita&entity_id=${attivitaId}`, file)
      onPatch({ image_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }
  return (
    <div style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select value={item.icon} onChange={e => onPatch({ icon: e.target.value })}
          style={{ padding: '7px 6px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', flexShrink: 0 }}>
          {icons.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input value={titolo} onChange={e => setTitolo(e.target.value)} onBlur={() => onPatch({ titolo })}
          placeholder="es. Yoga / Meditazione / Trekking" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={onRemove} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
      </div>
      <textarea value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onPatch({ testo })}
        rows={2} placeholder="Descrizione…" style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }} />
      {item.image_url && <img src={item.image_url} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 6, display: 'block' }} />}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 11, padding: '3px 8px', background: `${PRIMARY}10`, color: PRIMARY, border: 'none', borderRadius: 5, cursor: 'pointer' }}>
          {uploading ? '…' : item.image_url ? 'Cambia foto' : 'Foto (opz.)'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        {item.image_url && <button type="button" onClick={() => onPatch({ image_url: '' })} style={{ fontSize: 11, padding: '3px 8px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Rimuovi</button>}
      </div>
    </div>
  )
}

function TeamMemberItemAtt({ item, attivitaId, onPatch, onRemove }) {
  const [nome,  setNome]  = useState(item.nome  || '')
  const [ruolo, setRuolo] = useState(item.ruolo || '')
  const [bio,   setBio]   = useState(item.bio   || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  async function handlePhotoUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=attivita&entity_id=${attivitaId}`, file)
      onPatch({ photo_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }
  return (
    <div style={{ background: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #eee', display: 'flex', gap: 12 }}>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: `${PRIMARY}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #eee' }}>
          {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={24} strokeWidth={1.5} color="#aaa" />}
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 10, padding: '3px 6px', background: `${PRIMARY}10`, color: PRIMARY, border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>{uploading ? '…' : 'Foto'}</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={nome} onChange={e => setNome(e.target.value)} onBlur={() => onPatch({ nome })} placeholder="Nome e cognome" style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
          <button type="button" onClick={onRemove} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
        <input value={ruolo} onChange={e => setRuolo(e.target.value)} onBlur={() => onPatch({ ruolo })} placeholder="es. Guida / Istruttore / Specialista" style={{ ...inputStyle, marginBottom: 8 }} />
        <textarea value={bio} onChange={e => setBio(e.target.value)} onBlur={() => onPatch({ bio })} rows={2} placeholder="Breve bio…" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
    </div>
  )
}

function Toggle({ value, onChange, color }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: value ? color : '#ddd', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function SortableSectionRow({ id, label, hint, visible, onToggle, color, isLast }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 1, position: 'relative',
  }
  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid #f0f0f0' }}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#bbb', flexShrink: 0, padding: '0 4px' }}>⠿</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: '#aaa', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</div>}
      </div>
      <Toggle value={visible} onChange={onToggle} color={color} />
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }
const sectionTitle = { marginTop: 0, marginBottom: 16, fontSize: 15 }
const lblStyle     = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle   = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const saveBtn      = { padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const fieldWrap    = { marginBottom: 16 }
const hintStyle    = { display: 'block', fontSize: 12, color: '#aaa', marginTop: 4 }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
