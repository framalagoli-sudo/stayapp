import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
        <div style={{ display: 'grid', gap: 16 }}>
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
  const [openPanel, setOpenPanel] = useState(null) // null | 'strutture' | 'ristoranti' | 'accessi'

  function togglePanel(name) {
    setOpenPanel(p => p === name ? null : name)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* Header azienda */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{a.ragione_sociale}</div>
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
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {moduli.struttura && (
            <button onClick={() => togglePanel('strutture')} style={pill({ background: openPanel === 'strutture' ? '#1a1a2e' : '#f0f4ff', color: openPanel === 'strutture' ? '#fff' : '#1a1a2e', padding: '6px 14px', fontSize: 12 })}>
              Strutture
            </button>
          )}
          {moduli.ristorante && (
            <button onClick={() => togglePanel('ristoranti')} style={pill({ background: openPanel === 'ristoranti' ? '#e63946' : '#fff0f2', color: openPanel === 'ristoranti' ? '#fff' : '#c0392b', padding: '6px 14px', fontSize: 12 })}>
              Ristoranti
            </button>
          )}
          <button onClick={() => togglePanel('accessi')} style={pill({ background: openPanel === 'accessi' ? '#1a1a2e' : '#f5f5f5', color: openPanel === 'accessi' ? '#fff' : '#444', padding: '6px 14px', fontSize: 12 })}>
            Accessi
          </button>
          <button onClick={onEdit} style={pill({ background: '#f0f4ff', color: '#1a1a2e', padding: '6px 14px', fontSize: 12 })}>Modifica</button>
          <button onClick={onDelete} style={pill({ background: '#fff0f0', color: '#c00', padding: '6px 14px', fontSize: 12 })}>Elimina</button>
        </div>
      </div>

      {/* Pannelli espandibili */}
      {openPanel === 'strutture' && (
        <EntitaSection
          aziendaId={a.id}
          tipo="struttura"
          apiBase="/api/properties"
          editBase="/admin/struttura"
          label="struttura"
          labelPlural="strutture"
          accentColor="#1a1a2e"
        />
      )}
      {openPanel === 'ristoranti' && (
        <EntitaSection
          aziendaId={a.id}
          tipo="ristorante"
          apiBase="/api/ristoranti"
          editBase="/admin/ristoranti"
          label="ristorante"
          labelPlural="ristoranti"
          accentColor="#e63946"
        />
      )}
      {openPanel === 'accessi' && (
        <AccessiSection aziendaId={a.id} />
      )}
    </div>
  )
}

// ── Sezione Strutture / Ristoranti ────────────────────────────────────────────

