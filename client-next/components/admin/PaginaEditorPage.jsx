'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  GripVertical, AlignLeft, Image, Grid, Users, List, Star, BarChart2, Zap,
  MessageCircle, Tag, Package, HelpCircle, Video, Settings, Compass, Map,
  Calendar, FileText, Clock, Mail, Phone, MapPin, ChevronDown, ChevronUp,
  Plus, Trash2, ImageIcon, Layers, Building2,
} from 'lucide-react'
import AiButton from '@/components/admin/AiButton'
import { BLOCK_TYPES, BLOCK_GROUPS, BLOCK_DEFAULTS, blockLabel } from '@/lib/blockTypes'

function uid() { return crypto.randomUUID() }

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i')
    .replace(/[òó]/g,'o').replace(/[ùú]/g,'u').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'pagina'
}

// ── Block icon + color mapping ────────────────────────────────────────────────
const BLOCK_ICON_MAP = {
  hero: Layers, about: AlignLeft, foto_testo: Image, paragrafi: Grid,
  team: Users, steps: List, highlights: Star, stats: BarChart2,
  cta_banner: Zap, testimonianze: MessageCircle, promozioni: Tag,
  pacchetti: Package, faq: HelpCircle, gallery: ImageIcon, video: Video,
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
function ItemListEditor({ items = [], onChange, fields, newItem }) {
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
              {f.type === 'textarea'
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

// ── BlockEditor ───────────────────────────────────────────────────────────────
function BlockEditor({ block, onChange, entityId, entityTipo }) {
  const { type, data } = block
  const upd = (key, val) => onChange({ ...data, [key]: val })

  if (['gallery','services','activities','excursions','eventi','news','booking','show_map'].includes(type)) {
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
        <UploadBtn label="Carica immagine sfondo" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('bg_image_url', url)} />
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
          <textarea value={data.text || ''} onChange={e => upd('text', e.target.value)} rows={5} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
      </div>
    )
    case 'foto_testo': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Testo" value={data.text} onChange={v => upd('text', v)} multiline rows={4} />
        <Field label="URL immagine" value={data.image_url} onChange={v => upd('image_url', v)} placeholder="https://..." />
        {data.image_url && <img src={data.image_url} alt="" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
        <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('image_url', url)} />
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
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
        <Field label="Testo pulsante" value={data.button_text} onChange={v => upd('button_text', v)} />
        <Field label="URL pulsante" value={data.button_url} onChange={v => upd('button_url', v)} placeholder="https://..." />
      </div>
    )
    case 'video': return (
      <Field label="URL video (YouTube o Vimeo)" value={data.url} onChange={v => upd('url', v)} placeholder="https://youtube.com/watch?v=..." />
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
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ icon: 'star', text: '' }}
          fields={[{ key: 'icon', label: 'Icona (es. star, heart, wifi)', placeholder: 'star' }, { key: 'text', label: 'Testo' }]} />
      </div>
    )
    case 'stats': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
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
  const [expandedId, setExpandedId] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
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
  function patchBlocks(nb) { setBlocks(nb); setDirty(true) }

  function addBlock(type) {
    const b = { id: uid(), type, data: { ...BLOCK_DEFAULTS[type] } }
    patchBlocks([...blocks, b])
    setExpandedId(b.id)
  }
  function updateBlock(id, data) { patchBlocks(blocks.map(b => b.id === id ? { ...b, data } : b)) }
  function deleteBlock(id) {
    if (!confirm('Eliminare questo blocco?')) return
    patchBlocks(blocks.filter(b => b.id !== id))
    if (expandedId === id) setExpandedId(null)
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
          blocks,
        }),
      })
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
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
                  </div>
                )}
              </div>
              {isAfter && <DropLine />}
            </div>
          )
        })}
      </div>

      {/* ── Add block button ── */}
      <button onClick={() => setShowPicker(true)}
        style={{ width: '100%', padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Plus size={16} strokeWidth={2} />
        Aggiungi blocco
      </button>

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
    </div>
  )
}
