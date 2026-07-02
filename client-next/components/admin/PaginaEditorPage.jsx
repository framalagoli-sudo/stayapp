'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  GripVertical, AlignLeft, Image, Grid, Users, List, Star, BarChart2, Zap,
  MessageCircle, Tag, Package, HelpCircle, Video, Settings, Compass, Map,
  Calendar, FileText, Clock, Mail, Phone, MapPin, ChevronDown, ChevronUp,
  Plus, Trash2, Copy, Clipboard, ImageIcon, Layers, Building2, GalleryHorizontal, Columns, Minus, Megaphone, Utensils, Share2, Code, SlidersHorizontal,
} from 'lucide-react'
import AiButton from '@/components/admin/AiButton'
import RichTextEditor from '@/components/admin/RichTextEditor'
import MediaPickerButton from '@/components/admin/MediaPicker'
import UnsplashPicker from '@/components/admin/UnsplashPicker'
import { BLOCK_PATTERNS } from '@/lib/blockPatterns'
import { BLOCK_TYPES, BLOCK_GROUPS, BLOCK_DEFAULTS, blockLabel, BLOCK_BG_OPTIONS, BLOCK_PADY_OPTIONS, blockSupportsBg, BLOCK_TEXT_SIZE_OPTIONS, BLOCK_TEXT_COLOR_OPTIONS, blockHasText, GRID_AUTO_BLOCKS, BLOCK_COLUMNS_OPTIONS } from '@/lib/blockTypes'

function uid() { return crypto.randomUUID() }

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i')
    .replace(/[òó]/g,'o').replace(/[ùú]/g,'u').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'pagina'
}

// ── Block icon + color mapping ────────────────────────────────────────────────
const BLOCK_ICON_MAP = {
  hero: Layers, hero_slider: GalleryHorizontal, carosello: GalleryHorizontal, about: AlignLeft, pulsante: Zap, foto_testo: Image, paragrafi: Grid,
  colonne: Columns, divisore: Minus, annuncio: Megaphone, menu: Utensils,
  accordion: ChevronDown, social: Share2, countdown: Clock, before_after: SlidersHorizontal, embed: Code,
  team: Users, steps: List, highlights: Star, stats: BarChart2,
  cta_banner: Zap, testimonianze: MessageCircle, promozioni: Tag,
  pacchetti: Package, faq: HelpCircle, immagine: Image, galleria_immagini: Grid, gallery: ImageIcon, video: Video,
  services: Settings, activities: Compass, excursions: Map, eventi: Calendar,
  news: FileText, booking: Clock, newsletter: Mail, contatti: Phone,
  show_map: MapPin, clienti: Building2,
}
const GROUP_COLORS = {
  layout: '#5b6af8', marketing: '#f97316', media: '#0891b2',
  servizi: '#16a34a', conversione: '#9333ea',
}
function blockColor(type) {
  const grp = BLOCK_TYPES.find(b => b.type === type)?.group
  return GROUP_COLORS[grp] || '#666'
}
function BlockTypeIcon({ type, size = 15, muted = false }) {
  const Icon = BLOCK_ICON_MAP[type] || FileText
  return <Icon size={size} strokeWidth={1.5} color={muted ? '#aaa' : blockColor(type)} />
}

// ── ItemListEditor ────────────────────────────────────────────────────────────
function ItemListEditor({ items = [], onChange, fields, newItem, entityId, entityTipo }) {
  function update(idx, key, val) { onChange(items.map((it, i) => i === idx ? { ...it, [key]: val } : it)) }
  function add() { onChange([...items, { id: uid(), ...newItem }]) }
  function remove(idx) { onChange(items.filter((_, i) => i !== idx)) }
  function move(idx, dir) {
    const arr = [...items]; const t = idx + dir
    if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]; onChange(arr)
  }
  return (
    <div>
      {items.map((it, idx) => (
        <div key={it.id || idx} style={{ background: '#f9f9fb', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => move(idx, -1)} style={tinyBtn}>▲</button>
              <button onClick={() => move(idx, 1)} style={tinyBtn}>▼</button>
            </div>
            <button onClick={() => remove(idx)} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
          </div>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 8 }}>
              {f.label && <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 3 }}>{f.label}</label>}
              {f.type === 'image'
                ? <div>
                    {it[f.key] && <img src={it[f.key]} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <UnsplashPicker label="Unsplash" defaultQuery={it.title || ''} onPick={url => update(idx, f.key, url)} />
                      <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => update(idx, f.key, url)} />
                    </div>
                    <input type="text" value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} placeholder="https://..." style={inputStyle()} />
                  </div>
                : f.type === 'textarea'
                ? <textarea value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} rows={f.rows || 3} style={inputStyle()} />
                : f.type === 'toggle'
                ? <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={!!it[f.key]} onChange={e => update(idx, f.key, e.target.checked)} />
                    {f.toggleLabel || f.label}
                  </label>
                : f.type === 'number'
                ? <input type="number" value={it[f.key] ?? ''} onChange={e => update(idx, f.key, Number(e.target.value))} style={{ ...inputStyle(), width: 80 }} />
                : <input type="text" value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} placeholder={f.placeholder || ''} style={inputStyle()} />
              }
            </div>
          ))}
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: '8px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
        + Aggiungi elemento
      </button>
    </div>
  )
}

