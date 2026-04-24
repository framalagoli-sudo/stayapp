import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const FORM_FIELDS = [
  { key: 'name',        label: 'Nome ristorante', required: true },
  { key: 'description', label: 'Descrizione',      type: 'textarea' },
  { key: 'address',     label: 'Indirizzo' },
  { key: 'phone',       label: 'Telefono' },
  { key: 'email',       label: 'Email', type: 'email' },
  { key: 'schedule',    label: 'Orari', placeholder: 'es. Lun-Ven 12:00-14:30 / 19:00-22:30' },
]

const pill = (extra = {}) => ({
  padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', ...extra,
})

export default function RistorantiListPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [ristoranti, setRistoranti] = useState([])
  const [aziende, setAziende] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState(null)

  const isSuperAdmin = profile?.role === 'super_admin'

  useEffect(() => {
    if (profile && !['super_admin', 'admin', 'editor'].includes(profile.role)) {
      navigate('/admin', { replace: true })
    }
  }, [profile])

  useEffect(() => { load() }, [])
  useEffect(() => { setShowCreate(false) }, [location.key])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [risData, azData] = await Promise.all([
        apiFetch('/api/ristoranti'),
        isSuperAdmin ? apiFetch('/api/aziende') : Promise.resolve([]),
      ])
      setRistoranti(risData)
      setAziende(azData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(form) {
    const created = await apiFetch('/api/ristoranti', { method: 'POST', body: JSON.stringify(form) })
    setRistoranti(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setShowCreate(false)
    navigate(`/admin/ristoranti/${created.id}/info`)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Eliminare il ristorante "${name}"?\nL'operazione è irreversibile.`)) return
    try {
      await apiFetch(`/api/ristoranti/${id}`, { method: 'DELETE' })
      setRistoranti(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Ristoranti</h2>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} style={pill({ background: '#1a1a2e', color: '#fff' })}>
            + Nuovo ristorante
          </button>
        )}
      </div>

      {error && <p style={{ color: '#c00' }}>{error}</p>}

      {showCreate && (
        <CreateForm
          isSuperAdmin={isSuperAdmin}
          aziende={aziende}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {ristoranti.length === 0 && !showCreate && (
          <p style={{ color: '#888' }}>Nessun ristorante trovato. Creane uno nuovo per iniziare.</p>
        )}
        {ristoranti.map(r => (
          <div key={r.id} style={{
            background: '#fff', borderRadius: 12, padding: '18px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{r.slug}</code>
                <span style={{ color: r.active ? '#38a169' : '#e53e3e' }}>{r.active ? 'Attivo' : 'Inattivo'}</span>
                {r.address && <span>{r.address}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => navigate(`/admin/ristoranti/${r.id}/info`)}
                style={pill({ background: '#f0f4ff', color: '#1a1a2e' })}
              >
                Gestisci
              </button>
              <button
                onClick={() => handleDelete(r.id, r.name)}
                style={pill({ background: '#fff0f0', color: '#c00' })}
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateForm({ isSuperAdmin, aziende, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', azienda_id: aziende[0]?.id || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name?.trim()) { setError('Il nome è obbligatorio.'); return }
    if (isSuperAdmin && !form.azienda_id) { setError('Seleziona un\'azienda.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
  const lblStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24, maxWidth: 560 }}>
      <h3 style={{ marginTop: 0, marginBottom: 20 }}>Nuovo ristorante</h3>
      <form onSubmit={handleSubmit}>
        {isSuperAdmin && (
          <div style={{ marginBottom: 14 }}>
            <label style={lblStyle}>Azienda <span style={{ color: '#c00' }}>*</span></label>
            <select value={form.azienda_id} onChange={e => set('azienda_id', e.target.value)} style={inputStyle}>
              <option value="">— Seleziona azienda —</option>
              {aziende.map(a => <option key={a.id} value={a.id}>{a.ragione_sociale}</option>)}
            </select>
          </div>
        )}
        {FORM_FIELDS.map(({ key, label, type = 'text', placeholder, required }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={lblStyle}>{label}{required && <span style={{ color: '#c00' }}> *</span>}</label>
            {type === 'textarea' ? (
              <textarea value={form[key] || ''} onChange={e => set(key, e.target.value)} rows={2}
                style={{ ...inputStyle, resize: 'vertical' }} />
            ) : (
              <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
                placeholder={placeholder} style={inputStyle} />
            )}
          </div>
        ))}
        {error && <p style={{ color: '#c00', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" disabled={saving} style={pill({ background: '#1a1a2e', color: '#fff', padding: '10px 24px' })}>
            {saving ? 'Creazione…' : 'Crea ristorante'}
          </button>
          <button type="button" onClick={onCancel} style={pill({ background: '#f0f0f0', color: '#333', padding: '10px 24px' })}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
