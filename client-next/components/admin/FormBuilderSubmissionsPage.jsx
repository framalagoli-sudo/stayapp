'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { ArrowLeft, Inbox, Download, ShieldAlert } from 'lucide-react'

// Le risposte di un modulo, in due linguette: «Richieste» e «Possibile spam».
// Le sospette non si buttano più (migration 147): stanno a parte, col motivo, e
// il titolare le sposta con un clic. «Non è spam» mette la persona fra i contatti.
export default function FormBuilderSubmissionsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [form, setForm]               = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [conteggi, setConteggi]       = useState({ richieste: 0, spam: 0 })
  const [vista, setVista]             = useState('richieste')   // richieste · spam
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [inCorso, setInCorso]         = useState(null)

  const carica = useCallback(async (quale) => {
    const s = await apiFetch(`/api/form-builder/${id}/submissions${quale === 'spam' ? '?spam=1' : ''}`)
    setSubmissions(s.data || [])
    setConteggi(s.conteggi || { richieste: 0, spam: 0 })
  }, [id])

  useEffect(() => {
    Promise.all([apiFetch(`/api/form-builder/${id}`), carica('richieste')])
      .then(([f]) => { setForm(f); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id, carica])

  async function cambiaVista(v) {
    setVista(v); setError('')
    try { await carica(v) } catch (e) { setError(e.message) }
  }

  async function sposta(invio, comeSpam) {
    setInCorso(invio.id); setError('')
    try {
      await apiFetch(`/api/form-builder/${id}/submissions`, { method: 'PATCH', body: JSON.stringify({ id: invio.id, possibile_spam: comeSpam }) })
      await carica(vista)
    } catch (e) { setError(e.message) }
    setInCorso(null)
  }

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
    a.download = `${form.nome || 'form'}-${vista === 'spam' ? 'possibile-spam' : 'risposte'}.csv`; a.click()
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  const linguetta = (chiave, etichetta, n) => (
    <button key={chiave} type="button" onClick={() => cambiaVista(chiave)} data-vista={chiave}
      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid ' + (vista === chiave ? '#1a1a2e' : '#ddd'), background: vista === chiave ? '#1a1a2e' : '#fff', color: vista === chiave ? '#fff' : '#444', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {etichetta} ({n})
    </button>
  )

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={() => router.push(`/admin/form-builder/${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, overflowWrap: 'anywhere' }}>Risposte — {form?.nome}</h1>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{conteggi.richieste} richiest{conteggi.richieste === 1 ? 'a' : 'e'}{conteggi.spam ? ` · ${conteggi.spam} possibile spam` : ''}</div>
        </div>
        {submissions.length > 0 && (
          <button onClick={exportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#444' }}>
            <Download size={14} strokeWidth={1.5} /> Esporta CSV
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
        {linguetta('richieste', 'Richieste', conteggi.richieste)}
        {linguetta('spam', 'Possibile spam', conteggi.spam)}
      </div>
      {vista === 'spam' && (
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px', lineHeight: 1.5 }}>
          Qui finiscono le risposte con i segni dello spam: troppi link, parole tipiche, inviate in un attimo. Non sono cancellate e non hanno ricevuto la risposta automatica.
          Se una è di una persona vera, premi «Non è spam»: torna fra le richieste e la persona entra fra i contatti.
        </p>
      )}

      {error && <p style={{ color: '#c53030' }}>{error}</p>}

      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a8a8a' }}>
          {vista === 'spam' ? <ShieldAlert size={40} strokeWidth={1} style={{ marginBottom: 12 }} /> : <Inbox size={40} strokeWidth={1} style={{ marginBottom: 12 }} />}
          <p>{vista === 'spam' ? 'Nessuna risposta sospetta' : 'Nessuna risposta ancora'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>Data</th>
                {form?.campi.map(c => (
                  <th key={c.id} style={{ textAlign: 'left', padding: '10px 14px', color: '#666', fontWeight: 600 }}>{c.label}</th>
                ))}
                <th style={{ padding: '10px 14px' }} />
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} data-risposta={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap', fontSize: 12, verticalAlign: 'top' }}>
                    {new Date(s.created_at).toLocaleString('it-IT')}
                    {s.possibile_spam && s.spam_motivo && <div style={{ color: '#9a5b00', marginTop: 4, whiteSpace: 'normal', maxWidth: 180 }}>{s.spam_motivo}</div>}
                  </td>
                  {form?.campi.map(c => {
                    const v = s.dati[c.id]
                    return (
                      <td key={c.id} style={{ padding: '10px 14px', color: '#1a1a2e', verticalAlign: 'top', overflowWrap: 'anywhere' }}>
                        {c.tipo === 'checkbox' || c.tipo === 'consenso' ? (v ? '✓ Sì' : '—') : (v ?? '—')}
                      </td>
                    )
                  })}
                  <td style={{ padding: '10px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <button type="button" disabled={inCorso === s.id} onClick={() => sposta(s, !s.possibile_spam)}
                      title={s.possibile_spam ? 'Torna fra le richieste e la persona entra fra i contatti' : 'Va in «Possibile spam»: la scheda contatto, se c’è, non viene toccata'}
                      style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: s.possibile_spam ? '#276749' : '#9a5b00', opacity: inCorso === s.id ? 0.5 : 1 }}>
                      {s.possibile_spam ? 'Non è spam' : 'Segna come spam'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
