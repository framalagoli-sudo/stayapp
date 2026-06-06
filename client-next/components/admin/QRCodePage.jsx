'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
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
  const pwaUrl = tipo === 'ristorante' ? `${baseUrl}/r/${slug}?qr=1`
              : tipo === 'attivita'   ? `${baseUrl}/a/${slug}?qr=1`
              :                        `${baseUrl}/s/${slug}?qr=1`
  const typeColor = tipo === 'ristorante' ? '#e63946' : tipo === 'attivita' ? '#7c3aed' : '#1a1a2e'
  const typeLabel = tipo === 'ristorante' ? 'Ristorante' : tipo === 'attivita' ? 'Attività' : 'Struttura'

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
  const { strutture, ristoranti, attivita, loading: aziendaLoading } = useAzienda()
  const [legacySlug,   setLegacySlug]   = useState(null)
  const [legacyError,  setLegacyError]  = useState(null)
  const [superEntita,  setSuperEntita]  = useState(null)
  const [superLoading, setSuperLoading] = useState(false)

  const isLegacy     = profile?.role === 'admin_struttura'
  const isSuperAdmin = profile?.role === 'super_admin'

  // super_admin: AziendaContext non carica entità → fetch diretto
  useEffect(() => {
    if (!isSuperAdmin) return
    setSuperLoading(true)
    Promise.all([
      apiFetch('/api/properties'),
      apiFetch('/api/ristoranti'),
      apiFetch('/api/attivita'),
    ]).then(([s, r, a]) => {
      setSuperEntita([
        ...(s || []).map(x => ({ ...x, tipo: 'struttura'  })),
        ...(r || []).map(x => ({ ...x, tipo: 'ristorante' })),
        ...(a || []).map(x => ({ ...x, tipo: 'attivita'   })),
      ])
    }).catch(() => setSuperEntita([]))
      .finally(() => setSuperLoading(false))
  }, [isSuperAdmin])

  // admin_struttura legacy: carica slug dalla property
  useEffect(() => {
    if (!isLegacy || !profile?.property_id) return
    apiFetch(`/api/properties/${profile.property_id}`)
      .then(d => setLegacySlug(d?.slug || null))
      .catch(() => setLegacyError('Impossibile caricare i dati della struttura.'))
  }, [profile])

  const title = (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>QR Code</h2>
      <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
        Scarica o condividi i QR code. Inquadrando il codice il cliente accede direttamente alla PWA.
      </p>
    </div>
  )

  // ── Legacy (admin_struttura) ───────────────────────────────────────────────
  if (isLegacy) {
    if (legacyError) return <p style={{ color: '#c00' }}>{legacyError}</p>
    if (!legacySlug)  return <p style={{ color: '#888' }}>Caricamento…</p>
    return <div>{title}<QRCard name={profile.full_name || 'La mia struttura'} tipo="struttura" slug={legacySlug} /></div>
  }

  // ── Super admin: fetch diretto ─────────────────────────────────────────────
  if (isSuperAdmin) {
    if (superLoading || superEntita === null) return <p style={{ color: '#888' }}>Caricamento…</p>
    return (
      <div>
        {title}
        {superEntita.length === 0
          ? <p style={{ color: '#aaa' }}>Nessuna entità trovata.</p>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {superEntita.map(e => <QRCard key={`${e.tipo}-${e.id}`} name={e.name} tipo={e.tipo} slug={e.slug} />)}
            </div>
        }
      </div>
    )
  }

  // ── Admin azienda / staff ──────────────────────────────────────────────────
  const allEntita = [
    ...(strutture  || []).map(s => ({ ...s, tipo: 'struttura'  })),
    ...(ristoranti || []).map(r => ({ ...r, tipo: 'ristorante' })),
    ...(attivita   || []).map(a => ({ ...a, tipo: 'attivita'   })),
  ]

  return (
    <div>
      {title}
      {aziendaLoading && <p style={{ color: '#888' }}>Caricamento…</p>}
      {!aziendaLoading && allEntita.length === 0 && <p style={{ color: '#aaa' }}>Nessuna entità da mostrare.</p>}
      {!aziendaLoading && allEntita.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {allEntita.map(e => <QRCard key={`${e.tipo}-${e.id}`} name={e.name} tipo={e.tipo} slug={e.slug} />)}
        </div>
      )}
    </div>
  )
}
