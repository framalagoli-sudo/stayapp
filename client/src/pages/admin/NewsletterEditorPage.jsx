import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAzienda } from '../../context/AziendaContext'
import { apiFetch } from '../../lib/api'
import { ArrowLeft, Send, Eye, Save, Plus, Trash2, AlertCircle, CheckCircle, Smile, Clock, X } from 'lucide-react'

const EMOJIS = [
  '🎯','⚡','🔥','✨','💫','🎉','🎁','🌟','💥','❗',
  '🌸','🌞','❄️','🍂','🌊','🌿','🌺','🎊','💎','🎭',
  '🏨','🏖️','✈️','🗺️','🛎️','🍾','🥂','🌴','👑','💌',
  '📢','📣','🔔','💡','🎈','🎀','🚀','💰','🎪','⭐',
]

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'semplice',   label: 'Semplice',   desc: 'Titolo, testo e un bottone CTA',            color: '#6366f1' },
  { id: 'promozione', label: 'Promozione', desc: 'Offerta con prezzo, badge sconto e CTA',     color: '#f59e0b' },
  { id: 'notizie',    label: 'Notizie',    desc: 'Più blocchi titolo/testo/immagine',           color: '#10b981' },
  { id: 'evento',     label: 'Evento',     desc: 'Data, luogo, prezzo e bottone prenota',       color: '#ef4444' },
]

const DEFAULT_CONTENT = {
  semplice:   { heading: '', text: '', image_url: '', cta_text: '', cta_url: '' },
  promozione: { heading: '', badge: '', image_url: '', price_original: '', price_discounted: '', text: '', cta_text: '', cta_url: '', conditions: '' },
  notizie:    { heading: '', intro: '', blocks: [] },
  evento:     { heading: '', image_url: '', event_title: '', date: '', time: '', location: '', text: '', price: '', cta_text: '', cta_url: '' },
}

// ─── Client-side preview HTML ─────────────────────────────────────────────────

