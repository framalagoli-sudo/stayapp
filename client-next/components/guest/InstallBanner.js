'use client'
import { useEffect, useState } from 'react'
import { X, Smartphone } from 'lucide-react'

const STORAGE_KEY = 'pwa_install_dismissed_v2'

function getPlatform() {
  if (typeof window === 'undefined') return null
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone
  if (isStandalone) return null

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isIOSChrome = isIOS && /CriOS/.test(ua)
  const isIOSSafari = isIOS && !isIOSChrome && /Safari/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (isIOSSafari)  return 'ios-safari'
  if (isIOSChrome)  return 'ios-chrome'
  if (isAndroid)    return 'android'
  return null
}

// Modal con le istruzioni per iOS Safari
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
          { n: 3, text: <>Tocca <strong style={{ color: '#fff' }}>"Aggiungi"</strong> — l'app apparirà sulla tua schermata</> },
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

export default function InstallBanner({ primaryColor = '#00b5b5', entityName = '' }) {
  const [platform,    setPlatform]    = useState(null)
  const [deferredEvt, setDeferredEvt] = useState(null)
  const [visible,     setVisible]     = useState(false)
  const [showModal,   setShowModal]   = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const p = getPlatform()
    if (!p) return

    if (p === 'android') {
      const handler = (e) => { e.preventDefault(); setDeferredEvt(e) }
      window.addEventListener('beforeinstallprompt', handler)
      setPlatform('android')
      setTimeout(() => setVisible(true), 2000)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    setPlatform(p)
    setTimeout(() => setVisible(true), 2000)
  }, [])

  function dismiss() {
    setVisible(false)
    setShowModal(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  async function handleClick() {
    if (platform === 'android' && deferredEvt) {
      await deferredEvt.prompt()
      const { outcome } = await deferredEvt.userChoice
      if (outcome === 'accepted') { setVisible(false); return }
      return
    }
    if (platform === 'ios-safari') {
      setShowModal(true)
      return
    }
    if (platform === 'ios-chrome') {
      try { await navigator.share({ title: entityName, url: window.location.href }) } catch {}
      return
    }
  }

  if (!visible) return null

  return (
    <>
      {showModal && platform === 'ios-safari' && (
        <IOSInstructions primaryColor={primaryColor} onClose={() => setShowModal(false)} />
      )}

      <div style={{
        position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 398,
        background: '#1a1a2e',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
        zIndex: 9998,
        animation: 'bannerIn 0.3s ease',
      }}>
        <style>{`@keyframes bannerIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>

        <div style={{ width: 34, height: 34, borderRadius: 9, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Smartphone size={17} strokeWidth={1.5} color="#fff" />
        </div>

        <p style={{ margin: 0, fontSize: 13, color: '#ddd', flex: 1, lineHeight: 1.3 }}>
          Vuoi aggiungere <strong style={{ color: '#fff' }}>{entityName || "l'app"}</strong> alla schermata del tuo telefono?
        </p>

        <button onClick={handleClick} style={{
          background: primaryColor, color: '#fff', border: 'none',
          borderRadius: 8, padding: '7px 14px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          flexShrink: 0, WebkitTapHighlightColor: 'transparent',
        }}>
          Sì
        </button>

        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
          <X size={16} strokeWidth={1.5} color="#666" />
        </button>
      </div>
    </>
  )
}
