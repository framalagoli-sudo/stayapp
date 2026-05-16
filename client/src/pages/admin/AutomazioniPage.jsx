import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { useAzienda } from '../../context/AziendaContext'
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Send, Check, X, Clock, Mail, AlertCircle,
} from 'lucide-react'

const TRIGGERS = [
  { key: 'nuova_prenotazione', label: 'Nuova prenotazione',      desc: 'Quando un cliente prenota una risorsa' },
  { key: 'nuovo_contatto',     label: 'Nuovo contatto',          desc: 'Quando arriva un nuovo messaggio dal sito' },
  { key: 'pre_visita',         label: 'Prima della visita',      desc: 'N ore prima della data di prenotazione' },
  { key: 'post_visita',        label: 'Dopo la visita',          desc: 'N ore dopo la data di prenotazione' },
]

const VARS_BY_TRIGGER = {
  nuova_prenotazione: ['{{nome}}', '{{data}}', '{{ora}}', '{{servizio}}', '{{n_persone}}'],
  nuovo_contatto:     ['{{nome}}', '{{email}}'],
  pre_visita:         ['{{nome}}', '{{data}}', '{{ora}}', '{{servizio}}', '{{n_persone}}'],
  post_visita:        ['{{nome}}', '{{data}}', '{{ora}}', '{{servizio}}', '{{link_recensione}}'],
}

const EMPTY_STEP = { delay_ore: 0, subject: '', heading: '', text: '', cta_text: '', cta_url: '' }

const STATUS_COLORS = { sent: '#276749', failed: '#c53030', pending: '#b7791f' }
const STATUS_LABELS  = { sent: 'Inviata', failed: 'Errore', pending: 'In attesa' }

// ─── StepEditor ───────────────────────────────────────────────────────────────

