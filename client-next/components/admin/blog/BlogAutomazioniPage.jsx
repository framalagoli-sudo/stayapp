'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { Plus, Trash2, ArrowLeft, Clock, Zap, Edit2, Check, X } from 'lucide-react'

const FREQ_LABELS = { giornaliera: 'Ogni giorno', settimanale: 'Ogni settimana', mensile: 'Ogni mese' }
const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MODALITA_LABELS = { bozza: 'Bozza + notifica', pubblica: 'Pubblica automaticamente' }

function fmtNext(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', background: '#fff' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }

const DEFAULT_FORM = {
  entity_id: '', entity_tipo: '', entity_nome: '',
  frequenza: 'settimanale', ora_pubblicazione: 9,
  giorno_settimana: 1, giorno_mese: 1,
  argomenti_str: '',
  modalita: 'bozza', notifica_email: '',
}

export default function BlogAutomazioniPage() {
  const { strutture, ristoranti } = useAzienda()
  const router = useRouter()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const entityOptions = [
    ...(strutture || []).map(s => ({ id: s.id, nome: s.name, tipo: 'struttura' })),
    ...(ristoranti || []).map(r => ({ id: r.id, nome: r.name, tipo: 'ristorante' })),
  ]

  useEffect(() => {
    apiFetch('/api/blog-automazioni')
      .then(d => setLista(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (entityOptions.length > 0 && !form.entity_id) {
      const first = entityOptions[0]
      setForm(f => ({ ...f, entity_id: first.id, entity_tipo: first.tipo, entity_nome: first.nome }))
    }
  }, [strutture, ristoranti])

  function openNew() {
    setEditId(null)
    const first = entityOptions[0]
    setForm({ ...DEFAULT_FORM, entity_id: first?.id || '', entity_tipo: first?.tipo || '', entity_nome: first?.nome || '' })
    setError('')
    setShowForm(true)
  }

  function openEdit(auto) {
    setEditId(auto.id)
    setForm({
      entity_id: auto.entity_id,
      entity_tipo: auto.entity_tipo,
      entity_nome: auto.entity_nome || '',
      frequenza: auto.frequenza,
      ora_pubblicazione: auto.ora_pubblicazione,
      giorno_settimana: auto.giorno_settimana,
      giorno_mese: auto.giorno_mese,
      argomenti_str: (auto.argomenti || []).join(', '),
      modalita: auto.modalita,
      notifica_email: auto.notifica_email || '',
    })
    setError('')
    setShowForm(true)
  }

  function patchForm(fields) { setForm(f => ({ ...f, ...fields })) }

  function onEntityChange(id) {
    const e = entityOptions.find(x => x.id === id)
    if (e) patchForm({ entity_id: e.id, entity_tipo: e.tipo, entity_nome: e.nome })
  }

  async function handleSave() {
    if (!form.entity_id) return setError('Seleziona un business.')
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        argomenti: form.argomenti_str.split(',').map(s => s.trim()).filter(Boolean),
        ora_pubblicazione: parseInt(form.ora_pubblicazione),
        giorno_settimana:  parseInt(form.giorno_settimana),
        giorno_mese:       parseInt(form.giorno_mese),
      }
      delete payload.argomenti_str

      let result
      if (editId) {
        result = await apiFetch(`/api/blog-automazioni/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        setLista(prev => prev.map(a => a.id === editId ? result : a))
      } else {
        result = await apiFetch('/api/blog-automazioni', { method: 'POST', body: JSON.stringify(payload) })
        setLista(prev => [result, ...prev])
      }
      setShowForm(false)
    } catch (e) { setError(e.message || 'Errore salvataggio.') }
    setSaving(false)
  }

  async function toggleAttiva(auto) {
    const updated = await apiFetch(`/api/blog-automazioni/${auto.id}`, {
      method: 'PATCH', body: JSON.stringify({ attiva: !auto.attiva }),
    })
    setLista(prev => prev.map(a => a.id === auto.id ? updated : a))
  }

  async function handleDelete(auto) {
    if (!confirm(`Eliminare l'automazione per "${auto.entity_nome || auto.entity_tipo}"?`)) return
    await apiFetch(`/api/blog-automazioni/${auto.id}`, { method: 'DELETE' })
    setLista(prev => prev.filter(a => a.id !== auto.id))
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/admin/blog')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={18} strokeWidth={1.5} color="#888" />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Automazioni Blog</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>Genera articoli automaticamente con AI.</p>
        </div>
        <button
          onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} strokeWidth={2.5} /> Nuova automazione
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 16px 48px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{editId ? 'Modifica automazione' : 'Nuova automazione'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#888" strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {entityOptions.length > 1 && (
                <div>
                  <span style={lbl}>Business</span>
                  <select value={form.entity_id} onChange={e => onEntityChange(e.target.value)} style={inp}>
                    {entityOptions.map(e => <option key={e.id} value={e.id}>{e.nome} ({e.tipo})</option>)}
                  </select>
                </div>
              )}

              <div>
                <span style={lbl}>Frequenza</span>
                <select value={form.frequenza} onChange={e => patchForm({ frequenza: e.target.value })} style={inp}>
                  <option value="giornaliera">Ogni giorno</option>
                  <option value="settimanale">Ogni settimana</option>
                  <option value="mensile">Ogni mese</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={lbl}>Ora (UTC)</span>
                  <select value={form.ora_pubblicazione} onChange={e => patchForm({ ora_pubblicazione: e.target.value })} style={inp}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                {form.frequenza === 'settimanale' && (
                  <div>
                    <span style={lbl}>Giorno settimana</span>
                    <select value={form.giorno_settimana} onChange={e => patchForm({ giorno_settimana: e.target.value })} style={inp}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
                {form.frequenza === 'mensile' && (
                  <div>
                    <span style={lbl}>Giorno del mese</span>
                    <select value={form.giorno_mese} onChange={e => patchForm({ giorno_mese: e.target.value })} style={inp}>
                      {Array.from({ length: 28 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <span style={lbl}>Argomenti (opzionale, separati da virgola)</span>
                <input
                  value={form.argomenti_str}
                  onChange={e => patchForm({ argomenti_str: e.target.value })}
                  placeholder="Es. promozioni estate, novità menù, eventi locali"
                  style={inp}
                />
                <p style={{ margin: '5px 0 0', fontSize: 12, color: '#aaa' }}>Claude ruoterà tra questi argomenti. Se vuoto, sceglie autonomamente.</p>
              </div>

              <div>
                <span style={lbl}>Modalità</span>
                <select value={form.modalita} onChange={e => patchForm({ modalita: e.target.value })} style={inp}>
                  <option value="bozza">Bozza (richiede approvazione)</option>
                  <option value="pubblica">Pubblica automaticamente</option>
                </select>
              </div>

              {form.modalita === 'bozza' && (
                <div>
                  <span style={lbl}>Email notifica bozza</span>
                  <input
                    type="email"
                    value={form.notifica_email}
                    onChange={e => patchForm({ notifica_email: e.target.value })}
                    placeholder="tua@email.com"
                    style={inp}
                  />
                </div>
              )}

              {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: 0 }}>{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Check size={16} strokeWidth={2.5} />
                {saving ? 'Salvataggio…' : editId ? 'Aggiorna' : 'Crea automazione'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {lista.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Zap size={32} color="#ddd" strokeWidth={1.5} style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, color: '#888', fontSize: 15 }}>Nessuna automazione configurata.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#bbb' }}>Crea la prima per generare articoli in automatico.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lista.map(auto => (
          <div key={auto.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px 18px', opacity: auto.attiva ? 1 : 0.55 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{auto.entity_nome || auto.entity_tipo}</span>
                  <span style={{ fontSize: 11, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {FREQ_LABELS[auto.frequenza]}
                  </span>
                  <span style={{ fontSize: 11, color: auto.modalita === 'pubblica' ? '#155724' : '#856404', background: auto.modalita === 'pubblica' ? '#d4edda' : '#fff3cd', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {MODALITA_LABELS[auto.modalita]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} strokeWidth={1.5} color="#aaa" />
                    Prossima: {fmtNext(auto.next_run_at)}
                  </span>
                  {auto.last_run_at && (
                    <span style={{ color: '#aaa', fontSize: 12 }}>Ultima: {fmtNext(auto.last_run_at)}</span>
                  )}
                </div>
                {auto.argomenti?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
                    Argomenti: {auto.argomenti.join(', ')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={auto.attiva}
                    onChange={() => toggleAttiva(auto)}
                    style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }}
                  />
                </label>
                <button onClick={() => openEdit(auto)} style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Edit2 size={14} strokeWidth={1.5} color="#555" />
                </button>
                <button onClick={() => handleDelete(auto)} style={{ background: '#fff0f0', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} strokeWidth={1.5} color="#e53e3e" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