function EntitaSection({ aziendaId, tipo, apiBase, editBase, label, labelPlural, accentColor }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  useEffect(() => { loadItems() }, [aziendaId])

  async function loadItems() {
    setLoading(true); setError(null)
    try {
      const data = await apiFetch(`${apiBase}?azienda_id=${aziendaId}`)
      setItems(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) { setCreateError('Il nome è obbligatorio'); return }
    setCreating(true); setCreateError(null)
    try {
      const created = await apiFetch(apiBase, {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), azienda_id: aziendaId }),
      })
      setItems(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setShowCreate(false)
    } catch (e) { setCreateError(e.message) }
    finally { setCreating(false) }
  }

  async function handleDelete(item) {
    if (!confirm(`Eliminare "${item.name}"? L'operazione è irreversibile.`)) return
    try {
      await apiFetch(`${apiBase}/${item.id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (e) { alert(e.message) }
  }

  const inp = { padding: '8px 12px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, flex: 1, boxSizing: 'border-box' }

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 24px', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>
          {labelPlural} ({items.length})
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            style={pill({ background: accentColor, color: '#fff', padding: '5px 12px', fontSize: 12 })}
          >
            + Nuova {label}
          </button>
        )}
      </div>

      {loading && <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Caricamento…</p>}
      {error && <p style={{ fontSize: 13, color: '#c00', margin: 0 }}>{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`Nome ${label}`}
            autoFocus
            style={inp}
          />
          <button type="submit" disabled={creating} style={pill({ background: accentColor, color: '#fff', padding: '8px 14px', fontSize: 12 })}>
            {creating ? 'Creazione…' : 'Crea'}
          </button>
          <button type="button" onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null) }} style={pill({ background: '#f0f0f0', color: '#333', padding: '8px 14px', fontSize: 12 })}>
            Annulla
          </button>
          {createError && <p style={{ color: '#c00', fontSize: 12, margin: '4px 0 0', width: '100%' }}>{createError}</p>}
        </form>
      )}

      {!loading && !error && items.length === 0 && !showCreate && (
        <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Nessuna {label} configurata.</p>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: '#fff', borderRadius: 8, padding: '10px 14px',
            border: '1px solid #eee',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 1, display: 'flex', gap: 8 }}>
                <code style={{ background: '#f5f5f5', padding: '0 4px', borderRadius: 3 }}>{item.slug}</code>
                <span style={{ color: item.active ? '#38a169' : '#e53e3e' }}>{item.active ? 'Attiva' : 'Inattiva'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => navigate(`${editBase}/${item.id}/info`)}
                style={pill({ background: '#f0f4ff', color: '#1a1a2e', padding: '5px 12px', fontSize: 12 })}
              >
                Gestisci
              </button>
              <button
                onClick={() => handleDelete(item)}
                style={pill({ background: '#fff0f0', color: '#c00', padding: '5px 12px', fontSize: 12 })}
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

// ── Sezione Accessi ───────────────────────────────────────────────────────────

function AccessiSection({ aziendaId }) {
  const [utente, setUtente] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('view')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => { loadUtente() }, [aziendaId])

  async function loadUtente() {
    setLoading(true); setError(null)
    try {
      const data = await apiFetch(`/api/aziende/${aziendaId}/utente`)
      setUtente(data || null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.email?.trim()) { setFormError('Email obbligatoria'); return }
    if (form.password.length < 6) { setFormError('Password minimo 6 caratteri'); return }
    setSaving(true); setFormError(null)
    try {
      const created = await apiFetch(`/api/aziende/${aziendaId}/utente`, {
        method: 'POST', body: JSON.stringify(form),
      })
      setUtente(created)
      setMode('view')
      setForm({ email: '', password: '', full_name: '' })
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  async function handleResetPwd(e) {
    e.preventDefault()
    if (form.password.length < 6) { setFormError('Password minimo 6 caratteri'); return }
    setSaving(true); setFormError(null)
    try {
      await apiFetch(`/api/aziende/${aziendaId}/utente/${utente.id}`, {
        method: 'PATCH', body: JSON.stringify({ password: form.password }),
      })
      setMode('view')
      setForm(f => ({ ...f, password: '' }))
      setSuccess('Password aggiornata.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  async function handleToggleBan() {
    const newBanned = !utente.banned
    if (!confirm(newBanned ? `Bloccare l'accesso di ${utente.email}?` : `Sbloccare l'accesso di ${utente.email}?`)) return
    try {
      await apiFetch(`/api/aziende/${aziendaId}/utente/${utente.id}`, {
        method: 'PATCH', body: JSON.stringify({ banned: newBanned }),
      })
      setUtente(u => ({ ...u, banned: newBanned }))
    } catch (e) { alert(e.message) }
  }

  async function handleRevoke() {
    if (!confirm(`Revocare l'accesso di ${utente.email}? L'utente non potrà più accedere.`)) return
    try {
      await apiFetch(`/api/aziende/${aziendaId}/utente/${utente.id}`, { method: 'DELETE' })
      setUtente(null)
      setMode('view')
    } catch (e) { alert(e.message) }
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 24px', background: '#fafafa' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
        Accessi azienda
      </div>

      {loading && <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Caricamento…</p>}
      {error && <p style={{ fontSize: 13, color: '#c00', margin: 0 }}>{error}</p>}

      {!loading && !error && utente === null && mode === 'view' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Nessun accesso configurato.</p>
          <button onClick={() => setMode('create')} style={pill({ background: '#1a1a2e', color: '#fff', padding: '6px 14px', fontSize: 12 })}>
            Crea credenziali
          </button>
        </div>
      )}

      {!loading && !error && utente && mode === 'view' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {utente.full_name || utente.email}
              {utente.banned && <span style={{ marginLeft: 8, fontSize: 11, background: '#fee2e2', color: '#c00', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Bloccato</span>}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{utente.email}</div>
            {utente.last_sign_in && (
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                Ultimo accesso: {new Date(utente.last_sign_in).toLocaleDateString('it-IT')}
              </div>
            )}
            {success && <div style={{ fontSize: 12, color: '#276749', marginTop: 4 }}>{success}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { setMode('resetPwd'); setFormError(null) }} style={pill({ background: '#f0f4ff', color: '#1a1a2e', padding: '6px 14px', fontSize: 12 })}>
              Reset password
            </button>
            <button onClick={handleToggleBan} style={pill({ background: utente.banned ? '#f0fff4' : '#fff7ed', color: utente.banned ? '#276749' : '#c05600', padding: '6px 14px', fontSize: 12 })}>
              {utente.banned ? 'Sblocca' : 'Blocca'}
            </button>
            <button onClick={handleRevoke} style={pill({ background: '#fff0f0', color: '#c00', padding: '6px 14px', fontSize: 12 })}>
              Revoca accesso
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} style={{ maxWidth: 420 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Nome completo</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Email <span style={{ color: '#c00' }}>*</span></label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} required />
            </div>
            <div>
              <label style={lbl}>Password <span style={{ color: '#c00' }}>*</span></label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="min. 6 caratteri" style={inp} />
            </div>
          </div>
          {formError && <p style={{ color: '#c00', fontSize: 12, margin: '0 0 8px' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={pill({ background: '#1a1a2e', color: '#fff', padding: '7px 16px', fontSize: 12 })}>
              {saving ? 'Creazione…' : 'Crea accesso'}
            </button>
            <button type="button" onClick={() => { setMode('view'); setFormError(null) }} style={pill({ background: '#f0f0f0', color: '#333', padding: '7px 16px', fontSize: 12 })}>
              Annulla
            </button>
          </div>
        </form>
      )}

      {mode === 'resetPwd' && utente && (
        <form onSubmit={handleResetPwd} style={{ maxWidth: 280 }}>
          <label style={lbl}>Nuova password <span style={{ color: '#c00' }}>*</span></label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="min. 6 caratteri"
            style={{ ...inp, marginBottom: 10 }}
          />
          {formError && <p style={{ color: '#c00', fontSize: 12, margin: '0 0 8px' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={pill({ background: '#1a1a2e', color: '#fff', padding: '7px 16px', fontSize: 12 })}>
              {saving ? 'Salvataggio…' : 'Aggiorna password'}
            </button>
            <button type="button" onClick={() => { setMode('view'); setFormError(null) }} style={pill({ background: '#f0f0f0', color: '#333', padding: '7px 16px', fontSize: 12 })}>
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

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
