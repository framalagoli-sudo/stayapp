import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useAzienda } from '../../context/AziendaContext'
import {
  Save, Send, Trash2, Plus, Copy, Check, AlertCircle, ArrowLeft, FileText,
} from 'lucide-react'
import AiButton from '../../components/admin/AiButton'

const STATI_LABEL = {
  bozza:     { label: 'Bozza',     color: '#666',   bg: '#f5f5f5' },
  inviato:   { label: 'Inviato',   color: '#2b6cb0', bg: '#ebf8ff' },
  accettato: { label: 'Accettato', color: '#276749', bg: '#f0fff4' },
  rifiutato: { label: 'Rifiutato', color: '#c53030', bg: '#fff5f5' },
  scaduto:   { label: 'Scaduto',   color: '#b45309', bg: '#fffbeb' },
}

const IVA_OPTIONS = [0, 4, 10, 22]

function newVoce() {
  return {
    id: crypto.randomUUID(),
    descrizione: '',
    qty: 1,
    prezzo_unitario: 0,
    sconto_pct: 0,
  }
}

function calcSubtotale(v) {
  return (v.qty || 1) * (v.prezzo_unitario || 0) * (1 - (v.sconto_pct || 0) / 100)
}

function fmt(n, currency = 'EUR') {
  return Number(n).toLocaleString('it-IT', { style: 'currency', currency })
}

