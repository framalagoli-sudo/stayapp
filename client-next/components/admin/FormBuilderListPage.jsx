'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { FormInput, Plus, Trash2, ChevronRight, ToggleLeft, ToggleRight, AlertCircle, X, Mail, FileText, Briefcase, Star, LayoutTemplate } from 'lucide-react'

const GDPR = { id: 'gdpr', tipo: 'consenso', label: 'Accetto il trattamento dei miei dati personali ai sensi del GDPR', required: true, privacy_url: '' }
const MARKETING = { id: 'marketing', tipo: 'consenso_marketing', label: 'Acconsento a ricevere comunicazioni commerciali e promozionali', required: false, privacy_url: '' }
const CAMPO = (tipo, label, placeholder = '', required = false) => ({ id: crypto.randomUUID(), tipo, label, placeholder, required, opzioni: [] })

const TEMPLATES = [
  {
    key: 'contatto',
    icon: Mail,
    nome: 'Form contatti',
    desc: 'Il classico — nome, email, messaggio',
    campi: [CAMPO('text','Nome','Il tuo nome',true), CAMPO('email','Email','la-tua@email.it',true), CAMPO('textarea','Messaggio','Come possiamo aiutarti?',true), GDPR, MARKETING],
  },
  {
    key: 'preventivo',
    icon: FileText,
    nome: 'Richiesta preventivo',
    desc: 'Con telefono e descrizione richiesta',
    campi: [CAMPO('text','Nome','Il tuo nome',true), CAMPO('email','Email','la-tua@email.it',true), CAMPO('tel','Telefono','',false), CAMPO('textarea','Descrizione richiesta','Descrivi quello che cerchi…',true), GDPR, MARKETING],
  },
  {
    key: 'candidatura',
    icon: Briefcase,
    nome: 'Candidatura lavoro',
    desc: 'Per raccogliere candidature spontanee',
    campi: [CAMPO('text','Nome','Il tuo nome',true), CAMPO('email','Email','la-tua@email.it',true), CAMPO('tel','Telefono','',false), CAMPO('text','Posizione desiderata','Es. Barista, Receptionist…',false), CAMPO('textarea','Presentati','Raccontaci di te…',true), GDPR],
  },
  {
    key: 'feedback',
    icon: Star,
    nome: 'Feedback / Recensione',
    desc: 'Raccoglie valutazione e commento',
    campi: [CAMPO('text','Nome','Il tuo nome',true), CAMPO('email','Email','la-tua@email.it',true), { ...CAMPO('select','Valutazione generale','',true), opzioni: ['⭐ Scarso','⭐⭐ Sufficiente','⭐⭐⭐ Buono','⭐⭐⭐⭐ Ottimo','⭐⭐⭐⭐⭐ Eccellente'] }, CAMPO('textarea','Commento','Dicci la tua esperienza…',false), GDPR],
  },
  {
    key: 'vuoto',
    icon: LayoutTemplate,
    nome: 'Form vuoto',
    desc: 'Parti da zero e aggiungi i tuoi campi',
    campi: [],
  },
]

export default function FormBuilderListPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti, activeAziendaId } = useAzienda()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [creating, setCreating] = useState(false)

  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id

  async function load() {
    if (!aziendaId) return
    try {
      const data = await apiFetch(`/api/form-builder?azienda_id=${aziendaId}`)
      setForms(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [aziendaId]) // eslint-disable-line

  async function handleNew(tpl) {
    setCreating(true)
    try {
      const f = await apiFetch('/api/form-builder', { method: 'POST', body: JSON.stringify({ nome: tpl.nome, campi: tpl.campi, azienda_id: aziendaId }) })
      router.push(`/admin/form-builder/${f.id}`)
    } catch (e) { setError(e.message); setCreating(false) }
  }

  async function handleToggle(id, attivo, e) {
    e.stopPropagation()
    try {
      const updated = await apiFetch(`/api/form-builder/${id}`, { method: 'PATCH', body: JSON.stringify({ attivo: !attivo }) })
      setForms(prev => prev.map(f => f.id === id ? { ...f, attivo: updated.attivo } : f))
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Eliminare questo form e tutte le risposte?')) return
    try {
      await apiFetch(`/api/form-builder/${id}`, { method: 'DELETE' })
      setForms(prev => prev.filter(f => f.id !== id))
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FormInput size={22} strokeWidth={1.5} color="#1a1a2e" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Form Builder</h1>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
        >
          <Plus size={16} strokeWidth={1.5} /> Nuovo form
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : forms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
          <FormInput size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>Nessun form creato</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Crea un form per raccogliere lead dal tuo sito</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {forms.map(f => (
            <div
              key={f.id}
              onClick={() => router.push(`/admin/form-builder/${f.id}`)}
              style={{
                background: '#fff', borderRadius: 10, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                border: '1px solid #eee', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: f.attivo ? 1 : 0.6,
              }}
            >
              <FormInput size={18} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{f.nome}</div>
                {f.descrizione && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{f.descrizione}</div>}
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {new Date(f.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/admin/form-builder/${f.id}/submissions`) }}
                style={{ fontSize: 12, background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap' }}
              >
                Risposte
              </button>

              <button onClick={(e) => handleToggle(f.id, f.attivo, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: f.attivo ? '#276749' : '#aaa' }}>
                {f.attivo
                  ? <ToggleRight size={22} strokeWidth={1.5} />
                  : <ToggleLeft size={22} strokeWidth={1.5} />
                }
              </button>

              <ChevronRight size={16} strokeWidth={1.5} color="#ccc" />

              <button onClick={(e) => handleDelete(f.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ccc' }}>
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 560, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Scegli un template</h2>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4 }}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.key}
                  onClick={() => { setShowPicker(false); handleNew(tpl) }}
                  disabled={creating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    background: '#f8f8f8', border: '1.5px solid #eee', borderRadius: 10,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <tpl.icon size={20} strokeWidth={1.5} color="#1a1a2e" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{tpl.nome}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{tpl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
