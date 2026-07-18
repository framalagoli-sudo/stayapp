'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAttivita } from '../../../hooks/useAttivita'
import { uploadMedia } from '../../../lib/api'
import { ExternalLink } from 'lucide-react'
import CollegamentiSection from '../../../components/admin/CollegamentiSection'

const FIELDS = [
  { key: 'name',        label: 'Nome *', type: 'text' },
  { key: 'tipo',        label: 'Tipo di attività', type: 'text', placeholder: 'es. Spa, Agenzia, Negozio, Palestra…' },
  { key: 'description', label: 'Descrizione', type: 'textarea' },
  { key: 'address',     label: 'Indirizzo', type: 'text' },
  { key: 'phone',       label: 'Telefono', type: 'text' },
  { key: 'email',       label: 'Email', type: 'email' },
  { key: 'schedule',    label: 'Orari di apertura', type: 'text', placeholder: 'es. Lun-Ven 09:00-18:00' },
]
const INFO_KEYS = FIELDS.map(f => f.key)

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function AttivitaInfoPage() {
  const { id } = useParams()
  const { attivita, loading, saving, saved, saveError, save } = useAttivita(id)
  const [form, setForm] = useState({})
  const [uploading, setUploading] = useState({})
  const [slugInput, setSlugInput] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugSaved, setSlugSaved] = useState(false)
  const [slugError, setSlugError] = useState('')

  useEffect(() => { if (attivita) { setForm(attivita); setSlugInput(attivita.slug || '') } }, [attivita])

  async function handleSlugSave() {
    const clean = slugify(slugInput)
    if (!clean || clean === attivita.slug) return
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
      const type = (field === 'logo_url' || field === 'logo_dark_url') ? 'attivita-logo' : 'attivita-cover'
      const qs = field === 'logo_dark_url' ? '&field=logo_dark_url' : ''
      const { url } = await uploadMedia(`/api/upload/${type}?attivita_id=${id}${qs}`, file)
      await save({ [field]: url })
    } catch (e) { alert(`Errore upload: ${e.message}`) }
    finally { setUploading(u => ({ ...u, [field]: false })) }
  }

  async function handleRemove(field) {
    try { await save({ [field]: null }) } catch (e) { alert(e.message) }
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!attivita) return <p style={errorStyle}>Attività non trovata.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Informazioni generali</h2>
        {attivita.slug && (
          <a
            href={`/a/${attivita.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6b46c1', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: '#6b46c110', borderRadius: 8 }}
          >
            <ExternalLink size={13} strokeWidth={2} />
            Anteprima
          </a>
        )}
      </div>
      <p style={descStyle}>Dati di base dell'attività visibili ai clienti.</p>

      {/* Logo & Cover */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Logo e copertina</h3>

        <div style={{ marginBottom: 24 }}>
          <label style={lblStyle}>Logo</label>
          {attivita.logo_url && (
            <div style={{ marginBottom: 10, padding: 12, background: '#f5f5f5', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <img key={attivita.logo_url} src={attivita.logo_url} alt="logo"
                style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain' }} />
              <button type="button" onClick={() => handleRemove('logo_url')} style={removeBtnStyle}>Rimuovi</button>
            </div>
          )}
          <label style={uploadLabelStyle}>
            {uploading.logo_url ? 'Upload…' : attivita.logo_url ? 'Cambia logo' : 'Carica logo'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleUpload('logo_url', e.target.files[0])} />
          </label>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lblStyle}>Logo per sfondi scuri (negativo)</label>
          {attivita.logo_dark_url && (
            <div style={{ marginBottom: 10, padding: 12, background: '#1a1a2e', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <img key={attivita.logo_dark_url} src={attivita.logo_dark_url} alt="logo negativo"
                style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain' }} />
              <button type="button" onClick={() => handleRemove('logo_dark_url')} style={{ ...removeBtnStyle, color: '#ff8080' }}>Rimuovi</button>
            </div>
          )}
          <label style={uploadLabelStyle}>
            {uploading.logo_dark_url ? 'Upload…' : attivita.logo_dark_url ? 'Cambia logo' : 'Carica logo negativo'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleUpload('logo_dark_url', e.target.files[0])} />
          </label>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#aaa' }}>Versione chiara del logo, usata su footer e header scuri. Se vuota, si usa il logo normale.</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lblStyle}>Logo nell'app ospite</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro (negativo)']].map(([v, label]) => {
              const active = (attivita.minisito?.app_logo || 'auto') === v
              return (
                <button key={v} type="button"
                  onClick={() => save({ minisito: { ...(attivita.minisito || {}), app_logo: v } }).catch(() => {})}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${active ? '#1a1a2e' : '#ddd'}`, background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#555', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer' }}>
                  {label}
                </button>
              )
            })}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#aaa' }}>L'header dell'app ha sfondo scuro: "Automatico" usa il logo negativo se caricato. Scegli "Chiaro" o "Scuro" per forzare.</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lblStyle}>Dimensione logo (header)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['small', 'Piccolo'], ['medium', 'Medio'], ['large', 'Grande']].map(([v, label]) => {
              const active = (attivita.minisito?.logo_size || 'medium') === v
              return (
                <button key={v} type="button"
                  onClick={() => save({ minisito: { ...(attivita.minisito || {}), logo_size: v } }).catch(() => {})}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${active ? '#1a1a2e' : '#ddd'}`, background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#555', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer' }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label style={lblStyle}>Foto di copertina</label>
          {attivita.cover_url && (
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <img key={attivita.cover_url} src={attivita.cover_url} alt="cover"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid #ddd' }} />
              <button type="button" onClick={() => handleRemove('cover_url')}
                style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 10px' }}>
                Rimuovi
              </button>
            </div>
          )}
          <label style={uploadLabelStyle}>
            {uploading.cover_url ? 'Upload…' : attivita.cover_url ? 'Cambia foto' : 'Carica copertina'}
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

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={!!form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              style={{ width: 16, height: 16 }} />
            Attività attiva (visibile ai clienti via QR code)
          </label>
        </div>

        {saveError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{saveError}</p>}
        <button type="submit" disabled={saving} style={saveBtn}>
          {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva'}
        </button>
      </form>

      {attivita.azienda_id && (
        <CollegamentiSection
          entitaId={attivita.id}
          entitaTipo="attivita"
          aziendaId={attivita.azienda_id}
        />
      )}

      <PwaToggleSection attivita={attivita} save={save} />

      {/* Slug */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 16, fontWeight: 700 }}>URL pubblica</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
          Indirizzo web della pagina per i clienti. Se lo modifichi, aggiorna il QR code.
        </p>
        <label style={lblStyle}>Slug (solo lettere, numeri e trattini)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#aaa', flexShrink: 0 }}>{window.location.origin}/a/</span>
          <input
            value={slugInput}
            onChange={e => { setSlugInput(slugify(e.target.value) || e.target.value.toLowerCase()); setSlugSaved(false); setSlugError('') }}
            style={{ ...inputStyle, flex: 1, minWidth: 160 }}
          />
          <button
            type="button"
            onClick={handleSlugSave}
            disabled={slugSaving || !slugInput || slugInput === attivita.slug}
            style={{ ...saveBtn, opacity: (!slugInput || slugInput === attivita.slug) ? 0.5 : 1 }}
          >
            {slugSaving ? 'Salvataggio…' : slugSaved ? '✓ Salvato' : 'Salva URL'}
          </button>
        </div>
        {slugError && <p style={{ color: '#c00', fontSize: 13, margin: 0 }}>{slugError}</p>}
      </div>
    </div>
  )
}

const titleStyle       = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle        = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle        = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }
const sectionTitle     = { marginTop: 0, marginBottom: 16, fontSize: 15 }
const lblStyle         = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle       = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const saveBtn          = { padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const uploadLabelStyle = { padding: '8px 16px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333', display: 'inline-block' }
const removeBtnStyle   = { fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }
const loadingStyle     = { padding: 32, color: '#888' }
const errorStyle       = { padding: 32, color: '#e53e3e' }

const PWA_MODULES = [
  { key: 'servizi',  label: 'Tab Servizi',  desc: 'Lista dei servizi offerti con prezzi' },
  { key: 'galleria', label: 'Tab Galleria', desc: 'Griglia fotografica cliccabile' },
  { key: 'contatta', label: 'Tab Contatta', desc: 'Form messaggio + bottoni Tel/WhatsApp/Email' },
]

function PwaToggleSection({ attivita, save }) {
  const pwa = attivita.pwa || { active: false, modules: { servizi: true, galleria: true, contatta: true } }
  const [saving, setSaving] = useState(null)  // null | 'pwa' | 'mini' | 'module'
  const [saved, setSaved] = useState(false)

  async function toggle(path, value) {
    const key = path === 'active' ? 'pwa' : 'module'
    setSaving(key); setSaved(false)
    try {
      const updated = path === 'active'
        ? { ...pwa, active: value }
        : { ...pwa, modules: { ...pwa.modules, [path]: value } }
      await save({ pwa: updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }

  async function toggleMinisito(value) {
    setSaving('mini'); setSaved(false)
    try {
      const mini = { ...(attivita.minisito || {}), active: value }
      await save({ minisito: mini })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }

  const miniOn = attivita.minisito?.active !== false

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Canali di distribuzione</h3>
        {saved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Salvato</span>}
      </div>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>Scegli quali esperienze attivare per i clienti.</p>

      {/* Toggle Sito Web */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', margin: '16px 0 0', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <div onClick={() => saving ? null : toggleMinisito(!miniOn)} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', background: miniOn ? '#059669' : '#d1d5db', transition: 'background 0.2s', flexShrink: 0, opacity: saving === 'mini' ? 0.6 : 1 }}>
          <div style={{ position: 'absolute', top: 3, left: miniOn ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Sito Web Pubblico</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Landing page marketing con URL pubblica</div>
        </div>
      </label>

      <p style={{ margin: '20px 0 4px', fontSize: 13, color: '#888', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        Attiva l'app installabile per i tuoi clienti.
      </p>

      {/* Toggle globale PWA */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 20 }}>
        <div
          onClick={() => toggle('active', !pwa.active)}
          style={{
            width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
            background: pwa.active ? '#059669' : '#ddd', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: pwa.active ? 22 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {pwa.active ? 'PWA attiva' : 'PWA disattivata'}
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {pwa.active ? 'I clienti vedono l\'app ospite' : 'I clienti vedono il sito'}
          </div>
        </div>
      </label>

      {/* Toggle moduli (visibili solo se PWA attiva) */}
      {pwa.active && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#555' }}>Sezioni visibili nell'app</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PWA_MODULES.map(({ key, label, desc }) => {
              const active = pwa.modules?.[key] !== false
              return (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div
                    onClick={() => toggle(key, !active)}
                    style={{
                      width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                      background: active ? '#1a1a2e' : '#ddd', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: active ? 17 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{desc}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
