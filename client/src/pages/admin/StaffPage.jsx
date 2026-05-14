import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useAzienda } from '../../context/AziendaContext'

const PERMISSIONS = [
  { key: 'richieste',    label: 'Richieste' },
  { key: 'prenotazioni', label: 'Prenotazioni' },
  { key: 'booking',      label: 'Booking risorse' },
  { key: 'eventi',       label: 'Eventi' },
  { key: 'blog',         label: 'Blog & News' },
  { key: 'newsletter',   label: 'Newsletter' },
  { key: 'contatti',     label: 'Contatti' },
]

const EMPTY_FORM = { email: '', full_name: '', permissions: {} }

function EntitySelector({ label, entities, selectedIds, onChange }) {
  if (!entities?.length) return null
  return (
    <div style={{ marginTop: 6, paddingLeft: 16, borderLeft: '2px solid #ddd' }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
        {label} — lascia vuoto per accesso a tutt{label.includes('struttur') ? 'e' : 'i'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {entities.map(e => {
          const checked = selectedIds.includes(e.id)
          return (
            <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', background: checked ? '#ddeeff' : '#f5f5f5', padding: '4px 10px', borderRadius: 16, border: `1px solid ${checked ? '#3399cc' : '#ddd'}` }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selectedIds.filter(id => id !== e.id) : [...selectedIds, e.id])}
                style={{ margin: 0 }}
              />
              {e.name}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function PermissionForm({ perms, onChange, strutture, ristoranti, attivita }) {
  function toggle(key) {
    onChange({ ...perms, [key]: !perms[key] })
  }
  return (
    <div>
      {/* Sezioni generiche */}
      <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Sezioni</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PERMISSIONS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: perms[key] ? '#e8f4f8' : '#f5f5f5', padding: '6px 12px', borderRadius: 20, border: `1px solid ${perms[key] ? '#0099bb' : '#ddd'}` }}>
            <input type="checkbox" checked={!!perms[key]} onChange={() => toggle(key)} style={{ margin: 0 }} />
            {label}
          </label>
        ))}
      </div>

      {/* Struttura */}
      {strutture?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: perms.struttura ? '#e8f4f8' : '#f5f5f5', padding: '6px 12px', borderRadius: 20, border: `1px solid ${perms.struttura ? '#0099bb' : '#ddd'}`, width: 'fit-content' }}>
            <input type="checkbox" checked={!!perms.struttura} onChange={() => onChange({ ...perms, struttura: !perms.struttura, struttura_ids: perms.struttura ? [] : (perms.struttura_ids || []) })} style={{ margin: 0 }} />
            Gestione struttura
          </label>
          {perms.struttura && strutture.length > 1 && (
            <EntitySelector
              label="Strutture accessibili"
              entities={strutture}
              selectedIds={perms.struttura_ids || []}
              onChange={ids => onChange({ ...perms, struttura_ids: ids })}
            />
          )}
        </div>
      )}

      {/* Ristorante */}
      {ristoranti?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: perms.ristorante ? '#e8f4f8' : '#f5f5f5', padding: '6px 12px', borderRadius: 20, border: `1px solid ${perms.ristorante ? '#0099bb' : '#ddd'}`, width: 'fit-content' }}>
            <input type="checkbox" checked={!!perms.ristorante} onChange={() => onChange({ ...perms, ristorante: !perms.ristorante, ristorante_ids: perms.ristorante ? [] : (perms.ristorante_ids || []) })} style={{ margin: 0 }} />
            Gestione ristorante
          </label>
          {perms.ristorante && ristoranti.length > 1 && (
            <EntitySelector
              label="Ristoranti accessibili"
              entities={ristoranti}
              selectedIds={perms.ristorante_ids || []}
              onChange={ids => onChange({ ...perms, ristorante_ids: ids })}
            />
          )}
        </div>
      )}

      {/* Attività */}
      {attivita?.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: perms.attivita_gestione ? '#e8f4f8' : '#f5f5f5', padding: '6px 12px', borderRadius: 20, border: `1px solid ${perms.attivita_gestione ? '#0099bb' : '#ddd'}`, width: 'fit-content' }}>
            <input type="checkbox" checked={!!perms.attivita_gestione} onChange={() => onChange({ ...perms, attivita_gestione: !perms.attivita_gestione, attivita_ids: perms.attivita_gestione ? [] : (perms.attivita_ids || []) })} style={{ margin: 0 }} />
            Gestione attività
          </label>
          {perms.attivita_gestione && attivita.length > 1 && (
            <EntitySelector
              label="Attività accessibili"
              entities={attivita}
              selectedIds={perms.attivita_ids || []}
              onChange={ids => onChange({ ...perms, attivita_ids: ids })}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function StaffPage() {
  const { strutture, ristoranti, attivita } = useAzienda()
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editPerms, setEditPerms] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await apiFetch('/api/users')
    setStaff(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!form.email.trim()) return
    setSaving(true)
    setError(null)
    const res = await apiFetch('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email: form.email.trim(), full_name: form.full_name.trim(), permissions: form.permissions }),
    })
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setShowForm(false)
    setForm(EMPTY_FORM)
    load()
  }

  function startEdit(member) {
    setEditingId(member.id)
    setEditPerms(member.permissions || {})
  }

  async function savePerms(id) {
    setSaving(true)
    await apiFetch(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions: editPerms }),
    })
    setSaving(false)
    setEditingId(null)
    load()
  }

  async function handleDelete(id, email) {
    if (!confirm(`Elimina ${email}? Non potrà più accedere al pannello.`)) return
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
    load()
  }

  async function toggleBan(member) {
    await apiFetch(`/api/users/${member.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ banned: !member.banned }),
    })
    load()
  }

  function permSummary(p) {
    if (!p) return []
    const labels = []
    PERMISSIONS.forEach(({ key, label }) => { if (p[key]) labels.push(label) })
    if (p.struttura) {
      const ids = p.struttura_ids || []
      if (ids.length && strutture?.length > 1) {
        const names = strutture.filter(s => ids.includes(s.id)).map(s => s.name).join(', ')
        labels.push(`Struttura (${names})`)
      } else {
        labels.push('Gestione struttura')
      }
    }
    if (p.ristorante) {
      const ids = p.ristorante_ids || []
      if (ids.length && ristoranti?.length > 1) {
        const names = ristoranti.filter(r => ids.includes(r.id)).map(r => r.name).join(', ')
        labels.push(`Ristorante (${names})`)
      } else {
        labels.push('Gestione ristorante')
      }
    }
    if (p.attivita_gestione) labels.push('Gestione attività')
    return labels
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Collaboratori</h1>
        <button
          onClick={() => { setShowForm(true); setError(null) }}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14 }}
        >
          + Invita collaboratore
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleInvite} style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Invita nuovo collaboratore</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>
            Riceverà un'email con il link per impostare la password e accedere al pannello.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4 }}>Email *</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4 }}>Nome completo</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 8 }}>Accessi consentiti</label>
            <PermissionForm
              perms={form.permissions}
              onChange={p => setForm(f => ({ ...f, permissions: p }))}
              strutture={strutture}
              ristoranti={ristoranti}
              attivita={attivita}
            />
          </div>

          {error && <p style={{ color: '#c00', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving}
              style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>
              {saving ? 'Invio...' : 'Invia invito'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null) }}
              style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>
              Annulla
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento...</p>
      ) : staff.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888' }}>
          <p style={{ margin: '0 0 8px', fontSize: 16 }}>Nessun collaboratore ancora</p>
          <p style={{ margin: 0, fontSize: 13 }}>Invita il tuo primo collaboratore con il pulsante in alto.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {staff.map(member => (
            <div key={member.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{member.full_name || '—'}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{member.email}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!member.confirmed && (
                      <span style={{ fontSize: 11, background: '#fff3cd', color: '#856404', padding: '2px 8px', borderRadius: 10 }}>In attesa conferma email</span>
                    )}
                    {member.banned && (
                      <span style={{ fontSize: 11, background: '#fce8e8', color: '#c00', padding: '2px 8px', borderRadius: 10 }}>Sospeso</span>
                    )}
                    {member.last_sign_in && (
                      <span style={{ fontSize: 11, color: '#999' }}>Ultimo accesso: {new Date(member.last_sign_in).toLocaleDateString('it-IT')}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => editingId === member.id ? setEditingId(null) : startEdit(member)}
                    style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>
                    {editingId === member.id ? 'Annulla' : 'Modifica accessi'}
                  </button>
                  <button onClick={() => toggleBan(member)}
                    style={{ background: member.banned ? '#e8f8e8' : '#fff3cd', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: member.banned ? '#2d7a2d' : '#856404' }}>
                    {member.banned ? 'Riabilita' : 'Sospendi'}
                  </button>
                  <button onClick={() => handleDelete(member.id, member.email)}
                    style={{ background: '#fce8e8', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#c00' }}>
                    Elimina
                  </button>
                </div>
              </div>

              {editingId !== member.id && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {permSummary(member.permissions).length === 0
                    ? <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Nessun accesso configurato</span>
                    : permSummary(member.permissions).map(l => (
                        <span key={l} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: '#e8f4f8', color: '#0066aa' }}>{l}</span>
                      ))
                  }
                </div>
              )}

              {editingId === member.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>Modifica accessi consentiti</div>
                  <PermissionForm
                    perms={editPerms}
                    onChange={setEditPerms}
                    strutture={strutture}
                    ristoranti={ristoranti}
                    attivita={attivita}
                  />
                  <button onClick={() => savePerms(member.id)} disabled={saving}
                    style={{ marginTop: 14, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13 }}>
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
