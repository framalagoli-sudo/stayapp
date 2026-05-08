import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

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
  const [entity, setEntity] = useState(null)
  const [offerta, setOfferta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    apiFetch(`/api/guest/${slug}`)
      .then(data => {
        setEntity(data)
        const promo = (data.minisito?.promozioni || []).find(p => p.id === id)
        setOfferta(promo || null)
      })
      .finally(() => setLoading(false))
  }, [slug, id])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Caricamento…</div>
  if (!offerta) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16 }}>
      <p>Offerta non trovata.</p>
      <button onClick={() => navigate(`/s/${slug}`)} style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Torna al sito</button>
    </div>
  )

  const theme    = entity.theme || {}
  const primary  = theme.primaryColor || '#1a1a2e'
  const heading  = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const gallery  = (offerta.gallery || []).filter(Boolean)

  function formatDate(d) {
    if (!d) return null
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 20px 80px' }}>
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
          <div style={{ padding: '16px 20px', background: '#f9f9fb', borderRadius: 10, marginBottom: 28, fontSize: 13, color: '#888', lineHeight: 1.6, borderLeft: `3px solid #ddd` }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#666' }}>Note e condizioni</strong>
            {offerta.conditions}
          </div>
        )}

        {/* CTA */}
        {offerta.cta_label && offerta.cta_url && (
          <a href={offerta.cta_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '16px 32px', background: primary, color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
            {offerta.cta_label}
          </a>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <X size={20} />
          </button>
          {lightbox > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ChevronLeft size={24} />
            </button>
          )}
          <img src={gallery[lightbox]} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
          {lightbox < gallery.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
