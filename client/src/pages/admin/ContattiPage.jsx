import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import { apiFetch } from '../../lib/api'
import { Search, Plus, X, Pencil, Trash2, Users, Mail, Phone, Tag, Check } from 'lucide-react'

const TAG_COLORS = [
  '#00b5b5', '#e63946', '#2b6cb0', '#276749', '#b7791f',
  '#6b46c1', '#c05621', '#2c7a7b', '#702459',
]
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
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } if (e.key === ',' || e.key === ' ') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length ? '' : 'Aggiungi tag (Invio per confermare)'}
        style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 120, background: 'transparent' }} />
    </div>
  )
}

const EMPTY = { nome: '', email: '', telefono: '', tags: [], note: '', iscritto_newsletter: false }

function ContactModal({ contact, aziendaId, onSave, onClose }) {
  const [form, setForm] = useState(contact ? { ...contact } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const isNew = !contact

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await apiFetch('/api/contatti', { method: 'POST', body: JSON.stringify({ ...form, azienda_id: aziendaId }) })
      } else {
        await apiFetch(`/api/contatti/${contact.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      }
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
          <label style={label}>Tag</label>
          <div style={{ marginBottom: 12 }}>
            <TagInput tags={form.tags || []} onChange={tags => setForm(f => ({ ...f, tags }))} />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Es: vip, famiglia, cliente-2024</div>
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

export default function ContattiPage() {
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti } = useAzienda()
  const [contatti,  setContatti]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [modal,     setModal]     = useState(null) // null | 'new' | contact obj
  const [allTags,   setAllTags]   = useState([])

  const aziendaId = azienda?.id || profile?.azienda_id
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id

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
      const tags = [...new Set(data.flatMap(c => c.tags || []))].sort()
      setAllTags(tags)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { if (aziendaId) load() }, [aziendaId, search, tagFilter])

  async function handleDelete(id, nome) {
    if (!confirm(`Eliminare "${nome}"?`)) return
    await apiFetch(`/api/contatti/${id}`, { method: 'DELETE' })
    setContatti(c => c.filter(x => x.id !== id))
  }

  const total      = contatti.length
  const newsletter = contatti.filter(c => c.iscritto_newsletter).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Contatti</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>{total} contatti · {newsletter} iscritti newsletter</p>
        </div>
        <button onClick={() => setModal('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} strokeWidth={2} /> Aggiungi
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Totale contatti', value: total, Icon: Users, color: '#2b6cb0' },
          { label: 'Newsletter', value: newsletter, Icon: Mail, color: '#276749' },
          { label: 'Con telefono', value: contatti.filter(c => c.telefono).length, Icon: Phone, color: '#b7791f' },
          { label: 'Tag usati', value: allTags.length, Icon: Tag, color: '#6b46c1' },
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

      {/* Filters */}
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

      {/* List */}
      {loading ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>
      ) : contatti.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa' }}>
          {search || tagFilter ? 'Nessun contatto trovato.' : 'Nessun contatto ancora. Aggiungine uno manualmente o attiva il widget iscrizione nel minisito.'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {contatti.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < contatti.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1a1a2e15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</span>
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
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setModal(c)}
                  style={{ padding: '6px 10px', background: '#f5f5f5', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                  <Pencil size={13} strokeWidth={2} color="#555" />
                </button>
                <button onClick={() => handleDelete(c.id, c.nome)}
                  style={{ padding: '6px 10px', background: '#fff0f0', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                  <Trash2 size={13} strokeWidth={2} color="#c00" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ContactModal
          contact={modal === 'new' ? null : modal}
          aziendaId={aziendaId}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
