import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiFetch } from '../../lib/api'

const PIANI = ['base', 'standard', 'premium', 'enterprise']

const TEXT_FIELDS = [
  { key: 'ragione_sociale', label: 'Ragione sociale', required: true },
  { key: 'partita_iva',     label: 'Partita IVA' },
  { key: 'codice_fiscale',  label: 'Codice fiscale' },
  { key: 'email',           label: 'Email', type: 'email' },
  { key: 'pec',             label: 'PEC', type: 'email' },
  { key: 'telefono',        label: 'Telefono' },
  { key: 'cellulare',       label: 'Cellulare' },
  { key: 'indirizzo',       label: 'Indirizzo' },
  { key: 'citta',           label: 'Città' },
  { key: 'cap',             label: 'CAP' },
  { key: 'provincia',       label: 'Provincia' },
]

const pill = (extra = {}) => ({
  padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', ...extra,
})

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box',
}

export default function AziendePage() {
  const location = useLocation()
  const [aziende, setAziende] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])
  useEffect(() => { setView('list'); setSelected(null) }, [location.key])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/aziende')
      setAziende(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(form) {
    const created = await apiFetch('/api/aziende', { method: 'POST', body: JSON.stringify(form) })
    setAziende(prev => [...prev, created].sort((a, b) => a.ragione_sociale.localeCompare(b.ragione_sociale)))
    setView('list')
  }

  async function handleEdit(form) {
    const updated = await apiFetch(`/api/aziende/${selected.id}`, { method: 'PATCH', body: JSON.stringify(form) })
    setAziende(prev => prev.map(a => a.id === selected.id ? updated : a))
    setView('list')
    setSelected(null)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Eliminare l'azienda "${name}"?\nVerranno eliminate anche tutte le strutture e i ristoranti associati.`)) return
    try {
      await apiFetch(`/api/aziende/${id}`, { method: 'DELETE' })
      setAziende(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Aziende</h2>
        {view === 'list' && (
          <button onClick={() => setView('create')} style={pill({ background: '#1a1a2e', color: '#fff' })}>
            + Nuova azienda
          </button>
        )}
      </div>

      {error && <p style={{ color: '#c00' }}>{error}</p>}

      {view === 'create' && (
        <AziendaForm
          title="Nuova azienda"
          onSave={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selected && (
        <AziendaForm
          title={`Modifica: ${selected.ragione_sociale}`}
          initialData={selected}
          onSave={handleEdit}
          onCancel={() => { setView('list'); setSelected(null) }}
        />
      )}

      {view === 'list' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {aziende.length === 0 && (
            <p style={{ color: '#888' }}>Nessuna azienda trovata. Creane una nuova per iniziare.</p>
          )}
          {aziende.map(a => (
            <AziendaCard
              key={a.id}
              azienda={a}
              onEdit={() => { setSelected(a); setView('edit') }}
              onDelete={() => handleDelete(a.id, a.ragione_sociale)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AziendaCard({ azienda: a, onEdit, onDelete }) {
  const moduli = a.moduli || {}
  const moduliAttivi = Object.entries(moduli).filter(([, v]) => v).map(([k]) => k)

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{a.ragione_sociale}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {a.partita_iva && <span>P.IVA {a.partita_iva}</span>}
          {a.email && <span>{a.email}</span>}
          {a.citta && <span>{a.citta}{a.provincia ? ` (${a.provincia})` : ''}</span>}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge color="#e8f4fd" text={a.piano} />
          <Badge color={a.active ? '#f0fff4' : '#fff0f0'} textColor={a.active ? '#276749' : '#c00'} text={a.active ? 'Attiva' : 'Inattiva'} />
          {moduliAttivi.map(m => (
            <Badge key={m} color="#f5f0ff" textColor="#6b21a8" text={m} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={onEdit} style={pill({ background: '#f0f4ff', color: '#1a1a2e' })}>Modifica</button>
        <button onClick={onDelete} style={pill({ background: '#fff0f0', color: '#c00' })}>Elimina</button>
      </div>
    </div>
  )
}

function Badge({ color, textColor = '#333', text }) {
  return (
    <span style={{
      background: color, color: textColor,
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    }}>
      {text}
    </span>
  )
}

function AziendaForm({ title, initialData = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    ragione_sociale: '', partita_iva: '', codice_fiscale: '',
    email: '', pec: '', telefono: '', cellulare: '',
    indirizzo: '', citta: '', cap: '', provincia: '',
    piano: 'base',
    moduli: { struttura: false, ristorante: false },
    active: true,
    ...initialData,
    moduli: { struttura: false, ristorante: false, ...(initialData.moduli || {}) },
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }
  function setModulo(key, val) { setForm(f => ({ ...f, moduli: { ...f.moduli, [key]: val } })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.ragione_sociale?.trim()) { setError('La ragione sociale è obbligatoria.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 28,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24, maxWidth: 640,
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 20 }}>{title}</h3>
      <form onSubmit={handleSubmit}>

        {/* Dati anagrafici */}
        <SectionLabel>Dati anagrafici</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {TEXT_FIELDS.map(({ key, label, type = 'text', required }) => (
            <div key={key} style={key === 'ragione_sociale' || key === 'indirizzo' ? { gridColumn: '1 / -1' } : {}}>
              <label style={labelStyle}>
                {label}{required && <span style={{ color: '#c00' }}> *</span>}
              </label>
              <input
                type={type}
                value={form[key] || ''}
                onChange={e => set(key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Piano */}
        <SectionLabel>Piano</SectionLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {PIANI.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => set('piano', p)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: '2px solid',
                borderColor: form.piano === p ? '#1a1a2e' : '#ddd',
                background: form.piano === p ? '#1a1a2e' : '#fff',
                color: form.piano === p ? '#fff' : '#666',
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Moduli */}
        <SectionLabel>Moduli attivi</SectionLabel>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {['struttura', 'ristorante'].map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!form.moduli[m]}
                onChange={e => setModulo(m, e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </label>
          ))}
        </div>

        {/* Stato */}
        <SectionLabel>Stato</SectionLabel>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={e => set('active', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          Azienda attiva
        </label>

        {error && <p style={{ color: '#c00', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={pill({ background: '#1a1a2e', color: '#fff', padding: '10px 24px' })}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
          <button type="button" onClick={onCancel} style={pill({ background: '#f0f0f0', color: '#333', padding: '10px 24px' })}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}
