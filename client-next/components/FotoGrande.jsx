'use client'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const PAROLE = {
  it: { chiudi: 'Chiudi', prima: 'Foto precedente', dopo: 'Foto successiva', foto: 'Foto' },
  en: { chiudi: 'Close', prima: 'Previous photo', dopo: 'Next photo', foto: 'Photo' },
}

// Le props da dare a una foto perché si apra in grande: clic, e Invio per chi
// usa la tastiera.
export function siIngrandisce(apri) {
  return {
    role: 'button', tabIndex: 0, 'data-foto-grande': '',
    onClick: apri,
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apri() } },
  }
}

// Una foto di una galleria a tutto schermo: frecce, tasti, dito. Si chiude con
// la ✕, con Esc o toccando fuori dalla foto. Sta in fondo al <body>, così
// nessuna sezione animata la tiene dentro di sé.
export default function FotoGrande({ foto, indice, onVai, onChiudi, lang = 'it' }) {
  const p = PAROLE[lang] || PAROLE.it
  const n = foto.length
  const tocco = useRef(null)
  const chiudi = useRef(null)
  const vai = passo => onVai((indice + passo + n) % n)

  useEffect(() => {
    const tasti = e => {
      if (e.key === 'Escape') onChiudi()
      else if (n > 1 && e.key === 'ArrowLeft') vai(-1)
      else if (n > 1 && e.key === 'ArrowRight') vai(1)
    }
    window.addEventListener('keydown', tasti)
    return () => window.removeEventListener('keydown', tasti)
  })
  // Sotto, la pagina non scorre; chiudendo si torna alla foto da cui si era partiti.
  useEffect(() => {
    const prima = document.activeElement
    const scorrimento = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    chiudi.current?.focus()
    return () => { document.body.style.overflow = scorrimento; prima?.focus?.({ preventScroll: true }) }
  }, [])

  const attuale = foto[indice]
  if (!attuale) return null
  const tondo = { position: 'absolute', width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }

  return createPortal(
    <div data-foto-aperta role="dialog" aria-modal="true" aria-label={attuale.alt || p.foto}
      onClick={onChiudi}
      onTouchStart={e => { tocco.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (tocco.current == null || n < 2) return
        const dx = e.changedTouches[0].clientX - tocco.current
        tocco.current = null
        if (Math.abs(dx) > 50) vai(dx < 0 ? 1 : -1)
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 12px' }}>
      <img src={attuale.url} alt={attuale.alt || ''} onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', borderRadius: 6 }} />
      <button ref={chiudi} type="button" aria-label={p.chiudi} onClick={onChiudi} style={{ ...tondo, top: 10, right: 10 }}><X size={22} strokeWidth={1.5} /></button>
      {n > 1 && (
        <>
          <button type="button" aria-label={p.prima} onClick={e => { e.stopPropagation(); vai(-1) }} style={{ ...tondo, left: 10, top: '50%', transform: 'translateY(-50%)' }}><ChevronLeft size={24} strokeWidth={1.5} /></button>
          <button type="button" aria-label={p.dopo} onClick={e => { e.stopPropagation(); vai(1) }} style={{ ...tondo, right: 10, top: '50%', transform: 'translateY(-50%)' }}><ChevronRight size={24} strokeWidth={1.5} /></button>
          <div data-foto-conto style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{indice + 1} / {n}</div>
        </>
      )}
    </div>,
    document.body
  )
}
