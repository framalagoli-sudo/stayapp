import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { Webhook, Plus, Trash2, Send, Check, X, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'

const EVENTI = [
  { key: 'nuovo_contatto',       label: 'Nuovo contatto' },
  { key: 'nuova_prenotazione',   label: 'Nuova prenotazione' },
  { key: 'nuova_richiesta',      label: 'Nuova richiesta' },
  { key: 'cambio_stage_pipeline', label: 'Cambio stage pipeline' },
]

const DEFAULT_FORM = { nome: '', url: '', eventi: [] }

function WebhookRow({ hook, onToggle, onDelete, onTest }) {
  const [expanded, setExpanded] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await apiFetch(`/api/webhooks/${hook.id}/test`, { method: 'POST' })
      setTestResult({ ok: res.ok, status: res.status, error: res.error })
    } catch {
      setTestResult({ ok: false, error: 'Errore connessione' })
    }
    setTesting(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <Webhook size={16} strokeWidth={1.5} color="#666" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>
            {hook.nome || 'Webhook'}
          </div>
          <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hook.url}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => onToggle(hook)} title={hook.attivo ? 'Disattiva' : 'Attiva'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: hook.attivo ? '#276749' : '#aaa' }}>
            {hook.attivo ? <ToggleRight size={20} strokeWidth={1.5} /> : <ToggleLeft size={20} strokeWidth={1.5} />}
          </button>
          <button onClick={handleTest} disabled={testing} title="Invia test"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#2b6cb0' }}>
            <Send size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => onDelete(hook.id)} title="Elimina"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#c53030' }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#888' }}>
            {expanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {testResult && (
        <div style={{ margin: '0 16px 12px', padding: '8px 12px', borderRadius: 6, fontSize: 13,
          background: testResult.ok ? '#f0fff4' : '#fff5f5',
          color: testResult.ok ? '#276749' : '#c53030',
          border: `1px solid ${testResult.ok ? '#c6f6d5' : '#fed7d7'}` }}>
          {testResult.ok
            ? <><Check size={13} strokeWidth={2} style={{ marginRight: 5 }} />Test OK — HTTP {testResult.status}</>
            : <><X size={13} strokeWidth={2} style={{ marginRight: 5 }} />{testResult.error}</>}
        </div>
      )}

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f0f0f0', marginTop: 4 }}>
          <div style={{ fontSize: 12, color: '#888', marginTop: 10, marginBottom: 6 }}>Eventi monitorati:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EVENTI.map(ev => (
              <span key={ev.key} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12,
                background: hook.eventi?.includes(ev.key) ? '#ebf4ff' : '#f5f5f5',
                color: hook.eventi?.includes(ev.key) ? '#2b6cb0' : '#aaa',
                border: `1px solid ${hook.eventi?.includes(ev.key) ? '#bee3f8' : '#e8e8e8'}`,
              }}>
                {ev.label}
              </span>
            ))}
          </div>
          {hook.eventi?.length === 0 && (
            <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Nessun evento selezionato — il webhook non verrà mai chiamato.</div>
          )}
        </div>
      )}
    </div>
  )
}

function AddWebhookForm({ onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleEvento(key) {
    setForm(f => ({
      ...f,
      eventi: f.eventi.includes(key) ? f.eventi.filter(e => e !== key) : [...f.eventi, key],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.url.trim()) { setError('URL obbligatorio'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message || 'Errore')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 14 }}>Nuovo webhook</div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Nome (opzionale)</label>
        <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="es. Zapier CRM"
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>URL destinazione *</label>
        <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          placeholder="https://hooks.zapier.com/..."
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>Eventi da monitorare</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EVENTI.map(ev => {
            const active = form.eventi.includes(ev.key)
            return (
              <button key={ev.key} type="button" onClick={() => toggleEvento(ev.key)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  background: active ? '#1a1a2e' : '#f5f5f5',
                  color: active ? '#fff' : '#555',
                  border: `1px solid ${active ? '#1a1a2e' : '#e0e0e0'}` }}>
                {ev.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && <div style={{ color: '#c53030', fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving}
          style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>
          {saving ? 'Salvo...' : 'Salva webhook'}
        </button>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 16px', background: 'none', border: '1px solid #ddd', borderRadius: 7, fontSize: 14, cursor: 'pointer', color: '#555' }}>
          Annulla
        </button>
      </div>
    </form>
  )
}

export default function IntegrazioniPage() {
  const [hooks, setHooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/webhooks')
      setHooks(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    const data = await apiFetch('/api/webhooks', { method: 'POST', body: JSON.stringify(form) })
    if (data?.error) throw new Error(data.error)
    setHooks(h => [data, ...h])
    setShowForm(false)
  }

  async function handleToggle(hook) {
    const updated = await apiFetch(`/api/webhooks/${hook.id}`, { method: 'PATCH', body: JSON.stringify({ attivo: !hook.attivo }) })
    if (updated?.id) setHooks(h => h.map(x => x.id === hook.id ? updated : x))
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo webhook?')) return
    await apiFetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    setHooks(h => h.filter(x => x.id !== id))
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Integrazioni</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>
            Webhook outbound — connetti StayApp a Zapier, Make, n8n o qualsiasi sistema esterno.
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={15} strokeWidth={2} />
          Aggiungi
        </button>
      </div>

      {showForm && <AddWebhookForm onSave={handleSave} onCancel={() => setShowForm(false)} />}

      {/* Info box */}
      <div style={{ background: '#f0f4ff', border: '1px solid #c7d7f0', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#2b4a8f', lineHeight: 1.6 }}>
        <strong>Come funziona:</strong> ogni webhook riceve un POST JSON su ogni evento selezionato.
        Header <code style={{ background: '#dce8ff', padding: '1px 5px', borderRadius: 3 }}>X-StayApp-Event</code> indica il tipo di evento.
        Usa il pulsante <Send size={11} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> per inviare un payload di test.
      </div>

      {loading ? (
        <div style={{ color: '#aaa', fontSize: 14 }}>Caricamento...</div>
      ) : hooks.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 12, border: '1px dashed #ddd' }}>
          <Webhook size={32} strokeWidth={1} color="#ccc" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, color: '#888', marginBottom: 6 }}>Nessun webhook configurato</div>
          <div style={{ fontSize: 13, color: '#bbb' }}>Aggiungi il primo per iniziare a sincronizzare eventi con Zapier, Make o altri sistemi.</div>
        </div>
      ) : (
        hooks.map(hook => (
          <WebhookRow key={hook.id} hook={hook} onToggle={handleToggle} onDelete={handleDelete} />
        ))
      )}
    </div>
  )
}
