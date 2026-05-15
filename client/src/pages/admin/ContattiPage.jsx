import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import { apiFetch } from '../../lib/api'
import { Search, Plus, X, Pencil, Trash2, Users, Mail, Phone, Tag, List, LayoutGrid, GripVertical, ChevronDown } from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'

// ─── Pipeline stages ─────────────────────────────────────────────────────────
const STAGES = [
  { key: 'lead',         label: 'Nuovo lead',       color: '#888',    light: '#f5f5f5' },
  { key: 'contattato',   label: 'Contattato',        color: '#2b6cb0', light: '#ebf4ff' },
  { key: 'proposta',     label: 'Proposta inviata',  color: '#b7791f', light: '#fffbeb' },
  { key: 'chiuso_vinto', label: 'Chiuso ✓',          color: '#276749', light: '#f0fff4' },
  { key: 'chiuso_perso', label: 'Perso',             color: '#c53030', light: '#fff5f5' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

// ─── Tag helpers ──────────────────────────────────────────────────────────────
const TAG_COLORS = ['#00b5b5','#e63946','#2b6cb0','#276749','#b7791f','#6b46c1','#c05621','#2c7a7b','#702459']
function tagColor(tag) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h + tag.charCodeAt(i)) % TAG_COLORS.length
  return TAG_COLORS[h]
}

function TagChip({ tag, onRemove, small }) {
  const color = tagColor(tag)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '2px 8px' : '4px 10px', borderRadius: 20, background: color + '18', color, fontSize: small ? 11 : 12, fontWeight: 700 }}>
      {tag}
      {onRemove && <button onClick={() => onRemove(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, lineHeight: 1, display: 'flex' }}><X size={10} /></button>}
    </span>
  )
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  function add() {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, minHeight: 42, alignItems: 'center' }}>
      {tags.map(t => <TagChip key={t} tag={t} onRemove={tag => onChange(tags.filter(x => x !== tag))} small />)}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length ? '' : 'Aggiungi tag…'}
        style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 120, background: 'transparent' }} />
    </div>
  )
}

