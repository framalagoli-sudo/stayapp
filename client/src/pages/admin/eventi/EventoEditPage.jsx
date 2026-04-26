import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch, uploadMedia } from '../../../lib/api'
import { Trash2, Plus, X, Upload } from 'lucide-react'

const INCLUDES_OPTIONS = [
  { key: 'cena',       label: 'Cena' },
  { key: 'pranzo',     label: 'Pranzo' },
  { key: 'colazione',  label: 'Colazione' },
  { key: 'drink',      label: 'Drink di benvenuto' },
  { key: 'notte',      label: 'Pernottamento' },
  { key: 'trasporto',  label: 'Trasporto' },
  { key: 'ingresso',   label: 'Ingresso incluso' },
]

const BLANK_PKG = { id: '', name: '', description: '', price: '', includes: [] }

function toInputDate(iso) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

export default function EventoEditPage() {
  const { id } = useParams()   // 'new' = creation
  const navigate = useNavigate()
  const { strutture, ristoranti } = useAzienda()
  const isNew = id === 'new'

  const [form, setForm] = useState({
    title: '', description: '', date_start: '', date_end: '', location: '',
    price: '', seats_total: '', active: true, published: false,
    entity_tipo: '', entity_id: '', packages: [],
  })
  const [cover, setCover] = useState(null)       // URL attuale
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isNew) {
      apiFetch(`/api/eventi/${id}`).then(ev => {
        setCover(ev.cover_url || null)
        setForm({
          title:       ev.title || '',
          description: ev.description || '',
          date_start:  toInputDate(ev.date_start),
          date_end:    toInputDate(ev.date_end),
          location:    ev.location || '',
          price:       ev.price ?? '',
          seats_total: ev.seats_total ?? '',
          active:      ev.active ?? true,
          published:   ev.published ?? false,
          entity_tipo: ev.entity_tipo || '',
          entity_id:   ev.entity_id   || '',
          packages:    (ev.packages || []).map(p => ({
            ...p, price: p.price ?? '', includes: p.includes || [],
          })),
        })
      }).catch(() => setError('Evento non trovato'))
    }
  }, [id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function addPackage() {
    setForm(f => ({ ...f, packages: [...f.packages, { ...BLANK_PKG, id: crypto.randomUUID() }] }))
  }

  function updatePkg(pkgId, patch) {
    setForm(f => ({ ...f, packages: f.packages.map(p => p.id === pkgId ? { ...p, ...patch } : p) }))
  }

  function removePkg(pkgId) {
    setForm(f => ({ ...f, packages: f.packages.filter(p => p.id !== pkgId) }))
  }

  function toggleInclude(pkgId, key) {
    const pkg = form.packages.find(p => p.id === pkgId)
    const includes = pkg.includes.includes(key)
      ? pkg.includes.filter(k => k !== key)
      : [...pkg.includes, key]
    updatePkg(pkgId, { includes })
  }

  async function handleCoverUpload(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Max 5 MB'); return }
    if (isNew) { alert('Salva prima l\'evento, poi carica la copertina.'); return }
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/event-cover?evento_id=${id}`, file)
      setCover(url)
    } catch (e) { alert(e.message) }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        price:       form.price       === '' ? 0    : parseFloat(form.price),
        seats_total: form.seats_total === '' ? null : parseInt(form.seats_total),
        date_start:  form.date_start ? new Date(form.date_start).toISOString() : null,
        date_end:    form.date_end   ? new Date(form.date_end).toISOString()   : null,
        entity_tipo: form.entity_tipo || null,
        entity_id:   form.entity_id   || null,
        packages: form.packages.map(p => ({
          ...p,
          price: p.price === '' ? 0 : parseFloat(p.price),
        })),
      }

      if (isNew) {
        const created = await apiFetch('/api/eventi', { method: 'POST', body: JSON.stringify(payload) })
        navigate(`/admin/eventi/${created.id}`, { replace: true })
      } else {
        await apiFetch(`/api/eventi/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Eliminare questo evento e tutte le prenotazioni?')) return
    await apiFetch(`/api/eventi/${id}`, { method: 'DELETE' })
    navigate('/admin/eventi')
  }

  const entityOptions = [
    ...strutture.map(s => ({ tipo: 'struttura', id: s.id, name: `Struttura: ${s.name}` })),
    ...ristoranti.map(r => ({ tipo: 'ristorante', id: r.id, name: `Ristorante: ${r.name}` })),
  ]

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>{isNew ? 'Nuovo evento' : 'Modifica evento'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
            {isNew ? 'Compila i dati e salva per ottenere l\'ID e caricare la copertina.' : 'Le modifiche vengono salvate al click su Salva.'}
          </p>
        </div>
        <button onClick={() => navigate('/admin/eventi')}
          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#555' }}>
          ← Lista
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Cover */}
        {!isNew && (
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Copertina</h3>
            <label style={{ cursor: 'pointer', display: 'block' }}>
              {cover
                ? <img src={cover} alt="cover" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
                : <div style={{ height: 120, borderRadius: 10, border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#aaa', marginBottom: 10 }}>
                    <Upload size={18} strokeWidth={1.5} /> {uploading ? 'Caricamento…' : 'Clicca per caricare l\'immagine'}
                  </div>
              }
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleCoverUpload(e.target.files[0])} />
            </label>
            {cover && (
              <button type="button" onClick={() => handleCoverUpload(null)}
                style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Rimuovi copertina
              </button>
            )}
          </div>
        )}

        {/* Dati principali */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Informazioni</h3>

          <div style={fieldWrap}>
            <label style={lbl}>Titolo *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required style={inp} placeholder="es. Cena di San Valentino" />
          </div>

          <div style={fieldWrap}>
            <label style={lbl}>Descrizione</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="Descrivi l'evento, cosa è incluso, programma…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={lbl}>Data e ora inizio *</label>
              <input type="datetime-local" value={form.date_start} onChange={e => set('date_start', e.target.value)} required style={inp} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Data e ora fine</label>
              <input type="datetime-local" value={form.date_end} onChange={e => set('date_end', e.target.value)} style={inp} />
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={lbl}>Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} style={inp} placeholder="es. Sala principale, Terrazza, Giardino" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldWrap}>
              <label style={lbl}>Prezzo base (€)</label>
              <input type="number" min="0" step="0.5" value={form.price} onChange={e => set('price', e.target.value)} style={inp} placeholder="0 = gratuito" />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Posti disponibili</label>
              <input type="number" min="1" value={form.seats_total} onChange={e => set('seats_total', e.target.value)} style={inp} placeholder="Vuoto = illimitati" />
            </div>
          </div>

          {entityOptions.length > 0 && (
            <div style={fieldWrap}>
              <label style={lbl}>Associa a struttura / ristorante</label>
              <select
                value={form.entity_id}
                onChange={e => {
                  const opt = entityOptions.find(o => o.id === e.target.value)
                  set('entity_id',   opt?.id   || '')
                  set('entity_tipo', opt?.tipo  || '')
                }}
                style={{ ...inp, cursor: 'pointer' }}
              >
                <option value="">— Nessuna associazione (evento aziendale) —</option>
                {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <span style={{ fontSize: 11, color: '#aaa', marginTop: 4, display: 'block' }}>
                L'evento apparirà nel minisito e nell'app della struttura/ristorante selezionata.
              </span>
            </div>
          )}
        </div>

        {/* Stato */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Stato</h3>
          <div style={{ display: 'flex', gap: 32 }}>
            <Toggle label="Attivo" hint="L'evento è visibile nell'admin" value={form.active} onChange={v => set('active', v)} />
            <Toggle label="Pubblicato" hint="Visibile sul sito e nell'app ospiti" value={form.published} onChange={v => set('published', v)} />
          </div>
        </div>

        {/* Pacchetti */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Pacchetti</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginTop: -8 }}>
            Aggiungi varianti con prezzi diversi (es. solo ingresso, cena inclusa, pacchetto weekend).
            Se non aggiungi pacchetti, verrà usato il prezzo base.
          </p>
          {form.packages.map(pkg => (
            <div key={pkg.id} style={{ background: '#f9f9fb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                <input value={pkg.name} onChange={e => updatePkg(pkg.id, { name: e.target.value })}
                  placeholder="Nome pacchetto *" style={inp} />
                <input type="number" min="0" step="0.5" value={pkg.price} onChange={e => updatePkg(pkg.id, { price: e.target.value })}
                  placeholder="€" style={inp} />
                <button type="button" onClick={() => removePkg(pkg.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4 }}>
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
              <input value={pkg.description} onChange={e => updatePkg(pkg.id, { description: e.target.value })}
                placeholder="Descrizione (opzionale)" style={{ ...inp, marginBottom: 10 }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INCLUDES_OPTIONS.map(({ key, label }) => {
                  const active = pkg.includes.includes(key)
                  return (
                    <button key={key} type="button" onClick={() => toggleInclude(pkg.id, key)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 16, border: `1px solid ${active ? '#1a1a2e' : '#ddd'}`, background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#555', cursor: 'pointer' }}>
                      {active ? '✓ ' : '+ '}{label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <button type="button" onClick={addPackage}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={2.5} /> Aggiungi pacchetto
          </button>
        </div>

        {error && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving}
            style={{ padding: '11px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Salvataggio…' : isNew ? 'Crea evento' : 'Salva modifiche'}
          </button>
          {!isNew && (
            <button type="button" onClick={handleDelete}
              style={{ padding: '11px 18px', background: 'none', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Elimina
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? '#1a1a2e' : '#ddd', position: 'relative', flexShrink: 0, transition: 'background 0.2s',
      }}>
        <span style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#888' }}>{hint}</div>
      </div>
    </div>
  )
}

const cardStyle    = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }
const sectionTitle = { margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#444' }
const fieldWrap    = { marginBottom: 16 }
const lbl          = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inp          = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
