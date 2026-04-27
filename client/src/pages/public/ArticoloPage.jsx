import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { ArrowLeft, Calendar, User, Link2, Check } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ShareBar({ url, title }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent
  const shares = [
    { label: 'WhatsApp', color: '#25D366', href: `https://wa.me/?text=${enc(title + '\n' + url)}`, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.878-1.428A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.054-1.112l-.29-.173-3 .878.892-2.928-.19-.302A7.944 7.944 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/></svg>
    )},
    { label: 'Facebook', color: '#1877f2', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    )},
    { label: 'X', color: '#000', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    )},
    { label: 'LinkedIn', color: '#0a66c2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    )},
  ]

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '32px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Condividi</span>
      {shares.map(s => (
        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: s.color, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
          {s.icon} {s.label}
        </a>
      ))}
      <button onClick={copyLink}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#f0f0f0', color: '#555', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? 'Copiato!' : 'Copia link'}
      </button>
    </div>
  )
}

export default function ArticoloPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [articolo, setArticolo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/blog/public/${slug}`)
      .then(setArticolo)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!articolo) return
    document.title = `${articolo.title} — StayApp`
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', articolo.excerpt || articolo.title)
    const og = document.querySelector('meta[property="og:image"]')
    if (og && articolo.cover_url) og.setAttribute('content', articolo.cover_url)
    return () => { document.title = 'StayApp' }
  }, [articolo])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
      <p style={{ color: '#aaa' }}>Caricamento…</p>
    </div>
  )
  if (!articolo) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f9f9f9' }}>
      <p style={{ color: '#888', fontSize: 16 }}>Articolo non trovato.</p>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1a6fc4', cursor: 'pointer', fontSize: 14 }}>← Torna indietro</button>
    </div>
  )

  const pageUrl = window.location.href

  return (
    <div style={{ background: '#f9f9f9', minHeight: '100vh' }}>
      {/* Cover */}
      {articolo.cover_url && (
        <div style={{ width: '100%', height: 340, overflow: 'hidden', position: 'relative' }}>
          <img src={articolo.cover_url} alt={articolo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))' }} />
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 80px' }}>
        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: '20px 0 0' }}>
          <ArrowLeft size={15} strokeWidth={2} /> Torna indietro
        </button>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '16px 0 12px', fontSize: 13, color: '#aaa' }}>
          {articolo.published_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} strokeWidth={1.5} /> {fmtDate(articolo.published_at)}
            </span>
          )}
          {articolo.author && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={13} strokeWidth={1.5} /> {articolo.author}
            </span>
          )}
        </div>

        {/* Titolo */}
        <h1 style={{ margin: '0 0 16px', fontSize: 32, fontWeight: 800, lineHeight: 1.25, color: '#1a1a2e' }}>
          {articolo.title}
        </h1>

        {/* Excerpt */}
        {articolo.excerpt && (
          <p style={{ fontSize: 17, color: '#555', margin: '0 0 24px', lineHeight: 1.6, fontStyle: 'italic' }}>
            {articolo.excerpt}
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '24px 0' }} />

        {/* Contenuto */}
        <div
          dangerouslySetInnerHTML={{ __html: articolo.content || '' }}
          style={{ fontSize: 16, lineHeight: 1.8, color: '#333' }}
          className="articolo-content"
        />

        {/* Share */}
        <ShareBar url={pageUrl} title={articolo.title} />
      </div>

      <style>{`
        .articolo-content h2 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; color: #1a1a2e; }
        .articolo-content h3 { font-size: 18px; font-weight: 700; margin: 22px 0 10px; color: #1a1a2e; }
        .articolo-content p  { margin: 0 0 16px; }
        .articolo-content ul, .articolo-content ol { padding-left: 24px; margin: 0 0 16px; }
        .articolo-content li { margin-bottom: 6px; }
        .articolo-content blockquote { border-left: 3px solid #1a1a2e; margin: 20px 0; padding: 10px 20px; background: #f5f5f5; border-radius: 0 8px 8px 0; color: #555; font-style: italic; }
        .articolo-content hr { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
        .articolo-content a { color: #1a6fc4; text-decoration: underline; }
        .articolo-content strong { font-weight: 700; }
        .articolo-content em { font-style: italic; }
      `}</style>
    </div>
  )
}