function StepEditor({ step, idx, trigger, onChange, onRemove }) {
  const vars = VARS_BY_TRIGGER[trigger] || []
  const delayLabel = trigger === 'pre_visita' ? 'ore prima della visita' : trigger === 'post_visita' ? 'ore dopo la visita' : 'ore dopo il trigger'

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>Step {idx + 1}</span>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c53030', padding: 4 }}>
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Ritardo ({delayLabel})</label>
          <input
            type="number" min="0" value={step.delay_ore}
            onChange={e => onChange({ ...step, delay_ore: Math.max(0, Number(e.target.value)) })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Oggetto email</label>
          <input
            type="text" value={step.subject} placeholder="es. Conferma prenotazione — {{nome}}"
            onChange={e => onChange({ ...step, subject: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Titolo email</label>
        <input
          type="text" value={step.heading} placeholder="es. Grazie per la prenotazione, {{nome}}!"
          onChange={e => onChange({ ...step, heading: e.target.value })}
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Testo</label>
        <textarea
          rows={4} value={step.text} placeholder="Corpo dell'email…"
          onChange={e => onChange({ ...step, text: e.target.value })}
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Testo pulsante (opzionale)</label>
          <input
            type="text" value={step.cta_text} placeholder="es. Visualizza dettagli"
            onChange={e => onChange({ ...step, cta_text: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>URL pulsante</label>
          <input
            type="url" value={step.cta_url} placeholder="https://…"
            onChange={e => onChange({ ...step, cta_url: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {vars.length > 0 && (
        <div style={{ fontSize: 11, color: '#888' }}>
          Variabili disponibili: {vars.map(v => (
            <code key={v} style={{ background: '#f0f0f0', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>{v}</code>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AutomazioneCard ─────────────────────────────────────────────────────────

function AutomazioneCard({ auto, onToggle, onDelete, onSave }) {
  const [expanded, setExpanded]   = useState(false)
  const [editing, setEditing]     = useState(false)
  const [nome, setNome]           = useState(auto.nome)
  const [steps, setSteps]         = useState(auto.steps || [])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [log, setLog]             = useState(null)
  const [logLoading, setLogLoading] = useState(false)
  const [testEmail, setTestEmail]  = useState('')
  const [testing, setTesting]      = useState(false)
  const [testResult, setTestResult] = useState(null)

  const trigger = TRIGGERS.find(t => t.key === auto.trigger_evento)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(auto.id, { nome, steps })
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  async function loadLog() {
    setLogLoading(true)
    try {
      const data = await apiFetch(`/api/automazioni/${auto.id}/log`)
      setLog(data)
    } catch { setLog([]) }
    setLogLoading(false)
  }

  async function handleTest() {
    if (!testEmail.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      await apiFetch(`/api/automazioni/${auto.id}/test`, { method: 'POST', body: JSON.stringify({ email: testEmail }) })
      setTestResult({ ok: true })
    } catch (e) {
      setTestResult({ ok: false, error: e.message })
    }
    setTesting(false)
  }

  function updateStep(idx, newStep) {
    setSteps(steps.map((s, i) => i === idx ? newStep : s))
  }

  function removeStep(idx) {
    setSteps(steps.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <Zap size={16} strokeWidth={1.5} color="#666" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{auto.nome || 'Automazione'}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {trigger?.label} · {auto.steps?.length || 0} step{auto.steps?.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => onToggle(auto)} title={auto.attiva ? 'Disattiva' : 'Attiva'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: auto.attiva ? '#276749' : '#aaa' }}>
            {auto.attiva ? <ToggleRight size={20} strokeWidth={1.5} /> : <ToggleLeft size={20} strokeWidth={1.5} />}
          </button>
          <button onClick={() => onDelete(auto.id)} title="Elimina"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#c53030' }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => { setExpanded(e => !e); if (!expanded && !log) loadLog() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#888' }}>
            {expanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: 16 }}>
          {/* Steps editor */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>Sequenza email</span>
            <button onClick={() => setEditing(e => !e)}
              style={{ fontSize: 12, color: '#2b6cb0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              {editing ? 'Annulla' : 'Modifica'}
            </button>
          </div>

          {editing ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Nome automazione</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              {steps.map((step, idx) => (
                <StepEditor key={idx} step={step} idx={idx} trigger={auto.trigger_evento}
                  onChange={s => updateStep(idx, s)} onRemove={() => removeStep(idx)} />
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setSteps([...steps, { ...EMPTY_STEP }])}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0f4ff', border: '1px dashed #99b3e8', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#2b6cb0' }}>
                  <Plus size={14} strokeWidth={1.5} /> Aggiungi step
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#fff', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvataggio…' : saved ? <><Check size={14} strokeWidth={1.5} /> Salvato</> : 'Salva'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Read-only view degli steps */}
              {(!auto.steps?.length) && (
                <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic', marginBottom: 12 }}>Nessuno step configurato. Clicca "Modifica".</div>
              )}
              {auto.steps?.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '10px 12px', background: '#f9f9fb', borderRadius: 8 }}>
                  <Clock size={14} strokeWidth={1.5} color="#888" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                      {step.delay_ore === 0 ? 'Subito' : `Dopo ${step.delay_ore}h`}
                      {step.subject && <span style={{ fontWeight: 400, color: '#444', marginLeft: 8 }}>· {step.subject}</span>}
                    </div>
                    {step.text && <div style={{ fontSize: 12, color: '#888', marginTop: 2, whiteSpace: 'pre-wrap' }}>{step.text.slice(0, 120)}{step.text.length > 120 ? '…' : ''}</div>}
                  </div>
                </div>
              ))}

              {/* Test email */}
              <div style={{ marginTop: 16, padding: '12px', background: '#f0f4ff', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#2b6cb0', marginBottom: 8 }}>Invia email di test</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                    placeholder="tua@email.com"
                    style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                  <button onClick={handleTest} disabled={testing || !testEmail.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#2b6cb0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#fff', opacity: (!testEmail.trim() || testing) ? 0.6 : 1 }}>
                    <Send size={13} strokeWidth={1.5} /> {testing ? '…' : 'Test'}
                  </button>
                </div>
                {testResult && (
                  <div style={{ marginTop: 8, fontSize: 12, color: testResult.ok ? '#276749' : '#c53030', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {testResult.ok ? <Check size={13} strokeWidth={1.5} /> : <AlertCircle size={13} strokeWidth={1.5} />}
                    {testResult.ok ? 'Email di test accodate (invio entro 60s)' : testResult.error}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Log esecuzioni */}
          {!editing && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', marginBottom: 8 }}>Ultime esecuzioni</div>
              {logLoading && <div style={{ fontSize: 12, color: '#aaa' }}>Caricamento…</div>}
              {log && !logLoading && (
                log.length === 0
                  ? <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Nessuna esecuzione.</div>
                  : log.slice(0, 10).map(entry => (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                      <span style={{ color: STATUS_COLORS[entry.status] || '#888', fontWeight: 600, minWidth: 60 }}>{STATUS_LABELS[entry.status] || entry.status}</span>
                      <span style={{ flex: 1, color: '#444' }}>{entry.contact_email}</span>
                      <span style={{ color: '#aaa' }}>step {entry.step_index + 1}</span>
                      <span style={{ color: '#aaa' }}>{entry.sent_at ? new Date(entry.sent_at).toLocaleString('it-IT') : new Date(entry.scheduled_at).toLocaleString('it-IT')}</span>
                      {entry.error_msg && <span title={entry.error_msg}><AlertCircle size={12} strokeWidth={1.5} color="#c53030" /></span>}
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modale nuova automazione ─────────────────────────────────────────────────

function NuovaAutomazioneModal({ entityTipo, entityId, onClose, onCreate }) {
  const [nome, setNome] = useState('')
  const [trigger, setTrigger] = useState('nuova_prenotazione')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!nome.trim()) return setError('Nome obbligatorio')
    setSaving(true)
    setError('')
    try {
      const data = await apiFetch('/api/automazioni', {
        method: 'POST',
        body: JSON.stringify({ nome: nome.trim(), entity_tipo: entityTipo, entity_id: entityId, trigger_evento: trigger, steps: [] }),
      })
      onCreate(data)
      onClose()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 440 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 20 }}>Nuova automazione</div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="es. Benvenuto nuovo contatto"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Trigger</label>
          <select value={trigger} onChange={e => setTrigger(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
            {TRIGGERS.map(t => <option key={t.key} value={t.key}>{t.label} — {t.desc}</option>)}
          </select>
        </div>

        {error && <div style={{ color: '#c53030', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 14, background: '#fff' }}>Annulla</button>
          <button onClick={handleCreate} disabled={saving}
            style={{ padding: '9px 22px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creazione…' : 'Crea automazione'}
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
  if (all.length === 0) return <div style={{ fontSize: 13, color: '#aaa' }}>Nessuna entità disponibile.</div>
  if (all.length === 1 && !selected) { onSelect(all[0]); return null }

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Entità</label>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AutomazioniPage() {
  const { strutture, ristoranti, attivita, selectedStrutturaId, selectedRistoranteId, selectedAttivitaId } = useAzienda()
  const [selected, setSelected] = useState(null)
  const [automazioni, setAutomazioni] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Auto-seleziona la prima entità disponibile
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
      const data = await apiFetch(`/api/automazioni?entity_tipo=${selected.tipo}&entity_id=${selected.id}`)
      setAutomazioni(data)
    } catch { setAutomazioni([]) }
    setLoading(false)
  }, [selected])

  useEffect(() => { load() }, [load])

  async function handleToggle(auto) {
    try {
      const updated = await apiFetch(`/api/automazioni/${auto.id}`, {
        method: 'PATCH', body: JSON.stringify({ attiva: !auto.attiva }),
      })
      setAutomazioni(list => list.map(a => a.id === auto.id ? updated : a))
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa automazione?')) return
    try {
      await apiFetch(`/api/automazioni/${id}`, { method: 'DELETE' })
      setAutomazioni(list => list.filter(a => a.id !== id))
    } catch {}
  }

  async function handleSave(id, updates) {
    const updated = await apiFetch(`/api/automazioni/${id}`, {
      method: 'PATCH', body: JSON.stringify(updates),
    })
    setAutomazioni(list => list.map(a => a.id === id ? updated : a))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Automazioni email</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>
            Sequenze automatiche inviate al momento giusto — conferme, reminder, follow-up.
          </p>
        </div>
        {selected && (
          <button onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#fff' }}>
            <Plus size={15} strokeWidth={1.5} /> Nuova automazione
          </button>
        )}
      </div>

      <EntityPicker strutture={strutture} ristoranti={ristoranti} attivita={attivita} selected={selected}
        onSelect={e => { setSelected(e); setAutomazioni([]) }} />

      {selected && (
        <>
          {loading && <div style={{ fontSize: 14, color: '#aaa', padding: '20px 0' }}>Caricamento…</div>}
          {!loading && automazioni.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#bbb' }}>
              <Mail size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Nessuna automazione</div>
              <div style={{ fontSize: 13 }}>Crea la prima sequenza email per {selected.name}.</div>
            </div>
          )}
          {automazioni.map(auto => (
            <AutomazioneCard key={auto.id} auto={auto}
              onToggle={handleToggle} onDelete={handleDelete} onSave={handleSave} />
          ))}
        </>
      )}

      {showModal && selected && (
        <NuovaAutomazioneModal
          entityTipo={selected.tipo} entityId={selected.id}
          onClose={() => setShowModal(false)}
          onCreate={data => setAutomazioni(list => [data, ...list])}
        />
      )}
    </div>
  )
}
