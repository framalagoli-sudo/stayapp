import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useProperty } from '../../hooks/useProperty'
import { useAuth } from '../../context/AuthContext'
import {
  Save, Trash2, ArrowLeft, Calendar, AlertCircle, Sparkles, X,
  RefreshCw, Copy, Eye, Image, Search, Clock, Tag, CheckCircle, User, Layers, ExternalLink,
} from 'lucide-react'

const TIPI = [
  { key: 'post',           label: 'Post',       color: '#718096' },
  { key: 'reel',           label: 'Reel',       color: '#e53e3e' },
  { key: 'story',          label: 'Story',      color: '#ed8936' },
  { key: 'carosello',      label: 'Carosello',  color: '#38a169' },
  { key: 'video',          label: 'Video',      color: '#dd6b20' },
  { key: 'blog_post',      label: 'Blog Post',  color: '#0077b5' },
  { key: 'newsletter',     label: 'Newsletter', color: '#6366f1' },
  { key: 'evento',         label: 'Evento',     color: '#0ea5e9' },
  { key: 'ads',            label: 'Ads',        color: '#d97706' },
  { key: 'collaborazione', label: 'Collab.',    color: '#ec4899' },
]

// Mappa tipo → ref_tipo per il collegamento interno
const TIPO_REF = { blog_post: 'articolo', newsletter: 'newsletter', evento: 'evento' }

// Testi contestuali per ogni tipo di contenuto
const TIPO_COPY = {
  post:           { label: 'Testo del post',          placeholder: 'Scrivi il testo del post…',                   titolo_nuovo: 'Nuovo post',           titolo_modifica: 'Modifica post',           immagine: 'Immagine',                     distribuzione: null,               articolo: 'questo post' },
  reel:           { label: 'Script / didascalia',      placeholder: 'Hook, script voiceover, didascalia…',         titolo_nuovo: 'Nuovo reel',           titolo_modifica: 'Modifica reel',           immagine: 'Thumbnail',                    distribuzione: null,               articolo: 'questo reel' },
  story:          { label: 'Testo della story',        placeholder: 'Testo, CTA, sticker da usare…',               titolo_nuovo: 'Nuova story',          titolo_modifica: 'Modifica story',          immagine: 'Visual della story',           distribuzione: null,               articolo: 'questa story' },
  carosello:      { label: 'Testo del carosello',      placeholder: 'Testo slide 1, slide 2, CTA finale…',         titolo_nuovo: 'Nuovo carosello',      titolo_modifica: 'Modifica carosello',      immagine: 'Immagine prima slide',         distribuzione: null,               articolo: 'questo carosello' },
  video:          { label: 'Script / descrizione',     placeholder: 'Script del video o descrizione da caricare…', titolo_nuovo: 'Nuovo video',          titolo_modifica: 'Modifica video',          immagine: 'Thumbnail',                    distribuzione: null,               articolo: 'questo video' },
  blog_post:      { label: 'Abstract / introduzione',  placeholder: 'Breve abstract, angolazione, note SEO…',      titolo_nuovo: 'Nuovo blog post',      titolo_modifica: 'Modifica blog post',      immagine: 'Cover / immagine in evidenza', distribuzione: 'Blog',             articolo: 'questo blog post' },
  newsletter:     { label: 'Testo introduttivo',       placeholder: 'Intro, abstract o note della newsletter…',    titolo_nuovo: 'Nuova newsletter',     titolo_modifica: 'Modifica newsletter',     immagine: 'Immagine header',              distribuzione: 'Email / Newsletter', articolo: 'questa newsletter' },
  evento:         { label: 'Descrizione evento',       placeholder: 'Descrizione, dettagli pratici, CTA…',         titolo_nuovo: 'Nuovo evento',         titolo_modifica: 'Modifica evento',         immagine: 'Immagine evento',              distribuzione: 'Pagina evento',    articolo: 'questo evento' },
  ads:            { label: 'Copy dell\'ads',           placeholder: 'Headline, testo principale, CTA…',            titolo_nuovo: 'Nuovo ads',            titolo_modifica: 'Modifica ads',            immagine: 'Creative / visual',            distribuzione: null,               articolo: 'questo ads' },
  collaborazione: { label: 'Brief collaborazione',     placeholder: 'Brief, dettagli, requisiti, compenso…',       titolo_nuovo: 'Nuova collaborazione', titolo_modifica: 'Modifica collaborazione', immagine: 'Immagine',                     distribuzione: null,               articolo: 'questa collaborazione' },
}

