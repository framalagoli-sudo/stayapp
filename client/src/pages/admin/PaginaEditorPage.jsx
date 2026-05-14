import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { BLOCK_TYPES, BLOCK_GROUPS, BLOCK_DEFAULTS, blockLabel, blockEmoji } from '../../lib/blockTypes'

function uid() { return crypto.randomUUID() }

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i')
    .replace(/[òó]/g,'o').replace(/[ùú]/g,'u').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'pagina'
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
        <div key={it.id || idx} style={{ background: '#f9f9fb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
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
      <button onClick={add} style={{ width: '100%', padding: '8px', background: '#f0f4ff', border: '1px dashed #99b', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
        + Aggiungi elemento
      </button>
    </div>
  )
}

// ── BlockEditor ───────────────────────────────────────────────────────────────
function BlockEditor({ block, onChange, entityId, entityTipo }) {
  const { type, data } = block
  const upd = (key, val) => onChange({ ...data, [key]: val })

  if (['gallery','services','activities','excursions','eventi','news','booking','contatti','show_map'].includes(type)) {
    return <p style={{ fontSize: 13, color: '#888', fontStyle: 'italic', margin: 0 }}>Questo blocco visualizza automaticamente i dati dell'entità — nessuna configurazione necessaria.</p>
  }

  switch (type) {
    case 'about':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Titolo sezione" value={data.title} onChange={v => upd('title', v)} />
          <Field label="Testo" value={data.text} onChange={v => upd('text', v)} multiline rows={5} />
        </div>
      )
    case 'foto_testo':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
          <Field label="Testo" value={data.text} onChange={v => upd('text', v)} multiline rows={4} />
          <Field label="URL immagine" value={data.image_url} onChange={v => upd('image_url', v)} placeholder="https://..." />
          {data.image_url && <img src={data.image_url} alt="" style={{ maxHeight: 120, borderRadius: 6, objectFit: 'cover', width: '100%' }} />}
          <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('image_url', url)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={!!data.inverti} onChange={e => upd('inverti', e.target.checked)} />
            Inverti: testo a sinistra, immagine a destra
          </label>
          <Field label="Testo pulsante (opz.)" value={data.button_label} onChange={v => upd('button_label', v)} />
          <Field label="URL pulsante (opz.)" value={data.button_url} onChange={v => upd('button_url', v)} placeholder="https://..." />
        </div>
      )
    case 'cta_banner':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
          <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
          <Field label="Testo pulsante" value={data.button_text} onChange={v => upd('button_text', v)} />
          <Field label="URL pulsante" value={data.button_url} onChange={v => upd('button_url', v)} placeholder="https://..." />
        </div>
      )
    case 'video':
      return <Field label="URL video (YouTube o Vimeo)" value={data.url} onChange={v => upd('url', v)} placeholder="https://youtube.com/watch?v=..." />
    case 'newsletter':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Titolo sezione" value={data.title} onChange={v => upd('title', v)} />
          <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
        </div>
      )
    case 'highlights':
      return (
        <div>
          <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
          <ItemListEditor items={data.items} onChange={v => upd('items', v)}
            newItem={{ icon: 'star', text: '' }}
            fields={[{ key: 'icon', label: 'Icona (es. star, heart, wifi)', placeholder: 'star' }, { key: 'text', label: 'Testo' }]} />
        </div>
      )
    case 'stats':
      return (
        <div>
          <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
          <ItemListEditor items={data.items} onChange={v => upd('items', v)}
            newItem={{ value: '', label: '' }}
            fields={[{ key: 'value', label: 'Valore (es. 150+)', placeholder: '150+' }, { key: 'label', label: 'Etichetta' }]} />
        </div>
      )
    case 'paragrafi':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
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
    case 'team':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
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
    case 'steps':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
          <ItemListEditor items={data.items} onChange={v => upd('items', v)}
            newItem={{ icon: 'check-circle', title: '', text: '' }}
            fields={[
              { key: 'icon', label: 'Icona', placeholder: 'check-circle' },
              { key: 'title', label: 'Titolo passo' },
              { key: 'text', label: 'Descrizione', type: 'textarea', rows: 2 },
            ]} />
        </div>
      )
    case 'testimonianze':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
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
    case 'faq':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
          <ItemListEditor items={data.items} onChange={v => upd('items', v)}
            newItem={{ question: '', answer: '' }}
            fields={[
              { key: 'question', label: 'Domanda' },
              { key: 'answer', label: 'Risposta', type: 'textarea', rows: 3 },
            ]} />
        </div>
      )
    case 'promozioni':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
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
    case 'pacchetti':
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 10 }} />
          <ItemListEditor items={data.items} onChange={v => upd('items', v)}
            newItem={{ badge: '', name: '', tagline: '', price: '', price_label: 'a persona', includes: [], cta_label: 'Scegli', cta_url: '' }}
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
    default:
      return <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Editor non disponibile per questo blocco.</p>
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline, rows = 3, placeholder, style: extraStyle }) {
  return (
    <div style={extraStyle}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 3 }}>{label}</label>}
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
        style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px dashed #bbb', background: '#fafafa', cursor: 'pointer', color: '#555' }}>
        {upl ? 'Caricamento...' : `📁 ${label}`}
      </button>
    </>
  )
}

