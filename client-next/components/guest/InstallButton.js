'use client'
import { useEffect, useState } from 'react'
import { Smartphone, X } from 'lucide-react'

function getPlatform() {
  if (typeof window === 'undefined') return null
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone
  if (isStandalone) return null

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isIOSChrome = isIOS && /CriOS/.test(ua)
  const isIOSSafari = isIOS && !isIOSChrome && /Safari/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (isIOSSafari) return 'ios-safari'
  if (isAndroid)   return 'android'
  return null // iOS Chrome: non mostrare
}

function IOSInstructions({ primaryColor, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 10000, display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#1a1a2e', borderRadius: '20px 20px 0 0',
        padding: '24px 24px 40px', animation: 'slideUp 0.25s ease',
      }}>
        <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Aggiungi alla schermata Home</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} strokeWidth={1.5} color="#aaa" />
          </button>
        </div>
        {[
          { n: 1, text: <>Tocca il tasto <strong style={{ color: '#fff' }}>Condividi</strong> in basso nella barra di Safari</> },
          { n: 2, text: <>Scorri e tocca <strong style={{ color: '#fff' }}>"Aggiungi alla schermata Home"</strong></> },
          { n: 3, text: <>Tocca <strong style={{ color: '#fff' }}>"Aggiungi"</strong> — l&apos;icona apparirà sulla schermata</> },
        ].map(({ n, text }) => (
          <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{n}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#bbb', lineHeight: 1.5, paddingTop: 4 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InstallButton({ primaryColor = '#00b5b5', entityName = '' }) {
  const [platform,    setPlatform]    = useState(null)
  const [deferredEvt, setDeferredEvt] = useState(null)
  const [showModal,   setShowModal]   = useState(false)

  useEffect(() => {
    const p = getPlatform()
    if (!p) return

    if (p === 'android') {
      const handler = e => { e.preventDefault(); setDeferredEvt(e) }
      window.addEventListener('beforeinstallprompt', handler)
      setPlatform('android')
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    setPlatform(p)
  }, [])

  async function handleClick() {
    if (platform === 'android' && deferredEvt) {
      await deferredEvt.prompt()
      const { outcome } = await deferredEvt.userChoice
      if (outcome === 'accepted') setPlatform(null)
      return
    }
    if (platform === 'ios-safari') {
      setShowModal(true)
    }
  }

  if (!platform) return null

  return (
    <>
      {showModal && <IOSInstructions primaryColor={primaryColor} onClose={() => setShowModal(false)} />}
      <button
        onClick={handleClick}
        title={`Aggiungi ${entityName || "l'app"} alla schermata Home`}
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Smartphone size={17} strokeWidth={1.5} color="#fff" />
      </button>
    </>
  )
}
