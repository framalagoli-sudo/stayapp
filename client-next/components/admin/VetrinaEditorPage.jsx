'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { getPreset, fieldOptions } from '@/lib/vetrinePresets'

const NUMERIC = new Set(['number', 'currency', 'percent'])

// Coerce i campi numerici del preset in Number (o li rimuove se vuoti) prima del salvataggio.
function cleanDati(dati, fields) {
  const out = { ...(dati || {}) }
  for (const f of fields) {
    if (!NUMERIC.has(f.type)) continue
    const v = out[f.key]
    if (v === '' || v === null || v === undefined) { delete out[f.key]; continue }
    const n = Number(v)
    if (!Number.isNaN(n)) out[f.key] = n
  }
  return out
}

export default function VetrinaEditorPage() {
  const router = useRouter()
  const { id: vetrinaId } = useParams()

  const [vetrina, setVetrina] = useState(null)
  const [elementi, setElementi] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { load() }, [vetrinaId])

  async function load() {
    setLoading(true)
    const [v, els] = await Promise.all([
      apiFetch(`/api/vetrine/${vetrinaId}`),
      apiFetch(`/api/vetrina-elementi?vetrina_id=${vetrinaId}`),
    ])
    setVetrina(v && !v.error ? v : null)
    setElementi(Array.isArray(els) ? els : [])
    setLoading(false)
  }

  async function patchVetrina(patch) {
    const res = await apiFetch(`/api/vetrine/${vetrinaId}`, { method: 'PATCH', body: JSON.stringify(patch) })
    if (res && !res.error) setVetrina(res)
  }

  async function addElemento(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const res = await apiFetch('/api/vetrina-elementi', { method: 'POST', body: JSON.stringify({ vetrina_id: vetrinaId, titolo: newTitle.trim() }) })
    setNewTitle(''); setShowNew(false)
    await load()
    if (res?.id) setExpandedId(res.id)
  }

  async function deleteElemento(el) {
    if (!confirm(`Elimina "${el.titolo}"? Non è reversibile.`)) return
    await apiFetch(`/api/vetrina-elementi/${el.id}`, { method: 'DELETE' })
    load()
  }

  async function toggleStatus(el) {
    const next = el.status === 'pubblicata' ? 'bozza' : 'pubblicata'
    await apiFetch(`/api/vetrina-elementi/${el.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
    load()
  }

  if (loading) return <p style={{ padding: 40, color: '#888' }}>Caricamento...</p>
  if (!vetrina) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#c00', marginBottom: 12 }}>Vetrina non trovata.</p>
      <button onClick={() => router.back()} style={backBtn}>← Indietro</button>
    </div>
  )

  const preset = getPreset(vetrina.preset)

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', padding: 0 }}>← Indietro</button>
        <input value={vetrina.titolo} onChange={e => setVetrina(v => ({ ...v, titolo: e.target.value }))} onBlur={e => patchVetrina({ titolo: e.target.value })}
          style={{ flex: 1, minWidth: 180, fontSize: 19, fontWeight: 700, border: 'none', borderBottom: '1px solid transparent', color: '#1a1a2e', outline: 'none' }}
          onFocus={e => e.target.style.borderBottomColor = '#ddd'} />
        <span style={{ fontSize: 11, color: '#888', background: '#f0f0f4', padding: '3px 8px', borderRadius: 6 }}>{preset.label}</span>
        <button onClick={() => patchVetrina({ status: vetrina.status === 'pubblicata' ? 'bozza' : 'pubblicata' })}
          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: vetrina.status === 'pubblicata' ? '#d4edda' : '#fff3cd', color: vetrina.status === 'pubblicata' ? '#155724' : '#856404', fontWeight: 600 }}>
          {vetrina.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
        </button>
      </div>

      {/* Lista elementi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, color: '#555' }}>{preset.elementoLabel || 'Elementi'} ({elementi.length})</h2>
        <button onClick={() => setShowNew(true)} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          + Aggiungi {(preset.elementoLabel || 'elemento').toLowerCase()}
        </button>
      </div>

      {showNew && (
        <form onSubmit={addElemento} style={{ background: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: 10 }}>
          <input autoFocus required placeholder={`Nome ${(preset.elementoLabel || 'elemento').toLowerCase()} (es. Villa Firenze)`} value={newTitle} onChange={e => setNewTitle(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
          <button type="submit" style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>Crea</button>
          <button type="button" onClick={() => { setShowNew(false); setNewTitle('') }} style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 14 }}>Annulla</button>
        </form>
      )}

      {elementi.length === 0 && !showNew ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888' }}>
          <p style={{ margin: 0, fontSize: 13 }}>Nessun elemento. Aggiungi il primo con il pulsante qui sopra.</p>
        </div>
      ) : (
        elementi.map(el => (
          <div key={el.id} style={{ background: '#fff', borderRadius: 10, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{el.titolo || 'Senza nome'}</span>
              {el.stato_pubblico && <span style={{ fontSize: 11, color: '#555', background: '#f0f0f4', padding: '2px 8px', borderRadius: 6 }}>{statoLabel(preset, el.stato_pubblico)}</span>}
              <button onClick={() => toggleStatus(el)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: el.status === 'pubblicata' ? '#d4edda' : '#fff3cd', color: el.status === 'pubblicata' ? '#155724' : '#856404', fontWeight: 600 }}>
                {el.status === 'pubblicata' ? '✓ Pubblicato' : '○ Bozza'}
              </button>
              <button onClick={() => setExpandedId(expandedId === el.id ? null : el.id)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                {expandedId === el.id ? 'Chiudi' : 'Modifica'}
              </button>
              <button onClick={() => deleteElemento(el)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#fce8e8', color: '#c00', cursor: 'pointer' }}>✕</button>
            </div>
            {expandedId === el.id && (
              <ElementoEditor key={el.id} elemento={el} preset={preset} vetrina={vetrina} onSaved={load} />
            )}
          </div>
        ))
      )}
    </div>
  )
}

function statoLabel(preset, value) {
  return (preset.stati || []).find(s => s.value === value)?.label || value
}

// ── Editor di un singolo elemento, guidato dal preset ─────────────────────────
function ElementoEditor({ elemento, preset, vetrina, onSaved }) {
  const [titolo, setTitolo] = useState(elemento.titolo || '')
  const [copertina, setCopertina] = useState(elemento.copertina_url || '')
  const [immagini, setImmagini] = useState(Array.isArray(elemento.immagini) ? elemento.immagini : [])
  const [dati, setDati] = useState(elemento.dati || {})
  const [datiPrivati, setDatiPrivati] = useState(elemento.dati_privati || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const setField = (pub, key, val) => (pub ? setDati : setDatiPrivati)(d => ({ ...d, [key]: val }))

  async function save() {
    setSaving(true); setError(null)
    const cleanPub = cleanDati(dati, preset.campiPubblici)
    const cleanPriv = cleanDati(datiPrivati, preset.campiPrivati)
    const valoreRaw = cleanPub[preset.valorePrimario]
    const patch = {
      titolo,
      copertina_url: copertina,
      immagini,
      dati: cleanPub,
      dati_privati: cleanPriv,
      valore_primario: valoreRaw === undefined || valoreRaw === '' ? null : Number(valoreRaw),
      stato_pubblico: cleanPub[preset.statoPubblico] || '',
    }
    const res = await apiFetch(`/api/vetrina-elementi/${elemento.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setSaved(true); setTimeout(() => setSaved(false), 1800)
    onSaved()
  }

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', padding: 18, background: '#fafafa' }}>
      <FieldWrap label="Nome">
        <input value={titolo} onChange={e => setTitolo(e.target.value)} style={inp} />
      </FieldWrap>

      <FieldWrap label="Immagine di copertina">
        {copertina && <img src={copertina} alt="" style={{ maxHeight: 110, borderRadius: 8, objectFit: 'cover', width: '100%', marginBottom: 6 }} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={copertina} onChange={e => setCopertina(e.target.value)} placeholder="https://..." style={inp} />
          <Uploader vetrina={vetrina} onUrl={setCopertina} />
        </div>
      </FieldWrap>

      <Gallery immagini={immagini} setImmagini={setImmagini} vetrina={vetrina} />

      {/* Campi pubblici */}
      <div style={sectionHead}>Campi pubblici</div>
      {preset.campiPubblici.map(f => (
        <FieldWrap key={f.key} label={f.label}>
          <PresetField field={f} preset={preset} value={dati[f.key]} onChange={v => setField(true, f.key, v)} />
        </FieldWrap>
      ))}

      {/* Campi riservati */}
      <div style={{ ...sectionHead, color: '#8a5a00' }}>🔒 Riservato — mostrato solo dopo la richiesta di contatto</div>
      {preset.campiPrivati.map(f => (
        <FieldWrap key={f.key} label={f.label}>
          <PresetField field={f} preset={preset} value={datiPrivati[f.key]} onChange={v => setField(false, f.key, v)} />
        </FieldWrap>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button onClick={save} disabled={saving} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
        {saved && <span style={{ fontSize: 12, color: '#155724', fontWeight: 600 }}>Salvato ✓</span>}
        {error && <span style={{ fontSize: 12, color: '#c00' }}>{error}</span>}
      </div>
    </div>
  )
}

// Rende un campo in base al tipo definito dal preset.
function PresetField({ field, preset, value, onChange }) {
  const v = value ?? ''
  if (field.type === 'textarea') return <textarea value={v} onChange={e => onChange(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
  if (field.type === 'boolean') return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} /> Sì
    </label>
  )
  if (field.type === 'select') return (
    <select value={v} onChange={e => onChange(e.target.value)} style={{ ...inp, background: '#fff' }}>
      <option value="">—</option>
      {fieldOptions(preset, field).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
  if (field.type === 'date') return <input type="date" value={v} onChange={e => onChange(e.target.value)} style={inp} />
  if (NUMERIC.has(field.type)) return <input type="number" step="any" value={v} onChange={e => onChange(e.target.value)} style={inp} />
  return <input type="text" value={v} onChange={e => onChange(e.target.value)} style={inp} />
}

// Galleria immagini (URL + upload)
function Gallery({ immagini, setImmagini, vetrina }) {
  return (
    <FieldWrap label="Galleria (prima/dopo, foto)">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {immagini.map((url, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={url} alt="" style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 6 }} />
            <button onClick={() => setImmagini(immagini.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#c00', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>✕</button>
          </div>
        ))}
      </div>
      <Uploader vetrina={vetrina} onUrl={url => setImmagini([...immagini, url])} label="+ Aggiungi immagine" />
    </FieldWrap>
  )
}

// Upload verso lo storage minisito dell'entità (stesso endpoint di UploadBtn).
function Uploader({ vetrina, onUrl, label = 'Carica' }) {
  const ref = useRef()
  const [up, setUp] = useState(false)
  async function handle(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUp(true)
    try {
      const token = (await import('@/lib/supabase').then(m => m.supabase.auth.getSession()))?.data?.session?.access_token
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`/api/upload/minisito-image?entity_type=${vetrina.entity_tipo}&entity_id=${vetrina.entity_id}`, {
        method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.url) onUrl(json.url)
    } finally { setUp(false); if (ref.current) ref.current.value = '' }
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle} />
      <button type="button" onClick={() => ref.current?.click()} disabled={up}
        style={{ fontSize: 12, padding: '9px 14px', borderRadius: 7, border: '1px dashed #c8c8d8', background: '#fff', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {up ? 'Caricamento...' : label}
      </button>
    </>
  )
}

function FieldWrap({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e8', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }
const sectionHead = { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#999', margin: '18px 0 10px', borderTop: '1px solid #ececf2', paddingTop: 14 }
const backBtn = { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }
