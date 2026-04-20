import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiFetch } from '../../lib/api'

const FIELDS = [
  { key: 'name', label: 'Nome struttura', type: 'text', required: true },
  { key: 'description', label: 'Descrizione', type: 'textarea' },
  { key: 'address', label: 'Indirizzo', type: 'text' },
  { key: 'phone', label: 'Telefono', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'wifi_name', label: 'Nome WiFi', type: 'text' },
  { key: 'wifi_password', label: 'Password WiFi', type: 'text' },
  { key: 'checkin_time', label: 'Check-in', type: 'text', placeholder: 'es. 14:00' },
  { key: 'checkout_time', label: 'Check-out', type: 'text', placeholder: 'es. 11:00' },
  { key: 'rules', label: 'Regole della struttura', type: 'textarea' },
]

const pill = (extra = {}) => ({
  padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', ...extra,
})

export default function PropertiesPage() {
  const location = useLocation()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'create' | 'edit'
  const [selected, setSelected] = useState(null)
  const [qrProperty, setQrProperty] = useState(null)
  const [pageError, setPageError] = useState(null)

  useEffect(() => { loadAll() }, [])

  // Torna alla lista quando l'utente naviga su questa pagina (anche dalla stessa URL)
  useEffect(() => {
    setView('list')
    setSelected(null)
  }, [location.key])

  async function loadAll() {
    setLoading(true)
    setPageError(null)
    try {
      const data = await apiFetch('/api/properties')
      setProperties(data)
    } catch (e) {
      setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(form) {
    const created = await apiFetch('/api/properties', { method: 'POST', body: JSON.stringify(form) })
    setProperties(ps => [...ps, created].sort((a, b) => a.name.localeCompare(b.name)))
    setView('list')
  }

  async function handleEdit(form) {
    const updated = await apiFetch(`/api/properties/${selected.id}`, { method: 'PATCH', body: JSON.stringify(form) })
    setProperties(ps => ps.map(p => p.id === selected.id ? updated : p))
    setView('list')
    setSelected(null)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Eliminare la struttura "${name}"?\nL'operazione è irreversibile.`)) return
    try {
      await apiFetch(`/api/properties/${id}`, { method: 'DELETE' })
      setProperties(ps => ps.filter(p => p.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Strutture</h2>
        {view === 'list' && (
          <button onClick={() => setView('create')} style={pill({ background: '#1a1a2e', color: '#fff' })}>
            + Nuova struttura
          </button>
        )}
      </div>

      {pageError && <p style={{ color: '#c00' }}>{pageError}</p>}

      {view === 'create' && (
        <PropertyForm
          title="Nuova struttura"
          onSave={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selected && (
        <PropertyForm
          title={`Modifica: ${selected.name}`}
          initialData={selected}
          onSave={handleEdit}
          onCancel={() => { setView('list'); setSelected(null) }}
        />
      )}

      {view === 'list' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {properties.length === 0 && (
            <p style={{ color: '#888' }}>
              Nessuna struttura trovata. Creane una nuova per iniziare.
            </p>
          )}
          {properties.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>
                    {p.slug}
                  </code>
                  {' · '}
                  <span style={{ color: p.active ? '#38a169' : '#e53e3e' }}>
                    {p.active ? 'Attiva' : 'Inattiva'}
                  </span>
                </div>
                {p.address && (
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{p.address}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setQrProperty(p)}
                  style={pill({ background: '#f0fff4', color: '#276749' })}
                >
                  QR Code
                </button>
                <button
                  onClick={() => { setSelected(p); setView('edit') }}
                  style={pill({ background: '#f0f4ff', color: '#1a1a2e' })}
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  style={pill({ background: '#fff0f0', color: '#c00' })}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrProperty && (
        <QrModal property={qrProperty} onClose={() => setQrProperty(null)} />
      )}
    </div>
  )
}

function QrModal({ property, onClose }) {
  const overlayRef = useRef(null)
  const guestUrl = `${window.location.origin}/s/${property.slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestUrl)}`

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxWidth: 360, width: '90%', textAlign: 'center', position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#888', lineHeight: 1,
          }}
          aria-label="Chiudi"
        >
          ×
        </button>

        <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>{property.name}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: '#888' }}>QR Code struttura</p>

        <img
          src={qrUrl}
          alt={`QR Code ${property.name}`}
          style={{ width: 220, height: 220, display: 'block', margin: '0 auto 16px' }}
        />

        <p style={{ fontSize: 11, color: '#aaa', wordBreak: 'break-all', margin: '0 0 20px' }}>
          {guestUrl}
        </p>

        <a
          href={qrUrl}
          download={`qr-${property.slug}.png`}
          style={{
            display: 'inline-block', padding: '10px 24px',
            background: '#1a1a2e', color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Scarica PNG
        </a>
      </div>
    </div>
  )
}

function PropertyForm({ title, initialData = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name?.trim()) { setError('Il nome è obbligatorio.'); return }
    setSaving(true)
    setError(null)
    try {
      const allowed = FIELDS.map(f => f.key)
      const data = Object.fromEntries(Object.entries(form).filter(([k]) => allowed.includes(k)))
      await onSave(data)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 28,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24, maxWidth: 600,
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 20 }}>{title}</h3>
      <form onSubmit={handleSubmit}>
        {FIELDS.map(({ key, label, type, placeholder, required }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }}>
              {label}{required && <span style={{ color: '#c00' }}> *</span>}
            </label>
            {type === 'textarea' ? (
              <textarea
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            ) : (
              <input
                type={type}
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={required}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}
              />
            )}
          </div>
        ))}
        {error && <p style={{ color: '#c00', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={pill({ background: '#1a1a2e', color: '#fff', padding: '10px 24px' })}
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={pill({ background: '#f0f0f0', color: '#333', padding: '10px 24px' })}
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
