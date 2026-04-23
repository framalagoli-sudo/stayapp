import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

// Ruoli interni StayApp (gli utenti azienda si gestiscono dal pannello Aziende)
const INTERNAL_ROLES = ['super_admin', 'admin', 'editor']
const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', editor: 'Editor' }
const ROLE_DESC = {
  super_admin: 'Accesso completo a tutto',
  admin: 'Gestione piattaforma, no gestione utenti',
  editor: 'Accesso in lettura e modifica contenuti',
}

const pill = (extra = {}) => ({ padding: '6px 14px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', ...extra })

export default function UsersPage() {
  const { profile: myProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const all = await apiFetch('/api/users')
      // Mostra solo utenti interni (senza azienda_id, ruoli interni)
      const internal = all.filter(u => INTERNAL_ROLES.includes(u.role) && !u.azienda_id)
      setUsers(internal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleCreate(form) {
    const created = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) })
    setUsers(us => [{ ...created, banned: false }, ...us])
    setShowCreate(false)
  }

  async function handleSave(userId, updates) {
    await apiFetch(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) })
    setUsers(us => us.map(u => u.id === userId ? { ...u, ...updates } : u))
  }

  async function handleDelete(user) {
    if (!confirm(`Eliminare l'utente ${user.email}? L'operazione è irreversibile.`)) return
    try {
      await apiFetch(`/api/users/${user.id}`, { method: 'DELETE' })
      setUsers(us => us.filter(u => u.id !== user.id))
    } catch (e) { alert(e.message) }
  }

  async function toggleBan(user) {
    try {
      await apiFetch(`/api/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ banned: !user.banned }) })
      setUsers(us => us.map(u => u.id === user.id ? { ...u, banned: !u.banned } : u))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Utenti interni</h2>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} style={pill({ background: '#1a1a2e', color: '#fff', padding: '8px 18px', fontSize: 13 })}>
            + Nuovo utente
          </button>
        )}
      </div>
      <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>
        Gestisci gli utenti del team StayApp. Gli accessi clienti si gestiscono dal pannello Aziende.
      </p>

      {error && <p style={{ color: '#c00' }}>{error}</p>}

      {showCreate && (
        <CreateUserForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {users.map(u => (
          <UserCard
            key={u.id}
            user={u}
            isMe={u.id === myProfile?.id}
            onSave={updates => handleSave(u.id, updates)}
            onDelete={() => handleDelete(u)}
            onToggleBan={() => toggleBan(u)}
          />
        ))}
        {users.length === 0 && <p style={{ color: '#888' }}>Nessun utente interno trovato.</p>}
      </div>
    </div>
  )
}

function UserCard({ user, isMe, onSave, onDelete, onToggleBan }) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user.full_name || '')
  const [role, setRole] = useState(user.role || 'editor')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const isSuperAdmin = user.role === 'super_admin'

  async function handleSave() {
    if (isSuperAdmin && role !== 'super_admin') {
      if (!confirm('Stai retrocedendo un Super Admin. Sei sicuro?')) return
    }
    setSaving(true); setSaveError(null)
    try {
      await onSave({ full_name: fullName, role })
      setEditing(false)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setFullName(user.full_name || '')
    setRole(user.role || 'editor')
    setEditing(false)
    setSaveError(null)
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      opacity: user.banned ? 0.65 : 1,
      border: isMe ? '2px solid #1a1a2e' : '2px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Avatar */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: isSuperAdmin ? '#1a1a2e' : '#e8e8f0', color: isSuperAdmin ? '#fff' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
          {(user.full_name || user.email || '?')[0].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            /* ── Editing mode ── */
            <div>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nome completo"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
              />
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>Ruolo</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {INTERNAL_ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: '2px solid', borderColor: role === r ? '#1a1a2e' : '#e0e0e0',
                      background: role === r ? '#1a1a2e' : '#fff',
                      color: role === r ? '#fff' : '#666',
                    }}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                {role && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#aaa' }}>{ROLE_DESC[role]}</p>}
              </div>
              {saveError && <p style={{ color: '#c00', fontSize: 12, margin: '0 0 8px' }}>{saveError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} disabled={saving} style={pill({ background: '#1a1a2e', color: '#fff' })}>
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
                <button onClick={handleCancel} style={pill({ background: '#f0f0f0', color: '#333' })}>Annulla</button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{user.full_name || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Nessun nome</span>}</span>
                {isMe && <span style={{ fontSize: 11, background: '#e8f4fd', color: '#1a6fa8', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Tu</span>}
                {isSuperAdmin && <span style={{ fontSize: 11, background: '#f5f0ff', color: '#6b21a8', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Protetto</span>}
                {user.banned && <span style={{ fontSize: 11, background: '#fee2e2', color: '#c00', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Bloccato</span>}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{user.email}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, display: 'flex', gap: 10 }}>
                <span>{ROLE_LABELS[user.role] || user.role}</span>
                {user.last_sign_in && <span>· Ultimo accesso: {new Date(user.last_sign_in).toLocaleDateString('it-IT')}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Actions (only in view mode, not for super_admin protected) */}
        {!editing && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} style={pill({ background: '#f0f4ff', color: '#1a1a2e' })}>
              Modifica
            </button>
            {!isSuperAdmin && (
              <>
                <button onClick={onToggleBan} style={pill({ background: user.banned ? '#f0fff4' : '#fff7ed', color: user.banned ? '#276749' : '#c05600' })}>
                  {user.banned ? 'Sblocca' : 'Blocca'}
                </button>
                <button onClick={onDelete} style={pill({ background: '#fff0f0', color: '#c00' })}>
                  Elimina
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateUserForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'editor' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email?.trim()) { setError('Email obbligatoria'); return }
    if (form.password.length < 6) { setError('Password minimo 6 caratteri'); return }
    setSaving(true); setError(null)
    try { await onSave(form) }
    catch (e) { setError(e.message); setSaving(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20, maxWidth: 480 }}>
      <h3 style={{ marginTop: 0, marginBottom: 18 }}>Nuovo utente interno</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Nome completo</label>
          <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Mario Rossi" style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Email <span style={{ color: '#c00' }}>*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={lbl}>Password <span style={{ color: '#c00' }}>*</span></label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="min. 6 caratteri" style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Ruolo</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {INTERNAL_ROLES.map(r => (
              <button key={r} type="button" onClick={() => set('role', r)} style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '2px solid', borderColor: form.role === r ? '#1a1a2e' : '#e0e0e0',
                background: form.role === r ? '#1a1a2e' : '#fff',
                color: form.role === r ? '#fff' : '#666',
              }}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          {form.role && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#aaa' }}>{ROLE_DESC[form.role]}</p>}
        </div>
        {error && <p style={{ color: '#c00', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={pill({ background: '#1a1a2e', color: '#fff', padding: '9px 22px', fontSize: 13 })}>
            {saving ? 'Creazione…' : 'Crea utente'}
          </button>
          <button type="button" onClick={onCancel} style={pill({ background: '#f0f0f0', color: '#333', padding: '9px 22px', fontSize: 13 })}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