function toEmbedUrl(url) {
  if (!url) return url
  // Canva: aggiunge ?embed se non già presente
  if (url.includes('canva.com/design') && !url.includes('embed')) {
    return url.includes('?') ? `${url}&embed` : `${url}?embed`
  }
  return url
}

const CANALI = [
  { key: 'instagram',       label: 'Instagram',       color: '#e1306c' },
  { key: 'facebook',        label: 'Facebook',         color: '#1877f2' },
  { key: 'linkedin',        label: 'LinkedIn',         color: '#0a66c2' },
  { key: 'tiktok',          label: 'TikTok',           color: '#010101' },
  { key: 'x',               label: 'X (Twitter)',      color: '#14171a' },
  { key: 'google_business', label: 'Google Business',  color: '#34a853' },
]

const TUTTI_STATI = [
  { key: 'bozza',        label: 'Bozza' },
  { key: 'in_revisione', label: 'In revisione' },
  { key: 'pianificato',  label: 'Pianificato' },
  { key: 'pubblicato',   label: 'Pubblicato' },
]
const STATI_STAFF = TUTTI_STATI.filter(s => s.key !== 'pubblicato')

const PILLARS = [
  { key: '',                 label: 'Nessuno' },
  { key: 'educativo',        label: 'Educativo' },
  { key: 'promozionale',     label: 'Promozionale' },
  { key: 'dietro_le_quinte', label: 'Dietro le quinte' },
  { key: 'testimonianza',    label: 'Testimonianza' },
  { key: 'ispirazione',      label: 'Ispirazione' },
  { key: 'annuncio',         label: 'Annuncio' },
]

const TONI = [
  { key: 'amichevole',    label: 'Amichevole' },
  { key: 'professionale', label: 'Professionale' },
  { key: 'entusiasta',    label: 'Entusiasta' },
  { key: 'informale',     label: 'Informale / divertente' },
]

// Limiti caratteri per canale
const CHAR_LIMITS = {
  instagram:       { max: 2200,  warn: 1800 },
  facebook:        { max: 63206, warn: 5000 },
  linkedin:        { max: 3000,  warn: 2500 },
  tiktok:          { max: 150,   warn: 120  },
  x:               { max: 280,   warn: 260  },
  google_business: { max: 1500,  warn: 1200 },
}

// Orari di maggiore engagement per canale (stime generali, sempre in ora locale)
const BEST_TIMES = {
  instagram:       '08–09, 12–13, 17–19',
  facebook:        '09–10, 13–14, 17–18',
  linkedin:        '07–08, 12–13, 17–18',
  tiktok:          '06–10, 19–23',
  x:               '08–10, 12–13, 17–18',
  google_business: '09–11, 13–15',
}

