'use client'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  Save, Plus, Trash2, ArrowLeft, FormInput, Copy, Check,
  AlertCircle, ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
} from 'lucide-react'

const TIPI = [
  { key: 'text',     label: 'Testo breve' },
  { key: 'email',    label: 'Email' },
  { key: 'tel',      label: 'Telefono' },
  { key: 'number',   label: 'Numero' },
  { key: 'textarea', label: 'Testo lungo' },
  { key: 'select',   label: 'Menu a discesa' },
  { key: 'checkbox', label: 'Casella di spunta' },
  { key: 'date',     label: 'Data' },
]

function newCampo(tipo = 'text') {
  return { id: crypto.randomUUID(), tipo, label: '', required: false, placeholder: '', opzioni: [] }
}

export default function FormBuilderEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [nome, setNome]           = useState('')
  const [descrizione, setDescr]   = useState('')
  const [campi, setCampi]         = useState([])
  const [redirectUrl, setRedirect] = useState('')
  const [emailNotifica, setEmail] = useState('')
  const [attivo, setAttivo]       = useState(true)

  useEffect(() => {
    apiFetch(`/api/form-builder/${id}`)
      .then(f => {
        setForm(f)
        setNome(f.nome || '')
        setDescr(f.descrizione || '')
        setCampi(f.campi?.length ? f.campi : [newCampo('text')])
        setRedirect(f.redirect_url || '')
        setEmail(f.email_notifica || '')
        setAttivo(f.attivo ?? true)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id])

  const embedUrl = form ? `${window.location.origin}/form?token=${form.token}` : ''
  const embedCode = form ? `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>` : ''

  async function save() {
    setSaving(true); setError('')
    try {
      const updated = await apiFetch(`/api/form-builder/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nome, descrizione, campi, redirect_url: redirectUrl, email_notifica: emailNotifica, attivo }),
      })
      setForm(updated)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function copyEmbed() {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function addCampo() { setCampi(c => [...c, newCampo()]) }
  function removeCampo(cid) { setCampi(c => c.filter(x => x.id !== cid)) }
  function moveCampo(idx, dir) {
    setCampi(c => {
      const arr = [...c]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }
  function patchCampo(cid, patch) {
    setCampi(c => c.map(x => x.id === cid ? { ...x, ...patch } : x))
  }
  function addOpzione(cid) {
    setCampi(c => c.map(x => x.id === cid ? { ...x, opzioni: [...(x.opzioni || []), ''] } : x))
  }
  function patchOpzione(cid, idx, val) {
    setCampi(c => c.map(x => {
      if (x.id !== cid) return x
      const ops = [...(x.opzioni || [])]
      ops[idx] = val
      return { ...x, opzioni: ops }
    }))
  }
  function removeOpzione(cid, idx) {
    setCampi(c => c.map(x => {
      if (x.id !== cid) return x
      return { ...x, opzioni: x.opzioni.filter((_, i) => i !== idx) }
    }))
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/form-builder')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <FormInput size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>{nome || 'Editor form'}</h1>
        <button onClick={() => navigate(`/admin/form-builder/${id}/submissions`)} style={{ fontSize: 13, background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#555' }}>
          Risposte
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {/* Impostazioni base */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Nome form</label>
            <input value={nome} onChange={e => setNome(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Descrizione (opzionale, mostrata sopra il form)</label>
            <input value={descrizione} onChange={e => setDescr(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Email notifica (opzionale)</label>
            <input type="email" value={emailNotifica} onChange={e => setEmail(e.target.value)} placeholder="admin@esempio.it" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>URL redirect post-invio (opzionale)</label>
            <input type="url" value={redirectUrl} onChange={e => setRedirect(e.target.value)} placeholder="https://…" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setAttivo(a => !a)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: attivo ? '#276749' : '#aaa' }}>
              {attivo ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
            </button>
            <span style={{ fontSize: 13, color: '#555' }}>Form {attivo ? 'attivo' : 'disattivo'}</span>
          </div>
        </div>
      </div>

      {/* Campi */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Campi del form
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campi.map((c, idx) => (
            <div key={c.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, background: '#fafafa' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 10, alignItems: 'start', marginBottom: c.tipo === 'select' ? 10 : 0 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 3 }}>Etichetta</label>
                  <input
                    value={c.label} onChange={e => patchCampo(c.id, { label: e.target.value })}
                    placeholder="Es. Nome completo"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 13, boxSizing: 'border-box' }}
                  />
                  <input
                    value={c.placeholder} onChange={e => patchCampo(c.id, { placeholder: e.target.value })}
                    placeholder="Placeholder (opz.)"
                    style={{ width: '100%', border: '1px solid #eee', borderRadius: 6, padding: '5px 10px', fontSize: 12, boxSizing: 'border-box', marginTop: 4, color: '#888' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 3 }}>Tipo</label>
                  <select
                    value={c.tipo} onChange={e => patchCampo(c.id, { tipo: e.target.value })}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', fontSize: 13, boxSizing: 'border-box' }}
                  >
                    {TIPI.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: '#555', cursor: 'pointer' }}>
                    <input type="checkbox" checked={c.required} onChange={e => patchCampo(c.id, { required: e.target.checked })} />
                    Obbligatorio
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 18 }}>
                  <button onClick={() => moveCampo(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: '1px solid #eee', borderRadius: 4, cursor: idx === 0 ? 'default' : 'pointer', padding: '2px 6px', color: '#aaa' }}>
                    <ChevronUp size={13} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => moveCampo(idx, 1)} disabled={idx === campi.length - 1} style={{ background: 'none', border: '1px solid #eee', borderRadius: 4, cursor: idx === campi.length - 1 ? 'default' : 'pointer', padding: '2px 6px', color: '#aaa' }}>
                    <ChevronDown size={13} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => removeCampo(c.id)} disabled={campi.length === 1} style={{ background: 'none', border: '1px solid #eee', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', color: '#ccc' }}>
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Opzioni per select */}
              {c.tipo === 'select' && (
                <div style={{ paddingTop: 8, borderTop: '1px solid #eee' }}>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Opzioni menu a discesa</div>
                  {(c.opzioni || []).map((op, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <input
                        value={op} onChange={e => patchOpzione(c.id, oi, e.target.value)}
                        placeholder={`Opzione ${oi + 1}`}
                        style={{ flex: 1, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}
                      />
                      <button onClick={() => removeOpzione(c.id, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}>
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addOpzione(c.id)} style={{ fontSize: 12, background: 'none', border: '1px dashed #ddd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#888' }}>
                    + Aggiungi opzione
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addCampo}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#888', marginTop: 12 }}
        >
          <Plus size={13} strokeWidth={1.5} /> Aggiungi campo
        </button>
      </div>

      {/* Embed */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incorpora nel tuo sito</div>
        <code style={{ fontSize: 11, color: '#555', background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: '8px 10px', display: 'block', wordBreak: 'break-all', marginBottom: 8 }}>
          {embedCode}
        </code>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyEmbed}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied ? '#f0fff4' : '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: copied ? '#276749' : '#444' }}
          >
            {copied ? <><Check size={13} strokeWidth={2} /> Copiato</> : <><Copy size={13} strokeWidth={1.5} /> Copia codice embed</>}
          </button>
          <a href={embedUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2b6cb0', padding: '5px 10px', textDecoration: 'none' }}>
            Anteprima →
          </a>
        </div>
      </div>

      {/* Salva */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : 'Salva form'}
        </button>
      </div>
    </div>
  )
}
