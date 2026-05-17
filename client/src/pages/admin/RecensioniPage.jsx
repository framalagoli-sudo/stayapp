import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useAzienda } from '../../context/AziendaContext'
import { Star, Plus, Trash2, Eye, EyeOff, Link, Copy, Check, AlertCircle, MessageSquare } from 'lucide-react'
import AiButton from '../../components/admin/AiButton'

const FONTI = [
  { key: 'form',         label: 'Form',         color: '#276749' },
  { key: 'google',       label: 'Google',        color: '#2b6cb0' },
  { key: 'tripadvisor',  label: 'TripAdvisor',   color: '#276749' },
  { key: 'booking',      label: 'Booking.com',   color: '#003580' },
  { key: 'manuale',      label: 'Manuale',       color: '#888' },
]

function StarDisplay({ stelle, size = 16 }) {
  return (
    <span>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= stelle ? '#f59e0b' : '#e0e0e0', fontSize: size }}>★</span>
      ))}
    </span>
  )
}

function FonteBadge({ fonte }) {
  const f = FONTI.find(x => x.key === fonte) || { label: fonte, color: '#888' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: f.color + '15', color: f.color }}>
      {f.label}
    </span>
  )
}

// ─── Modale aggiungi recensione manuale / genera link ─────────────────────────