// ── SlidesEditor (hero_slider) ────────────────────────────────────────────────
function SlidesEditor({ slides = [], onChange, entityId, entityTipo }) {
  function update(idx, key, val) { onChange(slides.map((s, i) => i === idx ? { ...s, [key]: val } : s)) }
  function add() { onChange([...slides, { id: uid(), image_url: '', title: '', subtitle: '', cta1_text: '', cta1_url: '', cta2_text: '', cta2_url: '' }]) }
  function remove(idx) { onChange(slides.filter((_, i) => i !== idx)) }
  function move(idx, dir) { const a = [...slides]; const t = idx + dir; if (t < 0 || t >= a.length) return; [a[idx], a[t]] = [a[t], a[idx]]; onChange(a) }
  return (
    <div>
      {slides.map((s, idx) => (
        <div key={s.id || idx} style={{ background: '#f9f9fb', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Slide {idx + 1}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => move(idx, -1)} style={tinyBtn}>▲</button>
              <button onClick={() => move(idx, 1)} style={tinyBtn}>▼</button>
              <button onClick={() => remove(idx)} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
            </div>
          </div>
          {s.image_url && <img src={s.image_url} alt="" style={{ width: '100%', maxHeight: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <UnsplashPicker label="Cerca su Unsplash" defaultQuery={s.title} onPick={url => update(idx, 'image_url', url)} />
            <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => update(idx, 'image_url', url)} />
          </div>
          <Field label="URL immagine" value={s.image_url} onChange={v => update(idx, 'image_url', v)} placeholder="https://..." style={{ marginBottom: 8 }} />
          <Field label="Titolo" value={s.title} onChange={v => update(idx, 'title', v)} style={{ marginBottom: 8 }} />
          <Field label="Sottotitolo (corsivo)" value={s.subtitle} onChange={v => update(idx, 'subtitle', v)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="Pulsante 1 — testo" value={s.cta1_text} onChange={v => update(idx, 'cta1_text', v)} style={{ flex: 1 }} />
            <Field label="Pulsante 1 — URL" value={s.cta1_url} onChange={v => update(idx, 'cta1_url', v)} placeholder="https://..." style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Field label="Pulsante 2 — testo (opz.)" value={s.cta2_text} onChange={v => update(idx, 'cta2_text', v)} style={{ flex: 1 }} />
            <Field label="Pulsante 2 — URL" value={s.cta2_url} onChange={v => update(idx, 'cta2_url', v)} placeholder="https://..." style={{ flex: 1 }} />
          </div>
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: '9px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
        + Aggiungi slide
      </button>
    </div>
  )
}

// ── BlockEditor ───────────────────────────────────────────────────────────────
function BlockEditor({ block, onChange, entityId, entityTipo }) {
  const { type, data } = block
  const upd = (key, val) => onChange({ ...data, [key]: val })

  if (GRID_AUTO_BLOCKS.includes(type)) {
    const numStyle = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
          <BlockTypeIcon type={type} size={16} />
          <p style={{ fontSize: 12, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            Mostra i dati dell'entità (condivisi con l'app). Personalizza titolo e impaginazione qui sotto.
          </p>
        </div>
        <Field label="Titolo sezione (vuoto = predefinito)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <Field label="Sottotitolo (vuoto = predefinito)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Quanti elementi</label>
            <input type="number" min="1" value={data.limit ?? ''} onChange={e => upd('limit', e.target.value ? Number(e.target.value) : undefined)} placeholder="Tutti" style={numStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Colonne (desktop)</label>
            <select value={data.columns || ''} onChange={e => upd('columns', e.target.value)} style={{ ...numStyle, background: '#fff' }}>
              {BLOCK_COLUMNS_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Su mobile le colonne si adattano automaticamente.</p>
      </div>
    )
  }
  if (['booking', 'show_map'].includes(type)) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
        <BlockTypeIcon type={type} size={16} />
        <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          Questo blocco visualizza automaticamente i dati dell'entità — nessuna configurazione necessaria.
        </p>
      </div>
    )
  }

  switch (type) {
    case 'hero': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo principale" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Tagline / Sottotitolo" value={data.tagline} onChange={v => upd('tagline', v)} />
        <Field label="URL immagine di sfondo" value={data.bg_image_url} onChange={v => upd('bg_image_url', v)} placeholder="https://..." />
        {data.bg_image_url && <img src={data.bg_image_url} alt="" style={{ maxHeight: 100, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <UnsplashPicker label="Cerca su Unsplash" defaultQuery={data.title} onPick={url => upd('bg_image_url', url)} />
          <UploadBtn label="Carica immagine sfondo" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('bg_image_url', url)} />
        </div>
        <Field label="Video di sfondo (URL mp4, opz.)" value={data.bg_video} onChange={v => upd('bg_video', v)} placeholder="https://....mp4" />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Opacità overlay ({Math.round((data.overlay_opacity ?? 0.5) * 100)}%)</label>
          <input type="range" min="0" max="1" step="0.05" value={data.overlay_opacity ?? 0.5} onChange={e => upd('overlay_opacity', parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Altezza</label>
          <select value={data.height || 'large'} onChange={e => upd('height', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="full">Piena (100vh)</option>
            <option value="large">Grande (85vh)</option>
            <option value="medium">Media (65vh)</option>
          </select>
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 8 }}>CTA primario</div>
          <Field label="Testo pulsante" value={data.cta1_text} onChange={v => upd('cta1_text', v)} />
          <div style={{ marginTop: 8 }}>
            <Field label="URL pulsante" value={data.cta1_url} onChange={v => upd('cta1_url', v)} placeholder="https://..." />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 8 }}>CTA secondario (opz.)</div>
          <Field label="Testo pulsante" value={data.cta2_text} onChange={v => upd('cta2_text', v)} />
          <div style={{ marginTop: 8 }}>
            <Field label="URL pulsante" value={data.cta2_url} onChange={v => upd('cta2_url', v)} placeholder="https://..." />
          </div>
        </div>
      </div>
    )
    case 'hero_slider': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SlidesEditor slides={data.slides} onChange={v => upd('slides', v)} entityId={entityId} entityTipo={entityTipo} />
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Altezza</label>
              <select value={data.height || 'full'} onChange={e => upd('height', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <option value="full">Piena (100vh)</option>
                <option value="large">Grande (85vh)</option>
                <option value="medium">Media (65vh)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Allineamento testo</label>
              <select value={data.text_align || 'center'} onChange={e => upd('text_align', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <option value="center">Centrato</option>
                <option value="left">A sinistra</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Opacità velo scuro ({Math.round((data.overlay_opacity ?? 0.45) * 100)}%)</label>
            <input type="range" min="0" max="0.85" step="0.05" value={data.overlay_opacity ?? 0.45} onChange={e => upd('overlay_opacity', parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.autoplay !== false} onChange={e => upd('autoplay', e.target.checked)} />
              Scorrimento automatico
            </label>
            {data.autoplay !== false && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                ogni
                <input type="number" min="2" max="20" value={data.interval ?? 6} onChange={e => upd('interval', Number(e.target.value))} style={{ width: 60, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
                secondi
              </label>
            )}
          </div>
        </div>
      </div>
    )
    case 'carosello': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)} entityId={entityId} entityTipo={entityTipo}
          newItem={{ image_url: '', title: '', text: '', button_label: '', button_url: '' }}
          fields={[
            { key: 'image_url', label: 'Immagine', type: 'image' },
            { key: 'title', label: 'Titolo' },
            { key: 'text', label: 'Testo', type: 'textarea', rows: 2 },
            { key: 'button_label', label: 'Pulsante (opz.)' },
            { key: 'button_url', label: 'URL pulsante', placeholder: 'https://...' },
          ]} />
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Card visibili (desktop)</label>
            <select value={data.per_view || 3} onChange={e => upd('per_view', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
            <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>Su mobile si adatta automaticamente (1 per volta).</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.autoplay !== false} onChange={e => upd('autoplay', e.target.checked)} /> Scorrimento automatico
            </label>
            {data.autoplay !== false && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                ogni <input type="number" min="2" max="20" value={data.interval ?? 5} onChange={e => upd('interval', Number(e.target.value))} style={{ width: 60, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} /> secondi
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.show_arrows !== false} onChange={e => upd('show_arrows', e.target.checked)} /> Frecce
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.show_dots !== false} onChange={e => upd('show_dots', e.target.checked)} /> Puntini
            </label>
          </div>
        </div>
      </div>
    )
    case 'accordion': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ title: '', text: '' }}
          fields={[{ key: 'title', label: 'Titolo' }, { key: 'text', label: 'Contenuto', type: 'textarea', rows: 3 }]} />
      </div>
    )
    case 'social': return (
      <div>
        <Field label="Titolo (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ network: 'instagram', url: '' }}
          fields={[{ key: 'network', label: 'Social', placeholder: 'instagram, facebook, whatsapp, youtube…' }, { key: 'url', label: 'Link', placeholder: 'https://...' }]} />
      </div>
    )
    case 'countdown': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Data e ora di fine</label>
          <input type="datetime-local" value={data.target || ''} onChange={e => upd('target', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
        </div>
      </div>
    )
    case 'before_after': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {['before', 'after'].map(side => {
          const key = `${side}_url`
          return (
            <div key={side}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 600 }}>{side === 'before' ? 'Immagine PRIMA' : 'Immagine DOPO'}</label>
              {data[key] && <img src={data[key]} alt="" style={{ width: '100%', maxHeight: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <UnsplashPicker label="Unsplash" onPick={url => upd(key, url)} />
                <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd(key, url)} />
              </div>
              <input type="text" value={data[key] || ''} onChange={e => upd(key, e.target.value)} placeholder="https://..." style={{ width: '100%', border: '1px solid #e0e0e8', borderRadius: 7, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Etichetta PRIMA" value={data.before_label} onChange={v => upd('before_label', v)} style={{ flex: 1 }} />
          <Field label="Etichetta DOPO" value={data.after_label} onChange={v => upd('after_label', v)} style={{ flex: 1 }} />
        </div>
      </div>
    )
    case 'embed': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Codice HTML / iframe</label>
          <textarea value={data.html || ''} onChange={e => upd('html', e.target.value)} rows={6} placeholder="<iframe src=... ></iframe>" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>Incolla il codice fornito dal servizio (mappe, prenotazioni, widget). Mostrato in una sandbox sicura.</p>
        </div>
        <div style={{ maxWidth: 160 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Altezza (px)</label>
          <input type="number" min="100" value={data.height || 400} onChange={e => upd('height', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
        </div>
      </div>
    )
    case 'menu': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
          <BlockTypeIcon type="menu" size={16} />
          <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>Mostra il menù del ristorante (categorie, piatti, prezzi, allergeni). Le voci si gestiscono nella tab <strong>Menu</strong> del ristorante.</p>
        </div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
      </div>
    )
    case 'colonne': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Numero colonne</label>
          <select value={data.columns || 2} onChange={e => upd('columns', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value={2}>2</option><option value={3}>3</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ title: '', text: '' }}
          fields={[{ key: 'title', label: 'Titolo colonna' }, { key: 'text', label: 'Testo', type: 'textarea', rows: 3 }]} />
      </div>
    )
    case 'divisore': return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
          <select value={data.variant || 'space'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="space">Spazio vuoto</option>
            <option value="line">Linea sottile</option>
            <option value="wave">Onda</option>
            <option value="diagonal">Diagonale</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Dimensione</label>
          <select value={data.size || 'medium'} onChange={e => upd('size', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="small">Piccola</option><option value="medium">Media</option><option value="large">Grande</option>
          </select>
        </div>
        {(data.variant === 'wave' || data.variant === 'diagonal') && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Colore forma</label>
            <select value={data.color || 'muted'} onChange={e => upd('color', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="muted">Grigio</option>
              <option value="primary">Colore tema</option>
              <option value="secondary">Accento</option>
              <option value="dark">Scuro</option>
            </select>
          </div>
        )}
      </div>
    )
    case 'annuncio': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Testo annuncio" value={data.text} onChange={v => upd('text', v)} placeholder="Es. Spedizione gratuita sopra i 50€" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Testo link (opz.)" value={data.link_text} onChange={v => upd('link_text', v)} style={{ flex: 1 }} />
          <Field label="URL link" value={data.link_url} onChange={v => upd('link_url', v)} placeholder="https://..." style={{ flex: 1 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Colore</label>
          <select value={data.bg || 'primary'} onChange={e => upd('bg', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="primary">Colore principale</option>
            <option value="secondary">Colore accento</option>
            <option value="dark">Scuro</option>
          </select>
        </div>
      </div>
    )
    case 'about': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione" value={data.title} onChange={v => upd('title', v)} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>Testo</label>
            <AiButton
              tipo="minisito_about"
              contesto={data.title ? `Sezione: "${data.title}"` : ''}
              temaSuggerito={data.title || ''}
              label="✨ Genera"
              showTono={false}
              placeholder="Descrivi brevemente di cosa tratta questa sezione…"
              onInsert={v => upd('text', v)}
            />
          </div>
          <RichTextEditor content={data.text} onChange={v => upd('text', v)} format="json" minimal placeholder="Scrivi il testo…" />
        </div>
      </div>
    )
    case 'foto_testo': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Testo</label>
          <RichTextEditor content={data.text} onChange={v => upd('text', v)} format="json" minimal placeholder="Scrivi il testo…" />
        </div>
        <Field label="URL immagine" value={data.image_url} onChange={v => upd('image_url', v)} placeholder="https://..." />
        {data.image_url && <img src={data.image_url} alt="" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <UnsplashPicker label="Cerca su Unsplash" defaultQuery={data.title} onPick={url => upd('image_url', url)} />
          <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('image_url', url)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!data.inverti} onChange={e => upd('inverti', e.target.checked)} />
          Inverti: testo a sinistra, immagine a destra
        </label>
        <Field label="Testo pulsante (opz.)" value={data.button_label} onChange={v => upd('button_label', v)} />
        <Field label="URL pulsante (opz.)" value={data.button_url} onChange={v => upd('button_url', v)} placeholder="https://..." />
      </div>
    )
    case 'cta_banner': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'center'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="center">Centrato</option>
            <option value="split">Diviso (testo + pulsante a lato)</option>
          </select>
        </div>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
        <Field label="Testo pulsante" value={data.button_text} onChange={v => upd('button_text', v)} />
        <Field label="URL pulsante" value={data.button_url} onChange={v => upd('button_url', v)} placeholder="https://..." />
      </div>
    )
    case 'pulsante': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Testo del pulsante" value={data.text} onChange={v => upd('text', v)} />
        <Field label="Link (URL)" value={data.url} onChange={v => upd('url', v)} placeholder="https://..." />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Stile</label>
            <select value={data.style || 'filled'} onChange={e => upd('style', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="filled">Pieno</option>
              <option value="outline">Bordato</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Dimensione</label>
            <select value={data.size || 'medium'} onChange={e => upd('size', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="small">Piccolo</option>
              <option value="medium">Medio</option>
              <option value="large">Grande</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Allineamento</label>
            <select value={data.align || 'center'} onChange={e => upd('align', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="left">Sinistra</option>
              <option value="center">Centro</option>
              <option value="right">Destra</option>
            </select>
          </div>
        </div>
      </div>
    )
    case 'video': return (
      <Field label="URL video (YouTube o Vimeo)" value={data.url} onChange={v => upd('url', v)} placeholder="https://youtube.com/watch?v=..." />
    )
    case 'galleria_immagini': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Colonne</label>
          <select value={data.columns || 3} onChange={e => upd('columns', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value={2}>2 colonne</option>
            <option value={3}>3 colonne</option>
            <option value={4}>4 colonne</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data.images || []).map((it, idx) => (
            <div key={it.id || idx} style={{ background: '#f8f9ff', border: '1px solid #e8ecff', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Immagine {idx + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { const a = [...(data.images || [])]; if (idx > 0) { [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; upd('images', a) } }} style={tinyBtn}>▲</button>
                  <button onClick={() => { const a = [...(data.images || [])]; if (idx < a.length - 1) { [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; upd('images', a) } }} style={tinyBtn}>▼</button>
                  <button onClick={() => upd('images', (data.images || []).filter((_, i) => i !== idx))} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
                </div>
              </div>
              {it.url && <img src={it.url} alt="" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'cover', borderRadius: 6, marginBottom: 8, display: 'block' }} />}
              <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('images', (data.images || []).map((x, i) => i === idx ? { ...x, url } : x))} />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 3 }}>Testo alternativo (alt)</label>
                <input type="text" value={it.alt || ''} onChange={e => upd('images', (data.images || []).map((x, i) => i === idx ? { ...x, alt: e.target.value } : x))} placeholder="Descrizione" style={inputStyle()} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => upd('images', [...(data.images || []), { id: uid(), url: '', alt: '' }])}
            style={{ flex: 1, minWidth: 140, padding: '8px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
            + Aggiungi immagine
          </button>
          <MediaPickerButton entityId={entityId} entityTipo={entityTipo} label="Sfoglia e aggiungi"
            onPick={url => upd('images', [...(data.images || []), { id: uid(), url, alt: '' }])} />
        </div>
      </div>
    )
    case 'immagine': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.image_url && <img src={data.image_url} alt="" style={{ maxHeight: 140, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <UnsplashPicker label="Cerca su Unsplash" defaultQuery={data.alt} onPick={url => upd('image_url', url)} />
          <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('image_url', url)} />
          <MediaPickerButton entityId={entityId} entityTipo={entityTipo} onPick={url => upd('image_url', url)} />
        </div>
        <Field label="URL immagine" value={data.image_url} onChange={v => upd('image_url', v)} placeholder="https://..." />
        <Field label="Testo alternativo (alt — SEO e accessibilità)" value={data.alt} onChange={v => upd('alt', v)} placeholder="Descrizione dell'immagine" />
        <Field label="Didascalia (opz.)" value={data.caption} onChange={v => upd('caption', v)} />
        <Field label="Link al click (opz.)" value={data.link_url} onChange={v => upd('link_url', v)} placeholder="https://..." />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Larghezza</label>
          <select value={data.width || 'large'} onChange={e => upd('width', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="full">Piena</option>
            <option value="large">Grande</option>
            <option value="medium">Media</option>
            <option value="small">Piccola</option>
          </select>
        </div>
      </div>
    )
    case 'newsletter': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
      </div>
    )
    case 'highlights': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'card'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="card">Card</option>
            <option value="plain">Minimal (senza card)</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ icon: 'star', text: '' }}
          fields={[{ key: 'icon', label: 'Icona (es. star, heart, wifi)', placeholder: 'star' }, { key: 'text', label: 'Testo' }]} />
      </div>
    )
    case 'stats': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'dark'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="dark">Banda scura</option>
            <option value="plain">Sfondo chiaro</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ value: '', label: '' }}
          fields={[{ key: 'value', label: 'Valore (es. 150+)', placeholder: '150+' }, { key: 'label', label: 'Etichetta' }]} />
      </div>
    )
    case 'paragrafi': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ icon: 'star', title: '', text: '', image_url: '' }}
          fields={[
            { key: 'icon', label: 'Icona', placeholder: 'star' },
            { key: 'title', label: 'Titolo' },
            { key: 'text', label: 'Testo', type: 'textarea', rows: 2 },
            { key: 'image_url', label: 'Immagine URL (opz.)', placeholder: 'https://...' },
          ]} />
      </div>
    )
    case 'team': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ photo_url: '', nome: '', ruolo: '', bio: '' }}
          fields={[
            { key: 'photo_url', label: 'URL foto (circolare)', placeholder: 'https://...' },
            { key: 'nome', label: 'Nome' },
            { key: 'ruolo', label: 'Ruolo' },
            { key: 'bio', label: 'Breve bio', type: 'textarea', rows: 2 },
          ]} />
      </div>
    )
    case 'steps': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ icon: 'check-circle', title: '', text: '' }}
          fields={[
            { key: 'icon', label: 'Icona', placeholder: 'check-circle' },
            { key: 'title', label: 'Titolo passo' },
            { key: 'text', label: 'Descrizione', type: 'textarea', rows: 2 },
          ]} />
      </div>
    )
    case 'testimonianze': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'grid'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="grid">Griglia di card</option>
            <option value="quote">Citazione grande</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ author: '', location: '', rating: 5, text: '' }}
          fields={[
            { key: 'author', label: 'Autore' },
            { key: 'location', label: 'Luogo (opz.)' },
            { key: 'rating', label: 'Stelle (1-5)', type: 'number' },
            { key: 'text', label: 'Testo', type: 'textarea', rows: 3 },
          ]} />
      </div>
    )
    case 'faq': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ question: '', answer: '' }}
          fields={[
            { key: 'question', label: 'Domanda' },
            { key: 'answer', label: 'Risposta', type: 'textarea', rows: 3 },
          ]} />
      </div>
    )
    case 'promozioni': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ badge: '', title: '', text: '', cta_label: '', cta_url: '', expires_at: '' }}
          fields={[
            { key: 'badge', label: 'Badge (es. -20%)', placeholder: '-20%' },
            { key: 'title', label: 'Titolo offerta' },
            { key: 'text', label: 'Descrizione', type: 'textarea', rows: 2 },
            { key: 'cta_label', label: 'Testo pulsante' },
            { key: 'cta_url', label: 'URL pulsante', placeholder: 'https://...' },
            { key: 'expires_at', label: 'Scadenza (YYYY-MM-DD)', placeholder: '2026-12-31' },
          ]} />
      </div>
    )
    case 'pacchetti': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ badge: '', name: '', tagline: '', price: '', price_label: 'a persona', cta_label: 'Scegli', cta_url: '' }}
          fields={[
            { key: 'badge', label: 'Badge', placeholder: 'Più scelto' },
            { key: 'name', label: 'Nome pacchetto' },
            { key: 'tagline', label: 'Tagline' },
            { key: 'price', label: 'Prezzo', placeholder: '€ 99' },
            { key: 'price_label', label: 'Etichetta prezzo', placeholder: 'a persona' },
            { key: 'cta_label', label: 'Testo pulsante' },
            { key: 'cta_url', label: 'URL pulsante', placeholder: 'https://...' },
          ]} />
      </div>
    )
    case 'form_builder': return (
      <FormBuilderBlockEditor data={data} onChange={upd} />
    )
    case 'clienti': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} placeholder="I nostri clienti" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data.items || []).map((it, idx) => (
            <div key={it.id || idx} style={{ background: '#f8f9ff', border: '1px solid #e8ecff', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Logo {idx + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { const a=[...(data.items||[])]; if(idx>0){[a[idx-1],a[idx]]=[a[idx],a[idx-1]]; upd('items',a)} }} style={tinyBtn}>▲</button>
                  <button onClick={() => { const a=[...(data.items||[])]; if(idx<a.length-1){[a[idx],a[idx+1]]=[a[idx+1],a[idx]]; upd('items',a)} }} style={tinyBtn}>▼</button>
                  <button onClick={() => upd('items', (data.items||[]).filter((_,i) => i!==idx))} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
                </div>
              </div>
              {it.logo_url && <img src={it.logo_url} alt="" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, marginBottom: 8, display: 'block' }} />}
              <UploadBtn label="Carica logo" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('items', (data.items||[]).map((x,i) => i===idx ? {...x, logo_url: url} : x))} />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 3 }}>URL link (opz.)</label>
                <input type="text" value={it.link_url||''} onChange={e => upd('items', (data.items||[]).map((x,i) => i===idx ? {...x, link_url: e.target.value} : x))} placeholder="https://..." style={inputStyle()} />
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => upd('items', [...(data.items||[]), { id: uid(), logo_url: '', link_url: '' }])}
          style={{ width: '100%', padding: '8px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
          + Aggiungi logo
        </button>
      </div>
    )
    default:
      return <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Editor non disponibile per questo blocco.</p>
  }
}

