import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { guestFetch } from '../../lib/api'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, X, Send } from 'lucide-react'

const HEADING_FAMILIES = {
  playfair:   "'Playfair Display', Georgia, serif",
  cormorant:  "'Cormorant Garamond', Georgia, serif",
  raleway:    "'Raleway', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  nunito:     "'Nunito', system-ui, sans-serif",
  'dm-sans':  "'DM Sans', system-ui, sans-serif",
}

export default function OffertaPage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const [entity,      setEntity]      = useState(null)
  const [offerta,     setOfferta]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [lightbox,    setLightbox]    = useState(null)
  const [sheetOpen,   setSheetOpen]   = useState(false)

  useEffect(() => {
    guestFetch(`/api/guest/${slug}`)
      .then(data => {
        setEntity(data)
        const promo = (data.minisito?.promozioni || []).find(p => p.id === id)
        setOfferta(promo || null)
      })
      .finally(() => setLoading(false))
  }, [slug, id])

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Caricamento…</div>
  if (!offerta) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16 }}>
      <p>Offerta non trovata.</p>
      <button onClick={() => navigate(`/s/${slug}`)} style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Torna al sito</button>
    </div>
  )

  const theme      = entity.theme || {}
  const primary    = theme.primaryColor || '#1a1a2e'
  const heading    = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const gallery    = (offerta.gallery || []).filter(Boolean)
  const privacyUrl = `/s/${slug}/privacy`

  function formatDate(d) {
    if (!d) return null
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 88 }}>
      {/* Back button */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f0f0f0', padding: '14px 20px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 14, fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={18} strokeWidth={2} />
          Torna indietro
        </button>
      </div>

      {/* Cover */}
      {offerta.cover_url && (
        <div style={{ width: '100%', height: 'clamp(220px, 40vw, 420px)', overflow: 'hidden', position: 'relative' }}>
          <img src={offerta.cover_url} alt={offerta.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 20px 0' }}>
        {offerta.badge && (
          <span style={{ display: 'inline-block', background: `${primary}18`, color: primary, fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>
            {offerta.badge}
          </span>
        )}

        <h1 style={{ fontFamily: heading, fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 12, lineHeight: 1.2 }}>
          {offerta.title}
        </h1>

        {offerta.text && (
          <p style={{ fontSize: 18, color: '#666', lineHeight: 1.7, marginBottom: 24 }}>{offerta.text}</p>
        )}

        {/* Prezzo */}
        {(offerta.price_original || offerta.price_discounted) && (() => {
          const orig = offerta.price_original
          const disc = offerta.price_discounted
          const pct  = orig && disc ? Math.round((1 - parseFloat(disc) / parseFloat(orig)) * 100) : null
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              <span style={{ fontFamily: heading, fontSize: 40, fontWeight: 800, color: primary, lineHeight: 1 }}>
                €{disc || orig}
              </span>
              {disc && orig && (
                <span style={{ fontSize: 22, color: '#bbb', textDecoration: 'line-through', fontWeight: 500 }}>€{orig}</span>
              )}
              {pct > 0 && (
                <span style={{ background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 800, padding: '6px 14px', borderRadius: 20 }}>-{pct}%</span>
              )}
            </div>
          )
        })()}

        {/* Date validità */}
        {(offerta.valid_from || offerta.expires_at) && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28, padding: '16px 20px', background: '#f9f9fb', borderRadius: 12 }}>
            {offerta.valid_from && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#555' }}>
                <Calendar size={16} strokeWidth={1.5} color={primary} />
                <span>Dal <strong>{formatDate(offerta.valid_from)}</strong></span>
              </div>
            )}
            {offerta.expires_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#555' }}>
                <Calendar size={16} strokeWidth={1.5} color={primary} />
                <span>Al <strong>{formatDate(offerta.expires_at)}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Descrizione dettagliata */}
        {offerta.description_full && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ width: 48, height: 3, background: primary, borderRadius: 2, marginBottom: 20 }} />
            <div style={{ fontSize: 16, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {offerta.description_full}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Galleria</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {gallery.map((url, i) => (
                <div key={i} onClick={() => setLightbox(i)}
                  style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: 12, cursor: 'zoom-in' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Condizioni */}
        {offerta.conditions && (
          <div style={{ padding: '16px 20px', background: '#f9f9fb', borderRadius: 10, marginBottom: 36, fontSize: 13, color: '#888', lineHeight: 1.6, borderLeft: '3px solid #ddd' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#666' }}>Note e condizioni</strong>
            {offerta.conditions}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid #f0f0f0',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{offerta.title}</div>
          {(offerta.price_discounted || offerta.price_original) && (
            <div style={{ fontSize: 13, color: primary, fontWeight: 700 }}>€{offerta.price_discounted || offerta.price_original}</div>
          )}
        </div>
        <button onClick={() => setSheetOpen(true)}
          style={{ flexShrink: 0, padding: '12px 24px', background: primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={15} strokeWidth={2} />
          Sono interessato
        </button>
      </div>

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
            background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            animation: 'slideUp 0.25s ease',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 4 }} />
            </div>
            <div style={{ padding: '8px 24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontFamily: heading, fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Sono interessato</h2>
                <button onClick={() => setSheetOpen(false)}
                  style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} strokeWidth={2} color="#555" />
                </button>
              </div>
              <InterestForm
                entityTipo="struttura"
                entityId={entity.id}
                offertaTitle={offerta.title}
                primary={primary}
                privacyUrl={privacyUrl}
                onSuccess={() => setTimeout(() => setSheetOpen(false), 2000)}
              />
            </div>
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color="#fff" />
          </button>
          {lightbox > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={24} color="#fff" />
            </button>
          )}
          <img src={gallery[lightbox]} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
          {lightbox < gallery.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={24} color="#fff" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function InterestForm({ entityTipo, entityId, offertaTitle, primary, privacyUrl, onSuccess }) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState(`Sono interessato all'offerta: ${offertaTitle}`)
  const [privacy, setPrivacy] = useState(false)
  const [state,   setState]   = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!privacy) return
    setState('loading')
    try {
      await guestFetch('/api/guest/contact', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, name, email, message, source: 'offerta', source_name: offertaTitle }),
      })
      setState('success')
      onSuccess?.()
    } catch { setState('error') }
  }

  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid #e0e0e0', fontSize: 15, boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none', marginBottom: 14,
    background: '#fff', color: '#1a1a2e',
  }

  if (state === 'success') return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
      <p style={{ fontWeight: 700, fontSize: 18, color: primary, marginBottom: 6 }}>Richiesta inviata!</p>
      <p style={{ color: '#888', fontSize: 14 }}>Ti risponderemo il prima possibile.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 20, marginTop: 0 }}>Lascia i tuoi contatti, ti risponderemo al più presto.</p>
      <input value={name} onChange={e => setName(e.target.value)} required placeholder="Il tuo nome" style={inp} />
      <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="La tua email" style={inp} />
      <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3}
        style={{ ...inp, resize: 'vertical', marginBottom: 16 }} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} required
          style={{ marginTop: 2, accentColor: primary, flexShrink: 0 }} />
        <span>
          Ho letto e accetto la{' '}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary, fontWeight: 600 }}>Privacy Policy</a>
          {' '}ai sensi del GDPR.
        </span>
      </label>
      {state === 'error' && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 12 }}>Errore nell'invio. Riprova.</p>}
      <button type="submit" disabled={state === 'loading' || !privacy}
        style={{ width: '100%', padding: '15px', background: privacy ? primary : '#ccc', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: privacy ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 0.2s' }}>
        <Send size={18} strokeWidth={2} />
        {state === 'loading' ? 'Invio in corso…' : 'Invia richiesta'}
      </button>
    </form>
  )
}
