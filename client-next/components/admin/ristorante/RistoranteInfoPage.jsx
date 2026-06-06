'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRistorante } from '../../../hooks/useRistorante'
import { uploadMedia, apiFetch } from '../../../lib/api'
import CollegamentiSection from '../../../components/admin/CollegamentiSection'
import { ExternalLink } from 'lucide-react'

const FIELDS = [
  { key: 'name',        label: 'Nome ristorante *', type: 'text' },
  { key: 'description', label: 'Descrizione',        type: 'textarea' },
  { key: 'address',     label: 'Indirizzo',          type: 'text' },
  { key: 'phone',       label: 'Telefono',           type: 'text' },
  { key: 'email',       label: 'Email',              type: 'email' },
  { key: 'schedule',    label: 'Orari di apertura',  type: 'text', placeholder: 'es. Lun-Ven 12:00-14:30 / 19:00-22:30' },
]
const INFO_KEYS = FIELDS.map(f => f.key)

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function RistoranteInfoPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, saveError, save } = useRistorante(id)
  const [form, setForm] = useState({})
  const [uploading, setUploading] = useState({})
  const [slugInput, setSlugInput] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugSaved, setSlugSaved] = useState(false)
  const [slugError, setSlugError] = useState('')

  useEffect(() => { if (ristorante) { setForm(ristorante); setSlugInput(ristorante.slug || '') } }, [ristorante])

  async function handleSlugSave() {
    const clean = slugify(slugInput)
    if (!clean || clean === ristorante.slug) return
    setSlugSaving(true); setSlugError(''); setSlugSaved(false)
    try {
      await save({ slug: clean })
      setSlugInput(clean)
      setSlugSaved(true)
      setTimeout(() => setSlugSaved(false), 2500)
    } catch (e) {
      setSlugError(e.message || 'Errore nel salvataggio')
    } finally { setSlugSaving(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const updates = Object.fromEntries(Object.entries(form).filter(([k]) => [...INFO_KEYS, 'active'].includes(k)))
    try { await save(updates) } catch {}
  }

  async function handleUpload(field, file) {
    if (!file) return
    setUploading(u => ({ ...u, [field]: true }))
    try {
      const type = field === 'logo_url' ? 'restaurant-logo' : 'restaurant-cover'
      const { url } = await uploadMedia(`/api/upload/${type}?ristorante_id=${id}`, file)
      await save({ [field]: url })
    } catch (e) { alert(`Errore upload: ${e.message}`) }
    finally { setUploading(u => ({ ...u, [field]: false })) }
  }

  async function handleRemove(field) {
    try { await save({ [field]: null }) } catch (e) { alert(e.message) }
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Informazioni generali</h2>
        {ristorante.slug && (
          <a
            href={`/r/${ristorante.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#e63946', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: '#e6394610', borderRadius: 8 }}
          >
            <ExternalLink size={13} strokeWidth={2} />
            Anteprima PWA
          </a>
        )}
      </div>
      <p style={descStyle}>Dati di base del ristorante visibili ai clienti nell'app.</p>

      {/* Logo & Cover */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Logo e copertina</h3>

        <div style={{ marginBottom: 24 }}>
          <label style={lblStyle}>Logo</label>
          {ristorante.logo_url && (
            <div style={{ marginBottom: 10, padding: 12, background: '#f5f5f5', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <img key={ristorante.logo_url} src={ristorante.logo_url} alt="logo"
                style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain' }} />
              <button type="button" onClick={() => handleRemove('logo_url')} style={removeBtnStyle}>Rimuovi</button>
            </div>
          )}
          <label style={uploadLabelStyle}>
            {uploading.logo_url ? 'Upload…' : ristorante.logo_url ? 'Cambia logo' : 'Carica logo'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleUpload('logo_url', e.target.files[0])} />
          </label>
        </div>

        <div>
          <label style={lblStyle}>Foto di copertina</label>
          {ristorante.cover_url && (
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <img key={ristorante.cover_url} src={ristorante.cover_url} alt="cover"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid #ddd' }} />
              <button type="button" onClick={() => handleRemove('cover_url')}
                style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 10px' }}>
                Rimuovi
              </button>
            </div>
          )}
          <label style={uploadLabelStyle}>
            {uploading.cover_url ? 'Upload…' : ristorante.cover_url ? 'Cambia foto' : 'Carica copertina'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleUpload('cover_url', e.target.files[0])} />
          </label>
        </div>
      </div>

      {/* Info form */}
      <form onSubmit={handleSubmit} style={cardStyle}>
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <label style={lblStyle}>{label}</label>
            {type === 'textarea' ? (
              <textarea value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            ) : (
              <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} style={inputStyle} />
            )}
          </div>
        ))}

        {/* Stato attivo */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={!!form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              style={{ width: 16, height: 16 }} />
            Ristorante attivo (visibile ai clienti via QR code)
          </label>
        </div>

        {saveError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{saveError}</p>}
        <button type="submit" disabled={saving} style={saveBtn}>
          {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva'}
        </button>

        {ristorante.azienda_id && (
          <CollegamentiSection
            entitaId={ristorante.id}
            entitaTipo="ristorante"
            aziendaId={ristorante.azienda_id}
          />
        )}
      </form>

      {/* Slug / URL pubblica */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 16, fontWeight: 700 }}>URL pubblica</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
          Indirizzo web della PWA per i clienti. Se lo modifichi, aggiorna il QR code.
        </p>
        <label style={lblStyle}>Slug (solo lettere, numeri e trattini)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#aaa', flexShrink: 0 }}>{window.location.origin}/r/</span>
          <input
            value={slugInput}
            onChange={e => { setSlugInput(slugify(e.target.value) || e.target.value.toLowerCase()); setSlugSaved(false); setSlugError('') }}
            style={{ ...inputStyle, flex: 1, minWidth: 160 }}
          />
          <button
            type="button"
            onClick={handleSlugSave}
            disabled={slugSaving || !slugInput || slugInput === ristorante.slug}
            style={{ ...saveBtn, opacity: (!slugInput || slugInput === ristorante.slug) ? 0.5 : 1 }}
          >
            {slugSaving ? 'Salvataggio…' : slugSaved ? '✓ Salvato' : 'Salva URL'}
          </button>
        </div>
        {slugError && <p style={{ color: '#c00', fontSize: 13, margin: 0 }}>{slugError}</p>}
      </div>

      <CanaliSection entity={ristorante} entityKey="modules" save={save} />
    </div>
  )
}

function CanaliSection({ entity, save }) {
  const [saving, setSaving] = useState(null)

  async function togglePwa(value) {
    setSaving('pwa')
    const mods = { ...(entity.modules || {}), pwa_active: value }
    try { await save({ modules: mods }) } catch {}
    setSaving(null)
  }

  async function toggleMinisito(value) {
    setSaving('mini')
    const mini = { ...(entity.minisito || {}), active: value }
    try { await save({ minisito: mini }) } catch {}
    setSaving(null)
  }

  const pwaOn  = entity.modules?.pwa_active !== false
  const miniOn = !!entity.minisito?.active

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: 0 }}>
      <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 16, fontWeight: 700 }}>Canali di distribuzione</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Scegli quali esperienze attivare per i clienti.</p>
      {[
        { key: 'pwa',  label: 'App Ospiti (PWA)',  desc: 'App installabile accessibile via QR code', on: pwaOn, toggle: togglePwa },
        { key: 'mini', label: 'Sito Web Pubblico', desc: 'Landing page marketing con URL pubblica',  on: miniOn, toggle: toggleMinisito },
      ].map(({ key, label, desc, on, toggle }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid #f0f0f0' }}>
          <div
            onClick={() => saving ? null : toggle(!on)}
            style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', flexShrink: 0,
              background: on ? '#059669' : '#d1d5db', transition: 'background 0.2s', opacity: saving === key ? 0.6 : 1 }}
          >
            <div style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{desc}</div>
          </div>
          {saving === key && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>Salvataggio…</span>}
        </div>
      ))}
    </div>
  )
}

const titleStyle      = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle       = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle       = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }
const sectionTitle    = { marginTop: 0, marginBottom: 16, fontSize: 15 }
const lblStyle        = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle      = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const saveBtn         = { padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const uploadLabelStyle = { padding: '8px 16px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333', display: 'inline-block' }
const removeBtnStyle  = { fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }
const loadingStyle    = { padding: 32, color: '#888' }
const errorStyle      = { padding: 32, color: '#e53e3e' }