function buildPreview(template_id, content, entityName, primary = '#1a1a2e') {
  const p = primary
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cta = (text, url) => text ? `<a href="${url || '#'}" style="display:inline-block;padding:13px 26px;background:${p};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;margin-top:20px">${esc(text)}</a>` : ''

  let body = ''
  if (template_id === 'semplice') {
    const c = content
    body = `
      ${c.image_url ? `<img src="${c.image_url}" style="width:100%;max-height:260px;object-fit:cover;display:block">` : ''}
      <div style="padding:32px">
        ${c.heading ? `<h1 style="font-size:24px;color:#1a1a2e;margin:0 0 14px;font-family:Georgia,serif">${esc(c.heading)}</h1>` : ''}
        ${c.text ? `<p style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap;margin:0">${esc(c.text)}</p>` : ''}
        ${cta(c.cta_text, c.cta_url)}
      </div>`
  } else if (template_id === 'promozione') {
    const c = content
    const orig = parseFloat(c.price_original), disc = parseFloat(c.price_discounted)
    const pct = orig && disc && orig > disc ? Math.round((1 - disc / orig) * 100) : null
    body = `
      ${c.image_url ? `<img src="${c.image_url}" style="width:100%;max-height:300px;object-fit:cover;display:block">` : ''}
      <div style="padding:32px">
        ${c.badge ? `<span style="display:inline-block;background:${p}22;color:${p};font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px">${esc(c.badge)}</span>` : ''}
        ${c.heading ? `<h1 style="font-size:24px;color:#1a1a2e;margin:12px 0 16px;font-family:Georgia,serif">${esc(c.heading)}</h1>` : ''}
        ${(c.price_discounted || c.price_original) ? `<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px">
          <span style="font-size:40px;font-weight:800;color:${p};line-height:1;font-family:Georgia,serif">€${esc(c.price_discounted || c.price_original)}</span>
          ${c.price_original && c.price_discounted ? `<span style="font-size:20px;color:#bbb;text-decoration:line-through">€${esc(c.price_original)}</span>` : ''}
          ${pct ? `<span style="background:#22c55e;color:#fff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:20px">-${pct}%</span>` : ''}
        </div>` : ''}
        ${c.text ? `<p style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap;margin:0">${esc(c.text)}</p>` : ''}
        ${cta(c.cta_text, c.cta_url)}
        ${c.conditions ? `<p style="font-size:11px;color:#aaa;margin-top:16px">${esc(c.conditions)}</p>` : ''}
      </div>`
  } else if (template_id === 'notizie') {
    const c = content
    body = `<div style="padding:32px">
      ${c.heading ? `<h1 style="font-size:24px;color:#1a1a2e;margin:0 0 ${c.intro ? '10px' : '24px'};font-family:Georgia,serif">${esc(c.heading)}</h1>` : ''}
      ${c.intro ? `<p style="font-size:15px;color:#666;line-height:1.8;margin:0 0 24px">${esc(c.intro)}</p>` : ''}
      ${(c.blocks || []).map(b => `<div style="border-top:1px solid #f0f0f0;padding-top:20px;margin-bottom:20px;display:flex;gap:14px">
        ${b.image_url ? `<img src="${b.image_url}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;flex-shrink:0">` : ''}
        <div>
          ${b.title ? `<h3 style="font-size:16px;font-weight:700;color:#1a1a2e;margin:0 0 6px">${esc(b.title)}</h3>` : ''}
          ${b.text ? `<p style="font-size:13px;color:#555;line-height:1.7;margin:0">${esc(b.text)}</p>` : ''}
        </div>
      </div>`).join('')}
    </div>`
  } else if (template_id === 'evento') {
    const c = content
    const dateStr = c.date ? new Date(c.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
    body = `
      ${c.image_url ? `<img src="${c.image_url}" style="width:100%;max-height:260px;object-fit:cover;display:block">` : ''}
      <div style="padding:32px">
        ${c.heading ? `<p style="font-size:12px;font-weight:700;color:${p};text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">${esc(c.heading)}</p>` : ''}
        ${c.event_title ? `<h1 style="font-size:26px;color:#1a1a2e;margin:0 0 18px;font-family:Georgia,serif">${esc(c.event_title)}</h1>` : ''}
        ${(c.date || c.location || c.price) ? `<div style="background:#f9f9fb;border-radius:10px;padding:14px 18px;margin-bottom:18px">
          ${c.date ? `<div style="font-size:13px;color:#555;margin-bottom:6px">📅 <strong>${dateStr}${c.time ? ' alle ' + c.time : ''}</strong></div>` : ''}
          ${c.location ? `<div style="font-size:13px;color:#555;margin-bottom:6px">📍 ${esc(c.location)}</div>` : ''}
          ${c.price ? `<div style="font-size:13px;color:#555">💶 A partire da <strong>€${esc(c.price)}</strong></div>` : ''}
        </div>` : ''}
        ${c.text ? `<p style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap;margin:0">${esc(c.text)}</p>` : ''}
        ${cta(c.cta_text, c.cta_url)}
      </div>`
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#1a1a2e;padding:20px 28px">
    <span style="font-size:18px;font-weight:700;color:#fff">${esc(entityName || 'La tua azienda')}</span>
  </div>
  ${body}
  <div style="background:#f9f9fb;padding:16px 28px;text-align:center;border-top:1px solid #f0f0f0">
    <span style="font-size:11px;color:#bbb">Annulla iscrizione &nbsp;·&nbsp; Powered by StayApp</span>
  </div>
</div>
</body></html>`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsletterEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { strutture, ristoranti, attivita } = useAzienda()

  const [nl, setNl]           = useState(null)
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [templateId, setTemplateId] = useState('semplice')
  const [content, setContent] = useState(DEFAULT_CONTENT.semplice)
  const [entityTipo, setEntityTipo] = useState('struttura')
  const [entityId, setEntityId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saveTick, setSaveTick] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testModal, setTestModal] = useState(false)
  const [testState, setTestState] = useState('idle')
  const [sendState, setSendState] = useState('idle')
  const [recipientCount, setRecipientCount] = useState(null)
  const [sendConfirm, setSendConfirm] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const iframeRef = useRef(null)
  const subjectRef = useRef(null)

  const isSent = nl?.status === 'sent'

  // Flatten all entities for the picker
  const allEntities = [
    ...(strutture || []).map(e => ({ id: e.id, tipo: 'struttura', label: e.name })),
    ...(ristoranti || []).map(e => ({ id: e.id, tipo: 'ristorante', label: e.name })),
    ...(attivita || []).map(e => ({ id: e.id, tipo: 'attivita', label: e.name })),
  ]

  const currentEntity = allEntities.find(e => e.id === entityId) || null

  useEffect(() => {
    apiFetch(`/api/newsletter/${id}`)
      .then(data => {
        setNl(data)
        setSubject(data.subject || '')
        setPreheader(data.preheader || '')
        setScheduledAt(data.scheduled_at ? data.scheduled_at.slice(0, 16) : '')
        setTemplateId(data.template_id || 'semplice')
        setContent(data.content && Object.keys(data.content).length ? data.content : DEFAULT_CONTENT[data.template_id] || DEFAULT_CONTENT.semplice)
        setEntityTipo(data.entity_tipo || 'struttura')
        setEntityId(data.entity_id || '')
      })
      .catch(() => navigate('/admin/newsletter'))
      .finally(() => setLoading(false))
  }, [id])

  // Update iframe preview
  useEffect(() => {
    if (!showPreview || !iframeRef.current) return
    const entityName = currentEntity?.label || 'La tua azienda'
    iframeRef.current.srcdoc = buildPreview(templateId, content, entityName, '#1a1a2e')
  }, [showPreview, templateId, content, currentEntity])

  function patchContent(key, value) {
    setContent(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const updated = await apiFetch(`/api/newsletter/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          subject, preheader, template_id: templateId, content,
          entity_tipo: entityTipo, entity_id: entityId || null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      })
      setNl(updated)
      setSaveTick(Date.now())
      setTimeout(() => setSaveTick(null), 2500)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  function insertEmoji(emoji) {
    const input = subjectRef.current
    if (!input) { setSubject(s => s + emoji); setEmojiOpen(false); return }
    const start = input.selectionStart ?? subject.length
    const end   = input.selectionEnd   ?? subject.length
    const newVal = subject.slice(0, start) + emoji + subject.slice(end)
    setSubject(newVal)
    setEmojiOpen(false)
    setTimeout(() => {
      input.focus()
      const pos = start + [...emoji].length
      input.setSelectionRange(pos, pos)
    }, 0)
  }

  function handleTemplateChange(tid) {
    if (isSent) return
    setTemplateId(tid)
    setContent(DEFAULT_CONTENT[tid] || {})
  }

  async function sendTest() {
    if (!testEmail.trim()) return
    setTestState('loading')
    try {
      await save()
      await apiFetch(`/api/newsletter/${id}/test`, { method: 'POST', body: JSON.stringify({ test_email: testEmail }) })
      setTestState('ok')
      setTimeout(() => { setTestState('idle'); setTestModal(false) }, 2000)
    } catch (e) { setTestState('error_' + e.message) }
  }

  async function fetchRecipients() {
    // Stima: contatti iscritti newsletter dell'azienda
    setSendConfirm(true)
    setRecipientCount(null)
    try {
      const data = await apiFetch('/api/contatti?newsletter=true')
      setRecipientCount(data.length)
    } catch { setRecipientCount('?') }
  }

  async function sendAll() {
    setSendState('loading')
    try {
      await save()
      const res = await apiFetch(`/api/newsletter/${id}/send`, { method: 'POST' })
      setSendState('ok')
      setTimeout(() => { setSendState('idle'); setSendConfirm(false); navigate('/admin/newsletter') }, 2500)
    } catch (e) { setSendState('error_' + e.message) }
  }

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Caricamento…</div>

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e0e0e0',
    fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  }
  const label = { display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => navigate('/admin/newsletter')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, padding: 0 }}>
          <ArrowLeft size={16} strokeWidth={2} />
          Indietro
        </button>
        <h2 style={{ margin: 0, flex: 1, fontSize: 20 }}>
          {isSent ? 'Newsletter inviata' : 'Modifica bozza'}
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveTick && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#38a169' }}>
              <CheckCircle size={13} strokeWidth={2} /> Salvata
            </span>
          )}
          <button onClick={() => setShowPreview(p => !p)} style={{
            padding: '8px 16px', background: showPreview ? '#1a1a2e' : '#f0f0f0',
            color: showPreview ? '#fff' : '#555', border: 'none', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Eye size={14} strokeWidth={2} />
            Anteprima
          </button>
          {!isSent && (
            <button onClick={save} disabled={saving} style={{
              padding: '8px 16px', background: '#f0f0f0', color: '#555', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Save size={14} strokeWidth={2} />
              {saving ? 'Salvo…' : 'Salva bozza'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Left: editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Oggetto + Preheader + Mittente + Schedule */}
          <Section title="Informazioni generali">
            <div style={{ marginBottom: 14 }}>
              <span style={label}>Oggetto email</span>
              <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                <input ref={subjectRef} value={subject} onChange={e => setSubject(e.target.value)} disabled={isSent}
                  placeholder="Es: Offerta speciale solo per te!" style={{ ...inp, flex: 1 }} />
                {!isSent && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setEmojiOpen(o => !o)} title="Inserisci emoji" style={{
                      height: '100%', padding: '0 12px', background: emojiOpen ? '#1a1a2e' : '#f0f0f0',
                      color: emojiOpen ? '#fff' : '#555', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <Smile size={16} strokeWidth={2} />
                    </button>
                    {emojiOpen && (
                      <>
                        <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 51,
                          background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, width: 320,
                        }}>
                          {EMOJIS.map(e => (
                            <button key={e} onClick={() => insertEmoji(e)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                              padding: '4px', borderRadius: 6, lineHeight: 1,
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={ev => ev.currentTarget.style.background = 'none'}
                            >{e}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={label}>Testo anteprima (preheader)</span>
              <input value={preheader} onChange={e => setPreheader(e.target.value)} disabled={isSent}
                placeholder="Testo visibile prima di aprire l'email nel client…" style={inp} maxLength={140} />
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                Appare dopo l'oggetto nella casella di posta · max 140 caratteri
              </div>
            </div>
            {allEntities.length > 1 && (
              <div style={{ marginBottom: 14 }}>
                <span style={label}>Mittente (entità)</span>
                <select value={entityId} onChange={e => {
                  const found = allEntities.find(x => x.id === e.target.value)
                  setEntityId(e.target.value)
                  if (found) setEntityTipo(found.tipo)
                }} disabled={isSent} style={inp}>
                  <option value="">— seleziona —</option>
                  {allEntities.map(e => <option key={e.id} value={e.id}>{e.label} ({e.tipo})</option>)}
                </select>
              </div>
            )}
            {!isSent && (
              <div>
                <span style={label}>Programmazione invio</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    style={{ ...inp, flex: 1, colorScheme: 'light' }} />
                  {scheduledAt && (
                    <button onClick={() => setScheduledAt('')} title="Rimuovi programmazione" style={{
                      height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fff0f0', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#e53e3e', flexShrink: 0,
                    }}>
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                {scheduledAt && (
                  <div style={{ fontSize: 12, color: '#38a169', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} strokeWidth={2} />
                    Programmata per {new Date(scheduledAt).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {!scheduledAt && (
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                    Lascia vuoto per inviare manualmente
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Template */}
          {!isSent && (
            <Section title="Template">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => handleTemplateChange(t.id)} style={{
                    padding: '12px 14px', border: `2px solid ${templateId === t.id ? t.color : '#e8e8e8'}`,
                    borderRadius: 10, background: templateId === t.id ? `${t.color}10` : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: templateId === t.id ? t.color : '#333', marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Content fields */}
          <Section title="Contenuto">
            {templateId === 'semplice' && <SempliceFields c={content} patch={patchContent} inp={inp} label={label} disabled={isSent} />}
            {templateId === 'promozione' && <PromozioneFields c={content} patch={patchContent} inp={inp} label={label} disabled={isSent} />}
            {templateId === 'notizie' && <NotizieFIelds c={content} setContent={setContent} inp={inp} label={label} disabled={isSent} />}
            {templateId === 'evento' && <EventoFields c={content} patch={patchContent} inp={inp} label={label} disabled={isSent} />}
          </Section>

          {/* Actions */}
          {!isSent && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 40 }}>
              <button onClick={() => setTestModal(true)} style={{
                padding: '11px 20px', background: '#fff', border: '1px solid #ddd',
                borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#555',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <Eye size={15} strokeWidth={2} /> Invia email di test
              </button>
              <button onClick={fetchRecipients} style={{
                padding: '11px 20px', background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <Send size={15} strokeWidth={2} /> Invia a tutti gli iscritti
              </button>
            </div>
          )}
        </div>

        {/* Right: preview iframe */}
        {showPreview && (
          <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Anteprima email
            </div>
            <iframe ref={iframeRef} style={{ width: '100%', height: 620, border: '1px solid #e8e8e8', borderRadius: 12, background: '#fff' }} />
          </div>
        )}
      </div>

      {/* Test modal */}
      {testModal && (
        <Modal onClose={() => { setTestModal(false); setTestState('idle') }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Invia email di test</h3>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px' }}>Ti mandiamo una copia dell'email a questo indirizzo per verificare come appare.</p>
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} type="email"
            placeholder="tua@email.com" style={{ ...inp, marginBottom: 14 }} />
          {testState === 'ok' && <FeedbackRow ok>Email di test inviata!</FeedbackRow>}
          {testState.startsWith('error') && <FeedbackRow>{testState.replace('error_', '')}</FeedbackRow>}
          <button onClick={sendTest} disabled={testState === 'loading' || !testEmail.trim()} style={{
            width: '100%', padding: '12px', background: testEmail.trim() ? '#1a1a2e' : '#ccc',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: testEmail.trim() ? 'pointer' : 'not-allowed',
          }}>
            {testState === 'loading' ? 'Invio…' : 'Invia test'}
          </button>
        </Modal>
      )}

      {/* Send confirm modal */}
      {sendConfirm && (
        <Modal onClose={() => { setSendConfirm(false); setSendState('idle') }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Conferma invio</h3>
          {recipientCount === null ? (
            <p style={{ color: '#888', fontSize: 14 }}>Calcolo destinatari…</p>
          ) : (
            <p style={{ fontSize: 15, color: '#444', margin: '0 0 20px', lineHeight: 1.6 }}>
              Stai per inviare questa newsletter a <strong>{recipientCount}</strong> iscritti. L'operazione non è reversibile.
            </p>
          )}
          {sendState === 'ok' && <FeedbackRow ok>Newsletter inviata con successo!</FeedbackRow>}
          {sendState.startsWith('error') && <FeedbackRow>{sendState.replace('error_', '')}</FeedbackRow>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setSendConfirm(false); setSendState('idle') }} style={{
              flex: 1, padding: '11px', background: '#f5f5f5', color: '#555',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Annulla</button>
            <button onClick={sendAll} disabled={sendState === 'loading' || recipientCount === null} style={{
              flex: 1, padding: '11px', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Send size={15} strokeWidth={2} />
              {sendState === 'loading' ? 'Invio in corso…' : 'Invia ora'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Content field components per template ────────────────────────────────────

function SempliceFields({ c, patch, inp, label, disabled }) {
  return <>
    <Field label={label} k="Immagine di intestazione"><input value={c.image_url || ''} onChange={e => patch('image_url', e.target.value)} disabled={disabled} placeholder="URL immagine (opzionale)" style={inp} /></Field>
    <Field label={label} k="Titolo"><input value={c.heading || ''} onChange={e => patch('heading', e.target.value)} disabled={disabled} placeholder="Es: Benvenuta primavera!" style={inp} /></Field>
    <Field label={label} k="Testo"><textarea value={c.text || ''} onChange={e => patch('text', e.target.value)} disabled={disabled} rows={5} placeholder="Corpo del messaggio…" style={{ ...inp, resize: 'vertical' }} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label={label} k="Testo bottone CTA"><input value={c.cta_text || ''} onChange={e => patch('cta_text', e.target.value)} disabled={disabled} placeholder="Es: Scopri di più" style={inp} /></Field>
      <Field label={label} k="URL bottone CTA"><input value={c.cta_url || ''} onChange={e => patch('cta_url', e.target.value)} disabled={disabled} placeholder="https://…" style={inp} /></Field>
    </div>
  </>
}

function PromozioneFields({ c, patch, inp, label, disabled }) {
  const orig = parseFloat(c.price_original), disc = parseFloat(c.price_discounted)
  const pct = orig && disc && orig > disc ? Math.round((1 - disc / orig) * 100) : null
  return <>
    <Field label={label} k="Immagine"><input value={c.image_url || ''} onChange={e => patch('image_url', e.target.value)} disabled={disabled} placeholder="URL immagine" style={inp} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label={label} k="Titolo offerta"><input value={c.heading || ''} onChange={e => patch('heading', e.target.value)} disabled={disabled} placeholder="Es: Offerta estate" style={inp} /></Field>
      <Field label={label} k="Badge (opzionale)"><input value={c.badge || ''} onChange={e => patch('badge', e.target.value)} disabled={disabled} placeholder="Es: Solo questo weekend" style={inp} /></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
      <Field label={label} k="Prezzo originale (€)"><input value={c.price_original || ''} onChange={e => patch('price_original', e.target.value)} disabled={disabled} placeholder="Es: 150" style={inp} /></Field>
      <Field label={label} k={`Prezzo scontato (€)${pct ? ` — sconto ${pct}%` : ''}`}><input value={c.price_discounted || ''} onChange={e => patch('price_discounted', e.target.value)} disabled={disabled} placeholder="Es: 99" style={inp} /></Field>
    </div>
    <Field label={label} k="Descrizione"><textarea value={c.text || ''} onChange={e => patch('text', e.target.value)} disabled={disabled} rows={4} placeholder="Descrizione dell'offerta…" style={{ ...inp, resize: 'vertical' }} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label={label} k="Testo bottone CTA"><input value={c.cta_text || ''} onChange={e => patch('cta_text', e.target.value)} disabled={disabled} placeholder="Es: Approfitta ora" style={inp} /></Field>
      <Field label={label} k="URL bottone CTA"><input value={c.cta_url || ''} onChange={e => patch('cta_url', e.target.value)} disabled={disabled} placeholder="https://…" style={inp} /></Field>
    </div>
    <Field label={label} k="Note e condizioni"><input value={c.conditions || ''} onChange={e => patch('conditions', e.target.value)} disabled={disabled} placeholder="Es: Offerta valida fino al 30/06" style={inp} /></Field>
  </>
}

function NotizieFIelds({ c, setContent, inp, label, disabled }) {
  function patchBlock(idx, key, value) {
    const blocks = [...(c.blocks || [])]
    blocks[idx] = { ...blocks[idx], [key]: value }
    setContent(prev => ({ ...prev, blocks }))
  }
  function addBlock() {
    setContent(prev => ({ ...prev, blocks: [...(prev.blocks || []), { id: Date.now().toString(), title: '', text: '', image_url: '' }] }))
  }
  function removeBlock(idx) {
    setContent(prev => ({ ...prev, blocks: (prev.blocks || []).filter((_, i) => i !== idx) }))
  }
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label={label} k="Titolo sezione"><input value={c.heading || ''} onChange={e => setContent(p => ({ ...p, heading: e.target.value }))} disabled={disabled} placeholder="Es: Le ultime notizie" style={inp} /></Field>
      <Field label={label} k="Introduzione"><input value={c.intro || ''} onChange={e => setContent(p => ({ ...p, intro: e.target.value }))} disabled={disabled} placeholder="Testo introduttivo (opzionale)" style={inp} /></Field>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Blocchi</div>
    {(c.blocks || []).map((b, i) => (
      <div key={b.id || i} style={{ border: '1px solid #e8e8e8', borderRadius: 10, padding: '14px', marginBottom: 10, background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>Blocco {i + 1}</span>
          {!disabled && <button onClick={() => removeBlock(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 0 }}><Trash2 size={14} strokeWidth={2} /></button>}
        </div>
        <input value={b.image_url || ''} onChange={e => patchBlock(i, 'image_url', e.target.value)} disabled={disabled} placeholder="URL immagine (opzionale)" style={{ ...inp, marginBottom: 8 }} />
        <input value={b.title || ''} onChange={e => patchBlock(i, 'title', e.target.value)} disabled={disabled} placeholder="Titolo" style={{ ...inp, marginBottom: 8 }} />
        <textarea value={b.text || ''} onChange={e => patchBlock(i, 'text', e.target.value)} disabled={disabled} rows={3} placeholder="Testo…" style={{ ...inp, resize: 'vertical' }} />
      </div>
    ))}
    {!disabled && (
      <button onClick={addBlock} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed #ccc', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#888' }}>
        <Plus size={14} strokeWidth={2} /> Aggiungi blocco
      </button>
    )}
  </>
}

function EventoFields({ c, patch, inp, label, disabled }) {
  return <>
    <Field label={label} k="Immagine"><input value={c.image_url || ''} onChange={e => patch('image_url', e.target.value)} disabled={disabled} placeholder="URL immagine" style={inp} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label={label} k="Titoletto (opzionale)"><input value={c.heading || ''} onChange={e => patch('heading', e.target.value)} disabled={disabled} placeholder="Es: Ti aspettiamo" style={inp} /></Field>
      <Field label={label} k="Nome evento"><input value={c.event_title || ''} onChange={e => patch('event_title', e.target.value)} disabled={disabled} placeholder="Es: Cena di gala" style={inp} /></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <Field label={label} k="Data"><input value={c.date || ''} onChange={e => patch('date', e.target.value)} disabled={disabled} type="date" style={inp} /></Field>
      <Field label={label} k="Ora"><input value={c.time || ''} onChange={e => patch('time', e.target.value)} disabled={disabled} placeholder="Es: 20:00" style={inp} /></Field>
      <Field label={label} k="Prezzo (€)"><input value={c.price || ''} onChange={e => patch('price', e.target.value)} disabled={disabled} placeholder="Es: 45" style={inp} /></Field>
    </div>
    <Field label={label} k="Luogo"><input value={c.location || ''} onChange={e => patch('location', e.target.value)} disabled={disabled} placeholder="Es: Sala principale" style={inp} /></Field>
    <Field label={label} k="Descrizione"><textarea value={c.text || ''} onChange={e => patch('text', e.target.value)} disabled={disabled} rows={4} placeholder="Descrizione dell'evento…" style={{ ...inp, resize: 'vertical' }} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label={label} k="Testo bottone"><input value={c.cta_text || ''} onChange={e => patch('cta_text', e.target.value)} disabled={disabled} placeholder="Es: Prenota il tuo posto" style={inp} /></Field>
      <Field label={label} k="URL bottone"><input value={c.cta_url || ''} onChange={e => patch('cta_url', e.target.value)} disabled={disabled} placeholder="https://…" style={inp} /></Field>
    </div>
  </>
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label: labelStyle, k, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={labelStyle}>{k}</span>
      {children}
    </div>
  )
}

function Modal({ onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: 16, padding: '28px 30px', zIndex: 101,
        width: '90%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        {children}
      </div>
    </>
  )
}

function FeedbackRow({ ok, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: ok ? '#38a169' : '#e53e3e' }}>
      {ok ? <CheckCircle size={15} strokeWidth={2} /> : <AlertCircle size={15} strokeWidth={2} />}
      {children}
    </div>
  )
}