function AddModal({ entityTipo, entityId, onClose, onCreate }) {
  const [mode, setMode] = useState('link') // 'link' | 'manuale'
  const [autore, setAutore]   = useState('')
  const [stelle, setStelle]   = useState(5)
  const [testo, setTesto]     = useState('')
  const [fonte, setFonte]     = useState('manuale')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [linkResult, setLinkResult] = useState(null)
  const [copied, setCopied]   = useState(false)

  async function handleGeneraLink() {
    setSaving(true); setError('')
    try {
      const data = await apiFetch('/api/recensioni/genera-link', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, autore: autore.trim() }),
      })
      setLinkResult(data.link)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(linkResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleManuale() {
    if (!autore.trim()) return setError('Nome obbligatorio')
    setSaving(true); setError('')
    try {
      const data = await apiFetch('/api/recensioni', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, autore, stelle, testo, fonte }),
      })
      onCreate(data)
      onClose()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 460 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 20 }}>Aggiungi recensione</div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: 4, background: '#f5f5f5', borderRadius: 8, padding: 4, marginBottom: 20 }}>
          {[{ key: 'link', label: 'Genera link' }, { key: 'manuale', label: 'Importa manuale' }].map(t => (
            <button key={t.key} onClick={() => setMode(t.key)}
              style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === t.key ? '#fff' : 'transparent', color: mode === t.key ? '#1a1a2e' : '#888',
                boxShadow: mode === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'link' ? (
          <>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              Genera un link personale da inviare al cliente. Quando compila il form, la recensione viene salvata automaticamente. Se dà ≥4 stelle viene reindirizzato su Google/TripAdvisor.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Nome cliente (opzionale)</label>
              <input value={autore} onChange={e => setAutore(e.target.value)} placeholder="Mario Rossi"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {linkResult ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginBottom: 6 }}>Link generato</div>
                <div style={{ fontSize: 12, color: '#444', wordBreak: 'break-all', marginBottom: 10 }}>{linkResult}</div>
                <button onClick={handleCopy}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#166534', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#fff' }}>
                  {copied ? <><Check size={13} strokeWidth={1.5} /> Copiato</> : <><Copy size={13} strokeWidth={1.5} /> Copia link</>}
                </button>
              </div>
            ) : (
              <button onClick={handleGeneraLink} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#fff', opacity: saving ? 0.7 : 1 }}>
                <Link size={14} strokeWidth={1.5} /> {saving ? 'Generazione…' : 'Genera link'}
              </button>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              Importa una recensione da Google, TripAdvisor o qualsiasi altra fonte.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Nome recensore</label>
              <input value={autore} onChange={e => setAutore(e.target.value)} placeholder="Mario Rossi"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Stelle</label>
                <select value={stelle} onChange={e => setStelle(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Fonte</label>
                <select value={fonte} onChange={e => setFonte(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                  {FONTI.filter(f => f.key !== 'form').map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Testo</label>
              <textarea value={testo} onChange={e => setTesto(e.target.value)} rows={3}
                placeholder="Testo della recensione…"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleManuale} disabled={saving}
              style={{ padding: '10px 24px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvataggio…' : 'Aggiungi recensione'}
            </button>
          </>
        )}

        {error && <div style={{ marginTop: 12, fontSize: 13, color: '#c53030', display: 'flex', gap: 5 }}><AlertCircle size={14} strokeWidth={1.5} /> {error}</div>}

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888' }}>Chiudi</button>
        </div>
      </div>
    </div>
  )
}

// ─── RecensioneRow ────────────────────────────────────────────────────────────

function RecensioneRow({ rec, onToggle, onDelete, onPatch }) {
  const [risposta, setRisposta] = useState(rec.risposta || '')
  const [editResp, setEditResp] = useState(false)
  const [saving, setSaving] = useState(false)
  const { azienda } = useAzienda()

  async function saveRisposta() {
    setSaving(true)
    await onPatch(rec.id, { risposta })
    setEditResp(false)
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, marginBottom: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <StarDisplay stelle={rec.stelle} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{rec.autore || 'Anonimo'}</span>
            <FonteBadge fonte={rec.fonte} />
            {rec.verificata && <span style={{ fontSize: 11, color: '#276749', fontWeight: 700 }}>✓ Verificata</span>}
            {!rec.pubblica && <span style={{ fontSize: 11, color: '#b7791f', fontWeight: 700 }}>Nascosta</span>}
          </div>
          {rec.testo && <p style={{ margin: '0 0 8px', fontSize: 14, color: '#444', lineHeight: 1.6 }}>{rec.testo}</p>}
          <div style={{ fontSize: 11, color: '#bbb' }}>{new Date(rec.created_at).toLocaleDateString('it-IT')}</div>

          {/* Risposta admin */}
          {editResp ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#888' }}>La tua risposta</span>
                <AiButton
                  tipo="risposta_recensione"
                  nomeBusiness={azienda?.ragione_sociale || ''}
                  showTono={false}
                  label="✨ Suggerisci"
                  temaSuggerito={`Stelle: ${rec.stelle}/5\n${rec.testo ? `Recensione: ${rec.testo}` : ''}`}
                  placeholder="Incolla o descrivi la recensione…"
                  onInsert={t => setRisposta(t)}
                />
              </div>
              <textarea value={risposta} onChange={e => setRisposta(e.target.value)} rows={2}
                placeholder="La tua risposta…"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={saveRisposta} disabled={saving}
                  style={{ padding: '5px 14px', background: '#1a1a2e', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#fff' }}>
                  {saving ? '…' : 'Salva'}
                </button>
                <button onClick={() => setEditResp(false)}
                  style={{ padding: '5px 14px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: '#fff' }}>
                  Annulla
                </button>
              </div>
            </div>
          ) : rec.risposta ? (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9f9fb', borderRadius: 8, borderLeft: '3px solid #1a1a2e' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>La tua risposta</div>
              <div style={{ fontSize: 13, color: '#444' }}>{rec.risposta}</div>
              <button onClick={() => setEditResp(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#2b6cb0', marginTop: 4, padding: 0 }}>Modifica</button>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setEditResp(e => !e)} title="Rispondi"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#2b6cb0' }}>
            <MessageSquare size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => onToggle(rec)} title={rec.pubblica ? 'Nascondi' : 'Mostra'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: rec.pubblica ? '#276749' : '#aaa' }}>
            {rec.pubblica ? <Eye size={15} strokeWidth={1.5} /> : <EyeOff size={15} strokeWidth={1.5} />}
          </button>
          <button onClick={() => onDelete(rec.id)} title="Elimina"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#c53030' }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── EntityPicker ─────────────────────────────────────────────────────────────

function EntityPicker({ strutture, ristoranti, attivita, selected, onSelect }) {
  const all = [
    ...strutture.map(e => ({ id: e.id, name: e.name, tipo: 'struttura' })),
    ...ristoranti.map(e => ({ id: e.id, name: e.name, tipo: 'ristorante' })),
    ...(attivita || []).map(e => ({ id: e.id, name: e.name, tipo: 'attivita' })),
  ]
  if (all.length <= 1) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <select value={selected ? `${selected.tipo}:${selected.id}` : ''}
        onChange={e => {
          const [tipo, id] = e.target.value.split(':')
          onSelect(all.find(x => x.tipo === tipo && x.id === id) || null)
        }}
        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', minWidth: 240 }}>
        <option value="">— Seleziona —</option>
        {all.map(e => <option key={`${e.tipo}:${e.id}`} value={`${e.tipo}:${e.id}`}>{e.name} ({e.tipo})</option>)}
      </select>
    </div>
  )
}

// ─── Configurazione redirect ──────────────────────────────────────────────────

function RedirectConfig({ selected }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    apiFetch(`/api/${selected.tipo === 'struttura' ? 'properties' : selected.tipo === 'ristorante' ? 'ristoranti' : 'attivita'}/${selected.id}`)
      .then(d => { setUrl(d.minisito?.recensioni_redirect_url || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selected])

  async function save() {
    const endpoint = selected.tipo === 'struttura' ? 'properties' : selected.tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    const current = await apiFetch(`/api/${endpoint}/${selected.id}`)
    await apiFetch(`/api/${endpoint}/${selected.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ minisito: { ...(current.minisito || {}), recensioni_redirect_url: url.trim() } }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!selected || loading) return null

  return (
    <div style={{ background: '#f0f4ff', border: '1px solid #c3dafe', borderRadius: 10, padding: 16, marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#2b6cb0', marginBottom: 6 }}>Smart redirect (≥4 stelle)</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Quando un cliente dà 4 o 5 stelle, viene reindirizzato a questo URL per lasciare una recensione pubblica.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://g.page/r/... oppure https://tripadvisor.com/..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        <button onClick={save}
          style={{ padding: '8px 16px', background: '#2b6cb0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
          {saved ? <><Check size={13} strokeWidth={1.5} /> Salvato</> : 'Salva'}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecensioniPage() {
  const { strutture, ristoranti, attivita, selectedStrutturaId, selectedRistoranteId, selectedAttivitaId } = useAzienda()
  const [selected, setSelected]   = useState(null)
  const [recensioni, setRecensioni] = useState([])
  const [loading, setLoading]     = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (selected) return
    if (selectedStrutturaId && strutture.length) {
      const s = strutture.find(x => x.id === selectedStrutturaId) || strutture[0]
      setSelected({ id: s.id, name: s.name, tipo: 'struttura' })
    } else if (selectedRistoranteId && ristoranti.length) {
      const r = ristoranti.find(x => x.id === selectedRistoranteId) || ristoranti[0]
      setSelected({ id: r.id, name: r.name, tipo: 'ristorante' })
    } else if (selectedAttivitaId && attivita?.length) {
      const a = attivita.find(x => x.id === selectedAttivitaId) || attivita[0]
      setSelected({ id: a.id, name: a.name, tipo: 'attivita' })
    }
  }, [strutture, ristoranti, attivita, selectedStrutturaId, selectedRistoranteId, selectedAttivitaId])

  const load = useCallback(async () => {
    if (!selected) return
    setLoading(true)
    try {
      const data = await apiFetch(`/api/recensioni?entity_tipo=${selected.tipo}&entity_id=${selected.id}`)
      setRecensioni(data)
    } catch { setRecensioni([]) }
    setLoading(false)
  }, [selected])

  useEffect(() => { load() }, [load])

  async function handleToggle(rec) {
    const updated = await apiFetch(`/api/recensioni/${rec.id}`, {
      method: 'PATCH', body: JSON.stringify({ pubblica: !rec.pubblica }),
    })
    setRecensioni(list => list.map(r => r.id === rec.id ? updated : r))
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa recensione?')) return
    await apiFetch(`/api/recensioni/${id}`, { method: 'DELETE' })
    setRecensioni(list => list.filter(r => r.id !== id))
  }

  async function handlePatch(id, updates) {
    const updated = await apiFetch(`/api/recensioni/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
    setRecensioni(list => list.map(r => r.id === id ? updated : r))
  }

  const media = recensioni.length
    ? (recensioni.reduce((s, r) => s + r.stelle, 0) / recensioni.length).toFixed(1)
    : null
  const pubbliche = recensioni.filter(r => r.pubblica).length

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Recensioni</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>
            Raccogli feedback, gestisci la reputazione, importa da qualsiasi fonte.
          </p>
        </div>
        {selected && (
          <button onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#fff' }}>
            <Plus size={15} strokeWidth={1.5} /> Aggiungi
          </button>
        )}
      </div>

      <EntityPicker strutture={strutture} ristoranti={ristoranti} attivita={attivita}
        selected={selected} onSelect={e => { setSelected(e); setRecensioni([]) }} />

      {selected && (
        <>
          <RedirectConfig selected={selected} />

          {/* KPI */}
          {recensioni.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Media', value: <><span style={{ fontSize: 22, fontWeight: 800 }}>{media}</span> <span style={{ color: '#f59e0b' }}>★</span></> },
                { label: 'Totale', value: recensioni.length },
                { label: 'Pubbliche', value: pubbliche },
              ].map(k => (
                <div key={k.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {loading && <div style={{ fontSize: 14, color: '#aaa' }}>Caricamento…</div>}
          {!loading && recensioni.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#bbb' }}>
              <Star size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Nessuna recensione</div>
              <div style={{ fontSize: 13 }}>Genera un link da inviare ai tuoi clienti o importa manualmente.</div>
            </div>
          )}

          {recensioni.map(rec => (
            <RecensioneRow key={rec.id} rec={rec} onToggle={handleToggle} onDelete={handleDelete} onPatch={handlePatch} />
          ))}
        </>
      )}

      {showModal && selected && (
        <AddModal entityTipo={selected.tipo} entityId={selected.id}
          onClose={() => setShowModal(false)}
          onCreate={data => setRecensioni(list => [data, ...list])} />
      )}
    </div>
  )
}