// ─── Stage badge ──────────────────────────────────────────────────────────────
function StageBadge({ stage }) {
  const s = STAGE_MAP[stage] || STAGE_MAP.lead
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.light, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// ─── Stage select inline ──────────────────────────────────────────────────────
function StageSelect({ value, onChange }) {
  return (
    <select value={value || 'lead'} onChange={e => onChange(e.target.value)}
      style={{ fontSize: 11, fontWeight: 700, padding: '3px 6px', borderRadius: 20, border: '1px solid #ddd', background: (STAGE_MAP[value] || STAGE_MAP.lead).light, color: (STAGE_MAP[value] || STAGE_MAP.lead).color, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
    </select>
  )
}

// ─── Contact modal ────────────────────────────────────────────────────────────
const EMPTY = { nome: '', email: '', telefono: '', tags: [], note: '', iscritto_newsletter: false, pipeline_stage: 'lead' }

function ContactModal({ contact, aziendaId, onSave, onClose }) {
  const [form, setForm] = useState(contact ? { ...EMPTY, ...contact } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const isNew = !contact

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) await apiFetch('/api/contatti', { method: 'POST', body: JSON.stringify({ ...form, azienda_id: aziendaId }) })
      else await apiFetch(`/api/contatti/${contact.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      onSave()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const field = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }
  const label = { fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{isNew ? 'Nuovo contatto' : 'Modifica contatto'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={label}>Nome *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required style={field} placeholder="Nome e cognome" />
          <label style={label}>Email</label>
          <input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" style={field} placeholder="email@esempio.it" />
          <label style={label}>Telefono</label>
          <input value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={field} placeholder="+39 333 1234567" />
          <label style={label}>Stage pipeline</label>
          <select value={form.pipeline_stage || 'lead'} onChange={e => setForm(f => ({ ...f, pipeline_stage: e.target.value }))}
            style={{ ...field, background: '#fff' }}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <label style={label}>Tag</label>
          <div style={{ marginBottom: 12 }}>
            <TagInput tags={form.tags || []} onChange={tags => setForm(f => ({ ...f, tags }))} />
          </div>
          <label style={label}>Note</label>
          <textarea value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} style={{ ...field, resize: 'vertical' }} placeholder="Note interne…" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
            <input type="checkbox" checked={!!form.iscritto_newsletter} onChange={e => setForm(f => ({ ...f, iscritto_newsletter: e.target.checked }))} />
            <span style={{ fontSize: 14 }}>Iscritto alla newsletter</span>
          </label>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Salvataggio…' : isNew ? 'Aggiungi contatto' : 'Salva modifiche'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Kanban card (module-level — critico per drag!) ───────────────────────────
function KanbanCard({ contact, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contact.id })
  const style = {
    background: '#fff',
    borderRadius: 10,
    padding: '12px 14px',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.07)',
    opacity: isDragging ? 0.85 : 1,
    cursor: 'default',
    transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto',
    marginBottom: 8,
    border: '1px solid #f0f0f0',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Drag handle */}
        <div {...listeners} style={{ cursor: 'grab', color: '#ccc', flexShrink: 0, paddingTop: 2, touchAction: 'none' }}>
          <GripVertical size={14} strokeWidth={1.5} />
        </div>
        {/* Avatar */}
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1a1a2e15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>
          {(contact.nome || '?').charAt(0).toUpperCase()}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.nome}</div>
          {contact.email && <div style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{contact.email}</div>}
          {contact.telefono && <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{contact.telefono}</div>}
          {(contact.tags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
              {contact.tags.slice(0, 2).map(t => <TagChip key={t} tag={t} small />)}
              {contact.tags.length > 2 && <span style={{ fontSize: 10, color: '#aaa', alignSelf: 'center' }}>+{contact.tags.length - 2}</span>}
            </div>
          )}
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(contact)} style={{ padding: '4px 6px', background: '#f5f5f5', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            <Pencil size={11} strokeWidth={2} color="#555" />
          </button>
          <button onClick={() => onDelete(contact.id, contact.nome)} style={{ padding: '4px 6px', background: '#fff0f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            <Trash2 size={11} strokeWidth={2} color="#c00" />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#ccc', marginTop: 6, marginLeft: 52 }}>
        {new Date(contact.created_at).toLocaleDateString('it-IT')} · {contact.fonte || 'manuale'}
      </div>
    </div>
  )
}

// ─── Kanban column (module-level) ─────────────────────────────────────────────
function KanbanColumn({ stage, contacts, onEdit, onDelete, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  return (
    <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#333', flex: 1 }}>{stage.label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: stage.light, color: stage.color }}>{contacts.length}</span>
      </div>
      {/* Drop zone */}
      <div ref={setNodeRef} style={{
        flex: 1, minHeight: 120, borderRadius: 10, padding: 8,
        background: isOver ? stage.light : '#f8f8f8',
        border: `2px dashed ${isOver ? stage.color : 'transparent'}`,
        transition: 'background .15s, border-color .15s',
      }}>
        {contacts.map(c => (
          <KanbanCard key={c.id} contact={c} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {contacts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#ccc', fontSize: 12 }}>Trascina qui</div>
        )}
      </div>
      {/* Add button */}
      <button onClick={() => onAdd(stage.key)}
        style={{ marginTop: 8, padding: '7px', background: 'none', border: '1px dashed #ddd', borderRadius: 8, cursor: 'pointer', color: '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Plus size={12} strokeWidth={2} /> Aggiungi
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ContattiPage() {
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti } = useAzienda()
  const [contatti,  setContatti]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [view,      setView]      = useState('lista') // 'lista' | 'kanban'
  const [modal,     setModal]     = useState(null)    // null | 'new' | contact obj
  const [newStage,  setNewStage]  = useState('lead')  // stage pre-selezionato per "Aggiungi" da colonna
  const [allTags,   setAllTags]   = useState([])

  const aziendaId = azienda?.id || profile?.azienda_id
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function load() {
    setLoading(true)
    try {
      let url = '/api/contatti'
      const params = []
      if (search)    params.push(`search=${encodeURIComponent(search)}`)
      if (tagFilter) params.push(`tag=${encodeURIComponent(tagFilter)}`)
      if (params.length) url += '?' + params.join('&')
      const data = await apiFetch(url)
      setContatti(data)
      setAllTags([...new Set(data.flatMap(c => c.tags || []))].sort())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { if (aziendaId) load() }, [aziendaId, search, tagFilter]) // eslint-disable-line

  async function handleDelete(id, nome) {
    if (!confirm(`Eliminare "${nome}"?`)) return
    await apiFetch(`/api/contatti/${id}`, { method: 'DELETE' })
    setContatti(c => c.filter(x => x.id !== id))
  }

  async function moveStage(contactId, newStageKey) {
    setContatti(cs => cs.map(c => c.id === contactId ? { ...c, pipeline_stage: newStageKey } : c))
    try { await apiFetch(`/api/contatti/${contactId}`, { method: 'PATCH', body: JSON.stringify({ pipeline_stage: newStageKey }) }) }
    catch { load() }
  }

  function handleDragEnd({ active, over }) {
    if (!over) return
    const contact = contatti.find(c => c.id === active.id)
    if (contact && contact.pipeline_stage !== over.id) moveStage(active.id, over.id)
  }

  function openNewContact(stage = 'lead') {
    setNewStage(stage)
    setModal('new')
  }

  const total      = contatti.length
  const newsletter = contatti.filter(c => c.iscritto_newsletter).length

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Contatti</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>{total} contatti · {newsletter} iscritti newsletter</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ key: 'lista', Icon: List }, { key: 'kanban', Icon: LayoutGrid }].map(({ key, Icon }) => (
              <button key={key} onClick={() => setView(key)}
                style={{ padding: '6px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: view === key ? '#fff' : 'transparent', boxShadow: view === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: view === key ? '#1a1a2e' : '#888', transition: 'all .15s' }}>
                <Icon size={14} strokeWidth={1.8} />
                {key === 'lista' ? 'Lista' : 'Pipeline'}
              </button>
            ))}
          </div>
          <button onClick={() => openNewContact()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2} /> Aggiungi
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Totale contatti', value: total,      Icon: Users, color: '#2b6cb0' },
          { label: 'Newsletter',      value: newsletter,  Icon: Mail,  color: '#276749' },
          { label: 'Con telefono',    value: contatti.filter(c => c.telefono).length, Icon: Phone, color: '#b7791f' },
          { label: 'Tag usati',       value: allTags.length, Icon: Tag, color: '#6b46c1' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon size={16} strokeWidth={1.5} color={color} />
              <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Pipeline summary (kanban view only) ── */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {STAGES.map(s => {
            const count = contatti.filter(c => (c.pipeline_stage || 'lead') === s.key).length
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: s.light }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 12, color: s.color, fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 12, color: s.color, fontWeight: 400 }}>({count})</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filters (lista only) ── */}
      {view === 'lista' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca nome, email, telefono…"
              style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
            <option value="">Tutti i tag</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(search || tagFilter) && (
            <button onClick={() => { setSearch(''); setTagFilter('') }}
              style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', color: '#666' }}>
              Reset
            </button>
          )}
        </div>
      )}

      {/* ── Lista view ── */}
      {view === 'lista' && (
        loading ? <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>
        : contatti.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa' }}>
            {search || tagFilter ? 'Nessun contatto trovato.' : 'Nessun contatto ancora. Aggiungine uno o attiva il widget iscrizione nel minisito.'}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {contatti.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < contatti.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a2e15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</span>
                    <StageBadge stage={c.pipeline_stage || 'lead'} />
                    {c.iscritto_newsletter && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#f0fff4', color: '#276749' }}>Newsletter</span>
                    )}
                    {(c.tags || []).map(t => <TagChip key={t} tag={t} small />)}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {c.email && <span>{c.email}</span>}
                    {c.telefono && <span>{c.telefono}</span>}
                    <span style={{ color: '#bbb' }}>{new Date(c.created_at).toLocaleDateString('it-IT')} · {c.fonte}</span>
                  </div>
                </div>
                {/* Stage quick-change */}
                <StageSelect value={c.pipeline_stage || 'lead'} onChange={stage => moveStage(c.id, stage)} />
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setModal(c)} style={{ padding: '6px 10px', background: '#f5f5f5', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                    <Pencil size={13} strokeWidth={2} color="#555" />
                  </button>
                  <button onClick={() => handleDelete(c.id, c.nome)} style={{ padding: '6px 10px', background: '#fff0f0', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                    <Trash2 size={13} strokeWidth={2} color="#c00" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Kanban view ── */}
      {view === 'kanban' && (
        loading ? <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>
        : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
              {STAGES.map(stage => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  contacts={contatti.filter(c => (c.pipeline_stage || 'lead') === stage.key)}
                  onEdit={setModal}
                  onDelete={handleDelete}
                  onAdd={openNewContact}
                />
              ))}
            </div>
          </DndContext>
        )
      )}

      {/* ── Modal ── */}
      {modal && (
        <ContactModal
          contact={modal === 'new' ? { pipeline_stage: newStage } : modal}
          aziendaId={aziendaId}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
