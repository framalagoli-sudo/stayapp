import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'

export default function BlogCategoriesPage() {
  const { profile } = useAuth()
  const { azienda } = useAzienda()
  const navigate = useNavigate()
  const aziendaId = azienda?.id || profile?.azienda_id

  const [categories, setCategories] = useState([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!aziendaId) return
    apiFetch(`/api/blog/categories?azienda_id=${aziendaId}`)
      .then(setCategories).catch(() => {}).finally(() => setLoading(false))
  }, [aziendaId])

  async function addCategory() {
    if (!newName.trim()) return
    setAdding(true); setError('')
    try {
      const cat = await apiFetch('/api/blog/categories', {
        method: 'POST',
        body: JSON.stringify({ azienda_id: aziendaId, name: newName.trim(), description: newDesc.trim() }),
      })
      setCategories(prev => [...prev, cat])
      setNewName(''); setNewDesc('')
    } catch (e) { setError(e.message || 'Errore') }
    finally { setAdding(false) }
  }

  async function deleteCategory(id) {
    if (!confirm('Eliminare questa categoria? Gli articoli collegati perderanno la categoria.')) return
    await apiFetch(`/api/blog/categories/${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/blog')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Categorie Blog</h2>
      </div>

      {/* Aggiungi */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Nuova categoria</h3>
        {error && <p style={{ color: '#c00', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Nome *</label>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            style={inp} placeholder="es. Notizie, Offerte, Ricette…" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Descrizione (opzionale)</label>
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inp} placeholder="Breve descrizione" />
        </div>
        <button onClick={addCategory} disabled={adding || !newName.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !newName.trim() ? 0.5 : 1 }}>
          <Plus size={14} strokeWidth={2.5} /> {adding ? 'Aggiunta…' : 'Aggiungi categoria'}
        </button>
      </div>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {categories.length === 0 && (
          <p style={{ padding: 24, color: '#aaa', fontSize: 14, textAlign: 'center' }}>Nessuna categoria ancora.</p>
        )}
        {categories.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < categories.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{c.name}</div>
              {c.description && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{c.description}</div>}
              <div style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>/{c.slug}</div>
            </div>
            <button onClick={() => deleteCategory(c.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 8, display: 'flex' }}>
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }
const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
