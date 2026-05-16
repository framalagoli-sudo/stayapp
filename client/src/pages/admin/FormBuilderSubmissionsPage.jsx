import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { ArrowLeft, Inbox, Download } from 'lucide-react'

export default function FormBuilderSubmissionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]             = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/form-builder/${id}`),
      apiFetch(`/api/form-builder/${id}/submissions`),
    ]).then(([f, s]) => {
      setForm(f)
      setSubmissions(s.data || [])
      setTotal(s.count || 0)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [id])

  function exportCsv() {
    if (!form || submissions.length === 0) return
    const headers = ['Data', ...form.campi.map(c => c.label)]
    const rows = submissions.map(s => [
      new Date(s.created_at).toLocaleString('it-IT'),
      ...form.campi.map(c => {
        const v = s.dati[c.id]
        return typeof v === 'boolean' ? (v ? 'Sì' : 'No') : (v ?? '')
      }),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${form.nome || 'form'}-risposte.csv`; a.click()
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/admin/form-builder/${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Risposte — {form?.nome}</h1>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{total} risposta{total !== 1 ? 'e' : ''}</div>
        </div>
        {submissions.length > 0 && (
          <button
            onClick={exportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#444' }}
          >
            <Download size={14} strokeWidth={1.5} /> Esporta CSV
          </button>
        )}
      </div>

      {error && <p style={{ color: '#c53030' }}>{error}</p>}

      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
          <Inbox size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
          <p>Nessuna risposta ancora</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#888', fontWeight: 600, whiteSpace: 'nowrap' }}>Data</th>
                {form?.campi.map(c => (
                  <th key={c.id} style={{ textAlign: 'left', padding: '10px 14px', color: '#888', fontWeight: 600 }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 14px', color: '#888', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {new Date(s.created_at).toLocaleString('it-IT')}
                  </td>
                  {form?.campi.map(c => {
                    const v = s.dati[c.id]
                    return (
                      <td key={c.id} style={{ padding: '10px 14px', color: '#1a1a2e' }}>
                        {c.tipo === 'checkbox' ? (v ? '✓ Sì' : '—') : (v ?? '—')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
