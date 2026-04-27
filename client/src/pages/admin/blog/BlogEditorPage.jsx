import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch, uploadMedia } from '../../../lib/api'
import RichTextEditor from '../../../components/admin/RichTextEditor'
import { ArrowLeft, Upload, X, Eye, EyeOff } from 'lucide-react'

export default function BlogEditorPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti } = useAzienda()

  const aziendaId = azienda?.id || profile?.azienda_id

  const [form, setForm] = useState({
    title: '', excerpt: '', content: '', cover_url: '', author: '',
    category_id: '', entity_tipo: '', entity_id: '', published: false,
  })
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!aziendaId) return
    apiFetch(`/api/blog/categories?azienda_id=${aziendaId}`).then(setCategories).catch(() => {})
    if (!isNew) {
      apiFetch(`/api/blog/${id}`).then(d => setForm({
        title: d.title || '', excerpt: d.excerpt || '', content: d.content || '',
        cover_url: d.cover_url || '', author: d.author || '',
        category_id: d.category_id || '', entity_tipo: d.entity_tipo || '',
        entity_id: d.entity_id || '', published: !!d.published,
      })).catch(() => navigate('/admin/blog'))
    }
  }, [aziendaId, id])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  async function handleCoverUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadMedia('/api/upload/blog-cover', file)
      set('cover_url', data.url)
    } catch (err) { setError(err.message) }
    finally { setUploading(false) }
  }

  async function handleSave(publish) {
    if (!form.title.trim()) { setError('Il titolo è obbligatorio'); return }
    setSaving(true); setError(''); setSaved(false)
    const published = publish !== undefined ? publish : form.published
    try {
      const body = { ...form, published, azienda_id: aziendaId }
      if (isNew) {
        const created = await apiFetch('/api/blog', { method: 'POST', body: JSON.stringify(body) })
        navigate(`/admin/blog/${created.id}`, { replace: true })
      } else {
        await apiFetch(`/api/blog/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        if (publish !== undefined) setForm(f => ({ ...f, published }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e) { setError(e.message || 'Errore nel salvataggio') }
    finally { setSaving(false) }
  }

  // Entità selezionabili in base a entity_tipo
  const entityOptions = form.entity_tipo === 'struttura'
    ? strutture : form.entity_tipo === 'ristorante' ? ristoranti : []

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/blog')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{isNew ? 'Nuovo articolo' : 'Modifica articolo'}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!form.published && (
            <button onClick={() => handleSave(false)} disabled={saving}
              style={{ padding: '9px 18px', background: '#f0f0f0', color: '#1a1a2e', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Salvataggio…' : 'Salva bozza'}
            </button>
          )}
          <button onClick={() => handleSave(!form.published)} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: form.published ? '#e53e3e' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {form.published ? <EyeOff size={14} /> : <Eye size={14} />}
            {form.published ? 'Togli dalla pubblicazione' : 'Pubblica'}
          </button>
        </div>
      </div>

      {error && <p style={{ background: '#fff0f0', color: '#c00', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</p>}
      {saved && <p style={{ background: '#f0fff4', color: '#155724', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>✓ Salvato</p>}

      <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
        {/* Cover */}
        <div style={card}>
          <label style={lbl}>Immagine di copertina</label>
          {form.cover_url ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={form.cover_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={() => set('cover_url', '')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #ddd', borderRadius: 8, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: 13 }}>
              <Upload size={24} strokeWidth={1.5} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              {uploading ? 'Caricamento…' : 'Clicca per caricare la copertina'}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
        </div>

        {/* Titolo + metadati */}
        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Titolo *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="Titolo dell'articolo" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Estratto (anteprima)</label>
            <textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Breve descrizione mostrata nelle liste" />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={lbl}>Autore</label>
              <input value={form.author} onChange={e => set('author', e.target.value)} style={inp} placeholder="Nome autore" />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={lbl}>Categoria</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={inp}>
                <option value="">— Nessuna —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Associazione entità */}
        <div style={card}>
          <label style={lbl}>Associa a (opzionale)</label>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#aaa' }}>Se vuoi che l'articolo appaia anche nel minisito di una struttura o ristorante specifico.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={lbl}>Tipo</label>
              <select value={form.entity_tipo} onChange={e => { set('entity_tipo', e.target.value); set('entity_id', '') }} style={inp}>
                <option value="">— Aziendale —</option>
                <option value="struttura">Struttura</option>
                <option value="ristorante">Ristorante</option>
              </select>
            </div>
            {entityOptions.length > 0 && (
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={lbl}>{form.entity_tipo === 'struttura' ? 'Struttura' : 'Ristorante'}</label>
                <select value={form.entity_id} onChange={e => set('entity_id', e.target.value)} style={inp}>
                  <option value="">— Seleziona —</option>
                  {entityOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Contenuto */}
        <div style={card}>
          <label style={lbl}>Contenuto</label>
          <RichTextEditor content={form.content} onChange={v => set('content', v)} />
        </div>

        {/* Save footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingBottom: 32 }}>
          <button onClick={() => navigate('/admin/blog')} style={{ padding: '10px 20px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}>
            Annulla
          </button>
          <button onClick={() => handleSave()} disabled={saving} style={{ padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 0 }
const lbl  = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }
const inp  = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', background: '#fff' }
