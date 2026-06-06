import { useState } from 'react'

const WA_SVG = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

function buildUrl(raw, prefilledText) {
  if (!raw) return null
  let base = raw.startsWith('http') ? raw : `https://wa.me/${raw.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')}`
  if (prefilledText) base += `?text=${encodeURIComponent(prefilledText)}`
  return base
}

// whatsapp: numero raw (+39...) o URL wa.me
// entityName: nome mostrato nel popup
// fixed: true → position:fixed (landing), false → position:absolute (PWA)
// hasSibling: true → sposta a sinistra del chatbot
export default function WhatsAppButton({ whatsapp, entityName, fixed = false, hasSibling = false }) {
  const [open, setOpen] = useState(false)

  if (!whatsapp) return null
  const waUrl = buildUrl(whatsapp, 'Ciao! Vorrei avere informazioni.')
  if (!waUrl) return null

  const right = hasSibling ? 90 : 24
  const pos   = fixed ? 'fixed' : 'absolute'

  return (
    <>
      {/* ── Popup ────────────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: pos,
          bottom: 92,
          right,
          width: 280,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          zIndex: 999,
          animation: 'wa-fadein 0.18s ease',
        }}>
          {/* Header verde */}
          <div style={{
            background: '#25D366',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {WA_SVG}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                  {entityName || 'WhatsApp'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                  Risponde in pochi minuti
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: 20, lineHeight: 1, padding: 4,
              opacity: 0.8,
            }}>✕</button>
          </div>

          {/* Corpo — bolla messaggio */}
          <div style={{ padding: '16px 16px 8px', background: '#f0f0f0' }}>
            <div style={{
              background: '#fff',
              borderRadius: '0 12px 12px 12px',
              padding: '10px 14px',
              fontSize: 13,
              color: '#333',
              lineHeight: 1.5,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              display: 'inline-block',
              maxWidth: '90%',
            }}>
              Ciao! 👋 Come possiamo aiutarti? Scrivici, siamo disponibili su WhatsApp.
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: '12px 16px 16px', background: '#f0f0f0' }}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'block',
              textAlign: 'center',
              background: '#25D366',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              padding: '12px',
              borderRadius: 10,
              textDecoration: 'none',
            }}>
              Inizia la chat →
            </a>
          </div>
        </div>
      )}

      {/* ── Bottone floating ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Scrivici su WhatsApp"
        style={{
          position: pos,
          bottom: 24,
          right,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#25D366',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
          zIndex: 999,
          flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
          transform: open ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.15s',
        }}
      >
        {WA_SVG}
      </button>

      <style>{`
        @keyframes wa-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