export default function PreventivoEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { azienda } = useAzienda()

  const [prev, setPrev] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [contatti, setContatti] = useState([])

  // form fields
  const [titolo, setTitolo] = useState('')
  const [contattoId, setContattoId] = useState('')
  const [stato, setStato] = useState('bozza')
  const [valuta, setValuta] = useState('EUR')
  const [ivaPct, setIvaPct] = useState(22)
  const [voci, setVoci] = useState([])
  const [note, setNote] = useState('')
  const [scadenza, setScadenza] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/preventivi/${id}`),
      apiFetch('/api/contatti'),
    ]).then(([p, ct]) => {
      setPrev(p)
      setTitolo(p.titolo || '')
      setContattoId(p.contatto_id || '')
      setStato(p.stato || 'bozza')
      setValuta(p.valuta || 'EUR')
      setIvaPct(p.iva_pct ?? 22)
      setVoci(p.voci?.length ? p.voci : [newVoce()])
      setNote(p.note || '')
      setScadenza(p.scadenza || '')
      setContatti(ct)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [id])

  const imponibile = voci.reduce((acc, v) => acc + calcSubtotale(v), 0)
  const iva = imponibile * (ivaPct / 100)
  const totale = imponibile + iva

  const publicUrl = prev ? `${window.location.origin}/preventivo?token=${prev.token}` : ''

  async function save() {
    setSaving(true); setError('')
    try {
      const updated = await apiFetch(`/api/preventivi/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titolo, contatto_id: contattoId || null, stato,
          valuta, iva_pct: ivaPct, voci, note,
          scadenza: scadenza || null,
        }),
      })
      setPrev(updated)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function handleInvia() {
    if (!confirm('Cambiare lo stato in "Inviato"? Il cliente potrà vedere e accettare il preventivo.')) return
    setSaving(true); setError('')
    try {
      await save()
      const updated = await apiFetch(`/api/preventivi/${id}/invia`, { method: 'POST' })
      setStato(updated.stato)
      setPrev(updated)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // voci CRUD
  function addVoce() { setVoci(v => [...v, newVoce()]) }
  function removeVoce(vid) { setVoci(v => v.filter(x => x.id !== vid)) }
  function patchVoce(vid, patch) {
    setVoci(v => v.map(x => x.id === vid ? { ...x, ...patch } : x))
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  const statoInfo = STATI_LABEL[stato] || {}
  const isReadonly = stato === 'accettato'

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/preventivi')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <FileText size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          {prev?.numero} — {titolo || 'Preventivo'}
        </h1>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: statoInfo.bg, color: statoInfo.color }}>
          {statoInfo.label}
        </span>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {/* Link pubblico */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🔗 {publicUrl}
        </span>
        <button
          onClick={copyLink}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied ? '#f0fff4' : '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: copied ? '#276749' : '#444', whiteSpace: 'nowrap' }}
        >
          {copied ? <><Check size={13} strokeWidth={2} /> Copiato</> : <><Copy size={13} strokeWidth={1.5} /> Copia link</>}
        </button>
      </div>

      {/* Card principale */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Titolo */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Titolo</label>
            <input
              value={titolo} onChange={e => setTitolo(e.target.value)}
              disabled={isReadonly}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="es. Proposta di collaborazione"
            />
          </div>

          {/* Contatto */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Contatto (opzionale)</label>
            <select
              value={contattoId} onChange={e => setContattoId(e.target.value)}
              disabled={isReadonly}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
            >
              <option value="">— nessuno —</option>
              {contatti.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.email ? `(${c.email})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Scadenza */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Scadenza</label>
            <input
              type="date" value={scadenza} onChange={e => setScadenza(e.target.value)}
              disabled={isReadonly}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* Valuta */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Valuta</label>
            <select
              value={valuta} onChange={e => setValuta(e.target.value)}
              disabled={isReadonly}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
            >
              <option value="EUR">EUR — €</option>
              <option value="USD">USD — $</option>
              <option value="GBP">GBP — £</option>
              <option value="CHF">CHF — Fr</option>
            </select>
          </div>

          {/* IVA */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>IVA %</label>
            <select
              value={ivaPct} onChange={e => setIvaPct(Number(e.target.value))}
              disabled={isReadonly}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
            >
              {IVA_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>

          {/* Stato */}
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Stato</label>
            <select
              value={stato} onChange={e => setStato(e.target.value)}
              disabled={isReadonly}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
            >
              {Object.entries(STATI_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Voci */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voci</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontWeight: 600 }}>Descrizione</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontWeight: 600, width: 60 }}>Qtà</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontWeight: 600, width: 110 }}>Prezzo unit.</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontWeight: 600, width: 80 }}>Sconto %</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontWeight: 600, width: 110 }}>Subtotale</th>
                  {!isReadonly && <th style={{ width: 32 }} />}
                </tr>
              </thead>
              <tbody>
                {voci.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        value={v.descrizione} onChange={e => patchVoce(v.id, { descrizione: e.target.value })}
                        disabled={isReadonly}
                        style={{ width: '100%', border: 'none', padding: '4px 0', fontSize: 13, outline: 'none', background: 'transparent' }}
                        placeholder="Descrizione servizio…"
                      />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="number" min="0.01" step="0.01" value={v.qty}
                        onChange={e => patchVoce(v.id, { qty: parseFloat(e.target.value) || 1 })}
                        disabled={isReadonly}
                        style={{ width: '100%', border: 'none', padding: '4px 0', fontSize: 13, textAlign: 'right', outline: 'none', background: 'transparent' }}
                      />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="number" min="0" step="0.01" value={v.prezzo_unitario}
                        onChange={e => patchVoce(v.id, { prezzo_unitario: parseFloat(e.target.value) || 0 })}
                        disabled={isReadonly}
                        style={{ width: '100%', border: 'none', padding: '4px 0', fontSize: 13, textAlign: 'right', outline: 'none', background: 'transparent' }}
                      />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="number" min="0" max="100" step="1" value={v.sconto_pct}
                        onChange={e => patchVoce(v.id, { sconto_pct: parseFloat(e.target.value) || 0 })}
                        disabled={isReadonly}
                        style={{ width: '100%', border: 'none', padding: '4px 0', fontSize: 13, textAlign: 'right', outline: 'none', background: 'transparent' }}
                      />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>
                      {fmt(calcSubtotale(v), valuta)}
                    </td>
                    {!isReadonly && (
                      <td style={{ padding: '4px 4px' }}>
                        <button
                          onClick={() => removeVoce(v.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2 }}
                          disabled={voci.length === 1}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isReadonly && (
            <button
              onClick={addVoce}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#888', marginTop: 8 }}
            >
              <Plus size={13} strokeWidth={1.5} /> Aggiungi voce
            </button>
          )}
        </div>

        {/* Totali */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingTop: 12, borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: 13, color: '#555' }}>
            Imponibile: <strong>{fmt(imponibile, valuta)}</strong>
          </div>
          {ivaPct > 0 && (
            <div style={{ fontSize: 13, color: '#555' }}>
              IVA {ivaPct}%: <strong>{fmt(iva, valuta)}</strong>
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginTop: 4 }}>
            Totale: {fmt(totale, valuta)}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#888' }}>Note (visibili al cliente)</label>
            {!isReadonly && (
              <AiButton
                tipo="preventivo_note"
                nomeBusiness={azienda?.ragione_sociale || ''}
                contesto={titolo ? `Titolo preventivo: "${titolo}"` : ''}
                temaSuggerito={titolo || ''}
                label="✨ Genera note"
                showTono={false}
                placeholder="Es: inclusa consulenza iniziale, validità 30 giorni, pagamento 50% anticipo…"
                onInsert={t => setNote(t)}
              />
            )}
          </div>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            disabled={isReadonly}
            rows={3}
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            placeholder="Condizioni di pagamento, validità, dettagli aggiuntivi…"
          />
        </div>
      </div>

      {/* Accettazione info */}
      {stato === 'accettato' && prev?.firma_nome && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#276749' }}>
            ✓ Accettato da <strong>{prev.firma_nome}</strong> il {new Date(prev.accettato_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Azioni */}
      {!isReadonly && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {stato === 'bozza' && (
            <button
              onClick={handleInvia}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2b6cb0', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              <Send size={15} strokeWidth={1.5} /> Segna come inviato
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            <Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      )}
    </div>
  )
}
