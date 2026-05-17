import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../../lib/api'
import { X, Download, CalendarPlus, Sparkles, Check, AlertCircle, Image } from 'lucide-react'

const FORMATI = [
  { k: '1:1',  label: 'Feed',      w: 1080, h: 1080 },
  { k: '4:5',  label: 'Portrait',  w: 1080, h: 1350 },
  { k: '9:16', label: 'Story',     w: 1080, h: 1920 },
  { k: '16:9', label: 'Cover',     w: 1920, h: 1080 },
]

const CANALI = [
  { k: 'instagram', label: 'Instagram', color: '#E1306C' },
  { k: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { k: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2' },
  { k: 'tiktok',    label: 'TikTok',    color: '#010101' },
]

const PRESET_COLORS = ['#1a1a2e', '#2d6a4f', '#1a508b', '#6b21a8', '#9d0208', '#b5451b', '#2c2c2c']

const DISPLAY_W = 270 // preview canvas width in px

// ── Canvas helpers ────────────────────────────────────────────────────────────

function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(' ')
  const lines = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = w
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function darken(hex, f = 0.45) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.floor(r * (1 - f))},${Math.floor(g * (1 - f))},${Math.floor(b * (1 - f))})`
}

function drawPost(ctx, W, H, img, color, title, subtitle) {
  ctx.clearRect(0, 0, W, H)

  // Background: photo or color gradient
  if (img) {
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
    const iw = img.naturalWidth * s
    const ih = img.naturalHeight * s
    ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih)
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, color)
    g.addColorStop(1, darken(color))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // Dark gradient overlay (bottom 70%)
  const ov = ctx.createLinearGradient(0, H * 0.3, 0, H)
  ov.addColorStop(0, 'rgba(0,0,0,0)')
  ov.addColorStop(1, 'rgba(0,0,0,0.80)')
  ctx.fillStyle = ov
  ctx.fillRect(0, 0, W, H)

  // Bottom brand color strip (5% height)
  const stripH = Math.max(H * 0.055, 5)
  ctx.fillStyle = color
  ctx.fillRect(0, H - stripH, W, stripH)

  // Text positioning
  const pad = W * 0.07
  const titleSize = W * 0.062
  const subSize   = W * 0.038
  const lineH     = titleSize * 1.25

  // Draw subtitle (price/date) above strip
  let bottomY = H - stripH - pad * 0.5
  if (subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = `${subSize}px system-ui,-apple-system,sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(subtitle, pad, bottomY)
    bottomY -= subSize * 1.3
  }

  // Draw title (wrapped, white bold)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${titleSize}px system-ui,-apple-system,sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  const lines = wrapText(ctx, title || '', W - pad * 2)
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], pad, bottomY)
    bottomY -= lineH
  }
}

// ── Hook: load image safely ───────────────────────────────────────────────────

