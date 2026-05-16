import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { FormInput, Plus, Trash2, ChevronRight, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'

export default function FormBuilderListPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await apiFetch('/api/form-builder')
      setForms(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleNew() {
    try {
      const f = await apiFetch('/api/form-builder', { method: 'POST', body: JSON.stringify({ nome: 'Nuovo form' }) })
      navigate(`/admin/form-builder/${f.id}`)
    } catch (e) { setError(e.message) }
  }

  async function handleToggle(id, attivo, e) {
    e.stopPropagation()
    try {
      const updated = await apiFetch(`/api/form-builder/${id}`, { method: 'PATCH', body: JSON.stringify({ attivo: !attivo }) })
      setForms(prev => prev.map(f => f.id === id ? { ...f, attivo: updated.attivo } : f))
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Eliminare questo form e tutte le risposte?')) return
    try {
      await apiFetch(`/api/form-builder/${id}`, { method: 'DELETE' })
      setForms(prev => prev.filter(f => f.id !== id))
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FormInput size={22} strokeWidth={1.5} color="#1a1a2e" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Form Builder</h1>
        </div>
        <button
          onClick={handleNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
        >
          <Plus size={16} strokeWidth={1.5} /> Nuovo form
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : forms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
          <FormInput size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>Nessun form creato</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Crea un form per raccogliere lead dal tuo sito</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {forms.map(f => (
            <div
              key={f.id}
              onClick={() => navigate(`/admin/form-builder/${f.id}`)}
              style={{
                background: '#fff', borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                border: '1px solid #eee', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: f.attivo ? 1 : 0.6,
              }}
            >
              <FormInput size={18} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{f.nome}</div>
                {f.descrizione && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{f.descrizione}</div>}
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {new Date(f.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/admin/form-builder/${f.id}/submissions`) }}
                style={{ fontSize: 12, background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap' }}
              >
                Risposte
              </button>

              <button onClick={(e) => handleToggle(f.id, f.attivo, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: f.attivo ? '#276749' : '#aaa' }}>
                {f.attivo
                  ? <ToggleRight size={22} strokeWidth={1.5} />
                  : <ToggleLeft size={22} strokeWidth={1.5} />
                }
              </button>

              <ChevronRight size={16} strokeWidth={1.5} color="#ccc" />

              <button onClick={(e) => handleDelete(f.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ccc' }}>
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
