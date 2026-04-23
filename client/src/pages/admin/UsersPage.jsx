import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

const ROLES = ['admin_azienda', 'admin_struttura', 'staff', 'super_admin']
const ROLE_LABELS = { super_admin: 'Super Admin', admin_azienda: 'Admin Azienda', admin_struttura: 'Admin Struttura', staff: 'Staff' }

const pill = (extra = {}) => ({ padding: '6px 14px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', ...extra })

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [aziende, setAziende] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [u, a] = await Promise.all([apiFetch('/api/users'), apiFetch('/api/aziende')])
      setUsers(u.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setAziende(a)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function toggleBan(user) {
    try {
      await apiFetch(`/api/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ banned: !user.banned }) })
      setUsers(us => us.map(u => u.id === user.id ? { ...u, banned: !u.banned } : u))
    } catch (e) { alert(e.message) }
  }

  async function handleDelete(user) {
    if (!confirm(`Eliminare l'utente ${user.email}?\nL'operazione è irreversibile.`)) return
    try {
      await apiFetch(`/api/users/${user.id}`, { method: 'DELETE' })
      setUsers(us => us.filter(u => u.id !== user.id))
    } catch (e) { alert(e.message) }
  }

  async function handleCreate(form) {
    const created = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) })
    const az = aziende.find(a => a.id === created.azienda_id)
    setUsers(us => [{ ...created, azienda_name: az?.ragione_sociale || null, banned: false }, ...us])
    setShowCreate(false)
  }

  async function handleRoleChange(userId, role) {
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) })
      setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Utenti</h2>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} style={pill({ background: '#1a1a2e', color: '#fff', padding: '8px 18px', fontSize: 13 })}>
            + Nuovo utente
          </button>
        )}
      </div>

      {error && <p style={{ color: '#c00' }}>{error}</p>}

      {showCreate && (
        <CreateUserForm
          aziende={aziende}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {users.map(u => (
          <div key={u.id} style={{
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: u.banned ? 0.6 : 1,
          }}>
            {/* Avatar */}
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.banned ? '#eee' : '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {(u.full_name || u.email || '?')[0].toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                {u.full_name || <span style={{ color: '#aaa', fontWeight: 400 }}>Nessun nome</span>}
                {u.banned && <span style={{ fontSize: 11, background: '#fee2e2', color: '#c00', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>BLOCCATO</span>}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{u.email}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, display: 'flex', gap: 10 }}>
                <span>{ROLE_LABELS[u.role] || u.role}</span>
                {u.azienda_name && <span>· {u.azienda_name}</span>}
                {u.last_sign_in && <span>· Ultimo accesso: {new Date(u.last_sign_in).toLocaleDateString('it-IT')}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
              <select
                value={u.role || ''}
                onChange={e => handleRoleChange(u.id, e.target.value)}
                style={{ fontSize: 12, borderRadius: 6, border: '1px solid #ddd', padding: '5px 8px', cursor: 'pointer' }}
              >
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button onClick={() => toggleBan(u)} style={pill({ background: u.banned ? '#f0fff4' : '#fff7ed', color: u.banned ? '#276749' : '#c05600' })}>
                {u.banned ? 'Sblocca' : 'Blocca'}
              </button>
              <button onClick={() => handleDelete(u)} style={pill({ background: '#fff0f0', color: '#c00' })}>
                Elimina
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p style={{ color: '#888' }}>Nessun utente trovato.</p>}
      </div>
    </div>
  )
}

function CreateUserForm({ aziende, onSave, onCancel }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'admin_azienda', azienda_id: aziende[0]?.id || '' })
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
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20, maxWidth: 520 }}>
      <h3 style={{ marginTop: 0, marginBottom: 18 }}>Nuovo utente</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Nome completo</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Mario Rossi" style={inp} />
          </div>
          <div>
            <label style={lbl}>Email <span style={{ color: '#c00' }}>*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={lbl}>Password <span style={{ color: '#c00' }}>*</span></label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="min. 6 caratteri" style={inp} />
          </div>
          <div>
            <label style={lbl}>Ruolo</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} style={inp}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Azienda</label>
            <select value={form.azienda_id} onChange={e => set('azienda_id', e.target.value)} style={inp}>
              <option value="">— Nessuna —</option>
              {aziende.map(a => <option key={a.id} value={a.id}>{a.ragione_sociale}</option>)}
            </select>
          </div>
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
