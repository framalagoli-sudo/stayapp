'use client'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import { ArrowLeft, Send, Eye, Save, Plus, Trash2, AlertCircle, CheckCircle, Smile, Clock, X, Monitor, Smartphone } from 'lucide-react'
import { buildNewsletterHtml, personalize } from '@/lib/newsletter-html'
import AiButton from '@/components/admin/AiButton'
import { perCampoDataOra, daCampoDataOra, oraLocale } from '@/lib/fuso'

const EMOJIS = [
  '🎯','⚡','🔥','✨','💫','🎉','🎁','🌟','💥','❗',
  '🌸','🌞','❄️','🍂','🌊','🌿','🌺','🎊','💎','🎭',
  '🏨','🏖️','✈️','🗺️','🛎️','🍾','🥂','🌴','👑','💌',
  '📢','📣','🔔','💡','🎈','🎀','🚀','💰','🎪','⭐',
]

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'semplice',   label: 'Semplice',   desc: 'Titolo, testo e un pulsante',            color: '#6366f1' },
  { id: 'promozione', label: 'Promozione', desc: 'Offerta con prezzo, sconto e pulsante',     color: '#f59e0b' },
  { id: 'notizie',    label: 'Notizie',    desc: 'Più notizie, ognuna con titolo, testo e foto',           color: '#10b981' },
  { id: 'evento',     label: 'Evento',     desc: 'Data, luogo, prezzo e bottone prenota',       color: '#ef4444' },
]

const DEFAULT_CONTENT = {
  semplice:   { heading: '', text: '', image_url: '', cta_text: '', cta_url: '' },
  promozione: { heading: '', badge: '', image_url: '', price_original: '', price_discounted: '', text: '', cta_text: '', cta_url: '', conditions: '' },
  notizie:    { heading: '', intro: '', blocks: [] },
  evento:     { heading: '', image_url: '', event_title: '', date: '', time: '', location: '', text: '', price: '', cta_text: '', cta_url: '' },
}

// Un esempio per modello: serve alle miniature e all'anteprima di una bozza
// ancora vuota. Parole che valgono per qualunque mestiere.
const FOTO_ESEMPIO = '/newsletter-esempio.svg'
const ESEMPI = {
  semplice:   { heading: 'Una novità per te', text: 'Ciao {{nome}}, abbiamo una notizia che ti farà piacere. Qui racconti in poche righe di che cosa si tratta e perché vale la pena.', image_url: FOTO_ESEMPIO, cta_text: 'Scopri di più', cta_url: '#' },
  promozione: { heading: 'Solo per questa settimana', badge: '-20%', image_url: FOTO_ESEMPIO, price_original: '50', price_discounted: '40', text: 'Un’offerta riservata a chi ci segue: descrivi cosa comprende e fino a quando vale.', cta_text: 'Approfitta ora', cta_url: '#', conditions: 'Valida fino a domenica, fino a esaurimento.' },
  notizie:    { heading: 'Le novità del mese', intro: 'Tre cose che sono successe da noi e che volevamo raccontarti.', blocks: [
    { id: 'a', title: 'La prima notizia', text: 'Due righe per dire di che cosa si tratta.', image_url: FOTO_ESEMPIO },
    { id: 'b', title: 'La seconda notizia', text: 'Ogni notizia ha il suo titolo, il suo testo e la sua foto.', image_url: FOTO_ESEMPIO },
    { id: 'c', title: 'La terza notizia', text: 'Puoi aggiungerne quante ne servono.', image_url: '' },
  ] },
  evento:     { heading: 'Sei dei nostri?', image_url: FOTO_ESEMPIO, event_title: 'Il nome della serata', date: '2026-12-12', time: '20:30', location: 'Dove si svolge', text: 'Che cosa succede, per chi è, e perché non perderlo.', price: '25', cta_text: 'Prenota il tuo posto', cta_url: '#' },
}
const NOMI_CAMPI = { heading: 'titolo', text: 'testo', image_url: 'immagine', cta_text: 'testo del pulsante', cta_url: 'link del pulsante', badge: 'etichetta dello sconto',
  price_original: 'prezzo pieno', price_discounted: 'prezzo scontato', conditions: 'condizioni', intro: 'introduzione', blocks: 'le notizie', event_title: 'nome dell’evento',
  date: 'data', time: 'ora', location: 'luogo', price: 'prezzo' }
