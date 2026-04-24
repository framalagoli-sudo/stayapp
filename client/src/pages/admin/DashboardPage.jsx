import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 })
  const [properties, setProperties] = useState([])
  const [loadingProps, setLoadingProps] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (['super_admin', 'admin', 'editor', 'admin_gruppo', 'admin_struttura', 'staff'].includes(profile.role)) {
      if (profile.property_id) fetchStats()
      fetchProperties()
    }
  }, [profile])

  async function fetchStats() {
    const { data } = await supabase
      .from('requests')
      .select('status')
      .eq('property_id', profile.property_id)

    if (!data) return
    setStats({
      open: data.filter(r => r.status === 'open').length,
      inProgress: data.filter(r => r.status === 'in_progress').length,
      resolved: data.filter(r => r.status === 'resolved').length,
    })
  }

  async function fetchProperties() {
    setLoadingProps(true)
    try {
      const data = await apiFetch('/api/properties')
      setProperties(data)
    } catch (_) {
      // non critico, la dashboard rimane usabile
    } finally {
      setLoadingProps(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Eliminare la struttura "${name}"?\nL'operazione è irreversibile.`)) return
    try {
      await apiFetch(`/api/properties/${id}`, { method: 'DELETE' })
      setProperties(ps => ps.filter(p => p.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  const statCards = [
    { label: 'Richieste aperte', value: stats.open, color: '#e53e3e' },
    { label: 'In gestione', value: stats.inProgress, color: '#dd6b20' },
    { label: 'Risolte oggi', value: stats.resolved, color: '#38a169' },
  ]

  const canManage = profile && ['super_admin', 'admin_gruppo'].includes(profile.role)

  if (profile?.role === 'admin_azienda') {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>
        <p style={{ color: '#666' }}>Benvenuto, {profile?.full_name || 'Admin'}.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>Benvenuto, {profile?.full_name || 'Admin'}.</p>

      {profile?.property_id && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
          {statCards.map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Strutture</h3>
        {canManage && (
          <button
            onClick={() => navigate('/admin/properties')}
            style={{ padding: '6px 14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            + Nuova struttura
          </button>
        )}
      </div>

      {loadingProps ? (
        <p style={{ color: '#888', fontSize: 14 }}>Caricamento strutture…</p>
      ) : properties.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>Nessuna struttura trovata.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {properties.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: 4 }}>{p.slug}</code>
                  {' · '}
                  <span style={{ color: p.active ? '#38a169' : '#e53e3e' }}>
                    {p.active ? 'Attiva' : 'Inattiva'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => navigate('/admin/properties')}
                  style={{ padding: '6px 14px', background: '#f0f4ff', color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Modifica
                </button>
                {canManage && (
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{ padding: '6px 14px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Elimina
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