// ── BlockStylePanel — stile per-blocco (Fase 0: sfondo + spaziatura) ─────────
function BlockStylePanel({ block, onChange, entityId, entityTipo }) {
  const st = block.style || {}
  const set = (key, val) => onChange({ ...st, [key]: val })
  const showBg = blockSupportsBg(block.type)
  const showText = blockHasText(block.type)
  const sel = { width: '100%', border: '1px solid #e0e0e8', borderRadius: 7, padding: '8px 10px', fontSize: 13, background: '#fff', fontFamily: 'inherit' }
  const lbl = { display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }
  return (
    <div style={{ borderTop: '1px solid #ececf2', marginTop: 18, paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Stile sezione</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {showBg && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Sfondo</label>
            <select value={st.bg || 'default'} onChange={e => set('bg', e.target.value)} style={sel}>
              {BLOCK_BG_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={lbl}>Spaziatura verticale</label>
          <select value={st.paddingY || 'default'} onChange={e => set('paddingY', e.target.value)} style={sel}>
            {BLOCK_PADY_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        {showText && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Dimensione testo</label>
            <select value={st.textSize || 'normal'} onChange={e => set('textSize', e.target.value)} style={sel}>
              {BLOCK_TEXT_SIZE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        {showText && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Colore testo</label>
            <select value={st.textColor || 'default'} onChange={e => set('textColor', e.target.value)} style={sel}>
              {BLOCK_TEXT_COLOR_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>
      {showBg && st.bg === 'image' && (
        <div style={{ marginTop: 12, background: '#fafafd', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <label style={lbl}>Immagine di sfondo</label>
          {st.bg_image && <img src={st.bg_image} alt="" style={{ width: '100%', maxHeight: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <UnsplashPicker label="Cerca su Unsplash" onPick={url => set('bg_image', url)} />
            <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => set('bg_image', url)} />
          </div>
          <input type="text" value={st.bg_image || ''} onChange={e => set('bg_image', e.target.value)} placeholder="https://..." style={{ ...sel, marginBottom: 8 }} />
          <label style={lbl}>Velo scuro ({Math.round((st.bg_overlay ?? 0.5) * 100)}%)</label>
          <input type="range" min="0" max="0.85" step="0.05" value={st.bg_overlay ?? 0.5} onChange={e => set('bg_overlay', parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!st.hide_mobile} onChange={e => set('hide_mobile', e.target.checked)} /> Nascondi su mobile
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!st.hide_desktop} onChange={e => set('hide_desktop', e.target.checked)} /> Nascondi su desktop
        </label>
      </div>
    </div>
  )
}

// ── FormBuilderBlockEditor — carica lista form e mostra picker ───────────────
function FormBuilderBlockEditor({ data, onChange }) {
  const [forms, setForms] = useState([])
  useEffect(() => {
    apiFetch('/api/form-builder').then(f => setForms(f)).catch(() => {})
  }, [])

  const selectedForm = forms.find(f => f.token === data.form_token)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Seleziona form</label>
        <select
          value={data.form_token || ''}
          onChange={e => {
            const picked = forms.find(f => f.token === e.target.value)
            onChange('form_token', e.target.value)
            if (picked && !data.titolo_sezione) onChange('titolo_sezione', picked.nome)
          }}
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
        >
          <option value="">— Scegli un form —</option>
          {forms.map(f => (
            <option key={f.id} value={f.token}>{f.nome}{!f.attivo ? ' (disattivo)' : ''}</option>
          ))}
        </select>
        {forms.length === 0 && (
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Nessun form trovato. <a href="/admin/form-builder" target="_blank" style={{ color: '#2b6cb0' }}>Crea il primo form →</a>
          </p>
        )}
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Titolo sezione (opzionale)</label>
        <input
          value={data.titolo_sezione || ''}
          onChange={e => onChange('titolo_sezione', e.target.value)}
          placeholder="es. Contattaci"
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
      {selectedForm && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#276749' }}>
          ✓ Form selezionato: <strong>{selectedForm.nome}</strong> ({selectedForm.attivo ? 'attivo' : 'disattivo'})
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline, rows = 3, placeholder, style: extraStyle }) {
  return (
    <div style={extraStyle}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>{label}</label>}
      {multiline
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={inputStyle()} />
        : <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle()} />
      }
    </div>
  )
}

function UploadBtn({ label, entityId, entityTipo, onUrl }) {
  const inputRef = useRef()
  const [upl, setUpl] = useState(false)
  async function handle(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUpl(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch(`/api/upload/minisito-image?entity_type=${entityTipo}&entity_id=${entityId}`, {
        method: 'POST', body: fd,
        headers: { Authorization: `Bearer ${(await import('../../lib/supabase').then(m => m.supabase.auth.getSession()))?.data?.session?.access_token}` }
      })
      const json = await res.json()
      if (json.url) onUrl(json.url)
    } finally { setUpl(false) }
  }
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle} />
      <button type="button" onClick={() => inputRef.current.click()} disabled={upl}
        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8', background: '#fafafa', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ImageIcon size={13} strokeWidth={1.5} />
        {upl ? 'Caricamento...' : label}
      </button>
    </>
  )
}

function inputStyle() {
  return { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e8', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', background: '#fafafa' }
}
const tinyBtn = { background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 11, color: '#555' }

// Drop indicator
function DropLine() {
  return <div style={{ height: 3, background: '#5b6af8', borderRadius: 2, margin: '3px 0', boxShadow: '0 0 8px rgba(91,106,248,0.5)' }} />
}

// ── Block Picker Modal ────────────────────────────────────────────────────────
function BlockPicker({ onPick, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? BLOCK_TYPES.filter(b => b.label.toLowerCase().includes(search.toLowerCase()) || b.desc?.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Aggiungi blocco</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1, padding: '2px 6px' }}>✕</button>
          </div>
          <input autoFocus placeholder="Cerca blocco…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 14px', border: '1.5px solid #e0e0e8', borderRadius: 9, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '12px 12px' }}>
          {(filtered ? [{ key: 'results', label: `${filtered.length} risultati` }] : BLOCK_GROUPS).map(group => {
            const blocks = filtered || BLOCK_TYPES.filter(b => b.group === group.key)
            if (!blocks.length) return null
            const color = GROUP_COLORS[group.key] || '#666'
            return (
              <div key={group.key} style={{ marginBottom: 16 }}>
                {!filtered && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>
                    {group.label}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {blocks.map(b => {
                    const Icon = BLOCK_ICON_MAP[b.type] || FileText
                    const bColor = blockColor(b.type)
                    return (
                      <button key={b.type} onClick={() => { onPick(b.type); onClose() }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fff', textAlign: 'left', width: '100%' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f5ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${bColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} strokeWidth={1.5} color={bColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{b.label}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1, lineHeight: 1.3 }}>{b.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function PaginaEditorPage() {
  const { pageId } = useParams()
  const router = useRouter()

  const [page,       setPage]       = useState(null)
  const [blocks,     setBlocks]     = useState([])
  const [past,       setPast]       = useState([])   // undo stack
  const [future,     setFuture]     = useState([])   // redo stack
  const [hasClip,    setHasClip]    = useState(false) // blocco copiato in localStorage
  const [expandedId, setExpandedId] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showPatterns, setShowPatterns] = useState(false)
  const [showSeo,    setShowSeo]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [dirty,      setDirty]      = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [origSlug,   setOrigSlug]   = useState(null)
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(null)
  const [entitySlug, setEntitySlug] = useState(null)
  const [copied,     setCopied]     = useState(false)

  // Drag & drop
  const [dragBlockId, setDragBlockId] = useState(null)
  const [dragOverPos, setDragOverPos] = useState(null) // { blockId, position: 'before'|'after' }
  const [showPreview, setShowPreview]   = useState(false)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [previewNonce, setPreviewNonce]  = useState(0)

  useEffect(() => {
    apiFetch(`/api/pagine/${pageId}`).then(data => {
      setPage(data)
      setBlocks(Array.isArray(data.blocks) ? data.blocks : [])
      setOrigSlug(data.slug)
      setLoading(false)
    }).catch(err => {
      setLoadError(err.message || 'Errore caricamento pagina')
      setLoading(false)
    })
  }, [pageId])

  useEffect(() => {
    if (!page?.entity_id) return
    const ep = page.entity_tipo === 'struttura' ? `/api/properties/${page.entity_id}`
      : page.entity_tipo === 'ristorante' ? `/api/ristoranti/${page.entity_id}`
      : `/api/attivita/${page.entity_id}`
    apiFetch(ep).then(d => { if (d?.slug) setEntitySlug(d.slug) })
  }, [page?.entity_id])

  function previewUrl() {
    if (!entitySlug || !page) return null
    const base = page.entity_tipo === 'struttura' ? `/s/${entitySlug}` : page.entity_tipo === 'ristorante' ? `/r/${entitySlug}` : `/a/${entitySlug}`
    if (page.slug === '__home__') return base
    return `${base}/p/${page.slug}`
  }

  async function openPreview() {
    if (dirty) await save()
    const url = previewUrl()
    if (!url) return
    window.open(url + (page.slug === '__home__' && page.status === 'pubblicata' ? '' : '?preview=1'), '_blank')
  }

  function copyLink() {
    const url = previewUrl(); if (!url) return
    navigator.clipboard.writeText(window.location.origin + url)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  function patchPage(key, val) { setPage(p => ({ ...p, [key]: val })); setDirty(true) }
  function patchBlocks(nb) { setPast(p => [...p.slice(-49), blocks]); setFuture([]); setBlocks(nb); setDirty(true) }
  function undo() { if (!past.length) return; setFuture(f => [blocks, ...f]); setBlocks(past[past.length - 1]); setPast(p => p.slice(0, -1)); setDirty(true) }
  function redo() { if (!future.length) return; setPast(p => [...p, blocks]); setBlocks(future[0]); setFuture(f => f.slice(1)); setDirty(true) }

  // Copia/incolla blocco tra pagine (via localStorage, stesso browser).
  const CLIP_KEY = 'lbr_block_clip'
  useEffect(() => { try { setHasClip(!!localStorage.getItem(CLIP_KEY)) } catch {} }, [])
  function copyBlock(id) {
    const b = blocks.find(x => x.id === id); if (!b) return
    try { localStorage.setItem(CLIP_KEY, JSON.stringify({ type: b.type, data: b.data, style: b.style })); setHasClip(true) } catch {}
  }
  function pasteBlock() {
    let raw; try { raw = localStorage.getItem(CLIP_KEY) } catch {}
    if (!raw) return
    try {
      const b = JSON.parse(raw)
      const data = JSON.parse(JSON.stringify(b.data || {}))
      if (Array.isArray(data.items))  data.items  = data.items.map(it => ({ ...it, id: uid() }))
      if (Array.isArray(data.slides)) data.slides = data.slides.map(s => ({ ...s, id: uid() }))
      const nb = { id: uid(), type: b.type, data, ...(b.style ? { style: b.style } : {}) }
      patchBlocks([...blocks, nb]); setExpandedId(nb.id)
    } catch {}
  }

  // Undo/redo da tastiera (fuori dai campi di testo, dove vince l'undo nativo).
  useEffect(() => {
    const onKey = e => {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function addBlock(type) {
    const b = { id: uid(), type, data: { ...BLOCK_DEFAULTS[type] } }
    patchBlocks([...blocks, b])
    setExpandedId(b.id)
  }
  function addPattern(key) {
    const p = BLOCK_PATTERNS.find(x => x.key === key)
    if (!p) return
    const nb = p.blocks.map(b => ({ id: uid(), type: b.type, data: JSON.parse(JSON.stringify(b.data || {})) }))
    patchBlocks([...blocks, ...nb])
  }
  function updateBlock(id, data) { patchBlocks(blocks.map(b => b.id === id ? { ...b, data } : b)) }
  function updateBlockStyle(id, style) { patchBlocks(blocks.map(b => b.id === id ? { ...b, style } : b)) }
  function deleteBlock(id) {
    if (!confirm('Eliminare questo blocco?')) return
    patchBlocks(blocks.filter(b => b.id !== id))
    if (expandedId === id) setExpandedId(null)
  }
  function duplicateBlock(id) {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < 0) return
    const src = blocks[idx]
    const data = JSON.parse(JSON.stringify(src.data || {}))
    if (Array.isArray(data.items))  data.items  = data.items.map(it => ({ ...it, id: uid() }))
    if (Array.isArray(data.slides)) data.slides = data.slides.map(s => ({ ...s, id: uid() }))
    const copy = { id: uid(), type: src.type, data, ...(src.style ? { style: { ...src.style } } : {}) }
    const nb = [...blocks]; nb.splice(idx + 1, 0, copy)
    patchBlocks(nb); setExpandedId(copy.id)
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  function onBlockDragStart(e, blockId) {
    setDragBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    // Use a transparent ghost instead of the default drag image
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:0;left:0'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onBlockDragOver(e, blockId) {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    setDragOverPos(p => (p?.blockId === blockId && p?.position === position) ? p : { blockId, position })
  }

  function onBlockDrop(e, targetId) {
    e.preventDefault()
    if (!dragBlockId || dragBlockId === targetId || !dragOverPos) { resetBlockDrag(); return }
    const arr = [...blocks]
    const fromIdx = arr.findIndex(b => b.id === dragBlockId)
    if (fromIdx === -1) { resetBlockDrag(); return }
    const [moved] = arr.splice(fromIdx, 1)
    const toIdx = arr.findIndex(b => b.id === targetId)
    if (toIdx === -1) { resetBlockDrag(); return }
    arr.splice(dragOverPos.position === 'before' ? toIdx : toIdx + 1, 0, moved)
    patchBlocks(arr)
    resetBlockDrag()
  }

  function resetBlockDrag() { setDragBlockId(null); setDragOverPos(null) }

  async function save() {
    setSaving(true); setSaveError(null)
    try {
      await apiFetch(`/api/pagine/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titolo: page.titolo, slug: page.slug, status: page.status,
          nel_menu: page.nel_menu, seo_title: page.seo_title,
          seo_description: page.seo_description, og_image_url: page.og_image_url,
          hide_header: !!page.hide_header, hide_footer: !!page.hide_footer,
          blocks,
        }),
      })
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
      setPreviewNonce(n => n + 1)   // ricarica l'anteprima in-editor
    } catch (err) {
      setSaveError(err?.message || 'Salvataggio fallito — riprova')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ padding: 40, color: '#888' }}>Caricamento...</p>
  if (loadError) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#c00', marginBottom: 12 }}>Errore: {loadError}</p>
      <button onClick={() => router.back()} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>← Indietro</button>
    </div>
  )

  const entityTipo  = page.entity_tipo
  const entityId    = page.entity_id
  const slugChanged = slugManual && page.slug !== origSlug
  const seoScore    = [page.seo_title, page.seo_description].filter(Boolean).length
  const pUrl        = previewUrl()

  return (
    <div style={{ maxWidth: 780 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Indietro
        </button>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a2e' }}>
          {page.titolo || 'Pagina senza titolo'}
        </h1>
        {dirty && <span style={{ fontSize: 11, color: '#856404', background: '#fff3cd', padding: '3px 10px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>Non salvato</span>}
        {saved && <span style={{ fontSize: 11, color: '#155724', background: '#d4edda', padding: '3px 10px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>Salvato ✓</span>}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={undo} disabled={!past.length} title="Annulla (Ctrl+Z)"
            style={{ background: '#f0f0f4', border: 'none', borderRadius: '8px 0 0 8px', padding: '8px 12px', cursor: past.length ? 'pointer' : 'default', fontSize: 15, color: past.length ? '#1a1a2e' : '#bbb' }}>↶</button>
          <button onClick={redo} disabled={!future.length} title="Ripeti (Ctrl+Y)"
            style={{ background: '#f0f0f4', border: 'none', borderRadius: '0 8px 8px 0', padding: '8px 12px', cursor: future.length ? 'pointer' : 'default', fontSize: 15, color: future.length ? '#1a1a2e' : '#bbb' }}>↷</button>
        </div>
        {pUrl && (
          <button onClick={() => setShowPreview(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: showPreview ? '#1a1a2e' : '#f0f4ff', color: showPreview ? '#fff' : '#1a1a2e', border: '1.5px solid #c8d4f4', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            👁 Anteprima
          </button>
        )}
        {pUrl && (
          <button onClick={openPreview}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f4ff', color: '#1a1a2e', border: '1.5px solid #c8d4f4', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            {dirty ? '💾 Salva e apri' : '↗ Apri'}
          </button>
        )}
        <button onClick={save} disabled={saving || !dirty}
          style={{ background: dirty ? '#1a1a2e' : '#e0e0e0', color: dirty ? '#fff' : '#999', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: dirty ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
          {saving ? 'Salvando...' : 'Salva'}
        </button>
      </div>

      {/* ── Anteprima live in-editor (drawer) ── */}
      {showPreview && pUrl && (() => {
        const src = `${pUrl}?preview=1&_n=${previewNonce}`
        const devBtn = a => ({ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: a ? '#1a1a2e' : '#eee', color: a ? '#fff' : '#555' })
        const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888', padding: '4px 6px' }
        return (
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, maxWidth: '46vw', background: '#e9e9ee', borderLeft: '1px solid #d5d5dd', zIndex: 60, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #eee' }}>
              <strong style={{ fontSize: 13, flex: 1, color: '#1a1a2e' }}>Anteprima</strong>
              <button onClick={() => setPreviewDevice('desktop')} style={devBtn(previewDevice === 'desktop')}>Desktop</button>
              <button onClick={() => setPreviewDevice('mobile')} style={devBtn(previewDevice === 'mobile')}>Mobile</button>
              <button onClick={() => setPreviewNonce(n => n + 1)} title="Aggiorna" style={iconBtn}>↻</button>
              <button onClick={() => setShowPreview(false)} title="Chiudi" style={iconBtn}>✕</button>
            </div>
            {dirty && <div style={{ fontSize: 11, color: '#856404', background: '#fff3cd', padding: '6px 12px', textAlign: 'center' }}>Salva per aggiornare l'anteprima</div>}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: previewDevice === 'mobile' ? 14 : 0 }}>
              {previewDevice === 'desktop' ? (
                <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                  <iframe key={previewNonce} src={src} title="Anteprima desktop"
                    style={{ width: 1350, height: '250%', border: 0, transform: 'scale(0.4)', transformOrigin: 'top left' }} />
                </div>
              ) : (
                <div style={{ width: 390, height: '100%', border: '8px solid #1a1a2e', borderRadius: 30, overflow: 'hidden', background: '#fff' }}>
                  <iframe key={previewNonce} src={src} title="Anteprima mobile" style={{ width: '100%', height: '100%', border: 0 }} />
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {saveError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fce8e8', color: '#c00', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          ⚠ {saveError}
        </div>
      )}

      {/* ── Metadata ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #e8e8ee', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>Titolo *</label>
            <input value={page.titolo || ''} onChange={e => {
              const t = e.target.value
              patchPage('titolo', t)
              if (!slugManual) patchPage('slug', slugify(t))
            }} style={inputStyle()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>
              Slug URL {slugChanged && <span style={{ color: '#856404', fontWeight: 400 }}>⚠ cambiando lo slug si rompono i link esistenti</span>}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={page.slug || ''} onChange={e => { setSlugManual(true); patchPage('slug', slugify(e.target.value)) }}
                style={{ ...inputStyle(), fontFamily: 'monospace', flex: 1 }} />
              {pUrl && (
                <button onClick={copyLink} style={{ flexShrink: 0, padding: '9px 10px', border: '1px solid #e0e0e8', borderRadius: 7, background: copied ? '#d4edda' : '#fafafa', cursor: 'pointer', fontSize: 12, color: copied ? '#155724' : '#666' }}>
                  {copied ? '✓' : '📋'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={page.status === 'pubblicata'} onChange={e => patchPage('status', e.target.checked ? 'pubblicata' : 'bozza')} />
            <span style={{ fontWeight: 600, color: page.status === 'pubblicata' ? '#155724' : '#856404' }}>
              {page.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={!!page.nel_menu} onChange={e => patchPage('nel_menu', e.target.checked)} />
            Mostra nel menu di navigazione
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }} title="Utile per le landing page (senza distrazioni)">
            <input type="checkbox" checked={!!page.hide_header} onChange={e => patchPage('hide_header', e.target.checked)} />
            Nascondi header
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }} title="Utile per le landing page (senza distrazioni)">
            <input type="checkbox" checked={!!page.hide_footer} onChange={e => patchPage('hide_footer', e.target.checked)} />
            Nascondi footer
          </label>
        </div>
      </div>

      {/* ── Blocks ── */}
      <div style={{ marginBottom: 12 }}>
        {blocks.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: '#fafafa', borderRadius: 12, border: '2px dashed #e0e0e8', marginBottom: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Plus size={22} strokeWidth={1.5} color="#888" />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#888', marginBottom: 6 }}>Nessun blocco</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Usa il pulsante qui sotto per aggiungere il primo blocco</div>
          </div>
        )}

        {blocks.map((block) => {
          const isOpen     = expandedId === block.id
          const isDragging = dragBlockId === block.id
          const isBefore   = dragOverPos?.blockId === block.id && dragOverPos.position === 'before'
          const isAfter    = dragOverPos?.blockId === block.id && dragOverPos.position === 'after'
          const bColor     = blockColor(block.type)

          return (
            <div key={block.id} style={{ marginBottom: 6 }}>
              {isBefore && <DropLine />}
              <div
                onDragOver={e => onBlockDragOver(e, block.id)}
                onDrop={e => onBlockDrop(e, block.id)}
                onDragEnter={e => e.preventDefault()}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: (isBefore || isAfter) ? '1.5px solid #5b6af8' : '1px solid #e8e8ee',
                  boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  opacity: isDragging ? 0.3 : 1,
                  transition: 'opacity 0.12s, border-color 0.1s',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', minHeight: 50 }}>

                  {/* ── DRAG HANDLE (unico elemento draggable) ── */}
                  <div
                    draggable={true}
                    onDragStart={e => { e.stopPropagation(); onBlockDragStart(e, block.id) }}
                    onDragEnd={resetBlockDrag}
                    style={{ padding: '14px 6px 14px 12px', cursor: 'grab', userSelect: 'none', flexShrink: 0, color: '#ccc', lineHeight: 0 }}
                    title="Trascina per riordinare"
                  >
                    <GripVertical size={16} strokeWidth={1.5} />
                  </div>

                  {/* Block type icon */}
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: `${bColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10 }}>
                    <BlockTypeIcon type={block.type} size={15} />
                  </div>

                  {/* Label (clickable to expand) */}
                  <span
                    style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#1a1a2e', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpandedId(isOpen ? null : block.id)}
                  >
                    {blockLabel(block.type)}
                  </span>

                  {/* Copia (per incollare su altre pagine) */}
                  <button
                    onClick={() => copyBlock(block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#5b6af8' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                    title="Copia blocco (incollabile su altre pagine)"
                  >
                    <Clipboard size={14} strokeWidth={1.5} />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => duplicateBlock(block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#5b6af8' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                    title="Duplica blocco"
                  >
                    <Copy size={14} strokeWidth={1.5} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteBlock(block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e03030' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                    title="Elimina blocco"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedId(isOpen ? null : block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', color: '#bbb', lineHeight: 0, flexShrink: 0 }}
                  >
                    {isOpen ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
                  </button>
                </div>

                {/* Expanded editor */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '18px 20px', background: '#fafafa' }}>
                    <BlockEditor block={block} onChange={data => updateBlock(block.id, data)} entityId={entityId} entityTipo={entityTipo} />
                    <BlockStylePanel block={block} entityId={entityId} entityTipo={entityTipo} onChange={style => updateBlockStyle(block.id, style)} />
                  </div>
                )}
              </div>
              {isAfter && <DropLine />}
            </div>
          )
        })}
      </div>

      {/* ── Add block / pattern buttons ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setShowPicker(true)}
          style={{ flex: 1, minWidth: 200, padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={16} strokeWidth={2} />
          Aggiungi blocco
        </button>
        <button onClick={() => setShowPatterns(true)}
          style={{ flex: 1, minWidth: 200, padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Layers size={16} strokeWidth={2} />
          Inserisci sezione pronta
        </button>
        {hasClip && (
          <button onClick={pasteBlock}
            style={{ flex: 1, minWidth: 200, padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Clipboard size={16} strokeWidth={2} />
            Incolla blocco copiato
          </button>
        )}
      </div>

      {/* ── SEO panel ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8ee', overflow: 'hidden' }}>
        <button onClick={() => setShowSeo(s => !s)}
          style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Impostazioni SEO</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
              background: ['#fce8e8','#fff3cd','#d4edda'][seoScore],
              color: ['#c00','#856404','#155724'][seoScore],
            }}>
              {['✗ Non configurato','⚠ Incompleto','✓ Completo'][seoScore]}
            </span>
          </span>
          {showSeo ? <ChevronUp size={15} strokeWidth={2} color="#aaa" /> : <ChevronDown size={15} strokeWidth={2} color="#aaa" />}
        </button>
        {showSeo && (
          <div style={{ borderTop: '1px solid #f0f0f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Titolo SEO (<title>)" value={page.seo_title} onChange={v => patchPage('seo_title', v)} placeholder={page.titolo} />
            <div>
              <Field label="Meta description (max 160 caratteri)" value={page.seo_description} onChange={v => patchPage('seo_description', v)} multiline rows={2} />
              {page.seo_description && (
                <div style={{ fontSize: 11, marginTop: 4, color: page.seo_description.length > 160 ? '#c00' : '#999' }}>
                  {page.seo_description.length}/160 caratteri
                </div>
              )}
            </div>
            <Field label="Immagine Open Graph (URL)" value={page.og_image_url} onChange={v => patchPage('og_image_url', v)} placeholder="https://..." />
            {page.og_image_url && <img src={page.og_image_url} alt="" style={{ maxHeight: 100, borderRadius: 8, objectFit: 'cover' }} />}
          </div>
        )}
      </div>

      {showPicker && <BlockPicker onPick={addBlock} onClose={() => setShowPicker(false)} />}

      {showPatterns && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPatterns(false) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Inserisci una sezione pronta</span>
              <button onClick={() => setShowPatterns(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BLOCK_PATTERNS.map(p => (
                <button key={p.key} onClick={() => { addPattern(p.key); setShowPatterns(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #eee', cursor: 'pointer', background: '#fff', textAlign: 'left', width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: '#5b6af818', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={18} strokeWidth={1.5} color="#5b6af8" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
