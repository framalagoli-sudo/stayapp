'use client'
import { useState } from 'react'
import { useNavigate } from 'next/navigation'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch, uploadMedia } from '@/lib/api'
import { Building, UtensilsCrossed, Zap, Check } from 'lucide-react'

const TIPI = [
  { tipo: 'struttura',  label: 'Hotel / B&B / Studio',         icon: Building,        desc: 'Struttura ricettiva, studio professionale, sede fisica' },
  { tipo: 'ristorante', label: 'Ristorante / Bar / Café',       icon: UtensilsCrossed, desc: 'Locale con menu, prenotazioni tavoli, asporto' },
  { tipo: 'attivita',   label: 'Attività / Servizio / Esperienza', icon: Zap,          desc: 'Tour, corsi, consulenze, qualsiasi servizio su prenotazione' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { azienda, refresh } = useAzienda()
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState('struttura')
  const [nome, setNome] = useState('')
  const [entityId, setEntityId] = useState(null)
  const [entityTipo, setEntityTipo] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function createEntity() {
    if (!nome.trim()) { setError('Inserisci un nome.'); return }
    setSaving(true); setError('')
    try {
      const endpoint = tipo === 'struttura' ? '/api/properties' : tipo === 'ristorante' ? '/api/ristoranti' : '/api/attivita'
      const entity = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name: nome.trim(), azienda_id: azienda?.id }),
      })
      if (azienda?.id) {
        await apiFetch(`/api/aziende/${azienda.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ moduli: { ...azienda.moduli, [tipo]: true } }),
        })
      }
      setEntityId(entity.id)
      setEntityTipo(tipo)
      await refresh()
      setStep(2)
    } catch (e) { setError(e.message || 'Errore creazione') }
    setSaving(false)
  }

  async function uploadLogo() {
    if (!logoFile || !entityId) { setStep(3); return }
    setSaving(true); setError('')
    try {
      const ep = entityTipo === 'struttura'
        ? `/api/upload/logo?property_id=${entityId}`
        : entityTipo === 'ristorante'
          ? `/api/upload/ristorante-logo?ristorante_id=${entityId}`
          : `/api/upload/attivita-logo?attivita_id=${entityId}`
      await uploadMedia(ep, logoFile)
    } catch (e) { setError(e.message || 'Errore upload logo') }
    setSaving(false)
    setStep(3)
  }

  function StepDot({ n }) {
    const done = n < step
    const active = n === step
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: done || active ? '#1a1a2e' : '#e0e0e0',
        color: done || active ? '#fff' : '#aaa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {done ? <Check size={14} strokeWidth={2.5} /> : n}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '48px 44px', width: '100%', maxWidth: 520, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          {[1, 2, 3].map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
              <StepDot n={n} />
              {i < 2 && <div style={{ flex: 1, height: 2, background: n < step ? '#1a1a2e' : '#e0e0e0', margin: '0 6px' }} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Tipo + nome ── */}
        {step === 1 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Che tipo di attività gestisci?</h2>
            <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Puoi aggiungerne altri in seguito dal pannello.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {TIPI.map(({ tipo: t, label, icon: Icon, desc }) => (
                <button key={t} onClick={() => setTipo(t)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  border: `2px solid ${tipo === t ? '#1a1a2e' : '#e8e8e8'}`,
                  borderRadius: 10, background: tipo === t ? '#f8f8f8' : '#fff',
                  cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: tipo === t ? '#1a1a2e' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} strokeWidth={1.5} color={tipo === t ? '#fff' : '#666'} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <input
              value={nome} onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createEntity()}
              placeholder="Nome della tua attività"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit', outline: 'none' }}
            />

            {error && <div style={{ background: '#fff5f5', color: '#c53030', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>{error}</div>}

            <button onClick={createEntity} disabled={saving || !nome.trim()} style={{
              width: '100%', padding: '13px', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: (saving || !nome.trim()) ? 'default' : 'pointer', opacity: (saving || !nome.trim()) ? 0.6 : 1,
            }}>
              {saving ? 'Creazione in corso…' : 'Continua →'}
            </button>
          </>
        )}

        {/* ── Step 2: Logo ── */}
        {step === 2 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Carica il tuo logo</h2>
            <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Opzionale — puoi farlo in qualsiasi momento dal pannello.</p>

            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed #ddd', borderRadius: 12, padding: '40px 24px', marginBottom: 24,
              cursor: 'pointer', background: logoFile ? '#f8f8f8' : '#fafafa',
            }}>
              {logoFile ? (
                <>
                  <img src={URL.createObjectURL(logoFile)} alt="preview" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: '#555' }}>{logoFile.name}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🖼️</div>
                  <div style={{ fontSize: 14, color: '#888' }}>Clicca per selezionare un'immagine</div>
                  <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>PNG, JPG, SVG — max 5 MB</div>
                </>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setLogoFile(e.target.files[0] || null)} />
            </label>

            {error && <div style={{ background: '#fff5f5', color: '#c53030', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Salta
              </button>
              <button onClick={uploadLogo} disabled={saving} style={{
                flex: 2, padding: '12px', background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Caricamento…' : logoFile ? 'Carica e continua →' : 'Continua →'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Completato ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: '#f0fff4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 36, color: '#276749',
            }}>
              ✓
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Tutto pronto!</h2>
            <p style={{ color: '#888', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
              Il tuo account è configurato. Hai <strong>14 giorni di prova gratuita</strong> per esplorare tutte le funzionalità — senza carta di credito.
            </p>
            <button onClick={() => navigate('/admin')} style={{
              width: '100%', padding: '14px', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              Vai alla dashboard →
            </button>
          </div>
        )}

        {step < 3 && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 13, cursor: 'pointer' }}>
              Salta la configurazione guidata
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
