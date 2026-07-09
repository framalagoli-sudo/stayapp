'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { guestFetch } from '@/lib/api'
import { ArrowLeft, Clock, Calendar, Users, ChevronLeft, ChevronRight, X } from 'lucide-react'

const HEADING_FAMILIES = {
  playfair:   "'Playfair Display', Georgia, serif",
  cormorant:  "'Cormorant Garamond', Georgia, serif",
  raleway:    "'Raleway', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  nunito:     "'Nunito', system-ui, sans-serif",
  'dm-sans':  "'DM Sans', system-ui, sans-serif",
}

export default function PacchettoPage() {
  const { slug, id } = useParams()
  const router = useRouter()

  // Ritorno: history se disponibile, altrimenti la home dell'entità ricavata dal path.
  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) { router.back(); return }
    const m = typeof window !== 'undefined' ? window.location.pathname.match(/^(\/(?:s|r|a)\/[^/]+)/) : null
    router.push(m ? m[1] : '/')
  }

  const [entity, setEntity] = useState(null)
  const [pacchetto, setPacchetto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    guestFetch(`/api/guest/${slug}`)
      .then(data => {
        setEntity(data)
        const p = (data.minisito?.pacchetti || []).find(p => p.id === id)
        setPacchetto(p || null)
      })
      .finally(() => setLoading(false))
  }, [slug, id])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Caricamento…</div>
  if (!pacchetto) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16 }}>
      <p>Pacchetto non trovato.</p>
      <button onClick={() => router.push(`/s/${slug}`)} style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Torna al sito</button>
    </div>
  )

  const theme   = entity.theme || {}
  const primary = theme.primaryColor || '#1a1a2e'
  const heading = HEADING_FAMILIES[theme.fontHeading] || HEADING_FAMILIES.playfair
  const gallery = (pacchetto.gallery || []).filter(Boolean)
  const includes = (pacchetto.includes || []).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back button */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f0f0f0', padding: '14px 20px' }}>
        <button onClick={goBack}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 14, fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={18} strokeWidth={2} />
          Torna indietro
        </button>
      </div>

      {/* Cover */}
      {pacchetto.cover_url && (
        <div style={{ width: '100%', height: 'clamp(220px, 40vw, 420px)', overflow: 'hidden', position: 'relative' }}>
          <img src={pacchetto.cover_url} alt={pacchetto.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 20px 80px' }}>
        {pacchetto.badge && (
          <span style={{ display: 'inline-block', background: primary, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>
            {pacchetto.badge}
          </span>
        )}

        <h1 style={{ fontFamily: heading, fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 8, lineHeight: 1.2 }}>
          {pacchetto.name}
        </h1>

        {pacchetto.tagline && (
          <p style={{ fontSize: 18, color: '#888', marginBottom: 24 }}>{pacchetto.tagline}</p>
        )}

        {/* Prezzo + info rapide */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid #f0f0f0' }}>
          {pacchetto.price && (
            <div>
              <span style={{ fontFamily: heading, fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 800, color: primary }}>{pacchetto.price}</span>
              {pacchetto.price_label && <span style={{ fontSize: 15, color: '#aaa', marginLeft: 8 }}>/ {pacchetto.price_label}</span>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignSelf: 'center' }}>
            {pacchetto.duration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', background: '#f9f9fb', padding: '8px 14px', borderRadius: 20 }}>
                <Clock size={15} strokeWidth={1.5} color={primary} />
                {pacchetto.duration}
              </div>
            )}
            {pacchetto.period && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', background: '#f9f9fb', padding: '8px 14px', borderRadius: 20 }}>
                <Calendar size={15} strokeWidth={1.5} color={primary} />
                {pacchetto.period}
              </div>
            )}
            {pacchetto.min_persons && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', background: '#f9f9fb', padding: '8px 14px', borderRadius: 20 }}>
                <Users size={15} strokeWidth={1.5} color={primary} />
                {pacchetto.min_persons}
              </div>
            )}
          </div>
        </div>

        {/* Incluso nel pacchetto */}
        {includes.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Cosa include</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {includes.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 16, color: '#333' }}>
                  <span style={{ color: primary, fontWeight: 700, fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Descrizione dettagliata */}
        {pacchetto.description_full && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ width: 48, height: 3, background: primary, borderRadius: 2, marginBottom: 20 }} />
            <div style={{ fontSize: 16, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {pacchetto.description_full}
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

        {/* CTA */}
        {pacchetto.cta_label && pacchetto.cta_url && (
          <a href={pacchetto.cta_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '16px 32px', background: primary, color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
            {pacchetto.cta_label}
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