function useRemoteImage(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!src) { setImg(null); return }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload  = () => setImg(image)
    image.onerror = () => setImg(null)
    image.src = src
  }, [src])
  return img
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function PostSocialModal({ isOpen, onClose, titolo, sottotitolo, immagine, tipo, nomeBusiness }) {
  const canvasRef  = useRef(null)
  const exportRef  = useRef(null) // hidden full-res canvas

  const [formato,  setFormato]  = useState('1:1')
  const [colore,   setColore]   = useState('#1a1a2e')
  const [canale,   setCanale]   = useState('instagram')
  const [caption,  setCaption]  = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError,  setAiError]  = useState('')
  const [adding,   setAdding]   = useState(false)
  const [added,    setAdded]    = useState(false)
  const [addError, setAddError] = useState('')

  const img = useRemoteImage(immagine)
  const fmt = FORMATI.find(f => f.k === formato)

  // Display dimensions
  const dispH = Math.round(DISPLAY_W * fmt.h / fmt.w)

  // Draw preview whenever inputs change
  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    cv.width  = DISPLAY_W
    cv.height = dispH
    const ctx = cv.getContext('2d')
    drawPost(ctx, DISPLAY_W, dispH, img, colore, titolo, sottotitolo)
  }, [img, colore, titolo, sottotitolo, dispH])

  useEffect(() => { redraw() }, [redraw])

  // Generate AI caption
  async function generaCaption() {
    setLoadingAI(true); setAiError('')
    try {
      const { varianti } = await apiFetch('/api/content-studio/caption', {
        method: 'POST',
        body: JSON.stringify({
          piattaforma: canale,
          topic: titolo,
          contesto: [sottotitolo, tipo && `Tipo: ${tipo}`].filter(Boolean).join(' | '),
          pillar: '',
        }),
      })
      if (varianti?.[0]) setCaption(varianti[0].testo + '\n\n' + (varianti[0].hashtag || []).join(' '))
    } catch (e) { setAiError(e.message) }
    setLoadingAI(false)
  }

  // Download PNG at full resolution
  function scarica() {
    const cv = document.createElement('canvas')
    cv.width  = fmt.w
    cv.height = fmt.h
    const ctx = cv.getContext('2d')
    drawPost(ctx, fmt.w, fmt.h, img, colore, titolo, sottotitolo)
    const link = document.createElement('a')
    link.download = `post-${formato.replace(':', 'x')}-${Date.now()}.png`
    link.href = cv.toDataURL('image/png')
    link.click()
  }

  // Create draft in piano_editoriale
  async function aggiungiAlPiano() {
    setAdding(true); setAddError(''); setAdded(false)
    try {
      await apiFetch('/api/piano-editoriale', {
        method: 'POST',
        body: JSON.stringify({
          titolo: titolo || 'Post social',
          testo: caption,
          canali: [canale],
          immagine_url: immagine || '',
          stato: 'bozza',
          data_pianificata: null,
          note: sottotitolo || '',
        }),
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch (e) { setAddError(e.message) }
    setAdding(false)
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: '1px solid #f0f0f0' }}>
          <Image size={18} strokeWidth={1.5} color="#1a1a2e" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Crea post grafico</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{titolo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} strokeWidth={1.5} color="#888" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 0 }}>

          {/* LEFT: canvas + controls */}
          <div style={{ padding: '20px 22px', borderRight: '1px solid #f5f5f5' }}>

            {/* Canvas preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <canvas ref={canvasRef} style={{ borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'block' }} />
            </div>

            {!immagine && (
              <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 12 }}>
                Nessuna immagine — aggiungila nel contenuto per vederla nel post
              </p>
            )}

            {/* Format selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Formato</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {FORMATI.map(f => (
                  <button key={f.k} onClick={() => setFormato(f.k)} style={{
                    flex: 1, padding: '7px 4px', border: '1.5px solid', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    borderColor: formato === f.k ? '#1a1a2e' : '#e5e5e5',
                    background: formato === f.k ? '#1a1a2e' : '#fff',
                    color: formato === f.k ? '#fff' : '#555',
                  }}>
                    {f.label}<br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{f.k}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Colore brand</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColore(c)} style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    outline: colore === c ? `2.5px solid ${c}` : 'none',
                    outlineOffset: 2, boxShadow: colore === c ? `0 0 0 1px #fff` : 'none',
                  }} />
                ))}
                <input type="color" value={colore} onChange={e => setColore(e.target.value)}
                  title="Colore personalizzato"
                  style={{ width: 26, height: 26, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
              </div>
            </div>
          </div>

          {/* RIGHT: caption + channel + actions */}
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Channel selector */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Piattaforma</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CANALI.map(c => (
                  <button key={c.k} onClick={() => setCanale(c.k)} style={{
                    padding: '5px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    borderColor: canale === c.k ? c.color : '#e5e5e5',
                    background: canale === c.k ? c.color + '18' : '#fff',
                    color: canale === c.k ? c.color : '#666',
                  }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Caption</div>
                <button onClick={generaCaption} disabled={loadingAI} style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: loadingAI ? '#f5f5f7' : '#f0f0f8',
                  border: 'none', borderRadius: 6, padding: '4px 10px', cursor: loadingAI ? 'default' : 'pointer',
                  fontSize: 11, fontWeight: 600, color: '#5a5a8e',
                }}>
                  <Sparkles size={11} strokeWidth={1.5} />
                  {loadingAI ? 'Generando…' : '✨ Genera AI'}
                </button>
              </div>
              {aiError && (
                <div style={{ fontSize: 11, color: '#c53030', marginBottom: 6, display: 'flex', gap: 4 }}>
                  <AlertCircle size={11} strokeWidth={1.5} /> {aiError}
                </div>
              )}
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={7}
                placeholder="Scrivi o genera la caption con AI…"
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {addError && (
                <div style={{ fontSize: 12, color: '#c53030', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <AlertCircle size={12} strokeWidth={1.5} /> {addError}
                </div>
              )}

              <button onClick={aggiungiAlPiano} disabled={adding} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: added ? '#f0fff4' : '#1a1a2e', color: added ? '#276749' : '#fff',
                border: added ? '1px solid #c6f6d5' : 'none',
                borderRadius: 10, padding: '11px 18px', cursor: adding ? 'default' : 'pointer',
                fontWeight: 700, fontSize: 13,
              }}>
                {added
                  ? <><Check size={15} strokeWidth={2} /> Aggiunto al piano!</>
                  : adding
                    ? 'Aggiunta in corso…'
                    : <><CalendarPlus size={15} strokeWidth={1.5} /> Aggiungi al piano editoriale</>
                }
              </button>

              <button onClick={scarica} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#fff', color: '#333', border: '1.5px solid #e5e5e5',
                borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
              }}>
                <Download size={14} strokeWidth={1.5} /> Scarica PNG ({fmt.w}×{fmt.h})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
