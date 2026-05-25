import { useEffect, useRef, useState } from 'react'
import { useProperty } from '../../../hooks/useProperty'
import { uploadMedia } from '../../../lib/api'
import { ExternalLink, Plus, Trash2, Waves, Sparkles, Utensils, Activity, Car, Wifi, Umbrella, Music, Wine, Coffee, Bell, Bus, Star, Mountain, Wind, Heart, Award, MapPin, Clock, GripVertical, Users } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_SECTIONS      = { gallery: true, services: true, activities: true, excursions: true, eventi: true }
const DEFAULT_SOCIAL        = { instagram: '', facebook: '', tripadvisor: '', whatsapp: '' }
const DEFAULT_CTA_BANNER    = { active: false, title: '', subtitle: '', cta_label: '', cta_url: '' }
const DEFAULT_SECTION_ORDER = [
  'highlights', 'stats', 'about', 'foto_testo', 'paragrafi', 'team', 'steps', 'video', 'cta_banner',
  'testimonianze', 'promozioni', 'pacchetti',
  'services', 'activities', 'excursions', 'eventi', 'news', 'gallery', 'faq', 'show_map', 'booking', 'shop', 'contatti', 'newsletter',
]
const DEFAULT_TRACKING = { meta_pixel_id: '', ga4_id: '', gtm_id: '', tiktok_pixel_id: '' }
const DEFAULT = {
  active: false, tagline: '', booking_url: '', seo_title: '', seo_description: '',
  video_url: '', section_order: [],
  sections: DEFAULT_SECTIONS, social: DEFAULT_SOCIAL, highlights: [],
  stats: [], promozioni: [], pacchetti: [], testimonianze: [], faq: [],
  cta_banner: DEFAULT_CTA_BANNER,
  foto_testo: [], paragrafi_titolo: '', paragrafi: [],
  team_titolo: '', team: [], steps_titolo: '', steps: [],
  tracking_cfg: DEFAULT_TRACKING,
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

const TABS = [
  { key: 'generale',      label: 'Generale' },
  { key: 'seo',           label: 'SEO & Social' },
  { key: 'highlights',    label: 'Highlights' },
  { key: 'offerte',       label: 'Offerte' },
  { key: 'pacchetti',     label: 'Pacchetti' },
  { key: 'testimonianze', label: 'Testimonianze' },
  { key: 'faq',           label: 'FAQ' },
  { key: 'cta',           label: 'CTA Banner' },
  { key: 'contenuto',     label: 'Contenuto' },
  { key: 'sezioni',       label: 'Sezioni' },
]

export default function PropertyMiniSitoPage() {
  const { property, loading, saving, saved, saveError, save } = useProperty()
  const [form, setForm] = useState(DEFAULT)
  const [activeTab, setActiveTab] = useState('generale')

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
        foto_testo:    s.foto_testo    || [],
        paragrafi_titolo: s.paragrafi_titolo || '',
        paragrafi:     s.paragrafi    || [],
        team_titolo:   s.team_titolo  || '',
        team:          s.team         || [],
        steps_titolo:  s.steps_titolo || '',
        steps:         s.steps        || [],
        tracking_cfg:  { ...DEFAULT_TRACKING, ...(s.tracking_cfg || {}) },
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

  function updateHighlight(id, p) {
    const updated = { ...form, highlights: form.highlights.map(h => h.id === id ? { ...h, ...p } : h) }
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
    const updated = { ...form, promozioni: [...(form.promozioni || []), { id: crypto.randomUUID(), badge: '', title: '', text: '', description_full: '', cover_url: '', gallery: [], valid_from: '', expires_at: '', conditions: '', price_original: '', price_discounted: '', cta_label: '', cta_url: '' }] }
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
    const updated = { ...form, pacchetti: [...(form.pacchetti || []), { id: crypto.randomUUID(), badge: '', name: '', tagline: '', price: '', price_label: 'a persona', includes: [], description_full: '', cover_url: '', gallery: [], duration: '', period: '', min_persons: '', cta_label: '', cta_url: '' }] }
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
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function updateTestimonianza(id, p) {
    const updated = { ...form, testimonianze: form.testimonianze.map(t => t.id === id ? { ...t, ...p } : t) }
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
  function updateFaq(id, p) {
    const updated = { ...form, faq: form.faq.map(f => f.id === id ? { ...f, ...p } : f) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }
  function removeFaq(id) {
    const updated = { ...form, faq: form.faq.filter(f => f.id !== id) }
    setForm(updated); save({ minisito: updated }).catch(() => {})
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Struttura non trovata.</p>

  const landingUrl = `${window.location.origin}/s/${property.slug}`

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
    { key: 'about',         label: 'Chi siamo',            hint: property.description ? 'Dalla descrizione struttura' : 'Aggiungi una descrizione nelle info struttura' },
    { key: 'video',         label: 'Video',                hint: form.video_url ? 'Video configurato' : 'Aggiungi un link video nella tab Generale' },
    { key: 'cta_banner',    label: 'Banner CTA',           hint: form.cta_banner?.active ? 'Attivo' : 'Disattivo — attivalo nella tab CTA Banner' },
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
    { key: 'contatti',      label: 'Form di contatto',     hint: property.email ? `Messaggi inviati a ${property.email}` : 'Aggiungi un\'email nelle info struttura per ricevere i messaggi' },
    { key: 'newsletter',    label: 'Iscrizione newsletter', hint: 'Raccoglie nome, email e telefono degli ospiti' },
    { key: 'shop',          label: 'Shop / E-commerce',    hint: 'Mostra i prodotti del tuo shop online' },
  ]

  const SOCIAL_ITEMS = [
    { key: 'instagram',   label: 'Instagram',   placeholder: 'https://instagram.com/nomeprofilo' },
    { key: 'facebook',    label: 'Facebook',    placeholder: 'https://facebook.com/nomepagina' },
    { key: 'tripadvisor', label: 'TripAdvisor', placeholder: 'https://tripadvisor.it/Hotel-...' },
    { key: 'whatsapp',    label: 'WhatsApp',    placeholder: 'https://wa.me/39...' },
  ]

  return (
    <div style={{ maxWidth: 640 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Sito pubblico</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 12, color: '#888' }}>Salvataggio…</span>}
          {!saving && saved && <span style={{ fontSize: 12, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
          {saveError && <span style={{ fontSize: 12, color: '#c00' }}>{saveError}</span>}
          {form.active && property.slug && (
            <a href={landingUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#1a1a2e', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: '#f0f0f0', borderRadius: 8 }}>
              <ExternalLink size={13} strokeWidth={2} />
              Anteprima
            </a>
          )}
        </div>
      </div>

      {/* Toggle attivo — sempre visibile */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Sito {form.active ? 'attivo' : 'disattivo'}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
              {form.active ? `Visibile su ${landingUrl}` : 'Disattivo — i visitatori vedono la PWA ospiti'}
            </div>
          </div>
          <Toggle value={form.active} onChange={v => patch('active', v)} color="#1a1a2e" />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '9px 18px', borderRadius: 22, border: 'none', cursor: 'pointer',
            background: activeTab === t.key ? '#1a1a2e' : '#f0f0f0',
            color: activeTab === t.key ? '#fff' : '#555',
            fontWeight: activeTab === t.key ? 700 : 500, fontSize: 13,
            whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Generale */}
      {activeTab === 'generale' && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Impostazioni generali</h3>
          <div style={fieldWrap}>
            <label style={lblStyle}>Tagline</label>
            <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="es. Il comfort di casa, nel cuore delle Dolomiti" style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={lblStyle}>Link prenotazione esterno</label>
            <input type="url" value={form.booking_url} onChange={e => setForm(f => ({ ...f, booking_url: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="https://www.booking.com/hotel/..." style={inputStyle} />
            <span style={hintStyle}>Booking.com, sito proprietario, ecc. Appare come pulsante "Prenota" nel sito.</span>
          </div>
          <div>
            <label style={lblStyle}>Video (YouTube o Vimeo)</label>
            <input type="url" value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="https://www.youtube.com/watch?v=..." style={inputStyle} />
            <span style={hintStyle}>Appare come sezione video dedicata nel sito.</span>
          </div>
        </div>
      )}

      {/* SEO & Social */}
      {activeTab === 'seo' && <>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>SEO</h3>
          <div style={fieldWrap}>
            <label style={lblStyle}>Titolo pagina (SEO title)</label>
            <input value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder={`${property.name} — Hotel a ${property.address || '...'}`} style={inputStyle} />
            <span style={hintStyle}>{form.seo_title.length}/60 caratteri consigliati</span>
          </div>
          <div>
            <label style={lblStyle}>Descrizione (meta description)</label>
            <textarea value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="Breve descrizione che appare nei risultati di Google…" rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
            <span style={hintStyle}>{form.seo_description.length}/160 caratteri consigliati</span>
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Social e link utili</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Appaiono come pulsanti nel footer del sito. Lascia vuoti quelli non utilizzati.
          </p>
          {SOCIAL_ITEMS.map(({ key, label, placeholder }, i) => (
            <div key={key} style={{ marginBottom: i < SOCIAL_ITEMS.length - 1 ? 16 : 0 }}>
              <label style={lblStyle}>{label}</label>
              <input type="url" value={form.social[key]}
                onChange={e => setForm(f => ({ ...f, social: { ...f.social, [key]: e.target.value } }))}
                onBlur={() => save({ minisito: form }).catch(() => {})}
                placeholder={placeholder} style={inputStyle} />
            </div>
          ))}
        </div>
        <TrackingCard form={form} setForm={setForm} save={save} inputStyle={inputStyle} lblStyle={lblStyle} hintStyle={hintStyle} fieldWrap={fieldWrap} cardStyle={cardStyle} sectionTitle={sectionTitle} />
        <GeoCard tipo="struttura" slug={property.slug} faqCount={(form.faq||[]).filter(f=>f.question&&f.answer).length} cardStyle={cardStyle} sectionTitle={sectionTitle} />
      </>}

      {/* Highlights */}
      {activeTab === 'highlights' && <>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Punti di forza</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Fino a 6 card con icona e testo (es. "Vista panoramica", "Pet friendly", "Piscina").
          </p>
          {(form.highlights || []).map(h => {
            const Icon = ICON_MAP[h.icon] || Star
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <select value={h.icon} onChange={e => updateHighlight(h.id, { icon: e.target.value })}
                  style={{ padding: '8px 6px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                  {HIGHLIGHT_ICONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                </select>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} strokeWidth={1.5} color="#1a1a2e" />
                </div>
                <input value={h.text}
                  onChange={e => { const t = e.target.value; setForm(f => ({ ...f, highlights: f.highlights.map(x => x.id === h.id ? { ...x, text: t } : x) })) }}
                  onBlur={() => save({ minisito: form }).catch(() => {})}
                  placeholder="es. Vista panoramica sulle Dolomiti" style={{ ...inputStyle, flex: 1 }} />
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
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Numeri in evidenza</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Fino a 4 statistiche in una banda scura d'impatto (es. "1.200+ Ospiti accolti", "4.9★ Media recensioni").
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
      </>}

      {/* Offerte */}
      {activeTab === 'offerte' && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Offerte e promozioni</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Card promo con CTA. Se imposti una scadenza, la card sparisce automaticamente dopo quella data.
          </p>
          {(form.promozioni || []).map(p => (
            <PromoItem key={p.id} item={p} entityType="struttura" entityId={property.id} onPatch={x => updatePromo(p.id, x)} onRemove={() => removePromo(p.id)} />
          ))}
          <button onClick={addPromo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi offerta
          </button>
        </div>
      )}

      {/* Pacchetti */}
      {activeTab === 'pacchetti' && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Pacchetti e soggiorni</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Soggiorni tematici con elenco inclusi e prezzo (es. "Weekend Romantico", "Family Summer").
          </p>
          {(form.pacchetti || []).map(p => (
            <PacchettoItem key={p.id} item={p} entityType="struttura" entityId={property.id} onPatch={x => updatePacchetto(p.id, x)} onRemove={() => removePacchetto(p.id)} />
          ))}
          <button onClick={addPacchetto} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi pacchetto
          </button>
        </div>
      )}

      {/* Testimonianze */}
      {activeTab === 'testimonianze' && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Testimonianze ospiti</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Inserisci recensioni reali dei tuoi ospiti. Vengono mostrate come card nel sito.
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
      )}

      {/* FAQ */}
      {activeTab === 'faq' && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Domande frequenti (FAQ)</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Rispondi alle domande più comuni. Appaiono come accordion nel sito.
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
      )}

      {/* CTA Banner */}
      {activeTab === 'cta' && (
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
              placeholder="es. Pronto per un'esperienza indimenticabile?" style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={lblStyle}>Sottotitolo (opzionale)</label>
            <input value={form.cta_banner?.subtitle || ''}
              onChange={e => setForm(f => ({ ...f, cta_banner: { ...f.cta_banner, subtitle: e.target.value } }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="es. Prenota ora con la migliore tariffa garantita" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
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
      )}

      {/* Contenuto — blocchi descrittivi avanzati */}
      {activeTab === 'contenuto' && <>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Blocchi foto + testo</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Immagine affiancata al testo (50/50). Su mobile l'immagine va sopra.
          </p>
          {(form.foto_testo || []).map((block, idx) => (
            <FotoTestoItem key={block.id} item={block} entityType="struttura" entityId={property.id}
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
          <button onClick={() => {
            const updated = { ...form, foto_testo: [...(form.foto_testo || []), { id: crypto.randomUUID(), titolo: '', testo: '', image_url: '', inverti: false }] }
            setForm(updated); save({ minisito: updated }).catch(() => {})
          }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi blocco
          </button>
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Paragrafi con icona</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Card con icona + titolo + testo. Ottimo per servizi, specializzazioni, corsi, ecc.
          </p>
          <div style={fieldWrap}>
            <label style={lblStyle}>Titolo sezione</label>
            <input value={form.paragrafi_titolo}
              onChange={e => setForm(f => ({ ...f, paragrafi_titolo: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="es. I nostri servizi / Le nostre specializzazioni" style={inputStyle} />
          </div>
          {(form.paragrafi || []).map((p, idx) => (
            <ParagrafoItem key={p.id} item={p} entityType="struttura" entityId={property.id}
              icons={HIGHLIGHT_ICONS}
              onPatch={patch => {
                const updated = { ...form, paragrafi: form.paragrafi.map(x => x.id === p.id ? { ...x, ...patch } : x) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }}
              onRemove={() => {
                const updated = { ...form, paragrafi: form.paragrafi.filter(x => x.id !== p.id) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }}
              borderBottom={idx < form.paragrafi.length - 1}
            />
          ))}
          <button onClick={() => {
            const updated = { ...form, paragrafi: [...(form.paragrafi || []), { id: crypto.randomUUID(), icon: 'star', titolo: '', testo: '', image_url: '' }] }
            setForm(updated); save({ minisito: updated }).catch(() => {})
          }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi paragrafo
          </button>
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Il team</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Presenta i membri del tuo team con foto, nome, ruolo e bio breve.
          </p>
          <div style={fieldWrap}>
            <label style={lblStyle}>Titolo sezione</label>
            <input value={form.team_titolo}
              onChange={e => setForm(f => ({ ...f, team_titolo: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="es. Il nostro team / I nostri esperti" style={inputStyle} />
          </div>
          {(form.team || []).map((m, idx) => (
            <TeamMemberItem key={m.id} item={m} entityType="struttura" entityId={property.id}
              onPatch={patch => {
                const updated = { ...form, team: form.team.map(x => x.id === m.id ? { ...x, ...patch } : x) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }}
              onRemove={() => {
                const updated = { ...form, team: form.team.filter(x => x.id !== m.id) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }}
              borderBottom={idx < form.team.length - 1}
            />
          ))}
          <button onClick={() => {
            const updated = { ...form, team: [...(form.team || []), { id: crypto.randomUUID(), nome: '', ruolo: '', bio: '', photo_url: '' }] }
            setForm(updated); save({ minisito: updated }).catch(() => {})
          }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi membro
          </button>
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Come funziona (steps)</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Passi numerati con icona e testo. Ideale per spiegare un processo o un percorso.
          </p>
          <div style={fieldWrap}>
            <label style={lblStyle}>Titolo sezione</label>
            <input value={form.steps_titolo}
              onChange={e => setForm(f => ({ ...f, steps_titolo: e.target.value }))}
              onBlur={() => save({ minisito: form }).catch(() => {})}
              placeholder="es. Come funziona / Il tuo percorso" style={inputStyle} />
          </div>
          {(form.steps || []).map((step, idx) => (
            <StepItem key={step.id} item={step} index={idx} icons={HIGHLIGHT_ICONS}
              onPatch={patch => {
                const updated = { ...form, steps: form.steps.map(x => x.id === step.id ? { ...x, ...patch } : x) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }}
              onRemove={() => {
                const updated = { ...form, steps: form.steps.filter(x => x.id !== step.id) }
                setForm(updated); save({ minisito: updated }).catch(() => {})
              }}
              borderBottom={idx < form.steps.length - 1}
            />
          ))}
          <button onClick={() => {
            const updated = { ...form, steps: [...(form.steps || []), { id: crypto.randomUUID(), icon: 'star', titolo: '', testo: '' }] }
            setForm(updated); save({ minisito: updated }).catch(() => {})
          }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', marginTop: 4 }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi step
          </button>
        </div>
      </>}

      {/* Sezioni */}
      {activeTab === 'sezioni' && (
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
      )}

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

function PacchettoItem({ item, entityType, entityId, onPatch, onRemove }) {
  const [badge,        setBadge]        = useState(item.badge          || '')
  const [name,         setName]         = useState(item.name           || '')
  const [tagline,      setTagline]      = useState(item.tagline        || '')
  const [price,        setPrice]        = useState(item.price          || '')
  const [priceLabel,   setPriceLabel]   = useState(item.price_label    || 'a persona')
  const [includes,     setIncludes]     = useState((item.includes      || []).join('\n'))
  const [descFull,     setDescFull]     = useState(item.description_full || '')
  const [duration,     setDuration]     = useState(item.duration       || '')
  const [period,       setPeriod]       = useState(item.period         || '')
  const [minPersons,   setMinPersons]   = useState(item.min_persons    || '')
  const [ctaLabel,     setCtaLabel]     = useState(item.cta_label      || '')
  const [ctaUrl,       setCtaUrl]       = useState(item.cta_url        || '')
  const [uploading,    setUploading]    = useState(false)
  const [uploadingGal, setUploadingGal] = useState(false)
  const coverRef   = useRef()
  const galleryRef = useRef()

  async function handleCoverUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
      onPatch({ cover_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }

  async function handleGalleryUpload(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploadingGal(true)
    try {
      const urls = []
      for (const file of files) {
        const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
        urls.push(url)
      }
      onPatch({ gallery: [...(item.gallery || []), ...urls] })
    } catch {} finally { setUploadingGal(false); e.target.value = '' }
  }

  return (
    <div style={{ background: '#f9f9fb', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Badge (opzionale)</label>
        <input value={badge} onChange={e => setBadge(e.target.value)} onBlur={() => onPatch({ badge })}
          placeholder="es. Più richiesto" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Nome pacchetto *</label>
        <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onPatch({ name })}
          placeholder="es. Weekend Romantico" style={{ ...inputStyle, fontWeight: 600 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Sottotitolo</label>
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
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Durata</label>
          <input value={duration} onChange={e => setDuration(e.target.value)} onBlur={() => onPatch({ duration })}
            placeholder="es. 3 notti / 4 giorni" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Periodo disponibilità</label>
          <input value={period} onChange={e => setPeriod(e.target.value)} onBlur={() => onPatch({ period })}
            placeholder="es. Giugno–Settembre" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Numero minimo persone</label>
        <input value={minPersons} onChange={e => setMinPersons(e.target.value)} onBlur={() => onPatch({ min_persons: minPersons })}
          placeholder="es. 2 persone" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Include (una voce per riga)</label>
        <textarea value={includes}
          onChange={e => setIncludes(e.target.value)}
          onBlur={() => onPatch({ includes: includes.split('\n').map(s => s.trim()).filter(Boolean) })}
          rows={4} placeholder={"Colazione inclusa\nAccesso spa\nLate check-out\nCena romantica"}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Descrizione dettagliata</label>
        <textarea value={descFull}
          onChange={e => setDescFull(e.target.value)}
          onBlur={() => onPatch({ description_full: descFull })}
          rows={5} placeholder="Descrizione completa del pacchetto, visibile nella pagina di dettaglio…"
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 8 }}>Immagine di copertina</label>
        {item.cover_url && <img src={item.cover_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8, display: 'block' }} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => coverRef.current?.click()}
            style={{ fontSize: 13, padding: '6px 14px', background: '#f0f4ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {uploading ? 'Caricamento…' : item.cover_url ? 'Cambia copertina' : 'Carica copertina'}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
          {item.cover_url && (
            <button type="button" onClick={() => onPatch({ cover_url: '' })}
              style={{ fontSize: 12, padding: '4px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Rimuovi
            </button>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 8 }}>Galleria foto</label>
        {(item.gallery || []).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {(item.gallery || []).map((url, idx) => (
              <div key={idx} style={{ position: 'relative', width: 80, height: 60 }}>
                <img src={url} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                <button type="button" onClick={() => onPatch({ gallery: (item.gallery || []).filter((_, i) => i !== idx) })}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#c00', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', padding: 0, lineHeight: '18px', textAlign: 'center' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => galleryRef.current?.click()}
          style={{ fontSize: 13, padding: '6px 14px', background: '#f0f4ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {uploadingGal ? 'Caricamento…' : 'Aggiungi foto'}
        </button>
        <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} style={{ display: 'none' }} />
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

function TrackingCard({ form, setForm, save, inputStyle, lblStyle, hintStyle, fieldWrap, cardStyle, sectionTitle }) {
  const cfg = form.tracking_cfg || {}
  function patchTracking(key, value) {
    const updated = { ...form, tracking_cfg: { ...cfg, [key]: value } }
    setForm(updated)
    save({ minisito: updated }).catch(() => {})
  }
  const FIELDS = [
    { key: 'meta_pixel_id',    label: 'Meta Pixel ID',                        placeholder: 'es. 1234567890123456', hint: 'Meta Business Suite → Gestione eventi → Pixel' },
    { key: 'ga4_id',           label: 'Google Analytics 4 — Measurement ID', placeholder: 'es. G-XXXXXXXXXX',      hint: 'Google Analytics → Amministrazione → Stream dati → Measurement ID' },
    { key: 'gtm_id',           label: 'Google Tag Manager — Container ID',   placeholder: 'es. GTM-XXXXXXX',       hint: 'Google Tag Manager → Account → Container ID (in alto a destra)' },
    { key: 'tiktok_pixel_id',  label: 'TikTok Pixel ID',                     placeholder: 'es. C4ABCDE12345678901', hint: 'TikTok Ads Manager → Assets → Events → Web Events → Pixel' },
  ]
  return (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>Tracking & Analytics</h3>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
        Gli script vengono iniettati automaticamente nel sito. Lascia vuoti quelli non utilizzati.
      </p>
      {FIELDS.map(({ key, label, placeholder, hint }, i) => (
        <div key={key} style={{ ...fieldWrap, marginBottom: i < FIELDS.length - 1 ? 18 : 0 }}>
          <label style={lblStyle}>{label}</label>
          <input value={cfg[key] || ''} placeholder={placeholder}
            onChange={e => setForm(f => ({ ...f, tracking_cfg: { ...(f.tracking_cfg || {}), [key]: e.target.value } }))}
            onBlur={() => patchTracking(key, cfg[key] || '')}
            style={inputStyle} />
          <span style={hintStyle}>{hint}</span>
        </div>
      ))}
    </div>
  )
}

function GeoCard({ tipo, slug, faqCount, cardStyle, sectionTitle }) {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const prefix = { struttura: 's', ristorante: 'r', attivita: 'a' }[tipo] || tipo
  const typeLabel = { struttura: 'LodgingBusiness', ristorante: 'Restaurant', attivita: 'TouristAttraction' }[tipo]
  const entityUrl = `${window.location.origin}/${prefix}/${slug}`
  const checks = [
    { label: `Schema.org ${typeLabel}`, ok: true },
    { label: 'AggregateRating — stelle visibili su Google', ok: true },
    { label: 'Event schema — eventi in evidenza su Google', ok: true },
    { label: `FAQPage schema${faqCount > 0 ? ` (${faqCount} domande)` : ''}`, ok: faqCount > 0, note: faqCount === 0 ? '→ aggiungi FAQ nel tab Contenuto' : null },
    { label: 'robots.txt — AI crawlers ammessi', ok: true },
    { label: 'Sitemap XML', ok: true },
    { label: 'llms.txt — Perplexity / ChatGPT', ok: true },
  ]
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h3 style={{ ...sectionTitle, margin: 0 }}>GEO — AI Search Optimization</h3>
        <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>ATTIVO</span>
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: 4 }}>
        Il tuo sito viene letto e citato da Google AI, ChatGPT, Perplexity e altri motori AI.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: c.ok ? '#16a34a' : '#f59e0b', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{c.ok ? '✓' : '○'}</span>
            <span style={{ color: c.ok ? '#374151' : '#9ca3af' }}>{c.label}</span>
            {c.note && <span style={{ color: '#f59e0b', fontSize: 11 }}>{c.note}</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(entityUrl)}`} target="_blank" rel="noopener noreferrer"
          style={{ padding: '6px 14px', borderRadius: 8, background: '#1a1a2e', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          Testa su Google →
        </a>
        <a href={`${apiBase}/api/guest/sitemap/${tipo}/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{ padding: '6px 14px', borderRadius: 8, background: '#f5f5f7', color: '#1a1a2e', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          Sitemap XML
        </a>
        <a href={`${apiBase}/api/guest/llms/${tipo}/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{ padding: '6px 14px', borderRadius: 8, background: '#f5f5f7', color: '#1a1a2e', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          llms.txt
        </a>
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
        placeholder="es. 1.200+" style={{ ...inputStyle, flex: '0 0 110px', fontWeight: 700, textAlign: 'center' }} />
      <input value={label} onChange={e => setLabel(e.target.value)} onBlur={() => onPatch({ label })}
        placeholder="es. Ospiti accolti" style={{ ...inputStyle, flex: 1 }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4, flexShrink: 0 }}>
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}

function PromoItem({ item, entityType, entityId, onPatch, onRemove }) {
  const [badge,          setBadge]          = useState(item.badge             || '')
  const [title,          setTitle]          = useState(item.title             || '')
  const [text,           setText]           = useState(item.text              || '')
  const [descFull,       setDescFull]       = useState(item.description_full  || '')
  const [validFrom,      setValidFrom]      = useState(item.valid_from        || '')
  const [expiresAt,      setExpiresAt]      = useState(item.expires_at        || '')
  const [conditions,     setConditions]     = useState(item.conditions        || '')
  const [priceOriginal,  setPriceOriginal]  = useState(item.price_original    || '')
  const [priceDisc,      setPriceDisc]      = useState(item.price_discounted  || '')
  const [ctaLabel,       setCtaLabel]       = useState(item.cta_label         || '')
  const [ctaUrl,         setCtaUrl]         = useState(item.cta_url           || '')
  const [uploading,      setUploading]      = useState(false)
  const [uploadingGal,   setUploadingGal]   = useState(false)
  const [uploadErr,      setUploadErr]      = useState('')
  const coverRef   = useRef()
  const galleryRef = useRef()

  const discountPct = priceOriginal && priceDisc
    ? Math.round((1 - parseFloat(priceDisc) / parseFloat(priceOriginal)) * 100)
    : null

  async function handleCoverUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true); setUploadErr('')
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
      onPatch({ cover_url: url })
    } catch (err) { setUploadErr('Errore upload copertina: ' + (err.message || 'riprova')) }
    finally { setUploading(false); e.target.value = '' }
  }

  async function handleGalleryUpload(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploadingGal(true); setUploadErr('')
    try {
      const urls = []
      for (const file of files) {
        const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
        urls.push(url)
      }
      onPatch({ gallery: [...(item.gallery || []), ...urls] })
    } catch (err) { setUploadErr('Errore upload galleria: ' + (err.message || 'riprova')) }
    finally { setUploadingGal(false); e.target.value = '' }
  }

  return (
    <div style={{ background: '#f9f9fb', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Badge (opzionale)</label>
        <input value={badge} onChange={e => setBadge(e.target.value)} onBlur={() => onPatch({ badge })}
          placeholder="es. Offerta limitata" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Titolo offerta *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => onPatch({ title })}
          placeholder="es. Weekend romantico — soggiorno 2 notti" style={{ ...inputStyle, fontWeight: 600 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Descrizione breve</label>
        <input value={text} onChange={e => setText(e.target.value)} onBlur={() => onPatch({ text })}
          placeholder="es. Colazione inclusa, accesso spa, late check-out" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Descrizione dettagliata</label>
        <textarea value={descFull}
          onChange={e => setDescFull(e.target.value)}
          onBlur={() => onPatch({ description_full: descFull })}
          rows={5} placeholder="Descrizione completa dell'offerta, visibile nella pagina di dettaglio…"
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Valida dal</label>
          <input type="date" value={validFrom} onChange={e => { setValidFrom(e.target.value); onPatch({ valid_from: e.target.value }) }} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Valida fino al</label>
          <input type="date" value={expiresAt} onChange={e => { setExpiresAt(e.target.value); onPatch({ expires_at: e.target.value }) }} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 4 }}>Note / Condizioni</label>
        <textarea value={conditions}
          onChange={e => setConditions(e.target.value)}
          onBlur={() => onPatch({ conditions })}
          rows={2} placeholder="es. Non cumulabile con altre offerte. Soggetto a disponibilità."
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Prezzo originale (€)</label>
          <input value={priceOriginal} onChange={e => setPriceOriginal(e.target.value)}
            onBlur={() => onPatch({ price_original: priceOriginal })}
            placeholder="es. 150" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Prezzo scontato (€)</label>
          <input value={priceDisc} onChange={e => setPriceDisc(e.target.value)}
            onBlur={() => onPatch({ price_discounted: priceDisc })}
            placeholder="es. 99" style={inputStyle} />
        </div>
        {discountPct > 0 && (
          <div style={{ flex: '0 0 auto', paddingBottom: 1 }}>
            <div style={{ background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: 14, padding: '8px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
              -{discountPct}%
            </div>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 8 }}>Immagine di copertina</label>
        {item.cover_url && <img src={item.cover_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8, display: 'block' }} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => coverRef.current?.click()}
            style={{ fontSize: 13, padding: '6px 14px', background: '#f0f4ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {uploading ? 'Caricamento…' : item.cover_url ? 'Cambia copertina' : 'Carica copertina'}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
          {item.cover_url && (
            <button type="button" onClick={() => onPatch({ cover_url: '' })}
              style={{ fontSize: 12, padding: '4px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Rimuovi
            </button>
          )}
        </div>
        {uploadErr && <p style={{ color: '#c00', fontSize: 12, marginTop: 6, marginBottom: 0 }}>{uploadErr}</p>}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lblStyle, marginBottom: 8 }}>Galleria foto</label>
        {(item.gallery || []).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {(item.gallery || []).map((url, idx) => (
              <div key={idx} style={{ position: 'relative', width: 80, height: 60 }}>
                <img src={url} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                <button type="button" onClick={() => onPatch({ gallery: (item.gallery || []).filter((_, i) => i !== idx) })}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#c00', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', padding: 0, lineHeight: '18px', textAlign: 'center' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => galleryRef.current?.click()}
          style={{ fontSize: 13, padding: '6px 14px', background: '#f0f4ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {uploadingGal ? 'Caricamento…' : 'Aggiungi foto'}
        </button>
        <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} style={{ display: 'none' }} />
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

function FotoTestoItem({ item, entityType, entityId, onPatch, onRemove, borderBottom }) {
  const [titolo,    setTitolo]    = useState(item.titolo || '')
  const [testo,     setTesto]     = useState(item.testo  || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
      onPatch({ image_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: borderBottom ? '1px solid #f0f0f0' : 'none' }}>
      <div style={fieldWrap}>
        <label style={lblStyle}>Titolo (opzionale)</label>
        <input value={titolo} onChange={e => setTitolo(e.target.value)} onBlur={() => onPatch({ titolo })}
          placeholder="es. La nostra storia" style={inputStyle} />
      </div>
      <div style={fieldWrap}>
        <label style={lblStyle}>Testo</label>
        <textarea value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onPatch({ testo })}
          rows={4} placeholder="Testo descrittivo del blocco…" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {item.image_url && (
        <img src={item.image_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block' }} />
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ fontSize: 13, padding: '6px 14px', background: '#f0f4ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {uploading ? 'Caricamento…' : item.image_url ? 'Cambia immagine' : 'Carica immagine'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={item.inverti || false} onChange={e => onPatch({ inverti: e.target.checked })}
            style={{ accentColor: '#1a1a2e' }} />
          Foto a destra
        </label>
        {item.image_url && (
          <button type="button" onClick={() => onPatch({ image_url: '' })}
            style={{ fontSize: 12, padding: '4px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Rimuovi immagine
          </button>
        )}
      </div>
      <button type="button" onClick={onRemove}
        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, padding: 0, marginTop: 12 }}>
        <Trash2 size={13} strokeWidth={1.5} /> Rimuovi blocco
      </button>
    </div>
  )
}

function ParagrafoItem({ item, entityType, entityId, icons, onPatch, onRemove, borderBottom }) {
  const [titolo,    setTitolo]    = useState(item.titolo || '')
  const [testo,     setTesto]     = useState(item.testo  || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const Icon = (icons.find(i => i.key === item.icon) || icons[0]).Icon

  async function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
      onPatch({ image_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: borderBottom ? '1px solid #f0f0f0' : 'none' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: '0 0 auto' }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Icona</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select value={item.icon} onChange={e => onPatch({ icon: e.target.value })}
              style={{ padding: '8px 6px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff' }}>
              {icons.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} strokeWidth={1.5} color="#1a1a2e" />
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...lblStyle, marginBottom: 4 }}>Titolo</label>
          <input value={titolo} onChange={e => setTitolo(e.target.value)} onBlur={() => onPatch({ titolo })}
            placeholder="es. Cardiologia" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lblStyle}>Testo</label>
        <textarea value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onPatch({ testo })}
          rows={3} placeholder="Descrizione…" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {item.image_url && (
        <img src={item.image_url} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8, display: 'block' }} />
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ fontSize: 12, padding: '5px 12px', background: '#f0f4ff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
          {uploading ? 'Caricamento…' : item.image_url ? 'Cambia foto' : 'Foto (opzionale)'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        {item.image_url && (
          <button type="button" onClick={() => onPatch({ image_url: '' })}
            style={{ fontSize: 12, padding: '4px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Rimuovi foto
          </button>
        )}
        <button type="button" onClick={onRemove}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4 }}>
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function TeamMemberItem({ item, entityType, entityId, onPatch, onRemove, borderBottom }) {
  const [nome,      setNome]      = useState(item.nome  || '')
  const [ruolo,     setRuolo]     = useState(item.ruolo || '')
  const [bio,       setBio]       = useState(item.bio   || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/minisito-image?entity_type=${entityType}&entity_id=${entityId}`, file)
      onPatch({ photo_url: url })
    } catch {} finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: borderBottom ? '1px solid #f0f0f0' : 'none', display: 'flex', gap: 14 }}>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #eee' }}>
          {item.photo_url
            ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Users size={28} strokeWidth={1.5} color="#aaa" />
          }
        </div>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ fontSize: 11, padding: '4px 8px', background: '#f0f4ff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {uploading ? '…' : 'Foto'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input value={nome} onChange={e => setNome(e.target.value)} onBlur={() => onPatch({ nome })}
          placeholder="Nome e cognome" style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }} />
        <input value={ruolo} onChange={e => setRuolo(e.target.value)} onBlur={() => onPatch({ ruolo })}
          placeholder="es. Direttore / Cardiologo / Chef" style={{ ...inputStyle, marginBottom: 8 }} />
        <textarea value={bio} onChange={e => setBio(e.target.value)} onBlur={() => onPatch({ bio })}
          rows={2} placeholder="Breve bio…" style={{ ...inputStyle, resize: 'vertical', marginBottom: 4 }} />
        <button type="button" onClick={onRemove}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, padding: 0 }}>
          <Trash2 size={13} strokeWidth={1.5} /> Rimuovi
        </button>
      </div>
    </div>
  )
}

function StepItem({ item, index, icons, onPatch, onRemove, borderBottom }) {
  const [titolo, setTitolo] = useState(item.titolo || '')
  const [testo,  setTesto]  = useState(item.testo  || '')
  const Icon = (icons.find(i => i.key === item.icon) || icons[0]).Icon

  return (
    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: borderBottom ? '1px solid #f0f0f0' : 'none' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0, marginTop: 6 }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select value={item.icon} onChange={e => onPatch({ icon: e.target.value })}
              style={{ padding: '7px 6px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', flexShrink: 0 }}>
              {icons.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
            <input value={titolo} onChange={e => setTitolo(e.target.value)} onBlur={() => onPatch({ titolo })}
              placeholder="es. Prenota online" style={{ ...inputStyle, flex: 1 }} />
          </div>
          <textarea value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onPatch({ testo })}
            rows={2} placeholder="Breve descrizione del passaggio…" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4, marginTop: 4, flexShrink: 0 }}>
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
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
