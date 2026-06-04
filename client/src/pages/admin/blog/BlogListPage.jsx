import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { Plus, Edit2, Trash2, Eye, EyeOff, Tag, Sparkles, X, Zap } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ a }) {
  if (!a.active)    return <span style={badge('#f0f0f0','#888')}>Archiviato</span>
  if (!a.published) return <span style={badge('#fff3cd','#856404')}>Bozza</span>
  return <span style={badge('#d4edda','#155724')}>Pubblicato</span>
}
function badge(bg, color) {
  return { background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }
}

export default function BlogListPage() {
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti } = useAzienda()
  const navigate = useNavigate()
  const [articoli, setArticoli] = useState([])
  const [categories, setCategories] = useState([])
  const [filterCat, setFilterCat] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiArgomento, setAiArgomento] = useState('')
  const [aiEntityId, setAiEntityId] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  const aziendaId = azienda?.id || profile?.azienda_id
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id

  // Entities available for AI generation
  const entityOptions = [
    ...(strutture || []).map(s => ({ id: s.id, label: s.name, tipo: 'struttura' })),
    ...(ristoranti || []).map(r => ({ id: r.id, label: r.name, tipo: 'ristorante' })),
  ]

  useEffect(() => {
    if (entityOptions.length > 0 && !aiEntityId) setAiEntityId(entityOptions[0].id)
  }, [strutture, ristoranti])

  useEffect(() => {
    if (!aziendaId) { setLoading(false); return }
    Promise.all([
      apiFetch(`/api/blog?azienda_id=${aziendaId}`),
      apiFetch(`/api/blog/categories?azienda_id=${aziendaId}`),
    ]).then(([art, cats]) => {
      setArticoli(art)
      setCategories(cats)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [aziendaId])

  async function togglePublish(a) {
    const updated = await apiFetch(`/api/blog/${a.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ published: !a.published }),
    })
    setArticoli(prev => prev.map(x => x.id === a.id ? { ...x, ...updated } : x))
  }

  async function handleAiGenerate() {
    const entity = entityOptions.find(e => e.id === aiEntityId)
    if (!entity) return
    setAiGenerating(true)
    setAiError('')
    try {
      const result = await apiFetch('/api/ai/blog-auto', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entity.tipo, entity_id: entity.id, argomento: aiArgomento }),
      })
      setShowAiModal(false)
      setAiArgomento('')
      navigate(`/admin/blog/${result.id}`)
    } catch (e) {
      setAiError(e.message || 'Errore durante la generazione. Riprova.')
    }
    setAiGenerating(false)
  }

  async function deleteArticolo(a) {
    if (!confirm(`Eliminare "${a.title}"?`)) return
    await apiFetch(`/api/blog/${a.id}`, { method: 'DELETE' })
    setArticoli(prev => prev.filter(x => x.id !== a.id))
  }

  const filtered = filterCat ? articoli.filter(a => a.category_id === filterCat) : articoli

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Modal AI generation */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#7c3aed" strokeWidth={1.5} />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Genera articolo AI</h3>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Claude scrive una bozza dal contesto del tuo business.</p>
              </div>
              <button onClick={() => setShowAiModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#888" strokeWidth={1.5} />
              </button>
            </div>

            {entityOptions.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Business</label>
                <select
                  value={aiEntityId}
                  onChange={e => setAiEntityId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, background: '#fff' }}
                >
                  {entityOptions.map(e => (
                    <option key={e.id} value={e.id}>{e.label} ({e.tipo})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Argomento (opzionale)</label>
              <input
                value={aiArgomento}
                onChange={e => setAiArgomento(e.target.value)}
                placeholder="Es. estate 2026, novità menù, evento speciale…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
              />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#aaa' }}>Se lasci vuoto, Claude sceglierà l'argomento in base al contesto.</p>
            </div>

            {aiError && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 14px' }}>{aiError}</p>}

            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiEntityId}
              style={{ width: '100%', padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: aiGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: aiGenerating ? 0.8 : 1 }}
            >
              <Sparkles size={16} strokeWidth={2} />
              {aiGenerating ? 'Generazione in corso…' : 'Genera bozza'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Blog & News</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>Articoli pubblicati e bozze.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/admin/blog/categories')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f0f0f0', color: '#1a1a2e', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Tag size={14} strokeWidth={2} /> Categorie
          </button>
          <button
            onClick={() => navigate('/admin/blog/automazioni')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f5f3ff', color: '#6d28d9', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Zap size={14} strokeWidth={2} /> Automazioni
          </button>
          {entityOptions.length > 0 && (
            <button
              onClick={() => setShowAiModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Sparkles size={14} strokeWidth={2} /> Genera AI
            </button>
          )}
          <button
            onClick={() => navigate('/admin/blog/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} strokeWidth={2.5} /> Nuovo articolo
          </button>
        </div>
      </div>

      {/* Filtro categorie */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={() => setFilterCat('')}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid #ddd', background: !filterCat ? '#1a1a2e' : '#fff', color: !filterCat ? '#fff' : '#555', cursor: 'pointer' }}>
            Tutti
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setFilterCat(c.id)}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid #ddd', background: filterCat === c.id ? '#1a1a2e' : '#fff', color: filterCat === c.id ? '#fff' : '#555', cursor: 'pointer' }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: 0, color: '#888', fontSize: 15 }}>Nessun articolo. Crea il primo!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(a => {
          const cat = categories.find(c => c.id === a.category_id)
          return (
            <div key={a.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 0, overflow: 'hidden', opacity: a.active ? 1 : 0.6 }}>
              {a.cover_url && (
                <img src={a.cover_url} alt="" style={{ width: 100, height: 80, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <StatusBadge a={a} />
                      {cat && <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{cat.name}</span>}
                      {a.entity_tipo && <span style={{ fontSize: 11, color: '#aaa' }}>{a.entity_tipo}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    {a.excerpt && <div style={{ fontSize: 12, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.excerpt}</div>}
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                      {a.published ? `Pubblicato ${fmtDate(a.published_at)}` : `Creato ${fmtDate(a.created_at)}`}
                      {a.author && ` · ${a.author}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => togglePublish(a)} title={a.published ? 'Togli dalla pubblicazione' : 'Pubblica'}
                      style={{ ...iconBtn, color: a.published ? '#155724' : '#aaa' }}>
                      {a.published ? <Eye size={15} strokeWidth={2} /> : <EyeOff size={15} strokeWidth={2} />}
                    </button>
                    <button onClick={() => navigate(`/admin/blog/${a.id}`)} title="Modifica"
                      style={iconBtn}>
                      <Edit2 size={15} strokeWidth={2} />
                    </button>
                    <button onClick={() => deleteArticolo(a)} title="Elimina"
                      style={{ ...iconBtn, color: '#e53e3e' }}>
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const iconBtn = { background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center' }
