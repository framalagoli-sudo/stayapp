import { useEffect, useState } from 'react'
import { useProperty } from '../../../hooks/useProperty'
import { ExternalLink, Plus, Trash2, Waves, Sparkles, Utensils, Activity, Car, Wifi, Umbrella, Music, Wine, Coffee, Bell, Bus, Star, Mountain, Wind, Heart, Award, MapPin, Clock, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_SECTIONS      = { gallery: true, services: true, activities: true, excursions: true, eventi: true }
const DEFAULT_SOCIAL        = { instagram: '', facebook: '', tripadvisor: '', whatsapp: '' }
const DEFAULT_CTA_BANNER    = { active: false, title: '', subtitle: '', cta_label: '', cta_url: '' }
const DEFAULT_SECTION_ORDER = [
  'highlights', 'stats', 'about', 'video', 'cta_banner',
  'testimonianze', 'promozioni', 'pacchetti',
  'services', 'activities', 'excursions', 'eventi', 'news', 'gallery', 'faq', 'show_map',
]
const DEFAULT = {
  active: false, tagline: '', booking_url: '', seo_title: '', seo_description: '',
  video_url: '', section_order: [],
  sections: DEFAULT_SECTIONS, social: DEFAULT_SOCIAL, highlights: [],
  stats: [], promozioni: [], pacchetti: [], testimonianze: [], faq: [],
  cta_banner: DEFAULT_CTA_BANNER,
}

const HIGHLIGHT_ICONS = [
  { key: 'star',        Icon: Star,      label: 'Stella' },
  { key: 'heart',       Icon: Heart,     label: 'Cuore' },
  { key: 'award',       Icon: Award,     label: 'Premio' },
  { key: 'wifi',        Icon: Wifi,      label: 'Wi-Fi' },
  { key: 'parking',     Icon: Car,       label: 'Parcheggio' },
  { key: 'pool',        Icon: Waves,     label: 'Piscina' },
  { key: 'spa',         Icon: Sparkles,  label: 'Spa' },
  { key: 'restaurant',  Icon: Utensils,  label: 'Ristorante' },
  { key: 'gym',         Icon: Activity,  label: 'Palestra' },
  { key: 'beach',       Icon: Umbrella,  label: 'Spiaggia' },
  { key: 'mountain',    Icon: Mountain,  label: 'Montagna' },
  { key: 'breakfast',   Icon: Coffee,    label: 'Colazione' },
  { key: 'bar',         Icon: Wine,      label: 'Bar' },
  { key: 'shuttle',     Icon: Bus,       label: 'Navetta' },
  { key: 'reception',   Icon: Bell,      label: 'Reception' },
  { key: 'ac',          Icon: Wind,      label: 'Aria cond.' },
  { key: 'location',    Icon: MapPin,    label: 'Posizione' },
  { key: 'time',        Icon: Clock,     label: 'Orario' },
  { key: 'music',       Icon: Music,     label: 'Animazione' },
]
const ICON_MAP = Object.fromEntries(HIGHLIGHT_ICONS.map(({ key, Icon }) => [key, Icon]))

export default function PropertyMiniSitoPage() {
  const { property, loading, saving, saved, saveError, save } = useProperty()
  const [form, setForm] = useState(DEFAULT)

  useEffect(() => {
    if (property) {
      const s = property.minisito || {}
      setForm({
        ...DEFAULT, ...s,
        sections:      { ...DEFAULT_SECTIONS, ...(s.sections   || {}) },
        social:        { ...DEFAULT_SOCIAL,   ...(s.social     || {}) },
        highlights:    s.highlights    || [],
        stats:         s.stats         || [],
        promozioni:    s.promozioni    || [],
        pacchetti:     s.pacchetti     || [],
        testimonianze: s.testimonianze || [],
        faq:           s.faq           || [],
        video_url:     s.video_url     || '',
        cta_banner:    { ...DEFAULT_CTA_BANNER, ...(s.cta_banner || {}) },
        section_order: s.section_order || [],
      })
    }
  }, [property])

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

  function patchBanner(key, value) {
    const updated = { ...form, cta_banner: { ...form.cta_banner, [key]: value } }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }

  function addPacchetto() {
    const updated = { ...form, pacchetti: [...(form.pacchetti || []), { id: crypto.randomUUID(), badge: '', name: '', tagline: '', price: '', price_label: 'a persona', includes: [], cta_label: '', cta_url: '' }] }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updatePacchetto(id, p) {
    const updated = { ...form, pacchetti: form.pacchetti.map(x => x.id === id ? { ...x, ...p } : x) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removePacchetto(id) {
    const updated = { ...form, pacchetti: form.pacchetti.filter(x => x.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }

  function addTestimonianza() {
    const updated = { ...form, testimonianze: [...(form.testimonianze || []), { id: crypto.randomUUID(), author: '', location: '', rating: 5, text: '' }] }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }
  function updateTestimonianza(id, patch) {
    const updated = { ...form, testimonianze: form.testimonianze.map(t => t.id === id ? { ...t, ...patch } : t) }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }
  function removeTestimonianza(id) {
    const updated = { ...form, testimonianze: form.testimonianze.filter(t => t.id !== id) }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }

  function addFaq() {
    const updated = { ...form, faq: [...(form.faq || []), { id: crypto.randomUUID(), question: '', answer: '' }] }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }
  function updateFaq(id, patch) {
    const updated = { ...form, faq: form.faq.map(f => f.id === id ? { ...f, ...patch } : f) }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }
  function removeFaq(id) {
    const updated = { ...form, faq: form.faq.filter(f => f.id !== id) }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
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
  if (!property) return <p style={errorStyle}>Struttura non trovata.</p>

  const landingUrl = `${window.location.origin}/s/${property.slug}`

  const sectionOrder = form.section_order?.length ? form.section_order : DEFAULT_SECTION_ORDER

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
    { key: 'highlights',    label: 'Punti di forza',       hint: `${(form.highlights || []).length} punti configurati` },
    { key: 'stats',         label: 'Numeri in evidenza',   hint: `${(form.stats || []).length} numeri configurati` },
    { key: 'about',         label: 'Chi siamo',            hint: property.description ? 'Dalla descrizione struttura' : 'Aggiungi una descrizione nelle info struttura' },
    { key: 'video',         label: 'Video',                hint: form.video_url ? 'Video configurato' : 'Aggiungi un link video nella sezione Contenuto' },
    { key: 'cta_banner',    label: 'Banner CTA',           hint: form.cta_banner?.active ? 'Attivo' : 'Disattivo — attivalo nel card Banner CTA' },
    { key: 'testimonianze', label: 'Testimonianze',        hint: `${(form.testimonianze || []).length} testimonianze configurate` },
    { key: 'promozioni',    label: 'Offerte e promozioni', hint: `${(form.promozioni || []).length} offerte configurate` },
    { key: 'pacchetti',     label: 'Pacchetti soggiorno',  hint: `${(form.pacchetti || []).length} pacchetti configurati` },
    { key: 'services',      label: 'Servizi',              hint: `${(property.services || []).length} servizi configurati` },
    { key: 'activities',    label: 'Attività',             hint: `${(property.activities || []).length} categorie attività` },
    { key: 'excursions',    label: 'Escursioni',           hint: `${(property.excursions || []).length} escursioni` },
    { key: 'eventi',        label: 'Prossimi eventi',      hint: 'eventi pubblicati e associati alla struttura' },
    { key: 'news',          label: 'News & Articoli',      hint: 'articoli blog pubblicati e associati alla struttura' },
    { key: 'gallery',       label: 'Galleria foto',        hint: `${(property.gallery || []).length} foto caricate` },
    { key: 'faq',           label: 'FAQ',                  hint: `${(form.faq || []).length} domande configurate` },
    { key: 'show_map',      label: 'Mappa',                hint: property.address ? `Mappa di: ${property.address}` : 'Aggiungi un indirizzo nelle informazioni struttura' },
  ]

  const SOCIAL_ITEMS = [
    { key: 'instagram',   label: 'Instagram',   placeholder: 'https://instagram.com/nomeprofilo' },
    { key: 'facebook',    label: 'Facebook',    placeholder: 'https://facebook.com/nomepagina' },
    { key: 'tripadvisor', label: 'TripAdvisor', placeholder: 'https://tripadvisor.it/Hotel-...' },
    { key: 'whatsapp',    label: 'WhatsApp',    placeholder: 'https://wa.me/39...' },
  ]

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Minisito pubblico</h2>
        {form.active && property.slug && (
          <a href={landingUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#1a1a2e', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: '#f0f0f0', borderRadius: 8 }}>
            <ExternalLink size={13} strokeWidth={2} />
            Anteprima
          </a>
        )}
      </div>
      <p style={descStyle}>
        Una landing page pubblica e indicizzabile da Google — sostituisce il sito WordPress.
        Quando attivo, i visitatori che accedono all'URL della struttura vedono il minisito invece dell'app ospiti.
      </p>

      {/* Toggle attivo */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Minisito attivo</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
              {form.active ? `Visibile su ${landingUrl}` : 'Disattivo — i visitatori vedono la PWA ospiti'}
            </div>
          </div>
          <Toggle value={form.active} onChange={v => patch('active', v)} color="#1a1a2e" />
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
            placeholder="es. Il comfort di casa, nel cuore delle Dolomiti"
            style={inputStyle}
          />
        </div>

        <div style={fieldWrap}>
          <label style={lblStyle}>Video (YouTube o Vimeo)</label>
          <input
            type="url"
            value={form.video_url}
            onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="https://www.youtube.com/watch?v=..."
            style={inputStyle}
          />
          <span style={hintStyle}>Incolla il link del video. Appare come sezione dedicata nel minisito.</span>
        </div>

        <div style={fieldWrap}>
          <label style={lblStyle}>Link prenotazione esterno</label>
          <input
            type="url"
            value={form.booking_url}
            onChange={e => setForm(f => ({ ...f, booking_url: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="https://www.booking.com/hotel/..."
            style={inputStyle}
          />
          <span style={hintStyle}>Booking.com, sito proprietario, ecc. Appare come pulsante "Prenota" nel minisito.</span>
        </div>

        <h3 style={{ ...sectionTitle, marginTop: 24 }}>SEO</h3>

        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo pagina (SEO title)</label>
          <input
            value={form.seo_title}
            onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder={`${property.name} — Hotel a ${property.address || '...'}`}
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
            placeholder="Breve descrizione che appare nei risultati di Google…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <span style={hintStyle}>{form.seo_description.length}/160 caratteri consigliati</span>
        </div>

        {saveError && <p style={{ color: '#c00', fontSize: 13, marginTop: 12 }}>{saveError}</p>}
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
                  color="#1a1a2e"
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
          Fino a 6 card con icona e testo visualizzate in evidenza nel minisito (es. "Vista panoramica", "Pet friendly").
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
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={1.5} color="#1a1a2e" />
              </div>
              <input
                value={h.text}
                onChange={e => { const t = e.target.value; setForm(f => ({ ...f, highlights: f.highlights.map(x => x.id === h.id ? { ...x, text: t } : x) })) }}
                onBlur={() => save({ minisito: form }).catch(() => {})}
                placeholder="es. Vista panoramica sulle Dolomiti"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => removeHighlight(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', flexShrink: 0, padding: 4 }}>
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          )
        })}
        {(form.highlights || []).length < 6 && (
          <button onClick={addHighlight} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi punto di forza
          </button>
        )}
      </div>

      {/* Numeri / Stats */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Numeri in evidenza</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Fino a 4 statistiche mostrate in una banda scura d'impatto (es. "1.200+ Ospiti accolti", "4.9★ Media recensioni").
        </p>
        {(form.stats || []).map(s => (
          <StatItem key={s.id} item={s} onPatch={p => updateStat(s.id, p)} onRemove={() => removeStat(s.id)} />
        ))}
        {(form.stats || []).length < 4 && (
          <button onClick={addStat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
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
          <PromoItem key={p.id} item={p} onPatch={x => updatePromo(p.id, x)} onRemove={() => removePromo(p.id)} />
        ))}
        <button onClick={addPromo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
          <Plus size={14} strokeWidth={2.5} /> Aggiungi offerta
        </button>
      </div>

      {/* CTA Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Banner CTA</h3>
          <Toggle value={form.cta_banner?.active || false} onChange={v => patchBanner('active', v)} color="#1a1a2e" />
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: 8 }}>
          Una banda colorata a tutto schermo con titolo persuasivo e pulsante di conversione. Appare solo se attivata.
        </p>
        <div style={fieldWrap}>
          <label style={lblStyle}>Titolo principale</label>
          <input value={form.cta_banner?.title || ''}
            onChange={e => setForm(f => ({ ...f, cta_banner: { ...f.cta_banner, title: e.target.value } }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="es. Pronto per un'esperienza indimenticabile?"
            style={inputStyle} />
        </div>
        <div style={fieldWrap}>
          <label style={lblStyle}>Sottotitolo (opzionale)</label>
          <input value={form.cta_banner?.subtitle || ''}
            onChange={e => setForm(f => ({ ...f, cta_banner: { ...f.cta_banner, subtitle: e.target.value } }))}
            onBlur={() => save({ minisito: form }).catch(() => {})}
            placeholder="es. Prenota ora con la migliore tariffa garantita"
            style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
          <div style={{ flex: '0 0 180px' }}>
            <label style={lblStyle}>Testo pulsante</label>
            <input value={form.cta_banner?.cta_label || ''}
              onChange={e => setForm(f => ({ ...f, cta_banner: { ...f.cta_banner, cta_label: e.target.value } }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="es. Prenota ora" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lblStyle}>Link pulsante</label>
            <input type="url" value={form.cta_banner?.cta_url || ''}
              onChange={e => setForm(f => ({ ...f, cta_banner: { ...f.cta_banner, cta_url: e.target.value } }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="https://..." style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Pacchetti */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Pacchetti e soggiorni</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Proponi soggiorni tematici con elenco inclusi e prezzo. Ottimo per aumentare il valore percepito (es. "Weekend Romantico", "Family Summer").
        </p>
        {(form.pacchetti || []).map(p => (
          <PacchettoItem key={p.id} item={p} onPatch={x => updatePacchetto(p.id, x)} onRemove={() => removePacchetto(p.id)} />
        ))}
        <button onClick={addPacchetto} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
          <Plus size={14} strokeWidth={2.5} /> Aggiungi pacchetto
        </button>
      </div>

      {/* Testimonianze */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Testimonianze ospiti</h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
          Inserisci recensioni reali dei tuoi ospiti. Vengono mostrate come card nel minisito.
        </p>
        {(form.testimonianze || []).map(t => (
          <TestimonianzaItem key={t.id} item={t}
            onPatch={p => updateTestimonianza(t.id, p)}
            onRemove={() => removeTestimonianza(t.id)} />
        ))}
        {(form.testimonianze || []).length < 10 && (
          <button onClick={addTestimonianza} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
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
        <button onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 12 }}>
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

function SortableSectionRow({ id, label, hint, visible, onToggle, color, isLast }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', borderBottom: isLast ? 'none' : '1px solid #f0f0f0' }}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#ccc', flexShrink: 0, display: 'flex', touchAction: 'none' }}>
        <GripVertical size={18} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{hint}</div>}
      </div>
      <Toggle value={visible} onChange={onToggle} color={color} />
    </div>
  )
}

function PacchettoItem({ item, onPatch, onRemove }) {
  const [badge,      setBadge]      = useState(item.badge      || '')
  const [name,       setName]       = useState(item.name       || '')
  const [tagline,    setTagline]    = useState(item.tagline    || '')
  const [price,      setPrice]      = useState(item.price      || '')
  const [priceLabel, setPriceLabel] = useState(item.price_label || 'a persona')
  const [includes,   setIncludes]   = useState((item.includes  || []).join('\n'))
  const [ctaLabel,   setCtaLabel]   = useState(item.cta_label  || '')
  const [ctaUrl,     setCtaUrl]     = useState(item.cta_url    || '')
  return (
    <div style={{ background: '#f9f9fb', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Badge (opzionale)</label>
          <input value={badge} onChange={e => setBadge(e.target.value)} onBlur={() => onPatch({ badge })}
            placeholder="es. Più richiesto" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Nome pacchetto *</label>
        <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onPatch({ name })}
          placeholder="es. Weekend Romantico" style={{ ...inputStyle, fontWeight: 600 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Sottotitolo (opzionale)</label>
        <input value={tagline} onChange={e => setTagline(e.target.value)} onBlur={() => onPatch({ tagline })}
          placeholder="es. Per una fuga dalla routine" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: '0 0 120px' }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Prezzo</label>
          <input value={price} onChange={e => setPrice(e.target.value)} onBlur={() => onPatch({ price })}
            placeholder="es. €299" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Label prezzo</label>
          <input value={priceLabel} onChange={e => setPriceLabel(e.target.value)} onBlur={() => onPatch({ price_label: priceLabel })}
            placeholder="es. a persona / a notte" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Include (una voce per riga)</label>
        <textarea value={includes}
          onChange={e => setIncludes(e.target.value)}
          onBlur={() => onPatch({ includes: includes.split('\n').map(s => s.trim()).filter(Boolean) })}
          rows={4} placeholder={"Colazione inclusa\nAccesso spa\nLate check-out\nCena romantica"}
          style={{ ...inputStyle, resize: 'vertical' }} />
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
        <Trash2 size={13} strokeWidth={1.5} /> Rimuovi pacchetto
      </button>
    </div>
  )
}

function StatItem({ item, onPatch, onRemove }) {
  const [value, setValue] = useState(item.value)
  const [label, setLabel] = useState(item.label)
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <input value={value} onChange={e => setValue(e.target.value)} onBlur={() => onPatch({ value })}
        placeholder="es. 1.200+" style={{ ...inputStyle, flex: '0 0 110px', fontWeight: 700, textAlign: 'center' }} />
      <input value={label} onChange={e => setLabel(e.target.value)} onBlur={() => onPatch({ label })}
        placeholder="es. Ospiti accolti" style={{ ...inputStyle, flex: 1 }} />
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
          placeholder="es. Weekend romantico — soggiorno 2 notti" style={{ ...inputStyle, fontWeight: 600 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Descrizione</label>
        <input value={text} onChange={e => setText(e.target.value)} onBlur={() => onPatch({ text })}
          placeholder="es. Colazione inclusa, accesso spa, late check-out" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: '0 0 160px' }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Testo pulsante</label>
          <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} onBlur={() => onPatch({ cta_label: ctaLabel })}
            placeholder="es. Scopri l'offerta" style={inputStyle} />
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

function TestimonianzaItem({ item, onPatch, onRemove }) {
  const [author,   setAuthor]   = useState(item.author)
  const [location, setLocation] = useState(item.location)
  const [text,     setText]     = useState(item.text)
  return (
    <div style={{ background: '#f9f9fb', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Nome ospite</label>
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
          rows={3} placeholder="es. Struttura meravigliosa, personale gentilissimo…"
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
            placeholder="es. Il parcheggio è incluso?" style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }} />
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} onBlur={() => onPatch({ answer })}
            rows={2} placeholder="es. Sì, disponiamo di un ampio parcheggio gratuito per tutti gli ospiti."
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
const saveBtn      = { padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
