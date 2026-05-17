import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch, uploadMedia } from '../../../lib/api'
import { ArrowLeft, Save, Trash2, Plus, X, Upload, AlertCircle, ShoppingBag } from 'lucide-react'
import AiButton from '../../../components/admin/AiButton'
import { useAzienda } from '../../../context/AziendaContext'

export default function ProdottoEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { azienda } = useAzienda()
  const isNew = id === 'nuovo'
  const fileRef = useRef()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const [nome, setNome]           = useState('')
  const [descrizione, setDesc]    = useState('')
  const [prezzo, setPrezzo]       = useState('')
  const [prezzoScontato, setPrezzoScontato] = useState('')
  const [stock, setStock]         = useState('')
  const [categoria, setCat]       = useState('')
  const [attivo, setAttivo]       = useState(true)
  const [immagini, setImmagini]   = useState([])

  useEffect(() => {
    if (isNew) return
    apiFetch(`/api/shop/prodotti/${id}`)
      .then(p => {
        setNome(p.nome || ''); setDesc(p.descrizione || '')
        setPrezzo(p.prezzo ?? ''); setPrezzoScontato(p.prezzo_scontato ?? '')
        setStock(p.stock ?? ''); setCat(p.categoria || '')
        setAttivo(p.attivo !== false); setImmagini(p.immagini || [])
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id, isNew])

  async function save() {
    if (!nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError('')
    const body = {
      nome, descrizione, prezzo: parseFloat(prezzo) || 0,
      prezzo_scontato: prezzoScontato !== '' ? parseFloat(prezzoScontato) : null,
      stock: stock !== '' ? parseInt(stock) : null,
      categoria, attivo, immagini,
    }
    try {
      if (isNew) {
        const created = await apiFetch('/api/shop/prodotti', { method: 'POST', body: JSON.stringify(body) })
        navigate(`/admin/shop/${created.id}`, { replace: true })
      } else {
        await apiFetch(`/api/shop/prodotti/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      }
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Eliminare questo prodotto?')) return
    try {
      await apiFetch(`/api/shop/prodotti/${id}`, { method: 'DELETE' })
      navigate('/admin/shop')
    } catch (e) { setError(e.message) }
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadMedia('/api/upload/minisito-image?entity_type=prodotto&entity_id=shop', file)
      setImmagini(prev => [...prev, data.url])
    } catch (err) { setError(err.message) }
    setUploading(false)
    e.target.value = ''
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  const pct = prezzoScontato && prezzo && parseFloat(prezzo) > parseFloat(prezzoScontato)
    ? Math.round((1 - parseFloat(prezzoScontato) / parseFloat(prezzo)) * 100) : null

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/shop')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <ShoppingBag size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          {isNew ? 'Nuovo prodotto' : (nome || 'Modifica prodotto')}
        </h1>
        {!isNew && (
          <button onClick={handleDelete} style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#c53030' }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 16 }}>
        {/* Nome */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Nome prodotto *</label>
          <input value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Es. Marmellata artigianale, Corso online, Pack benvenuto…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        {/* Descrizione */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#888' }}>Descrizione</label>
            <AiButton
              tipo="minisito_about"
              nomeBusiness={azienda?.ragione_sociale || ''}
              contesto={nome ? `Prodotto: "${nome}"` : ''}
              temaSuggerito={nome || ''}
              label="✨ Genera"
              showTono={false}
              placeholder="Es: marmellata fatta a mano, senza conservanti, con frutta di stagione…"
              onInsert={t => setDesc(t)}
            />
          </div>
          <textarea value={descrizione} onChange={e => setDesc(e.target.value)} rows={4}
            placeholder="Descrivi il prodotto: caratteristiche, materiali, cosa include…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Prezzi + stock + categoria */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Prezzo (€) *</label>
            <input type="number" min="0" step="0.01" value={prezzo} onChange={e => setPrezzo(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>
              Prezzo scontato (€){pct ? <span style={{ color: '#c53030', fontWeight: 700, marginLeft: 6 }}>−{pct}%</span> : ''}
            </label>
            <input type="number" min="0" step="0.01" value={prezzoScontato} onChange={e => setPrezzoScontato(e.target.value)}
              placeholder="— nessuno —"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Stock (vuoto = illimitato)</label>
            <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
              placeholder="∞"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Categoria</label>
            <input value={categoria} onChange={e => setCat(e.target.value)}
              placeholder="Es. Alimentari, Abbigliamento…"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Attivo */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
          <input type="checkbox" checked={attivo} onChange={e => setAttivo(e.target.checked)} />
          Prodotto visibile nello shop pubblico
        </label>

        {/* Immagini */}
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Immagini prodotto</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {immagini.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 96, height: 96 }}>
                <img src={url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                <button onClick={() => setImmagini(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#c53030', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            ))}
            <div onClick={() => fileRef.current?.click()}
              style={{ width: 96, height: 96, border: '2px dashed #ddd', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa', fontSize: 11, gap: 4 }}>
              {uploading ? '…' : <><Upload size={18} strokeWidth={1.5} /><span>Aggiungi</span></>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          </div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>Oppure incolla un URL:</div>
          <input placeholder="https://…" onBlur={e => { if (e.target.value.trim()) { setImmagini(prev => [...prev, e.target.value.trim()]); e.target.value = '' } }}
            style={{ marginTop: 4, width: '100%', border: '1px solid #eee', borderRadius: 6, padding: '6px 10px', fontSize: 12, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
