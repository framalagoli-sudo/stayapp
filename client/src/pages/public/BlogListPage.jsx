import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'

export default function BlogListPage() {
  const [params]   = useSearchParams()
  const aziendaId  = params.get('azienda_id')
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    let url = '/api/blog/public?limit=50'
    if (aziendaId) url += `&azienda_id=${aziendaId}`
    apiFetch(url)
      .then(d => Array.isArray(d) && setArticles(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aziendaId])

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9fb', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
          News & Articoli
        </h1>
        <p style={{ color: '#888', fontSize: 15, marginBottom: 48 }}>Aggiornamenti e curiosità</p>

        {loading && <p style={{ color: '#aaa' }}>Caricamento…</p>}

        {!loading && articles.length === 0 && (
          <p style={{ color: '#aaa' }}>Nessun articolo pubblicato.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {articles.map(art => (
            <a key={art.id} href={`/blog/${art.slug}`}
              style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.14s, box-shadow 0.14s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}>
              {art.cover_url && (
                <img src={art.cover_url} alt={art.title}
                  style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
              )}
              <div style={{ padding: '20px 22px' }}>
                {art.published_at && (
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {new Date(art.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a2e', marginBottom: 10, lineHeight: 1.35 }}>
                  {art.title}
                </div>
                {art.excerpt && (
                  <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>
                    {art.excerpt}
                  </div>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#00b5b5' }}>Leggi →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
