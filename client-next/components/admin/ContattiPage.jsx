'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import { Search, Plus, X, Pencil, Trash2, Users, Mail, Phone, Tag, List, LayoutGrid, GripVertical, ChevronDown, ChevronUp, Star, Copy, Check, Download, Upload, Repeat, MessageCircle } from 'lucide-react'
import { costruisciListe, nomeFonte, fraseAttivita, canaliContattabili, contattabile, emailDaCorreggere } from '@/lib/contatti-liste'
import ContattiImportModal from './ContattiImportModal'
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'

// ─── Pipeline stages ─────────────────────────────────────────────────────────
const STAGES = [
  { key: 'lead',         label: 'Nuovo lead',       color: '#888',    light: '#f5f5f5' },
  { key: 'contattato',   label: 'Contattato',        color: '#2b6cb0', light: '#ebf4ff' },
  { key: 'proposta',     label: 'In trattativa',     color: '#b7791f', light: '#fffbeb' },
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

// ─── Export CSV ────────────────────────────────────────────────────────────────
// Separatore ';' (Excel IT/EU non spezza in colonne) + BOM UTF-8 (accenti corretti).
function csvCell(v) {
  const s = v == null ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

function downloadContattiCSV(contatti, nomeLista = '') {
  const headers = ['Nome', 'Email', 'Telefono', 'Da dove arriva', 'Attività', 'Ultima attività', 'Quando', 'Email promozionali', 'WhatsApp', 'Stage', 'Tag', 'Note', 'Arrivato il']
  const rows = contatti.map(c => [
    c.nome,
    c.email,
    c.telefono,
    nomeFonte(c.fonte),
    c.attivita_numero || 0,
    c.ultima_attivita_tipo ? fraseAttivita({ tipo: c.ultima_attivita_tipo, titolo: c.ultima_attivita_titolo }) : '',
    c.ultima_attivita_il ? new Date(c.ultima_attivita_il).toLocaleDateString('it-IT') : '',
    canaliContattabili(c).email ? 'Sì' : 'No',
    canaliContattabili(c).whatsapp ? 'Sì' : 'No',
    (STAGE_MAP[c.pipeline_stage] || STAGE_MAP.lead).label,
    (c.tags || []).join(', '),
    c.note,
    c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '',
  ])
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const lista = nomeLista ? '-' + nomeLista.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) : ''
  a.download = `contatti${lista}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Contact modal ────────────────────────────────────────────────────────────
const EMPTY = { nome: '', email: '', telefono: '', tags: [], note: '', iscritto_newsletter: false, whatsapp_optin: false, pipeline_stage: 'lead' }

function ContactModal({ contact, aziendaId, onSave, onClose, storia = [], entita = [], onElimina = null }) {
  const [form, setForm] = useState(contact ? { ...EMPTY, ...contact } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const isNew = !contact?.id
  // Il link per chiedere una recensione: prima stava su ogni riga dell'elenco.
  const [entitaRec, setEntitaRec] = useState(entita[0]?.key || '')
  const [recCopiata, setRecCopiata] = useState(false)
  async function linkRecensione() {
    const e = entita.find(x => x.key === entitaRec) || entita[0]
    if (!e) return
    try {
      const data = await apiFetch('/api/recensioni/genera-link', { method: 'POST', body: JSON.stringify({ entity_tipo: e.tipo, entity_id: e.id, autore: contact.nome }) })
      await navigator.clipboard.writeText(data.link)
      setRecCopiata(true); setTimeout(() => setRecCopiata(false), 2500)
    } catch (err) { alert(`Non è riuscito: ${err.message}`) }
  }

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

  async function handleErasure() {
    if (!window.confirm('Anonimizzare tutti i dati personali di questo contatto?\n\nNome, email, telefono e note verranno sostituiti con dati anonimi. Questa azione è irreversibile (GDPR Art. 17).')) return
    setSaving(true)
    try {
      await apiFetch(`/api/contatti/${contact.id}/erasure`, { method: 'POST' })
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
          <h3 style={{ margin: 0, fontSize: 17, overflowWrap: 'anywhere' }}>{isNew ? 'Nuovo contatto' : contact.nome}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {/* ⛔ La storia stava in un testo libero nelle note («[03/10] Ha prenotato…
            12 posti»), mescolata a quello che scrive il titolare. Ora si legge
            dal registro: una riga per ogni cosa fatta, la più recente in cima. */}
        {!isNew && (
          <div data-storia style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 8 }}>
              Storia {storia.length > 0 && <span style={{ fontWeight: 400, color: '#999' }}>· {storia.length} {storia.length === 1 ? 'attività' : 'attività'} · arrivato da: {nomeFonte(contact.fonte)}</span>}
            </div>
            {storia.length === 0 ? (
              <div style={{ fontSize: 13, color: '#999', background: '#fafafa', borderRadius: 8, padding: '10px 12px' }}>
                Nessuna attività registrata. Arrivato da: {nomeFonte(contact.fonte)}.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 0, border: '1px solid #eee', borderRadius: 8, maxHeight: 190, overflowY: 'auto' }}>
                {storia.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: i < storia.length - 1 ? '1px solid #f3f3f3' : 'none', fontSize: 13 }}>
                    <span style={{ color: '#999', flexShrink: 0, width: 78 }}>{new Date(a.avvenuta_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                    <span style={{ color: '#333', overflowWrap: 'anywhere' }}>{fraseAttivita(a)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={!!form.iscritto_newsletter} onChange={e => setForm(f => ({ ...f, iscritto_newsletter: e.target.checked }))} />
            <span style={{ fontSize: 14 }}>Iscritto alla newsletter</span>
          </label>

          {/* Il consenso WhatsApp e' l'unica spunta che puo' far bloccare il numero
              del cliente da Meta: va messa solo se il consenso c'e' davvero, e chi
              la mette deve saperlo nel momento in cui clicca, non dopo. */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={!!form.whatsapp_optin}
              onChange={e => setForm(f => ({ ...f, whatsapp_optin: e.target.checked }))}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 14 }}>Può ricevere messaggi su WhatsApp</span>
          </label>
          {form.whatsapp_optin && (
            <div style={{ display: 'flex', gap: 8, background: '#fffaf5', border: '1px solid #ffe0b2', borderRadius: 8, padding: '10px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 15, lineHeight: 1.2 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 12, color: '#7a4a00', lineHeight: 1.5 }}>
                <strong>Nota bene:</strong> spunta questa casella solo se la persona ti ha
                autorizzato a scriverle su WhatsApp. Inviare messaggi a chi non ha dato il
                consenso porta a segnalazioni e <strong>può farti bloccare il numero da Meta</strong> —
                oltre a non essere consentito dalla normativa privacy.
              </p>
            </div>
          )}

          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Salvataggio…' : isNew ? 'Aggiungi contatto' : 'Salva modifiche'}
          </button>
          {!isNew && entita.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              {entita.length > 1 && (
                <select value={entitaRec} onChange={e => setEntitaRec(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff' }}>
                  {entita.map(e => <option key={e.key} value={e.key}>{e.name}</option>)}
                </select>
              )}
              <button type="button" onClick={linkRecensione}
                style={{ flex: entita.length > 1 ? '0 0 auto' : 1, padding: '9px 12px', background: recCopiata ? '#f0fff4' : '#fffbeb', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: recCopiata ? '#276749' : '#b7791f', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {recCopiata ? <><Check size={13} strokeWidth={1.5} /> Link copiato</> : <><Star size={13} strokeWidth={1.5} /> Copia il link per la recensione</>}
              </button>
            </div>
          )}
          {!isNew && onElimina && (
            <button type="button" onClick={() => onElimina(contact)} disabled={saving}
              style={{ width: '100%', marginTop: 8, padding: '9px', background: '#fff0f0', border: 'none', color: '#c00', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Elimina contatto
            </button>
          )}
          {!isNew && (
            <button type="button" onClick={handleErasure} disabled={saving}
              style={{ width: '100%', marginTop: 8, padding: '9px', background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Anonimizza dati (GDPR Art. 17)
            </button>
          )}
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
  const { azienda, strutture, ristoranti, attivita, activeAziendaId } = useAzienda()
  const [contatti,  setContatti]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  // Il registro di quello che hanno fatto i contatti (`attivita` qui è già l'elenco delle attività dell'azienda).
  const [registro,  setRegistro]  = useState([])
  const [lista,     setLista]     = useState('tutti')   // quale lista si sta guardando
  const [ordine,    setOrdine]    = useState({ per: 'ultima', verso: 'desc' })
  const [view,      setView]      = useState('lista') // 'lista' | 'kanban'
  const [modal,     setModal]     = useState(null)    // null | 'new' | contact obj
  const [importOpen, setImportOpen] = useState(false)
  const [newStage,  setNewStage]  = useState('lead')  // stage pre-selezionato per "Aggiungi" da colonna

  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function load() {
    setLoading(true)
    try {
      // I contatti e il registro di quello che hanno fatto. La ricerca e le
      // liste si applicano qui nel browser: così ordinare e cambiare lista non
      // richiede di riscaricare tutto.
      const dove = aziendaId ? `?azienda_id=${aziendaId}` : ''
      const [data, storia] = await Promise.all([
        apiFetch(`/api/contatti${dove}`),
        apiFetch(`/api/contatti/attivita${dove}`).catch(() => []),
      ])
      setContatti(Array.isArray(data) ? data : [])
      setRegistro(Array.isArray(storia) ? storia : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [aziendaId]) // eslint-disable-line

  const allEntities = [
    ...(strutture || []).map(e => ({ id: e.id, name: e.name, tipo: 'struttura', key: `struttura:${e.id}` })),
    ...(ristoranti || []).map(e => ({ id: e.id, name: e.name, tipo: 'ristorante', key: `ristorante:${e.id}` })),
    ...(attivita || []).map(e => ({ id: e.id, name: e.name, tipo: 'attivita', key: `attivita:${e.id}` })),
  ]

  async function handleDelete(id, nome) {
    if (!confirm(`Eliminare "${nome}"?`)) return
    await apiFetch(`/api/contatti/${id}`, { method: 'DELETE' })
    setContatti(c => c.filter(x => x.id !== id))
    setModal(null)
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

  // Le liste si calcolano dai fatti: chi prenota entra da solo.
  const { liste, perContatto } = costruisciListe(contatti, registro)
  const listaScelta = liste.find(l => l.chiave === lista) || liste[0]
  const cercato = search.trim().toLowerCase()
  const COLONNE = {
    nome:     c => (c.nome || '').toLowerCase(),
    fonte:    c => nomeFonte(c.fonte).toLowerCase(),
    volte:    c => c.attivita_numero || 0,
    ultima:   c => c.ultima_attivita_il || '',
    contatto: c => (canaliContattabili(c).email ? 1 : 0) + (canaliContattabili(c).whatsapp ? 1 : 0),
    dal:      c => c.created_at || '',
  }
  const visibili = contatti
    .filter(c => !listaScelta.ids || listaScelta.ids.has(c.id))
    .filter(c => !cercato || [c.nome, c.email, c.telefono].some(x => (x || '').toLowerCase().includes(cercato)))
    .sort((x, y) => {
      const a = COLONNE[ordine.per](x), b = COLONNE[ordine.per](y)
      const d = typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'it')
      // A parità, il nome: l'ordine non deve cambiare da un caricamento all'altro.
      return (ordine.verso === 'asc' ? d : -d) || (x.nome || '').localeCompare(y.nome || '', 'it')
    })
  const contattabiliQui = visibili.filter(contattabile).length
  // Cliccando un'intestazione si ordina per quella; ricliccando si inverte.
  // I testi partono dalla A, numeri e date dal più alto.
  const ordinaPer = per => setOrdine(o => o.per === per ? { per, verso: o.verso === 'asc' ? 'desc' : 'asc' } : { per, verso: per === 'nome' || per === 'fonte' ? 'asc' : 'desc' })

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
          <button onClick={() => setImportOpen(true)}
            title="Importa contatti da un file CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#1a1a2e', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={15} strokeWidth={2} /> Importa
          </button>
          <button onClick={() => view === 'lista' ? downloadContattiCSV(visibili, listaScelta.chiave === 'tutti' ? '' : listaScelta.titolo) : downloadContattiCSV(contatti)} disabled={contatti.length === 0}
            title={contatti.length === 0 ? 'Nessun contatto da esportare' : 'Esporta in CSV i contatti che stai guardando'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: contatti.length === 0 ? '#bbb' : '#1a1a2e', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: contatti.length === 0 ? 'not-allowed' : 'pointer' }}>
            <Download size={15} strokeWidth={2} /> Esporta
          </button>
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
          { label: 'Tornati più volte', value: liste.find(l => l.chiave === 'tornati')?.n || 0, Icon: Repeat, color: '#6b46c1' },
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

      {/* ── Lista: le liste a sinistra, la tabella a destra ──
          ⛔ Era un elenco di schede con quattro comandi per riga, la pastiglia
          «Lead» su tutti e da due a cinque tag ciascuno — titoli interi di
          eventi, parole nostre come «lead» e «struttura». Francesco, guardando
          Garage 22: «trovo grande caos anche qui».
          Ora: a sinistra le LISTE, calcolate da quello che le persone hanno
          fatto (chi ha prenotato quella serata, chi è tornato, chi si può
          contattare); a destra una tabella che si ordina cliccando le
          intestazioni. I comandi stanno nella scheda, che si apre dalla riga.
          La pipeline resta nella sua vista. */}
      {view === 'lista' && (
        loading ? <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>
        : contatti.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa' }}>
            Nessun contatto ancora. Chi prenota, ordina o compila un modulo entra qui da solo; puoi anche aggiungerne uno a mano o importare un file.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Le liste */}
            <nav data-liste aria-label="Liste di contatti" style={{ flex: '0 0 230px', maxWidth: '100%', background: '#fff', borderRadius: 12, padding: '10px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {liste.map((l, i) => {
                const attiva = l.chiave === listaScelta.chiave
                const nuovoGruppo = l.gruppo && l.gruppo !== liste[i - 1]?.gruppo
                return (
                  <div key={l.chiave}>
                    {nuovoGruppo && <div style={{ fontSize: 10.5, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, padding: '12px 10px 4px' }}>{l.gruppo}</div>}
                    <button onClick={() => setLista(l.chiave)} data-lista={l.chiave} title={l.titoloLungo || l.titolo}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', background: attiva ? '#1a1a2e' : 'transparent', color: attiva ? '#fff' : '#333', fontSize: 13, fontWeight: attiva ? 700 : 500 }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.titolo}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: attiva ? 'rgba(255,255,255,0.75)' : '#999', flexShrink: 0 }}>{l.n}</span>
                    </button>
                  </div>
                )
              })}
            </nav>

            {/* La tabella */}
            <div style={{ flex: '1 1 520px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div data-titolo-lista style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{listaScelta.titoloLungo || listaScelta.titolo}</div>
                  {/* ⚠️ Avere il contatto di qualcuno non è poterlo invitare: va
                      detto qui, dove si decide se quella lista serve a qualcosa. */}
                  <div data-conto-lista style={{ fontSize: 13, color: '#777', marginTop: 2 }}>
                    {visibili.length} {visibili.length === 1 ? 'persona' : 'persone'}
                    {visibili.length > 0 && <> · {contattabiliQui === 0 ? 'nessuna ha dato il consenso a ricevere promozioni' : `${contattabiliQui} ${contattabiliQui === 1 ? 'si può' : 'si possono'} contattare per promozione`}</>}
                  </div>
                  {listaScelta.spiega && <div style={{ fontSize: 12.5, color: '#999', marginTop: 2 }}>{listaScelta.spiega}</div>}
                </div>
                <div style={{ position: 'relative', flex: '0 1 260px', minWidth: 180 }}>
                  <Search size={15} strokeWidth={1.5} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca nome, email, telefono…"
                    style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              {visibili.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: 36, textAlign: 'center', color: '#aaa' }}>
                  {cercato ? 'Nessuno con questo nome in questa lista.' : 'Nessuno in questa lista.'}
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
                  <table data-tabella-contatti style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr>
                        {[['nome', 'Nome'], ['fonte', 'Da dove arriva'], ['volte', 'Attività'], ['ultima', 'Ultima attività'], ['contatto', 'Si può contattare'], ['dal', 'Dal']].map(([k, etichetta]) => (
                          <th key={k} aria-sort={ordine.per === k ? (ordine.verso === 'asc' ? 'ascending' : 'descending') : 'none'}
                            style={{ textAlign: k === 'volte' ? 'right' : 'left', padding: 0, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                            <button onClick={() => ordinaPer(k)} data-ordina={k}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: k === 'volte' ? 'flex-end' : 'flex-start', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: ordine.per === k ? '#1a1a2e' : '#888' }}>
                              {etichetta}
                              {ordine.per === k && (ordine.verso === 'asc' ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} />)}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibili.map(c => {
                        const canali = canaliContattabili(c)
                        return (
                          <tr key={c.id} onClick={() => setModal(c)} data-contatto={c.id} tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter') setModal(c) }}
                            style={{ cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                              <div style={{ fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{c.nome}</div>
                              <div style={{ fontSize: 12, color: emailDaCorreggere(c) ? '#c53030' : '#888', marginTop: 2, overflowWrap: 'anywhere' }}>
                                {[c.email, c.telefono].filter(Boolean).join(' · ') || '—'}
                                {emailDaCorreggere(c) && ' · email da correggere'}
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#555', whiteSpace: 'nowrap' }}>{nomeFonte(c.fonte)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: (c.attivita_numero || 0) > 1 ? '#1a1a2e' : '#999' }}>{c.attivita_numero || 0}</td>
                            <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                              {c.ultima_attivita_tipo ? (
                                <>
                                  <div style={{ color: '#333', overflowWrap: 'anywhere' }}>{fraseAttivita({ tipo: c.ultima_attivita_tipo, titolo: c.ultima_attivita_titolo })}</div>
                                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{new Date(c.ultima_attivita_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </>
                              ) : <span style={{ color: '#bbb' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              {!canali.email && !canali.whatsapp ? <span style={{ color: '#bbb' }}>No</span> : (
                                <span style={{ display: 'inline-flex', gap: 5 }}>
                                  {canali.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f0fff4', color: '#276749' }}><Mail size={11} strokeWidth={1.5} /> Email</span>}
                                  {canali.whatsapp && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#ebf8f4', color: '#0b6b5c' }}><MessageCircle size={11} strokeWidth={1.5} /> WhatsApp</span>}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#888', whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
      {importOpen && (
        <ContattiImportModal
          aziendaId={aziendaId}
          onFatto={load}
          onClose={() => setImportOpen(false)}
        />
      )}

      {modal && (
        <ContactModal
          contact={modal === 'new' ? { pipeline_stage: newStage } : modal}
          storia={modal !== 'new' ? (perContatto.get(modal.id) || []) : []}
          entita={allEntities}
          onElimina={modal !== 'new' ? (c => handleDelete(c.id, c.nome)) : null}
          aziendaId={aziendaId}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