export default function PostEditorialePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = id === 'nuovo'
  const { property } = useProperty()
  const { profile } = useAuth()
  const isStaff = profile?.role === 'staff'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [saved, setSaved]     = useState(false)

  // Campi post
  const [titolo, setTitolo]         = useState('')
  const [testo, setTesto]           = useState('')
  const [canali, setCanali]         = useState([])
  const [dataPianificata, setData]  = useState(searchParams.get('data') || '')
  const [oraPianificata, setOra]    = useState('09:00')
  const [stato, setStato]           = useState('bozza')
  const [note, setNote]             = useState('')
  const [immagineUrl, setImmagine]  = useState('')
  const [designUrl, setDesignUrl]     = useState('')
  const [tipoContenuto, setTipo]      = useState('post')
  const [refId, setRefId]             = useState('')
  const [refs, setRefs]               = useState([])
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [pillar, setPillar]           = useState('')
  const [labels, setLabels]         = useState([])
  const [createdByName, setCreatedByName] = useState('')
  const [updatedByName, setUpdatedByName] = useState('')
  const [createdAt, setCreatedAt]         = useState('')
  const [updatedAt, setUpdatedAt]         = useState('')

  // Approvazione
  const [richiedeApprovazione, setRichiedeApprovazione] = useState(false)

  // Hashtag sets
  const [hashtagSets, setHashtagSets]       = useState([])
  const [showHashtagPanel, setShowHashtagPanel] = useState(false)
  const [showSaveSet, setShowSaveSet]       = useState(false)
  const [hashtagSaveName, setHashtagSaveName] = useState('')

  // Label input
  const [labelInput, setLabelInput] = useState('')

  // AI testo
  const [aiOpen, setAiOpen]               = useState(false)
  const [aiTema, setAiTema]               = useState('')
  const [aiTono, setAiTono]               = useState('amichevole')
  const [aiGenerating, setAiGenerating]   = useState(false)
  const [aiError, setAiError]             = useState('')
  const [aiResult, setAiResult]           = useState('')
  const [aiUsage, setAiUsage]             = useState(null)

  // Anteprima canale
  const [showPreview, setShowPreview]         = useState(false)
  // Anteprima design (Canva/Figma)
  const [showDesignPreview, setShowDesignPreview] = useState(false)

  // Ricerca foto Unsplash
  const [showPhotos, setShowPhotos]       = useState(false)
  const [photoQuery, setPhotoQuery]       = useState('')
  const [photos, setPhotos]               = useState([])
  const [photoLoading, setPhotoLoading]   = useState(false)
  const [photoError, setPhotoError]       = useState('')

  useEffect(() => {
    if (isNew) return
    apiFetch(`/api/piano-editoriale/${id}`)
      .then(p => {
        setTitolo(p.titolo || '')
        setTesto(p.testo || '')
        setCanali(p.canali || [])
        setStato(p.stato || 'bozza')
        setNote(p.note || '')
        setImmagine(p.immagine_url || '')
        setDesignUrl(p.design_url || '')
        setTipo(p.tipo_contenuto || 'post')
        setRefId(p.ref_id || '')
        setPillar(p.pillar || '')
        setLabels(p.labels || [])
        setRichiedeApprovazione(p.richiede_approvazione || false)
        setCreatedByName(p.created_by_name || '')
        setUpdatedByName(p.updated_by_name || '')
        setCreatedAt(p.created_at || '')
        setUpdatedAt(p.updated_at || '')
        if (p.data_pianificata) {
          const d = new Date(p.data_pianificata)
          setData(d.toISOString().slice(0, 10))
          setOra(d.toTimeString().slice(0, 5))
        }
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id, isNew])

  useEffect(() => {
    apiFetch('/api/piano-editoriale/hashtag-sets')
      .then(d => setHashtagSets(d || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const refTipo = TIPO_REF[tipoContenuto]
    if (!refTipo) { setRefs([]); return }
    setLoadingRefs(true)
    apiFetch(`/api/piano-editoriale/refs?tipo=${refTipo}`)
      .then(data => setRefs(data || []))
      .catch(() => setRefs([]))
      .finally(() => setLoadingRefs(false))
  }, [tipoContenuto])

  function toggleCanale(k) {
    setCanali(prev => prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k])
  }

  function buildDataPianificata() {
    if (!dataPianificata) return null
    return `${dataPianificata}T${oraPianificata}:00`
  }

  function addLabel() {
    const v = labelInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_àèìòù-]/g, '')
    if (v && !labels.includes(v)) setLabels(prev => [...prev, v])
    setLabelInput('')
  }

  function removeLabel(l) {
    setLabels(prev => prev.filter(x => x !== l))
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const refTipo = TIPO_REF[tipoContenuto] || null
    const body = { titolo, testo, canali, data_pianificata: buildDataPianificata(), stato, note, immagine_url: immagineUrl, labels, pillar, design_url: designUrl, tipo_contenuto: tipoContenuto, ref_id: refId || null, ref_tipo: refTipo, richiede_approvazione: richiedeApprovazione }
    try {
      if (isNew) {
        const created = await apiFetch('/api/piano-editoriale', { method: 'POST', body: JSON.stringify(body) })
        navigate(`/admin/piano-editoriale/${created.id}`, { replace: true })
      } else {
        await apiFetch(`/api/piano-editoriale/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Eliminare ${TIPO_COPY[tipoContenuto]?.articolo || 'questo contenuto'}?`)) return
    try {
      await apiFetch(`/api/piano-editoriale/${id}`, { method: 'DELETE' })
      navigate('/admin/piano-editoriale')
    } catch (e) { setError(e.message) }
  }

  async function handleDuplica() {
    try {
      const copy = await apiFetch(`/api/piano-editoriale/${id}/duplica`, { method: 'POST' })
      navigate(`/admin/piano-editoriale/${copy.id}`)
    } catch (e) { setError(e.message) }
  }

  function insertHashtagSet(set) {
    const str = set.tags.map(t => `#${t}`).join(' ')
    setTesto(prev => prev ? `${prev}\n${str}` : str)
    setShowHashtagPanel(false)
  }

  async function saveCurrentHashtagSet() {
    if (!hashtagSaveName.trim()) return
    const extracted = [...testo.matchAll(/#([a-zA-Z0-9_àèìòù]+)/g)].map(m => m[1].toLowerCase())
    const unique = [...new Set(extracted)]
    if (!unique.length) return
    try {
      const set = await apiFetch('/api/piano-editoriale/hashtag-sets', {
        method: 'POST',
        body: JSON.stringify({ nome: hashtagSaveName.trim(), canale: canali[0] || '', pillar, tags: unique }),
      })
      setHashtagSets(prev => [set, ...prev])
      setHashtagSaveName('')
      setShowSaveSet(false)
    } catch {}
  }

  async function deleteHashtagSet(id) {
    try {
      await apiFetch(`/api/piano-editoriale/hashtag-sets/${id}`, { method: 'DELETE' })
      setHashtagSets(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  async function generateAI() {
    if (!aiTema.trim()) return
    setAiGenerating(true); setAiError(''); setAiResult('')
    try {
      const res = await apiFetch('/api/ai/social-post', {
        method: 'POST',
        body: JSON.stringify({
          tema: aiTema,
          tono: aiTono,
          canale: canali[0] || 'instagram',
          nome_business: property?.name || '',
        }),
      })
      setAiResult(res.testo)
      setAiUsage(res.usage)
    } catch (e) { setAiError(e.message) }
    setAiGenerating(false)
  }

  async function searchPhotos() {
    if (!photoQuery.trim()) return
    setPhotoLoading(true); setPhotoError(''); setPhotos([])
    try {
      const data = await apiFetch(`/api/ai/unsplash?q=${encodeURIComponent(photoQuery.trim())}`)
      setPhotos(data)
    } catch (e) {
      setPhotoError(e.message.includes('503') ? 'Unsplash non configurato su Railway (UNSPLASH_ACCESS_KEY mancante)' : e.message)
    }
    setPhotoLoading(false)
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  const stati = (isStaff || richiedeApprovazione) ? STATI_STAFF : TUTTI_STATI
  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/piano-editoriale')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <Calendar size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          {isNew
            ? (TIPO_COPY[tipoContenuto]?.titolo_nuovo || 'Nuovo contenuto')
            : (titolo || TIPO_COPY[tipoContenuto]?.titolo_modifica || 'Modifica contenuto')}
        </h1>
        {!isNew && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDuplica}
              title="Duplica come nuova bozza"
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
            >
              <Copy size={14} strokeWidth={1.5} /> Duplica
            </button>
            <button onClick={handleDelete} style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#c53030' }}>
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 16 }}>

        {/* Titolo interno */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Titolo interno (non pubblicato)</label>
          <input
            value={titolo} onChange={e => setTitolo(e.target.value)}
            placeholder="Es. Post promozione estate"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {/* Tipo contenuto */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Tipo di contenuto</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TIPI.map(t => {
              const active = tipoContenuto === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setTipo(t.key); setRefId('') }}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                    borderColor: active ? t.color : '#eee',
                    background: active ? t.color : '#fff',
                    color: active ? '#fff' : '#555',
                    fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400,
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Collegamento interno opzionale */}
          {TIPO_REF[tipoContenuto] && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>
                Collega a {TIPO_REF[tipoContenuto] === 'articolo' ? 'un articolo del blog' : TIPO_REF[tipoContenuto] === 'newsletter' ? 'una newsletter' : 'un evento'} (opzionale)
              </label>
              <select
                value={refId}
                onChange={e => setRefId(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', color: refId ? '#1a1a2e' : '#aaa' }}
              >
                <option value="">— Nessun collegamento —</option>
                {loadingRefs && <option disabled>Caricamento…</option>}
                {refs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                {!loadingRefs && refs.length === 0 && <option disabled>Nessun contenuto trovato</option>}
              </select>
            </div>
          )}
        </div>

        {/* Testo */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#888' }}>{TIPO_COPY[tipoContenuto]?.label || 'Testo'}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: testo.length > 280 ? '#c53030' : testo.length > 200 ? '#d97706' : '#aaa' }}>
                {testo.length} car.
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <Eye size={11} strokeWidth={2} /> Anteprima
              </button>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'linear-gradient(135deg, #6c63ff, #48bfe3)', color: '#fff', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <Sparkles size={11} strokeWidth={2} /> Genera con AI
              </button>
            </div>
          </div>
          <textarea
            value={testo} onChange={e => setTesto(e.target.value)}
            rows={7} placeholder={TIPO_COPY[tipoContenuto]?.placeholder || 'Scrivi il contenuto…'}
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        </div>

        {/* Hashtag sets */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#888' }}>Set hashtag</label>
            <button
              type="button"
              onClick={() => { setShowHashtagPanel(p => !p); setShowSaveSet(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: showHashtagPanel ? '#1a1a2e' : '#f5f5f5', color: showHashtagPanel ? '#fff' : '#555', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              # Inserisci set
            </button>
            {testo.includes('#') && (
              <button
                type="button"
                onClick={() => { setShowSaveSet(p => !p); setShowHashtagPanel(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: showSaveSet ? '#1a1a2e' : '#f5f5f5', color: showSaveSet ? '#fff' : '#555', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                + Salva set
              </button>
            )}
          </div>

          {showHashtagPanel && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              {hashtagSets.length === 0 ? (
                <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Nessun set salvato. Scrivi hashtag nel testo e clicca "+ Salva set".</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {hashtagSets.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{s.nome}</span>
                        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
                          {s.tags.slice(0, 6).map(t => `#${t}`).join(' ')}{s.tags.length > 6 ? '…' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => insertHashtagSet(s)}
                        style={{ padding: '4px 10px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                      >
                        Inserisci
                      </button>
                      <button
                        onClick={() => deleteHashtagSet(s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2, flexShrink: 0, display: 'flex' }}
                      >
                        <X size={13} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showSaveSet && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                autoFocus
                value={hashtagSaveName}
                onChange={e => setHashtagSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCurrentHashtagSet() }}
                placeholder="Nome del set… es. Estate Instagram"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 12, boxSizing: 'border-box' }}
              />
              <button
                onClick={saveCurrentHashtagSet}
                disabled={!hashtagSaveName.trim()}
                style={{ padding: '7px 14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !hashtagSaveName.trim() ? 0.5 : 1, flexShrink: 0 }}
              >
                Salva
              </button>
              <button onClick={() => { setShowSaveSet(false); setHashtagSaveName('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Canali */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>
            {TIPO_COPY[tipoContenuto]?.distribuzione ? 'Distribuzione' : 'Canali'}
          </label>
          {TIPO_COPY[tipoContenuto]?.distribuzione ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                {TIPO_COPY[tipoContenuto].distribuzione}
              </span>
              <span style={{ fontSize: 12, color: '#aaa' }}>
                Puoi aggiungere canali social per la promozione
              </span>
            </div>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: TIPO_COPY[tipoContenuto]?.distribuzione ? 10 : 0 }}>
            {CANALI.map(c => {
              const active = canali.includes(c.key)
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCanale(c.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: active ? c.color : '#ddd',
                    background: active ? c.color : '#fff',
                    color: active ? '#fff' : '#555',
                    fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400,
                  }}
                >
                  {c.label}
                  {active && CHAR_LIMITS[c.key] && testo.length > CHAR_LIMITS[c.key].warn && (
                    <span style={{ marginLeft: 5, opacity: 0.85 }}>
                      {testo.length > CHAR_LIMITS[c.key].max ? '⚠' : '~'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Char limit summary per canali selezionati */}
          {canali.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {canali.map(k => {
                const lim = CHAR_LIMITS[k]
                if (!lim) return null
                const over  = testo.length > lim.max
                const warn  = testo.length > lim.warn
                const color = over ? '#c53030' : warn ? '#d97706' : '#22c55e'
                return (
                  <span key={k} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: over ? '#fff5f5' : warn ? '#fffbeb' : '#f0fdf4', color, fontWeight: 700 }}>
                    {CANALI.find(c => c.key === k)?.label}: {testo.length}/{lim.max}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Immagine + Unsplash */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#888' }}>{TIPO_COPY[tipoContenuto]?.immagine || 'Immagine'}</label>
            <button
              type="button"
              onClick={() => { setShowPhotos(p => !p); setPhotos([]); setPhotoError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <Search size={11} strokeWidth={2} /> Cerca su Unsplash
            </button>
          </div>
          <input
            value={immagineUrl} onChange={e => setImmagine(e.target.value)}
            placeholder="https://… URL immagine"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
          />
          {immagineUrl && (
            <img src={immagineUrl} alt="" style={{ marginTop: 8, maxHeight: 160, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee', maxWidth: '100%' }} onError={e => e.target.style.display = 'none'} />
          )}

          {/* Unsplash search panel */}
          {showPhotos && (
            <div style={{ marginTop: 12, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={photoQuery}
                  onChange={e => setPhotoQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPhotos()}
                  placeholder="Cerca foto… es. estate spiaggia, cibo ristorante"
                  style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' }}
                />
                <button
                  onClick={searchPhotos}
                  disabled={photoLoading || !photoQuery.trim()}
                  style={{ padding: '7px 14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !photoQuery.trim() ? 0.5 : 1 }}
                >
                  {photoLoading ? '…' : 'Cerca'}
                </button>
              </div>
              {photoError && (
                <p style={{ fontSize: 12, color: '#c53030', margin: '0 0 8px' }}>{photoError}</p>
              )}
              {photos.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {photos.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setImmagine(p.url); setShowPhotos(false) }}
                        style={{ borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.15s', aspectRatio: '16/9', position: 'relative' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <img src={p.thumb} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: '#aaa', margin: '8px 0 0' }}>Foto da Unsplash — credito automatico</p>
                </>
              )}
              {!photoLoading && photos.length === 0 && !photoError && photoQuery && (
                <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Nessun risultato</p>
              )}
            </div>
          )}
        </div>

        {/* Design URL */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Layers size={11} strokeWidth={2} /> Link design (Canva, Figma, Adobe…)
            </label>
            {designUrl && (
              <button
                type="button"
                onClick={() => setShowDesignPreview(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f0f0ff', color: '#6366f1', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <Eye size={11} strokeWidth={2} /> Apri anteprima
              </button>
            )}
          </div>
          <input
            value={designUrl} onChange={e => setDesignUrl(e.target.value)}
            placeholder="Incolla l'embed URL (Canva: Share → Embed → copia src)"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
          />
          {designUrl && (
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#bbb' }}>Per Canva: Share → Embed → copia l'URL src dell'iframe</span>
              <a href={designUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <ExternalLink size={10} strokeWidth={2} /> Apri
              </a>
            </div>
          )}
        </div>

        {/* Pillar */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Content pillar</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PILLARS.map(p => (
              <button
                key={p.key}
                onClick={() => setPillar(p.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                  borderColor: pillar === p.key ? '#1a1a2e' : '#eee',
                  background: pillar === p.key ? '#1a1a2e' : '#fff',
                  color: pillar === p.key ? '#fff' : '#555',
                  fontSize: 12, cursor: 'pointer', fontWeight: pillar === p.key ? 700 : 400,
                }}
              >
                {p.label || 'Nessuno'}
              </button>
            ))}
          </div>
        </div>

        {/* Labels */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>
            <Tag size={11} strokeWidth={2} style={{ verticalAlign: -1, marginRight: 4 }} />
            Label interne (campagne, prodotti…)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: labels.length ? 8 : 0 }}>
            {labels.map(l => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontWeight: 600 }}>
                #{l}
                <button onClick={() => removeLabel(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', lineHeight: 1, display: 'flex' }}>
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addLabel() } }}
              placeholder="campagna_estate, prodotto_x… Invio per aggiungere"
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 12, boxSizing: 'border-box' }}
            />
            <button
              onClick={addLabel}
              disabled={!labelInput.trim()}
              style={{ padding: '7px 12px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, opacity: !labelInput.trim() ? 0.5 : 1 }}
            >
              + Aggiungi
            </button>
          </div>
        </div>

        {/* Data, Ora, Stato */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 4 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Data pianificata</label>
            <input
              type="date" value={dataPianificata} onChange={e => setData(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Ora</label>
            <input
              type="time" value={oraPianificata} onChange={e => setOra(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Stato</label>
            <select
              value={stato} onChange={e => setStato(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
            >
              {stati.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Richiede approvazione */}
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setRichiedeApprovazione(p => !p)}
              style={{
                width: 36, height: 20, borderRadius: 20, flexShrink: 0,
                background: richiedeApprovazione ? '#f59e0b' : '#e5e7eb',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: richiedeApprovazione ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: richiedeApprovazione ? '#92400e' : '#555' }}>
                Richiede approvazione
              </span>
              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
                {richiedeApprovazione
                  ? 'Il contenuto deve essere approvato prima della pubblicazione'
                  : 'Pubblicazione libera'}
              </span>
            </div>
          </label>
        </div>

        {/* Best time to post */}
        {canali.length > 0 && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0f9ff', borderRadius: 8, borderLeft: '3px solid #0ea5e9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Clock size={12} strokeWidth={2} color="#0ea5e9" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Orari consigliati
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {canali.map(k => (
                <div key={k} style={{ fontSize: 11, color: '#555' }}>
                  <strong>{CANALI.find(c => c.key === k)?.label}:</strong>{' '}
                  <span style={{ color: '#0369a1' }}>{BEST_TIMES[k] || '—'}</span>
                  <span style={{ color: '#94a3b8', marginLeft: 4 }}>({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Note interne</label>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            rows={2} placeholder="Brief, link, hashtag, istruzioni grafiche…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Salva */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {!isNew && (createdByName || updatedByName) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {createdByName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
                <User size={11} strokeWidth={1.5} />
                <span>Creato da <strong style={{ color: '#666' }}>{createdByName}</strong>
                  {createdAt && <> · {new Date(createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                </span>
              </div>
            )}
            {updatedByName && updatedByName !== createdByName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
                <User size={11} strokeWidth={1.5} />
                <span>Modificato da <strong style={{ color: '#666' }}>{updatedByName}</strong>
                  {updatedAt && <> · {new Date(updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                </span>
              </div>
            )}
            {updatedByName && updatedByName === createdByName && updatedAt !== createdAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
                <span>Ultima modifica · {new Date(updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        ) : <div />}
        <button
          onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: saved ? '#059669' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}
        >
          {saved ? <><CheckCircle size={15} strokeWidth={1.5} /> Salvato</> : <><Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : 'Salva'}</>}
        </button>
      </div>

      {/* Modal AI */}
      {aiOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6c63ff, #48bfe3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Genera con AI</div>
                  {aiUsage && <div style={{ fontSize: 11, color: '#aaa' }}>{aiUsage.remaining}/{aiUsage.limit} generazioni rimaste</div>}
                </div>
              </div>
              <button onClick={() => { setAiOpen(false); setAiResult(''); setAiError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {canali.length > 0 && (
              <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                Canale: <strong>{CANALI.find(c => c.key === canali[0])?.label || canali[0]}</strong>
                {canali.length > 1 && <span style={{ color: '#aaa' }}> (verrà usato il primo)</span>}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Tema / brief *</label>
              <textarea
                value={aiTema} onChange={e => setAiTema(e.target.value)}
                placeholder="Es: Promozione weekend estivo con sconto 20%…"
                rows={3}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 }}>Tono</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TONI.map(t => (
                  <button key={t.key} type="button" onClick={() => setAiTono(t.key)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid', borderColor: aiTono === t.key ? '#6c63ff' : '#ddd', background: aiTono === t.key ? '#f0efff' : '#fff', color: aiTono === t.key ? '#6c63ff' : '#555', fontSize: 12, fontWeight: aiTono === t.key ? 700 : 400, cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {aiError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                <AlertCircle size={14} strokeWidth={1.5} /> {aiError}
              </div>
            )}

            {aiResult ? (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Testo generato</div>
                <textarea
                  value={aiResult} onChange={e => setAiResult(e.target.value)}
                  rows={7}
                  style={{ width: '100%', background: '#f8f8ff', border: '1.5px solid #e0deff', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, color: '#333', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => { setTesto(aiResult); setAiOpen(false); setAiResult(''); setAiTema('') }}
                    style={{ flex: 1, padding: '9px 0', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Usa questo testo
                  </button>
                  <button onClick={generateAI} disabled={aiGenerating}
                    style={{ padding: '9px 14px', background: '#f0efff', color: '#6c63ff', border: '1.5px solid #e0deff', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    <RefreshCw size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={generateAI} disabled={aiGenerating || !aiTema.trim()}
                style={{ width: '100%', padding: '10px 0', background: aiGenerating || !aiTema.trim() ? '#ccc' : 'linear-gradient(135deg, #6c63ff, #48bfe3)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: aiGenerating || !aiTema.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {aiGenerating ? <><RefreshCw size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Generazione…</> : <><Sparkles size={15} strokeWidth={2} /> Genera post</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Anteprima design */}
      {showDesignPreview && designUrl && (
        <div onClick={() => setShowDesignPreview(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '92vw', height: '92vh', background: '#1a1a2e', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1a1a2e', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} strokeWidth={1.5} color="#a5b4fc" /> Anteprima design
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={designUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                >
                  <ExternalLink size={12} strokeWidth={2} /> Apri in nuova tab
                </a>
                <button onClick={() => setShowDesignPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <iframe
              src={toEmbedUrl(designUrl)}
              style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
              allowFullScreen
              title="Anteprima design"
            />
          </div>
        </div>
      )}

      {/* Modal Anteprima per canale */}
      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowPreview(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }}>
              <X size={18} strokeWidth={1.5} />
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 20 }}>Anteprima per canale</div>

            {canali.length === 0 && (
              <p style={{ color: '#aaa', fontSize: 13 }}>Nessun canale selezionato</p>
            )}

            {canali.map(k => {
              const info  = CANALI.find(c => c.key === k)
              const lim   = CHAR_LIMITS[k]
              if (!info) return null
              const len   = testo.length
              const over  = lim && len > lim.max
              const warn  = lim && len > lim.warn
              const pct   = lim ? Math.min(100, (len / lim.max) * 100) : 0
              const barColor = over ? '#ef4444' : warn ? '#f59e0b' : '#22c55e'
              return (
                <div key={k} style={{ marginBottom: 20, border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Channel header */}
                  <div style={{ background: info.color, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{info.label}</span>
                    {lim && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: over ? '#fca5a5' : warn ? '#fde68a' : '#bbf7d0' }}>
                        {len} / {lim.max} {over ? '⚠ OVER LIMIT' : ''}
                      </span>
                    )}
                  </div>
                  {/* Barra */}
                  {lim && (
                    <div style={{ height: 3, background: '#f0f0f0' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.2s' }} />
                    </div>
                  )}
                  {/* Content */}
                  <div style={{ padding: 14, background: '#fafafa' }}>
                    {immagineUrl && (
                      <img src={immagineUrl} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block' }} onError={e => e.target.style.display = 'none'} />
                    )}
                    <p style={{ margin: 0, fontSize: 13, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {over
                        ? <><span>{testo.slice(0, lim.max)}</span><span style={{ background: '#fca5a5', color: '#7f1d1d' }}>{testo.slice(lim.max)}</span></>
                        : testo || <span style={{ color: '#ccc' }}>Testo vuoto</span>
                      }
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