function inputStyle() {
  return { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }
}
const tinyBtn = { background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', fontSize: 11 }

// Indicatore linea di drop
function DropLine() {
  return <div style={{ height: 3, background: '#4a7cdc', borderRadius: 2, margin: '2px 0', boxShadow: '0 0 8px rgba(74,124,220,0.45)' }} />
}

// ── Block Picker Modal ────────────────────────────────────────────────────────
function BlockPicker({ onPick, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Aggiungi blocco</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        {BLOCK_GROUPS.map(group => (
          <div key={group.key} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{group.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {BLOCK_TYPES.filter(b => b.group === group.key).map(b => (
                <button key={b.type} onClick={() => { onPick(b.type); onClose() }}
                  style={{ textAlign: 'left', padding: '12px 14px', background: '#f9f9fb', border: '1px solid #e8e8ee', borderRadius: 10, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f0ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f9f9fb'}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{b.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.3 }}>{b.desc}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function PaginaEditorPage() {
  const { pageId } = useParams()
  const navigate = useNavigate()

  const [page,        setPage]        = useState(null)
  const [blocks,      setBlocks]      = useState([])
  const [expandedId,  setExpandedId]  = useState(null)
  const [showPicker,  setShowPicker]  = useState(false)
  const [showSeo,     setShowSeo]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [dirty,       setDirty]       = useState(false)
  const [slugManual,  setSlugManual]  = useState(false)
  const [origSlug,    setOrigSlug]    = useState(null)
  const [saved,       setSaved]       = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [entitySlug,  setEntitySlug]  = useState(null)
  const [copied,      setCopied]      = useState(false)

  // Drag & drop
  const [dragBlockId,  setDragBlockId]  = useState(null)
  const [dragOverPos,  setDragOverPos]  = useState(null) // { blockId, position: 'before'|'after' }

  useEffect(() => {
    apiFetch(`/api/pagine/${pageId}`).then(data => {
      if (data?.error) return navigate(-1)
      setPage(data)
      setBlocks(Array.isArray(data.blocks) ? data.blocks : [])
      setOrigSlug(data.slug)
      setLoading(false)
    })
  }, [pageId])

  // Fetch entity slug for preview link
  useEffect(() => {
    if (!page?.entity_id || !page?.entity_tipo) return
    const ep = page.entity_tipo === 'struttura'
      ? `/api/properties/${page.entity_id}`
      : page.entity_tipo === 'ristorante'
      ? `/api/ristoranti/${page.entity_id}`
      : `/api/attivita/${page.entity_id}`
    apiFetch(ep).then(d => { if (d?.slug) setEntitySlug(d.slug) })
  }, [page?.entity_id])

  function previewUrl() {
    if (!entitySlug || !page) return null
    const base = page.entity_tipo === 'struttura' ? `/s/${entitySlug}` : page.entity_tipo === 'ristorante' ? `/r/${entitySlug}` : `/a/${entitySlug}`
    return `${base}/p/${page.slug}`
  }

  async function openPreview() {
    if (dirty) await save()
    const url = previewUrl()
    if (url) window.open(url, '_blank')
  }

  function copyLink() {
    const url = previewUrl()
    if (!url) return
    navigator.clipboard.writeText(window.location.origin + url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
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

  // Drag & drop handlers
  function onBlockDragStart(e, blockId) {
    setDragBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div'); ghost.style.opacity = '0'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onBlockDragOver(e, blockId) {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    setDragOverPos(prev => (prev?.blockId === blockId && prev?.position === position) ? prev : { blockId, position })
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
    setSaving(true)
    const res = await apiFetch(`/api/pagine/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        titolo: page.titolo, slug: page.slug, status: page.status,
        nel_menu: page.nel_menu, seo_title: page.seo_title,
        seo_description: page.seo_description, og_image_url: page.og_image_url,
        blocks,
      }),
    })
    setSaving(false)
    if (!res?.error) { setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  if (loading) return <p style={{ padding: 40, color: '#888' }}>Caricamento...</p>

  const entityTipo = page.entity_tipo
  const entityId   = page.entity_id
  const slugChanged = slugManual && page.slug !== origSlug
  const seoScore   = [page.seo_title, page.seo_description].filter(Boolean).length
  const seoColors  = ['#721c24', '#856404', '#155724']
  const seoBg      = ['#f8d7da', '#fff3cd', '#d4edda']
  const seoLabel   = ['✗ SEO non configurato', '⚠ SEO incompleto', '✓ SEO completo']
  const pUrl       = previewUrl()

  return (
    <div style={{ maxWidth: 820 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', padding: 0, flexShrink: 0 }}>← Indietro</button>
        <h1 style={{ margin: 0, fontSize: 20, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {page.titolo || 'Pagina senza titolo'}
        </h1>
        {dirty && <span style={{ fontSize: 12, color: '#856404', background: '#fff3cd', padding: '3px 10px', borderRadius: 10, flexShrink: 0 }}>Non salvato</span>}
        {saved && <span style={{ fontSize: 12, color: '#155724', background: '#d4edda', padding: '3px 10px', borderRadius: 10, flexShrink: 0 }}>Salvato ✓</span>}
        {pUrl && (
          <button onClick={openPreview}
            style={{ background: '#f0f4ff', color: '#1a1a2e', border: '1px solid #c8d4f4', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            {dirty ? '💾 Salva e apri ↗' : '↗ Apri pagina'}
          </button>
        )}
        <button onClick={save} disabled={saving || !dirty}
          style={{ background: dirty ? '#1a1a2e' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: dirty ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      {/* ── Metadata ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>Titolo pagina *</label>
            <input value={page.titolo || ''} onChange={e => {
              const t = e.target.value
              patchPage('titolo', t)
              if (!slugManual) patchPage('slug', slugify(t))
            }} style={inputStyle()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
              Slug URL
              {slugChanged && (
                <span style={{ marginLeft: 6, color: '#856404', fontWeight: 400, fontSize: 11 }}>⚠ cambiare lo slug invalida i link esistenti</span>
              )}
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={page.slug || ''} onChange={e => { setSlugManual(true); patchPage('slug', slugify(e.target.value)) }}
                style={{ ...inputStyle(), fontFamily: 'monospace', flex: 1 }} placeholder="es. chi-siamo" />
              {pUrl && (
                <button onClick={copyLink} title="Copia link pagina"
                  style={{ flexShrink: 0, padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, background: copied ? '#d4edda' : '#fafafa', cursor: 'pointer', fontSize: 12, color: copied ? '#155724' : '#555', whiteSpace: 'nowrap' }}>
                  {copied ? '✓ Copiato' : '📋'}
                </button>
              )}
            </div>
            <span style={{ fontSize: 11, color: '#aaa' }}>/{page.slug}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={page.status === 'pubblicata'}
              onChange={e => patchPage('status', e.target.checked ? 'pubblicata' : 'bozza')} />
            <span style={{ color: page.status === 'pubblicata' ? '#155724' : '#856404', fontWeight: 600 }}>
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
      <div style={{ marginBottom: 16 }}>
        {blocks.length === 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', background: '#f9f9fb', borderRadius: 12, border: '2px dashed #e0e0e8', color: '#aaa', marginBottom: 8 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧩</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#888' }}>Nessun blocco</div>
            <div style={{ fontSize: 13 }}>Usa il pulsante qui sotto per aggiungere il primo blocco di contenuto.</div>
          </div>
        )}
        {blocks.map((block, idx) => {
          const isOpen    = expandedId === block.id
          const isDragging  = dragBlockId === block.id
          const isBefore    = dragOverPos?.blockId === block.id && dragOverPos.position === 'before'
          const isAfter     = dragOverPos?.blockId === block.id && dragOverPos.position === 'after'
          return (
            <div key={block.id}>
              {isBefore && <DropLine />}
              <div
                draggable={true}
                onDragStart={e => onBlockDragStart(e, block.id)}
                onDragOver={e => onBlockDragOver(e, block.id)}
                onDrop={e => onBlockDrop(e, block.id)}
                onDragEnd={resetBlockDrag}
                style={{
                  background: '#fff', borderRadius: 12, marginBottom: 6,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
                  opacity: isDragging ? 0.35 : 1,
                  outline: isBefore || isAfter ? '2px solid transparent' : 'none',
                  transition: 'opacity 0.12s',
                }}
              >
                {/* Block header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setExpandedId(isOpen ? null : block.id)}
                >
                  <span style={{ color: '#bbb', fontSize: 16, cursor: 'grab', flexShrink: 0 }} title="Trascina per riordinare">⠿</span>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{blockEmoji(block.type)}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: '#1a1a2e' }}>{blockLabel(block.type)}</span>
                  <button onClick={e => { e.stopPropagation(); deleteBlock(block.id) }}
                    style={{ ...tinyBtn, color: '#c00', background: '#fce8e8', flexShrink: 0 }}>✕ Elimina</button>
                  <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 20px' }}>
                    <BlockEditor block={block} onChange={data => updateBlock(block.id, data)} entityId={entityId} entityTipo={entityTipo} />
                  </div>
                )}
              </div>
              {isAfter && <DropLine />}
            </div>
          )
        })}
      </div>

      {/* ── Add block ── */}
      <button onClick={() => setShowPicker(true)}
        style={{ width: '100%', padding: 14, background: '#f0f4ff', border: '2px dashed #99aaf0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#334', marginBottom: 24 }}>
        + Aggiungi blocco
      </button>

      {/* ── SEO panel ── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <button onClick={() => setShowSeo(s => !s)}
          style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>🔍 Impostazioni SEO</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: seoBg[seoScore], color: seoColors[seoScore], fontWeight: 600 }}>
              {seoLabel[seoScore]}
            </span>
          </span>
          <span style={{ color: '#888', fontSize: 12 }}>{showSeo ? '▲ Chiudi' : '▼ Apri'}</span>
        </button>
        {showSeo && (
          <div style={{ borderTop: '1px solid #f0f0f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Titolo SEO (<title>)" value={page.seo_title} onChange={v => patchPage('seo_title', v)} placeholder={page.titolo} />
            <div>
              <Field label="Meta description (max 160 caratteri)" value={page.seo_description} onChange={v => patchPage('seo_description', v)} multiline rows={2} />
              {page.seo_description && (
                <div style={{ fontSize: 11, color: page.seo_description.length > 160 ? '#c00' : '#888', marginTop: 3 }}>
                  {page.seo_description.length}/160 caratteri
                </div>
              )}
            </div>
            <Field label="Immagine Open Graph (URL)" value={page.og_image_url} onChange={v => patchPage('og_image_url', v)} placeholder="https://..." />
            {page.og_image_url && <img src={page.og_image_url} alt="" style={{ maxHeight: 100, borderRadius: 6, objectFit: 'cover' }} />}
          </div>
        )}
      </div>

      {showPicker && <BlockPicker onPick={addBlock} onClose={() => setShowPicker(false)} />}
    </div>
  )
}
