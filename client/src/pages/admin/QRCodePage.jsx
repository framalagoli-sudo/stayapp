import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import { apiFetch } from '../../lib/api'
import { Copy, Check, ExternalLink, Download } from 'lucide-react'

const baseUrl = window.location.origin

function qrSrc(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(url)}`
}

async function downloadQR(url, filename) {
  try {
    const res  = await fetch(qrSrc(url))
    const blob = await res.blob()
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(qrSrc(url), '_blank')
  }
}

function QRCard({ name, tipo, slug }) {
  const [copied, setCopied] = useState(false)
  const pwaUrl = tipo === 'ristorante' ? `${baseUrl}/r/${slug}` : `${baseUrl}/s/${slug}`
  const typeColor = tipo === 'ristorante' ? '#e63946' : '#1a1a2e'
  const typeLabel = tipo === 'ristorante' ? 'Ristorante' : 'Struttura'

  function copyUrl() {
    navigator.clipboard.writeText(pwaUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 28,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      maxWidth: 320,
    }}>
      {/* Header */}
      <div style={{ width: '100%', textAlign: 'left' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
          background: `${typeColor}15`, color: typeColor,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {typeLabel}
        </span>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginTop: 6 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2, fontFamily: 'monospace' }}>{slug}</div>
      </div>

      {/* QR Code */}
      <div style={{ padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <img
          src={qrSrc(pwaUrl)}
          alt={`QR ${name}`}
          style={{ display: 'block', width: 200, height: 200 }}
        />
      </div>

      {/* URL */}
      <div style={{
        width: '100%', background: '#f8f8f8', borderRadius: 10,
        padding: '10px 14px', fontSize: 12, color: '#555',
        wordBreak: 'break-all', lineHeight: 1.5,
      }}>
        {pwaUrl}
      </div>

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button onClick={copyUrl} style={{
          flex: 1, padding: '10px 8px', borderRadius: 10, border: '1px solid #ddd',
          background: copied ? '#f0fff4' : '#fafafa', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: copied ? '#38a169' : '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          {copied
            ? <><Check size={13} strokeWidth={2.5} /><span>Copiato</span></>
            : <><Copy size={13} strokeWidth={2} /><span>Copia link</span></>
          }
        </button>

        <button onClick={() => downloadQR(pwaUrl, `qr-${slug}.png`)} style={{
          flex: 1, padding: '10px 8px', borderRadius: 10, border: '1px solid #ddd',
          background: '#fafafa', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <Download size={13} strokeWidth={2} />
          Scarica PNG
        </button>

        <a href={pwaUrl} target="_blank" rel="noopener noreferrer" style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd',
          background: '#fafafa', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', color: '#333',
        }}>
          <ExternalLink size={14} strokeWidth={2} />
        </a>
      </div>
    </div>
  )
}

export default function QRCodePage() {
  const { profile } = useAuth()
  const { strutture, ristoranti, loading: aziendaLoading } = useAzienda()
  const [legacySlug, setLegacySlug] = useState(null)
  const [legacyError, setLegacyError] = useState(null)

  const isLegacy = profile && ['admin_struttura', 'staff'].includes(profile.role)

  // Per admin_struttura / staff carica lo slug dalla property
  useEffect(() => {
    if (!isLegacy || !profile?.property_id) return
    apiFetch(`/api/properties/${profile.property_id}`)
      .then(d => setLegacySlug(d?.slug || null))
      .catch(() => setLegacyError('Impossibile caricare i dati della struttura.'))
  }, [profile])

  // ── Legacy view (admin_struttura / staff) ─────────────────────────────────
  if (isLegacy) {
    if (legacyError) return <p style={{ color: '#c00' }}>{legacyError}</p>
    if (!legacySlug)  return <p style={{ color: '#888' }}>Caricamento…</p>
    return (
      <div>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>QR Code</h2>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
          Stampa o condividi il QR code per far accedere gli ospiti alla tua app.
        </p>
        <QRCard name={profile.full_name || 'La mia struttura'} tipo="struttura" slug={legacySlug} />
      </div>
    )
  }

  // ── Azienda / super_admin view ────────────────────────────────────────────
  const allEntita = [
    ...strutture.map(s => ({ ...s, tipo: 'struttura' })),
    ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' })),
  ]

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>QR Code</h2>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
        Scarica o condividi i QR code per ogni entità. Inquadrando il codice il cliente accede direttamente alla PWA.
      </p>

      {aziendaLoading && <p style={{ color: '#888' }}>Caricamento…</p>}

      {!aziendaLoading && allEntita.length === 0 && (
        <p style={{ color: '#aaa' }}>Nessuna struttura o ristorante da mostrare.</p>
      )}

      {!aziendaLoading && allEntita.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {allEntita.map(e => (
            <QRCard key={`${e.tipo}-${e.id}`} name={e.name} tipo={e.tipo} slug={e.slug} />
          ))}
        </div>
      )}
    </div>
  )
}
