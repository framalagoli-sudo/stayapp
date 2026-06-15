'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  Save, Plus, Trash2, ArrowLeft, FormInput, Copy, Check,
  AlertCircle, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, ShieldCheck,
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
  return {
    id: crypto.randomUUID(),
    tipo,
    label: tipo === 'consenso'
      ? 'Accetto il trattamento dei miei dati personali ai sensi del GDPR'
      : tipo === 'consenso_marketing'
      ? 'Acconsento a ricevere comunicazioni commerciali e promozionali'
      : '',
    required: tipo === 'consenso',
    placeholder: '',
    opzioni: [],
    ...(tipo === 'consenso' || tipo === 'consenso_marketing' ? { privacy_url: '' } : {}),
  }
}

export default function FormBuilderEditorPage() {
  const { id } = useParams()
  const router = useRouter()

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [nome, setNome]                       = useState('')
  const [descrizione, setDescr]               = useState('')
  const [campi, setCampi]                     = useState([])
  const [redirectUrl, setRedirect]             = useState('')
  const [emailNotifica, setEmail]             = useState('')
  const [attivo, setAttivo]                   = useState(true)
  const [emailConfermaAttiva, setEcAttiva]    = useState(false)
  const [emailConfermaOggetto, setEcOggetto]  = useState('')
  const [emailConfermaTestoInput, setEcTesto] = useState('')
  const [tagAuto, setTagAuto]                 = useState([])
  const [tagInput, setTagInput]               = useState('')
  const [multiStep, setMultiStep]             = useState(false)
  const [newsletterOptin, setNewsletterOptin] = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [urlExpand, setUrlExpand]             = useState({ consenso: false, consenso_marketing: false })

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
        setEcAttiva(f.email_conferma_attiva ?? false)
        setEcOggetto(f.email_conferma_oggetto || '')
        setEcTesto(f.email_conferma_testo || '')
        setTagAuto(f.tag_auto || [])
        setMultiStep(f.multi_step ?? false)
        setNewsletterOptin(f.newsletter_optin ?? false)
        // espandi url se già valorizzato
        const hasPrivacyUrl = (f.campi || []).find(c => c.tipo === 'consenso')?.privacy_url
        const hasMarketingUrl = (f.campi || []).find(c => c.tipo === 'consenso_marketing')?.privacy_url
        setUrlExpand({ consenso: !!hasPrivacyUrl, consenso_marketing: !!hasMarketingUrl })
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
        body: JSON.stringify({
          nome, descrizione, campi, redirect_url: redirectUrl, email_notifica: emailNotifica, attivo,
          email_conferma_attiva: emailConfermaAttiva,
          email_conferma_oggetto: emailConfermaOggetto,
          email_conferma_testo: emailConfermaTestoInput,
          tag_auto: tagAuto,
          multi_step: multiStep,
          newsletter_optin: newsletterOptin,
        }),
      })
      setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
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

  function toggleConsenso(tipo) {
    const exists = campi.find(c => c.tipo === tipo)
    if (exists) {
      setCampi(c => c.filter(x => x.tipo !== tipo))
    } else {
      setCampi(c => [...c, newCampo(tipo)])
    }
  }

  const privacyCampo    = campi.find(c => c.tipo === 'consenso')
  const marketingCampo  = campi.find(c => c.tipo === 'consenso_marketing')
  const campiNormali    = campi.map((c, idx) => ({ c, idx })).filter(({ c }) => c.tipo !== 'consenso' && c.tipo !== 'consenso_marketing')
  const hasEmailField   = campi.some(c => c.tipo === 'email')

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/admin/form-builder')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <FormInput size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>{nome || 'Editor form'}</h1>
        <button onClick={() => router.push(`/admin/form-builder/${id}/submissions`)} style={{ fontSize: 13, background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#555' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMultiStep(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: multiStep ? '#3730a3' : '#aaa' }}>
              {multiStep ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
            </button>
            <div>
              <span style={{ fontSize: 13, color: '#555' }}>Form multi-passo</span>
              {multiStep && <div style={{ fontSize: 11, color: '#888' }}>Assegna uno step numerico a ogni campo</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Campi del form */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Campi del form
        </div>

        {!hasEmailField && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <AlertCircle size={18} strokeWidth={1.5} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Manca il campo Email</div>
              <div style={{ fontSize: 12, color: '#a16207', marginTop: 2, lineHeight: 1.45 }}>
                Senza un campo di tipo <strong>Email</strong> i contatti non vengono salvati nel CRM e non puoi inviare email di conferma né notifiche.
              </div>
              <button
                onClick={() => setCampi(c => [...c, { ...newCampo('email'), label: 'Email', placeholder: 'la-tua@email.it', required: true }])}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: '#b45309', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={13} strokeWidth={2} /> Aggiungi campo Email
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campiNormali.map(({ c, idx }) => (
            <div key={c.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, background: '#fafafa' }}>

              {multiStep && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#888' }}>Passo:</span>
                  <button type="button" onClick={() => patchCampo(c.id, { step: Math.max(0, (c.step ?? 0) - 1) })}
                    disabled={(c.step ?? 0) === 0}
                    style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '1px 6px', cursor: (c.step ?? 0) === 0 ? 'default' : 'pointer', fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                    −
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', background: '#eef2ff', borderRadius: 4, padding: '2px 10px', minWidth: 24, textAlign: 'center' }}>
                    {(c.step ?? 0) + 1}
                  </span>
                  <button type="button" onClick={() => patchCampo(c.id, { step: (c.step ?? 0) + 1 })}
                    style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '1px 6px', cursor: 'pointer', fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                    +
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 10, alignItems: 'start' }}>
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
                  <button onClick={() => removeCampo(c.id)} style={{ background: 'none', border: '1px solid #eee', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', color: '#ccc' }}>
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {c.tipo === 'select' && (
                <div style={{ paddingTop: 8, borderTop: '1px solid #eee', marginTop: 10 }}>
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

              <div style={{ paddingTop: 8, borderTop: '1px solid #f0f0f0', marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!c.condizione}
                    onChange={e => patchCampo(c.id, { condizione: e.target.checked ? { campo_id: '', operatore: 'eq', valore: '' } : null })}
                  />
                  Mostra solo se…
                </label>
                {c.condizione && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    <select
                      value={c.condizione.campo_id || ''}
                      onChange={e => patchCampo(c.id, { condizione: { ...c.condizione, campo_id: e.target.value } })}
                      style={{ flex: 2, minWidth: 120, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }}
                    >
                      <option value="">— Campo —</option>
                      {campiNormali.filter(({ c: x }) => x.id !== c.id && x.label).map(({ c: x }) => (
                        <option key={x.id} value={x.id}>{x.label}</option>
                      ))}
                    </select>
                    <select
                      value={c.condizione.operatore || 'eq'}
                      onChange={e => patchCampo(c.id, { condizione: { ...c.condizione, operatore: e.target.value } })}
                      style={{ flex: 1, minWidth: 110, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }}
                    >
                      <option value="eq">uguale a</option>
                      <option value="neq">diverso da</option>
                      <option value="contains">contiene</option>
                    </select>
                    <input
                      value={c.condizione.valore || ''}
                      onChange={e => patchCampo(c.id, { condizione: { ...c.condizione, valore: e.target.value } })}
                      placeholder="Valore…"
                      style={{ flex: 2, minWidth: 80, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
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

      {/* Consensi GDPR — pannello dedicato */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldCheck size={16} strokeWidth={1.5} color="#276749" />
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Consensi GDPR
          </div>
        </div>

        {/* Consenso privacy — obbligatorio */}
        <div style={{ border: `1px solid ${privacyCampo ? '#b7e4c7' : '#eee'}`, borderRadius: 10, padding: 16, background: privacyCampo ? '#f0fff4' : '#fafafa', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => toggleConsenso('consenso')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: privacyCampo ? '#276749' : '#aaa', flexShrink: 0 }}>
              {privacyCampo ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: privacyCampo ? '#276749' : '#555' }}>
                Consenso trattamento dati personali
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                Obbligatorio per legge — checkbox che l&apos;utente deve spuntare prima di inviare
              </div>
            </div>
            {privacyCampo && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#276749', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                OBBLIGATORIO
              </span>
            )}
          </div>

          {privacyCampo && (
            <div style={{ marginTop: 12, paddingLeft: 34 }}>
              <label style={{ fontSize: 11, color: '#276749', display: 'block', marginBottom: 4 }}>Testo del consenso</label>
              <input
                value={privacyCampo.label}
                onChange={e => patchCampo(privacyCampo.id, { label: e.target.value })}
                style={{ width: '100%', border: '1px solid #b7e4c7', borderRadius: 6, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
              />
              <div style={{ marginTop: 8 }}>
                {!urlExpand.consenso ? (
                  <button
                    onClick={() => setUrlExpand(u => ({ ...u, consenso: true }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#276749', padding: 0, textDecoration: 'underline' }}
                  >
                    + Aggiungi link a policy esterna (opzionale)
                  </button>
                ) : (
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>
                      URL policy personalizzata — lascia vuoto per usare le pagine privacy già presenti in piattaforma
                    </label>
                    <input
                      type="url"
                      value={privacyCampo.privacy_url || ''}
                      onChange={e => patchCampo(privacyCampo.id, { privacy_url: e.target.value })}
                      placeholder="https://tuodominio.it/privacy"
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Consenso marketing — opzionale */}
        <div style={{ border: `1px solid ${marketingCampo ? '#c7d2fe' : '#eee'}`, borderRadius: 10, padding: 16, background: marketingCampo ? '#eef2ff' : '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => toggleConsenso('consenso_marketing')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: marketingCampo ? '#3730a3' : '#aaa', flexShrink: 0 }}>
              {marketingCampo ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: marketingCampo ? '#3730a3' : '#555' }}>
                Consenso comunicazioni commerciali
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                Facoltativo — necessario per inviare newsletter, promozioni e offerte
              </div>
            </div>
            {marketingCampo && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6366f1', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                FACOLTATIVO
              </span>
            )}
          </div>

          {marketingCampo && (
            <div style={{ marginTop: 12, paddingLeft: 34 }}>
              <label style={{ fontSize: 11, color: '#3730a3', display: 'block', marginBottom: 4 }}>Testo del consenso</label>
              <input
                value={marketingCampo.label}
                onChange={e => patchCampo(marketingCampo.id, { label: e.target.value })}
                style={{ width: '100%', border: '1px solid #c7d2fe', borderRadius: 6, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
              />
              <div style={{ marginTop: 8 }}>
                {!urlExpand.consenso_marketing ? (
                  <button
                    onClick={() => setUrlExpand(u => ({ ...u, consenso_marketing: true }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#3730a3', padding: 0, textDecoration: 'underline' }}
                  >
                    + Aggiungi link a policy esterna (opzionale)
                  </button>
                ) : (
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>
                      URL policy personalizzata — lascia vuoto per usare le pagine privacy già presenti in piattaforma
                    </label>
                    <input
                      type="url"
                      value={marketingCampo.privacy_url || ''}
                      onChange={e => patchCampo(marketingCampo.id, { privacy_url: e.target.value })}
                      placeholder="https://tuodominio.it/privacy"
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 12, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automazioni post-submit */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Automazioni post-submit
        </div>

        {/* Email di conferma all'utente */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: emailConfermaAttiva ? 14 : 0 }}>
            <button onClick={() => setEcAttiva(a => !a)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: emailConfermaAttiva ? '#276749' : '#aaa' }}>
              {emailConfermaAttiva ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
            </button>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Email di conferma all&apos;utente</span>
              <div style={{ fontSize: 11, color: '#888' }}>Invia un&apos;email automatica al mittente dopo ogni submit</div>
            </div>
          </div>
          {emailConfermaAttiva && !hasEmailField && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, marginLeft: 34, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#92400e' }}>
              <AlertCircle size={13} strokeWidth={1.5} /> Non verrà inviata: manca il campo Email nel form.
            </div>
          )}
          {emailConfermaAttiva && (
            <div style={{ paddingLeft: 34, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Oggetto email</label>
                <input
                  value={emailConfermaOggetto}
                  onChange={e => setEcOggetto(e.target.value)}
                  placeholder="Abbiamo ricevuto il tuo messaggio — {{form_nome}}"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Testo email</label>
                <textarea
                  value={emailConfermaTestoInput}
                  onChange={e => setEcTesto(e.target.value)}
                  placeholder={`Ciao {{nome}},\n\nabbiamo ricevuto la tua richiesta.\nTi risponderemo al più presto.`}
                  rows={4}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ fontSize: 11, color: '#888', background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                Variabili disponibili: <code style={{ background: '#e2e8f0', borderRadius: 3, padding: '1px 5px' }}>{'{{nome}}'}</code>&nbsp;&nbsp;<code style={{ background: '#e2e8f0', borderRadius: 3, padding: '1px 5px' }}>{'{{form_nome}}'}</code>
              </div>
            </div>
          )}
        </div>

        {/* Tag automatici */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 4 }}>Tag automatici al contatto CRM</label>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Assegnati al contatto ad ogni submit — utile per segmentare la lista</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {tagAuto.map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eef2ff', color: '#3730a3', fontSize: 12, borderRadius: 6, padding: '3px 8px' }}>
                {t}
                <button onClick={() => setTagAuto(ts => ts.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#818cf8', fontSize: 14 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                  e.preventDefault()
                  const t = tagInput.trim().replace(/,/g, '')
                  if (t && !tagAuto.includes(t)) setTagAuto(ts => [...ts, t])
                  setTagInput('')
                }
              }}
              placeholder="Scrivi un tag e premi Invio…"
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '7px 12px', fontSize: 13, boxSizing: 'border-box' }}
            />
            <button
              onClick={() => {
                const t = tagInput.trim().replace(/,/g, '')
                if (t && !tagAuto.includes(t)) { setTagAuto(ts => [...ts, t]); setTagInput('') }
              }}
              style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
            >
              Aggiungi
            </button>
          </div>
        </div>

        {/* Newsletter optin */}
        <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: newsletterOptin ? 8 : 0 }}>
            <button onClick={() => setNewsletterOptin(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: newsletterOptin ? '#276749' : '#aaa' }}>
              {newsletterOptin ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
            </button>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Aggiungi alla lista newsletter</span>
              <div style={{ fontSize: 11, color: '#888' }}>Chi compila questo form viene iscritto alla newsletter — richiede consenso GDPR nel form</div>
            </div>
          </div>
          {newsletterOptin && !hasEmailField && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 34, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
              <AlertCircle size={14} strokeWidth={1.5} /> Nessuno verrà iscritto: manca il campo Email nel form.
            </div>
          )}
          {newsletterOptin && hasEmailField && (
            <div style={{ paddingLeft: 34, fontSize: 12, color: '#276749', background: '#f0fff4', borderRadius: 8, padding: '8px 12px' }}>
              I contatti saranno iscritti con i tag: <strong>{tagAuto.length ? tagAuto.join(', ') : '(nessun tag)'}</strong> — filtrabili poi nella Newsletter.
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 14, fontSize: 12, color: '#888' }}>
          Per integrare con <strong style={{ color: '#555' }}>Zapier</strong>, <strong style={{ color: '#555' }}>Make</strong> o <strong style={{ color: '#555' }}>n8n</strong>: vai in <strong style={{ color: '#2b6cb0' }}>Integrazioni → Webhook</strong> e seleziona l&apos;evento <code style={{ background: '#f0f0f0', borderRadius: 3, padding: '1px 4px' }}>form_submit</code>.
        </div>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#276749', fontSize: 13, fontWeight: 600 }}>
            <Check size={15} strokeWidth={2} /> Salvato
          </span>
        )}
        <button
          onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: saved ? '#276749' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}
        >
          <Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : saved ? 'Salvato ✓' : 'Salva form'}
        </button>
      </div>
    </div>
  )
}