const pieno = v => Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== ''

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsletterEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const { strutture, ristoranti, attivita, azienda, loading: aziLoading } = useAzienda()
  // L'ora della partenza è quella dell'azienda: chi programma un invio per le
  // 9 lo vuole alle 9 lì, anche se in quel momento si trova altrove.
  const fuso = azienda?.fuso_orario

  const [nl, setNl]           = useState(null)
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [tagFilter, setTagFilter] = useState([])
  const [templateId, setTemplateId] = useState('semplice')
  const [content, setContent] = useState(DEFAULT_CONTENT.semplice)
  const [entityTipo, setEntityTipo] = useState('struttura')
  const [entityId, setEntityId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saveTick, setSaveTick] = useState(null)
  // L'anteprima è accesa: chi scrive vede subito come arriverà. Su uno schermo
  // stretto le due colonne non ci stanno, quindi lì si alterna col pulsante.
  const [showPreview, setShowPreview] = useState(true)
  const [stretto, setStretto] = useState(false)
  const [vista, setVista] = useState('computer')
  const [anteprima, setAnteprima] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testModal, setTestModal] = useState(false)
  const [testState, setTestState] = useState('idle')
  const [sendState, setSendState] = useState('idle')
  const [recipientCount, setRecipientCount] = useState(null)
  // La lista di contatti a cui è destinata, se c'è (si sceglie dalla pagina Contatti).
  const [lista, setLista] = useState(null)
  const [destinatari, setDestinatari] = useState(null)   // { lista, problema } dal conto del server
  // Le liste fra cui scegliere, coi loro numeri: null = le sto leggendo, false = non ci sono riuscito.
  const [liste, setListe] = useState(null)
  const [sendConfirm, setSendConfirm] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const subjectRef = useRef(null)

  const isSent = nl?.status === 'sent'

  // Flatten all entities for the picker
  const allEntities = [
    ...(strutture || []).map(e => ({ id: e.id, tipo: 'struttura', label: e.name, logo: e.logo_url, colore: e.theme?.primaryColor })),
    ...(ristoranti || []).map(e => ({ id: e.id, tipo: 'ristorante', label: e.name, logo: e.logo_url, colore: e.theme?.primaryColor })),
    ...(attivita || []).map(e => ({ id: e.id, tipo: 'attivita', label: e.name, logo: e.logo_url, colore: e.theme?.primaryColor })),
  ]

  const currentEntity = allEntities.find(e => e.id === entityId) || null

  useEffect(() => {
    if (aziLoading) return
    apiFetch(`/api/newsletter/${id}`)
      .then(data => {
        setNl(data)
        setSubject(data.subject || '')
        setPreheader(data.preheader || '')
        // Nell'ora dell'azienda: è quella in cui il salvataggio la rilegge.
        // Tagliare la stringa dava l'ora UTC, e ogni salvataggio anticipava
        // l'invio di due ore.
        setScheduledAt(perCampoDataOra(data.scheduled_at, fuso))
        setTagFilter(data.tag_filter || [])
        setLista(data.lista || null)
        setTemplateId(data.template_id || 'semplice')
        setContent(data.content && Object.keys(data.content).length ? data.content : DEFAULT_CONTENT[data.template_id] || DEFAULT_CONTENT.semplice)
        setEntityTipo(data.entity_tipo || 'struttura')
        setEntityId(data.entity_id || '')
      })
      .catch(() => router.push('/admin/newsletter'))
      .finally(() => setLoading(false))
  }, [id, aziLoading, fuso])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    const segui = () => { setStretto(mq.matches); if (mq.matches) setShowPreview(false) }
    segui()
    mq.addEventListener('change', segui)
    return () => mq.removeEventListener('change', segui)
  }, [])

  // L'anteprima è l'email vera: la disegna `buildNewsletterHtml`, lo stesso
  // costruttore dell'invio, con logo, colore e dati legali dell'azienda.
  // ⛔ Prima c'era una copia scritta qui dentro: senza logo, con un altro piede
  // e nascosta dietro un pulsante. Due disegni della stessa email divergono.
  // «{{nome}}» diventa «Mario», come nell'email di prova. Si aspetta un attimo
  // dopo l'ultimo tasto, così non lampeggia a ogni lettera.
  const nomeMittente = currentEntity?.label || 'OltreNova'
  const disegna = useCallback((tid, c, pre = '') => buildNewsletterHtml({
    entityName: nomeMittente, entityLogo: currentEntity?.logo || null,
    primary: currentEntity?.colore || '#1a1a2e',
    template_id: tid, content: personalize(c, 'Mario'), preheader: pre,
    unsubscribeUrl: '#', legale: azienda || null, privacyUrl: currentEntity ? '#' : null,
  }).replace('<head>', '<head><base target="_blank">'), [nomeMittente, currentEntity?.logo, currentEntity?.colore, azienda])
  // Una bozza ancora vuota mostra l'esempio del modello: un'email bianca non
  // dice com'è fatta. Appena si scrive qualcosa, l'esempio lascia il posto.
  const bozzaVuota = !Object.values(content || {}).some(pieno)
  const miniature = useMemo(() => Object.fromEntries(TEMPLATES.map(t => [t.id, disegna(t.id, ESEMPI[t.id])])), [disegna])

  useEffect(() => {
    if (!nl) return
    let vivo = true
    apiFetch(`/api/newsletter/liste${nl.azienda_id ? `?azienda_id=${nl.azienda_id}` : ''}`)
      .then(d => { if (vivo) setListe(d) }).catch(() => { if (vivo) setListe(false) })
    return () => { vivo = false }
  }, [nl?.id])
  const listaScelta = lista?.chiave && liste ? liste.liste.find(l => l.chiave === lista.chiave) : null
  const listaSparita = !!(lista?.chiave && liste && !listaScelta)
  const gruppiListe = liste ? [...liste.liste.reduce((m, l) => m.set(l.gruppo, [...(m.get(l.gruppo) || []), l]), new Map())] : []
  useEffect(() => {
    const t = setTimeout(() => {
      // I link dell'anteprima non portano da nessuna parte: si guarda, non si naviga.
      setAnteprima(disegna(templateId, bozzaVuota ? ESEMPI[templateId] : content, preheader))
    }, 250)
    return () => clearTimeout(t)
  }, [templateId, content, preheader, disegna, bozzaVuota])

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
          scheduled_at: daCampoDataOra(scheduledAt, fuso)?.toISOString() || null,
          tag_filter: tagFilter.length ? tagFilter : null,
          lista,
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

  // Cambiando modello si tiene quello che il nuovo modello sa mostrare (titolo,
  // testo, immagine, pulsante…). Prima si azzerava tutto senza dire niente.
  function handleTemplateChange(tid) {
    if (isSent || tid === templateId) return
    const nuovo = { ...(DEFAULT_CONTENT[tid] || {}) }
    const persi = []
    for (const [k, v] of Object.entries(content || {})) {
      if (!pieno(v)) continue
      if (k in nuovo && !Array.isArray(nuovo[k]) && !Array.isArray(v)) nuovo[k] = v
      else persi.push(NOMI_CAMPI[k] || k)
    }
    if (persi.length && !window.confirm(`Il modello «${TEMPLATES.find(t => t.id === tid)?.label}» non ha: ${persi.join(', ')}.\nQuello che hai scritto lì andrà perso. Cambio modello?`)) return
    setTemplateId(tid)
    setContent(nuovo)
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
    // ⛔ Contava TUTTI gli iscritti, anche con un filtro: il numero letto non
    // era quello delle email che partivano. Ora lo dice il server, con lo
    // stesso conto dell'invio — e prima si salva, perché il conto si fa su
    // quello che è scritto nel database, non su quello che c'è a schermo.
    setSendConfirm(true)
    setRecipientCount(null); setDestinatari(null)
    try {
      await save()
      const d = await apiFetch(`/api/newsletter/${id}/destinatari`)
      setRecipientCount(d.quanti); setDestinatari(d)
    } catch { setRecipientCount('?') }
  }

  async function sendAll() {
    setSendState('loading')
    try {
      await save()
      const res = await apiFetch(`/api/newsletter/${id}/send`, { method: 'POST' })
      setSendState('ok')
      setTimeout(() => { setSendState('idle'); setSendConfirm(false); router.push('/admin/newsletter') }, 2500)
    } catch (e) { setSendState('error_' + e.message) }
  }

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Caricamento…</div>

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e0e0e0',
    fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  }
  const label = { display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => router.push('/admin/newsletter')}
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
            {showPreview ? (stretto ? 'Torna a scrivere' : 'Nascondi anteprima') : 'Anteprima'}
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

      <div style={{ display: 'grid', gridTemplateColumns: showPreview && !stretto ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 24 }}>
        {/* Left: editor */}
        <div style={{ display: showPreview && stretto ? 'none' : 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Oggetto + Preheader + Mittente + Schedule */}
          {/* 1 · A chi */}
          <Section title="A chi la mandi">
            {allEntities.length > 1 && (
              <div style={{ marginBottom: 14 }}>
                <span style={label}>Chi la manda</span>
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
            <div data-destinatari>
              <span style={label}>Destinatari</span>
              {isSent ? (
                <div style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 600, overflowWrap: 'anywhere' }}>{lista?.titolo || 'Tutti gli iscritti'}</div>
              ) : (
                <select data-scegli-lista value={lista?.chiave || ''} disabled={!liste} style={inp}
                  onChange={e => { const l = liste?.liste?.find(x => x.chiave === e.target.value); setLista(l ? { chiave: l.chiave, titolo: l.titolo } : null) }}>
                  <option value="">Tutti gli iscritti{liste ? ` — ${liste.tutti.raggiungibili}` : ''}</option>
                  {listaSparita && <option value={lista.chiave}>{lista.titolo || 'Lista scelta'} — non esiste più</option>}
                  {gruppiListe.map(([gruppo, voci]) => (
                    <optgroup key={gruppo} label={gruppo}>
                      {voci.map(l => <option key={l.chiave} value={l.chiave}>{l.titolo} — {l.raggiungibili} su {l.persone}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}
              {/* Il conto sta sempre a vista: avere un contatto non è potergli scrivere. */}
              {!isSent && (() => {
                const frase = stile => ({ fontSize: 13, lineHeight: 1.5, marginTop: 8, padding: '9px 12px', borderRadius: 8, overflowWrap: 'anywhere', ...stile })
                const rosso = { background: '#fff5f5', color: '#9b2c2c', border: '1px solid #fed7d7' }, verde = { background: '#f0f7f2', color: '#22543d', border: '1px solid #c6e6d0' }
                if (liste === null) return <div data-conto-destinatari style={frase({ color: '#767676', padding: 0 })}>Conto i destinatari…</div>
                if (liste === false) return <div data-conto-destinatari style={frase(rosso)}>Non riesco a leggere le liste in questo momento. Il numero lo vedrai comunque prima di inviare.</div>
                if (listaSparita) return <div data-conto-destinatari="0" style={frase(rosso)}>La lista «{lista.titolo}» non esiste più: scegline un’altra, oppure «Tutti gli iscritti».</div>
                const { persone, raggiungibili } = listaScelta || liste.tutti
                if (!raggiungibili) return <div data-conto-destinatari="0" style={frase(rosso)}>
                  {persone ? <>Non partirebbe a nessuno: {listaScelta ? (persone === 1 ? 'l’unica persona di questa lista non ha' : `nessuna delle ${persone} persone di questa lista ha`) : (persone === 1 ? 'il tuo unico contatto non ha' : `nessuno dei tuoi ${persone} contatti ha`)} dato il consenso a ricevere email.</> : 'Non hai ancora contatti a cui scrivere.'}
                </div>
                return <div data-conto-destinatari={raggiungibili} style={frase(verde)}>
                  La {raggiungibili === 1 ? 'riceverà' : 'riceveranno'} <strong>{raggiungibili}</strong> {raggiungibili === 1 ? 'persona' : 'persone'}
                  {listaScelta ? <> su {persone} di questa lista</> : <>: tutti gli iscritti, su {persone} {persone === 1 ? 'contatto' : 'contatti'}</>}.
                  {raggiungibili < persone && <> {persone - raggiungibili === 1 ? 'L’altra non ha' : 'Le altre non hanno'} dato il consenso a ricevere email.</>}
                </div>
              })()}
              {/* Il vecchio filtro per etichetta: non si sceglie più da qui, ma una bozza che lo ha lo dice. */}
              {!isSent && tagFilter.length > 0 && (
                <div data-filtro-storico style={{ fontSize: 12.5, color: '#744210', background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, padding: '8px 12px', marginTop: 8, lineHeight: 1.5 }}>
                  Questa bozza ha anche un vecchio filtro per etichetta ({tagFilter.join(', ')}): la riceve solo chi ha quell’etichetta, e il numero qui sopra non ne tiene conto.{' '}
                  <button type="button" onClick={() => setTagFilter([])} style={{ background: 'none', border: 'none', padding: 0, color: '#2b6cb0', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>Togli il filtro</button>
                </div>
              )}
            </div>
          </Section>

          {/* 2 · Che modello */}
          {!isSent && (
            <Section title="Modello">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} type="button" data-modello={t.id} aria-pressed={templateId === t.id} onClick={() => handleTemplateChange(t.id)} style={{
                    padding: 8, border: `2px solid ${templateId === t.id ? '#1a1a2e' : '#e8e8e8'}`,
                    borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left', minWidth: 0,
                  }}>
                    <MiniaturaModello html={miniature[t.id]} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 4px 2px' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{t.label}</span>
                      {templateId === t.id && <CheckCircle size={14} strokeWidth={1.5} color="#1a1a2e" />}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', lineHeight: 1.4, margin: '0 4px 4px' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* 3 · Cosa scrivi */}
          <Section title="Oggetto">
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={label}>Oggetto email</span>
                {!isSent && (
                  <AiButton
                    tipo="newsletter_oggetto"
                    nomeBusiness={currentEntity?.label || ''}
                    label="✨ Genera oggetto"
                    showTono={false}
                    placeholder="Es: offerta estate, news mensile, evento speciale…"
                    onInsert={t => setSubject(t)}
                  />
                )}
              </div>
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
                          display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, maxWidth: 320,
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
          </Section>

          {/* Content fields */}
          <Section title="Contenuto" extra={!isSent && templateId !== 'notizie' ? (
            <AiButton
              tipo="newsletter_corpo"
              nomeBusiness={currentEntity?.label || ''}
              contesto={subject ? `Oggetto: "${subject}"` : ''}
              temaSuggerito={subject || ''}
              label="✨ Genera testo"
              placeholder="Es: promozione weekend, notizie di settembre, evento speciale…"
              onInsert={t => patchContent('text', t)}
            />
          ) : null}>
            {templateId === 'semplice' && <SempliceFields c={content} patch={patchContent} inp={inp} label={label} disabled={isSent} />}
            {templateId === 'promozione' && <PromozioneFields c={content} patch={patchContent} inp={inp} label={label} disabled={isSent} />}
            {templateId === 'notizie' && <NotizieFIelds c={content} setContent={setContent} inp={inp} label={label} disabled={isSent} />}
            {templateId === 'evento' && <EventoFields c={content} patch={patchContent} inp={inp} label={label} disabled={isSent} />}
          </Section>

          {/* 4 · Quando parte */}
          {!isSent && (
            <Section title="Quando parte">
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
                    Programmata per {oraLocale(daCampoDataOra(scheduledAt, fuso), fuso, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
          )}

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
                <Send size={15} strokeWidth={2} /> Invia la newsletter
              </button>
            </div>
          )}
        </div>

        {/* Right: preview iframe */}
        {showPreview && (
          <div data-anteprima-newsletter style={{ position: stretto ? 'static' : 'sticky', top: 20, alignSelf: 'flex-start', width: '100%', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Come arriva</span>
              {!stretto && (
                <div style={{ display: 'flex', gap: 4, background: '#eee', borderRadius: 8, padding: 3 }}>
                  {[['computer', Monitor, 'Computer'], ['telefono', Smartphone, 'Telefono']].map(([k, Icona, nome]) => (
                    <button key={k} type="button" data-vista={k} onClick={() => setVista(k)} aria-pressed={vista === k}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: vista === k ? '#fff' : 'transparent', color: vista === k ? '#1a1a2e' : '#666' }}>
                      <Icona size={13} strokeWidth={1.5} /> {nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Com'è nella casella di posta, prima di aprirla: è lì che si decide se leggerla. */}
            <div data-riga-posta style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#767676', marginBottom: 4 }}>Nella casella di posta</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeMittente}</div>
              <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 600, color: subject.trim() ? '#1a1a2e' : '#b45309' }}>{personalize(subject, 'Mario').trim() || 'Manca l’oggetto'}</span>
                {preheader.trim() && <span style={{ color: '#767676' }}> — {personalize(preheader, 'Mario')}</span>}
              </div>
            </div>
            <div style={{ background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <iframe title="Anteprima dell’email" sandbox="" srcDoc={anteprima}
                style={{ width: vista === 'telefono' && !stretto ? 390 : '100%', maxWidth: '100%', height: 'max(480px, calc(100vh - 260px))', border: 'none', background: '#f5f5f5', display: 'block' }} />
            </div>
            <div style={{ fontSize: 12, color: '#767676', marginTop: 8, lineHeight: 1.5 }}>
              {bozzaVuota
                ? <span data-esempio>Questo è un <strong>esempio</strong> del modello, con il tuo logo e i tuoi dati: sparisce appena scrivi qualcosa.</span>
                : <>È l’email vera, con il tuo logo e i tuoi dati. Dove scrivi {'{{nome}}'} qui leggi «Mario»: a ognuno arriverà il suo.</>}
            </div>
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
              {destinatari?.problema ? (
                <span style={{ color: '#c53030' }}>{destinatari.problema}</span>
              ) : (
                <>Stai per inviare questa newsletter a <strong>{recipientCount}</strong> {recipientCount === 1 ? 'iscritto' : 'iscritti'}
                  {destinatari?.lista && <> della lista <strong>{destinatari.lista.titolo}</strong> ({destinatari.lista.persone} {destinatari.lista.persone === 1 ? 'persona' : 'persone'} in tutto: riceve solo chi ha dato il consenso)</>}
                  . L'operazione non è reversibile.</>
              )}
            </p>
          )}
          {sendState === 'ok' && <FeedbackRow ok>Newsletter inviata con successo!</FeedbackRow>}
          {sendState.startsWith('error') && <FeedbackRow>{sendState.replace('error_', '')}</FeedbackRow>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setSendConfirm(false); setSendState('idle') }} style={{
              flex: 1, padding: '11px', background: '#f5f5f5', color: '#555',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Annulla</button>
            <button onClick={sendAll} disabled={sendState === 'loading' || recipientCount === null || !recipientCount || !!destinatari?.problema} style={{
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      <Field label={label} k="Titolo offerta"><input value={c.heading || ''} onChange={e => patch('heading', e.target.value)} disabled={disabled} placeholder="Es: Offerta estate" style={inp} /></Field>
      <Field label={label} k="Badge (opzionale)"><input value={c.badge || ''} onChange={e => patch('badge', e.target.value)} disabled={disabled} placeholder="Es: Solo questo weekend" style={inp} /></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, alignItems: 'end' }}>
      <Field label={label} k="Prezzo originale (€)"><input value={c.price_original || ''} onChange={e => patch('price_original', e.target.value)} disabled={disabled} placeholder="Es: 150" style={inp} /></Field>
      <Field label={label} k={`Prezzo scontato (€)${pct ? ` — sconto ${pct}%` : ''}`}><input value={c.price_discounted || ''} onChange={e => patch('price_discounted', e.target.value)} disabled={disabled} placeholder="Es: 99" style={inp} /></Field>
    </div>
    <Field label={label} k="Descrizione"><textarea value={c.text || ''} onChange={e => patch('text', e.target.value)} disabled={disabled} rows={4} placeholder="Descrizione dell'offerta…" style={{ ...inp, resize: 'vertical' }} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      <Field label={label} k="Titoletto (opzionale)"><input value={c.heading || ''} onChange={e => patch('heading', e.target.value)} disabled={disabled} placeholder="Es: Ti aspettiamo" style={inp} /></Field>
      <Field label={label} k="Nome evento"><input value={c.event_title || ''} onChange={e => patch('event_title', e.target.value)} disabled={disabled} placeholder="Es: Cena di gala" style={inp} /></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      <Field label={label} k="Data"><input value={c.date || ''} onChange={e => patch('date', e.target.value)} disabled={disabled} type="date" style={inp} /></Field>
      <Field label={label} k="Ora"><input value={c.time || ''} onChange={e => patch('time', e.target.value)} disabled={disabled} placeholder="Es: 20:00" style={inp} /></Field>
      <Field label={label} k="Prezzo (€)"><input value={c.price || ''} onChange={e => patch('price', e.target.value)} disabled={disabled} placeholder="Es: 45" style={inp} /></Field>
    </div>
    <Field label={label} k="Luogo"><input value={c.location || ''} onChange={e => patch('location', e.target.value)} disabled={disabled} placeholder="Es: Sala principale" style={inp} /></Field>
    <Field label={label} k="Descrizione"><textarea value={c.text || ''} onChange={e => patch('text', e.target.value)} disabled={disabled} rows={4} placeholder="Descrizione dell'evento…" style={{ ...inp, resize: 'vertical' }} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      <Field label={label} k="Testo bottone"><input value={c.cta_text || ''} onChange={e => patch('cta_text', e.target.value)} disabled={disabled} placeholder="Es: Prenota il tuo posto" style={inp} /></Field>
      <Field label={label} k="URL bottone"><input value={c.cta_url || ''} onChange={e => patch('cta_url', e.target.value)} disabled={disabled} placeholder="https://…" style={inp} /></Field>
    </div>
  </>
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

// La miniatura di un modello: l'email vera, disegnata a 600px e rimpicciolita
// alla larghezza della scheda. Non si clicca e non si legge col lettore di
// schermo: è un'immagine, il nome del modello sta sotto.
function MiniaturaModello({ html }) {
  const ref = useRef(null)
  const [larga, setLarga] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLarga(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} aria-hidden="true" style={{ height: larga ? Math.round(larga * 1.05) : 180, overflow: 'hidden', borderRadius: 8, background: '#f5f5f5' }}>
      {larga > 0 && (
        <iframe title="" sandbox="" tabIndex={-1} srcDoc={html}
          style={{ width: 600, height: 640, border: 'none', display: 'block', transform: `scale(${larga / 600})`, transformOrigin: 'top left', pointerEvents: 'none' }} />
      )}
    </div>
  )
}

function Section({ title, children, extra }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</div>
        {extra}
      </div>
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
