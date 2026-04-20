import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'

const STATUS_LABELS = { open: 'Aperta', in_progress: 'In gestione', resolved: 'Risolta' }
const STATUS_COLORS = { open: '#e53e3e', in_progress: '#dd6b20', resolved: '#38a169' }
const TYPE_LABELS = { reception: 'Reception', maintenance: 'Manutenzione', housekeeping: 'Pulizie', other: 'Altro' }

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RequestsPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchRequests()
  }, [profile, filter])

  async function fetchRequests() {
    setLoading(true)
    const params = new URLSearchParams()

    // super_admin e admin_gruppo vedono tutte le strutture; gli altri filtrano per la propria
    if (profile.role === 'admin_struttura' || profile.role === 'staff') {
      if (profile.property_id) params.set('property_id', profile.property_id)
    }
    if (filter !== 'all') params.set('status', filter)

    try {
      const data = await apiFetch(`/api/requests?${params}`)
      setRequests(data)
    } catch (_) {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      fetchRequests()
    } catch (e) {
      alert(e.message)
    }
  }

  const showProperty = profile && ['super_admin', 'admin_gruppo'].includes(profile.role)

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Richieste</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['open', 'in_progress', 'resolved', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd',
              background: filter === s ? '#1a1a2e' : '#fff',
              color: filter === s ? '#fff' : '#333',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Caricamento…</p>
      ) : requests.length === 0 ? (
        <p style={{ color: '#888' }}>Nessuna richiesta.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(req => (
            <div key={req.id} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{TYPE_LABELS[req.type] || req.type}</span>
                  {req.room && <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>Camera {req.room}</span>}
                  {showProperty && req.properties?.name && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 600,
                      background: '#f0f4ff', color: '#1a1a2e',
                      padding: '2px 8px', borderRadius: 10,
                    }}>
                      {req.properties.name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: STATUS_COLORS[req.status],
                    background: `${STATUS_COLORS[req.status]}18`,
                    padding: '3px 10px', borderRadius: 12,
                  }}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>{formatDateTime(req.created_at)}</span>
                </div>
              </div>

              <p style={{ margin: '8px 0 12px', color: '#555', fontSize: 14 }}>{req.message}</p>

              <div style={{ display: 'flex', gap: 8 }}>
                {req.status === 'open' && (
                  <button onClick={() => updateStatus(req.id, 'in_progress')} style={btnStyle('#dd6b20')}>
                    Prendi in carico
                  </button>
                )}
                {req.status !== 'resolved' && (
                  <button onClick={() => updateStatus(req.id, 'resolved')} style={btnStyle('#38a169')}>
                    Risolvi
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

const btnStyle = (color) => ({
  padding: '6px 14px', background: color, color: '#fff', border: 'none',
  borderRadius: 6, fontSize: 13, cursor: 'pointer',
})
