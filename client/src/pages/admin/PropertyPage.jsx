import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'

const FIELDS = [
  { key: 'name', label: 'Nome struttura', type: 'text' },
  { key: 'description', label: 'Descrizione', type: 'textarea' },
  { key: 'address', label: 'Indirizzo', type: 'text' },
  { key: 'phone', label: 'Telefono', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'wifi_name', label: 'Nome WiFi', type: 'text' },
  { key: 'wifi_password', label: 'Password WiFi', type: 'text' },
  { key: 'checkin_time', label: 'Check-in', type: 'text', placeholder: 'es. 14:00' },
  { key: 'checkout_time', label: 'Check-out', type: 'text', placeholder: 'es. 11:00' },
  { key: 'rules', label: 'Regole della struttura', type: 'textarea' },
]

const MODULE_DEFS = [
  { key: 'info',         label: 'Informazioni struttura',  desc: 'Tab Info nell\'app ospite' },
  { key: 'wifi',         label: 'WiFi',                    desc: 'Tab WiFi con credenziali' },
  { key: 'reception',    label: 'Richieste alla reception', desc: 'Tab Richiesta nell\'app ospite' },
  { key: 'housekeeping', label: 'Housekeeping / Pulizie',  desc: 'Richieste di pulizia camera' },
]

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

export default function PropertyPage() {
  const { profile } = useAuth()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [togglingKey, setTogglingKey] = useState(null)

  useEffect(() => {
    if (profile?.property_id) fetchProperty()
  }, [profile])

  async function fetchProperty() {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('id', profile.property_id)
      .single()
    if (data) setForm(data)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const allowed = FIELDS.map(f => f.key)
    const updates = Object.fromEntries(Object.entries(form).filter(([k]) => allowed.includes(k)))

    try {
      await apiFetch(`/api/properties/${profile.property_id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e.message || 'Errore nel salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  async function handleModuleToggle(key) {
    const currentModules = { ...DEFAULT_MODULES, ...(form.modules || {}) }
    const newModules = { ...currentModules, [key]: !currentModules[key] }

    setForm(f => ({ ...f, modules: newModules }))
    setTogglingKey(key)

    try {
      await apiFetch(`/api/properties/${profile.property_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ modules: newModules }),
      })
    } catch (e) {
      setForm(f => ({ ...f, modules: currentModules }))
      alert(`Errore nel salvataggio del modulo: ${e.message}`)
    } finally {
      setTogglingKey(null)
    }
  }

  const modules = { ...DEFAULT_MODULES, ...(form.modules || {}) }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ marginTop: 0 }}>La mia struttura</h2>

      {/* Form dati struttura */}
      <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 15 }}>Dati struttura</h3>
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }}>{label}</label>
            {type === 'textarea' ? (
              <textarea
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            ) : (
              <input
                type={type}
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}
              />
            )}
          </div>
        ))}
        {saveError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{saveError}</p>}
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '10px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {saving ? 'Salvataggio…' : saved ? 'Salvato!' : 'Salva'}
        </button>
      </form>

      {/* Sezione moduli */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 15 }}>Moduli attivi</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>
          Attiva o disattiva le funzionalità visibili agli ospiti.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {MODULE_DEFS.map(({ key, label, desc }, i) => {
            const isOn = modules[key]
            const isToggling = togglingKey === key
            return (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < MODULE_DEFS.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{desc}</div>
                </div>

                <button
                  onClick={() => !isToggling && handleModuleToggle(key)}
                  disabled={isToggling}
                  aria-label={`${isOn ? 'Disattiva' : 'Attiva'} ${label}`}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', padding: 0,
                    background: isOn ? '#1a1a2e' : '#ddd',
                    position: 'relative', cursor: isToggling ? 'default' : 'pointer',
                    flexShrink: 0, transition: 'background 0.2s',
                    opacity: isToggling ? 0.6 : 1,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2,
                    left: isOn ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    display: 'block',
                  }} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
