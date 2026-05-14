import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../lib/api'

const METHOD_COLORS = {
  PATCH:  { bg: '#dbeafe', text: '#1d4ed8' },
  DELETE: { bg: '#fee2e2', text: '#b91c1c' },
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'medium' })
}

function Badge({ method }) {
  const c = METHOD_COLORS[method] || { bg: '#f3f4f6', text: '#374151' }
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
    }}>{method}</span>
  )
}

export default function AuditLogPage() {
  const [rows, setRows]           = useState([])
  const [count, setCount]         = useState(0)
  const [offset, setOffset]       = useState(0)
  const [loading, setLoading]     = useState(false)
  const [filterMethod, setMethod] = useState('')
  const [filterEntity, setEntity] = useState('')
  const [filterEmail, setEmail]   = useState('')
  const [expanded, setExpanded]   = useState(null)
  const limit = 50

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit, offset: off })
      if (filterMethod) params.set('method', filterMethod)
      if (filterEntity) params.set('entity_tipo', filterEntity)
      if (filterEmail)  params.set('user_email', filterEmail)
      const res = await apiFetch(`/api/admin/audit-log?${params}`)
      setRows(res.data || [])
      setCount(res.count || 0)
      setOffset(off)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filterMethod, filterEntity, filterEmail])

  useEffect(() => { load(0) }, [load])

  const totalPages = Math.ceil(count / limit)
  const page = Math.floor(offset / limit) + 1

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Audit log</h2>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={filterMethod}
          onChange={e => setMethod(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        >
          <option value="">Tutti i metodi</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          placeholder="Filtra entità (es. properties)"
          value={filterEntity}
          onChange={e => setEntity(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: 220 }}
        />
        <input
          placeholder="Filtra email utente"
          value={filterEmail}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: 220 }}
        />
      </div>

      {/* Totale */}
      <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 13 }}>
        {count} operazioni trovate
      </p>

      {/* Tabella */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              {['Data', 'Utente', 'Metodo', 'Entità', 'Percorso', 'IP', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Caricamento…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nessuna operazione trovata</td></tr>
            )}
            {!loading && rows.map(r => (
              <>
                <tr
                  key={r.id}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  style={{ borderBottom: expanded === r.id ? 'none' : '1px solid #f3f4f6', cursor: 'pointer', background: expanded === r.id ? '#f9fafb' : 'transparent' }}
                >
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#6b7280' }}>{fmt(r.created_at)}</td>
                  <td style={{ padding: '8px 12px', color: '#111827' }}>{r.user_email || '—'}</td>
                  <td style={{ padding: '8px 12px' }}><Badge method={r.method} /></td>
                  <td style={{ padding: '8px 12px', color: '#374151' }}>
                    {r.entity_tipo || '—'}
                    {r.entity_id && <span style={{ color: '#9ca3af', marginLeft: 4, fontSize: 11 }}>{r.entity_id.slice(0, 8)}…</span>}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.path}>{r.path}</td>
                  <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 12 }}>{r.ip || '—'}</td>
                  <td style={{ padding: '8px 12px', color: r.status_code >= 400 ? '#b91c1c' : '#059669', fontWeight: 600 }}>{r.status_code}</td>
                </tr>
                {expanded === r.id && (
                  <tr key={r.id + '-detail'} style={{ borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                    <td colSpan={7} style={{ padding: '0 12px 12px 12px' }}>
                      <pre style={{ margin: 0, fontSize: 12, color: '#374151', background: '#f1f5f9', padding: '10px 14px', borderRadius: 6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {r.payload ? JSON.stringify(r.payload, null, 2) : '(nessun payload)'}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button
            onClick={() => load(offset - limit)}
            disabled={offset === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: offset === 0 ? 'default' : 'pointer', opacity: offset === 0 ? 0.4 : 1 }}
          >← Prec</button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Pagina {page} di {totalPages}</span>
          <button
            onClick={() => load(offset + limit)}
            disabled={offset + limit >= count}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: offset + limit >= count ? 'default' : 'pointer', opacity: offset + limit >= count ? 0.4 : 1 }}
          >Succ →</button>
        </div>
      )}
    </div>
  )
}
