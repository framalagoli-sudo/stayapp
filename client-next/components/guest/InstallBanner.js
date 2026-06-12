'use client'
import { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'

const STORAGE_KEY = 'pwa_install_dismissed'

function detect() {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone
  if (isStandalone) return null

  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isIOSChrome = isIOS && /CriOS/.test(ua)
  const isIOSSafari = isIOS && !isIOSChrome && /Safari/.test(ua)
  const isAndroid = /Android/.test(ua)

  if (isIOSSafari)  return 'ios-safari'
  if (isIOSChrome)  return 'ios-chrome'
  if (isAndroid)    return 'android'
  return null
}

export default function InstallBanner({ primaryColor = '#00b5b5', entityName = '' }) {
  const [platform,     setPlatform]     = useState(null)
  const [deferredEvt,  setDeferredEvt]  = useState(null)
  const [visible,      setVisible]      = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return
    const p = detect()
    if (!p) return

    if (p === 'android') {
      const handler = (e) => {
        e.preventDefault()
        setDeferredEvt(e)
        setPlatform('android')
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    // iOS: mostra dopo 3s per non essere aggressivo
    const t = setTimeout(() => { setPlatform(p); setVisible(true) }, 3000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(STORAGE_KEY, '1')
  }

  async function install() {
    if (deferredEvt) {
      await deferredEvt.prompt()
      const { outcome } = await deferredEvt.userChoice
      if (outcome === 'accepted') { setVisible(false); return }
    }
    dismiss()
  }

  if (!visible) return null

  const isIOSSafari = platform === 'ios-safari'
  const isIOSChrome = platform === 'ios-chrome'

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 398,
      background: '#1a1a2e', borderRadius: 16,
      padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      zIndex: 9999,
      animation: 'bannerIn 0.3s ease',
    }}>
      <style>{`@keyframes bannerIn { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>

      <div style={{ width: 36, height: 36, borderRadius: 10, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        {isIOSSafari
          ? <Share size={18} strokeWidth={1.5} color="#fff" />
          : <Download size={18} strokeWidth={1.5} color="#fff" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {isIOSChrome ? (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Installa l'app</p>
            <button onClick={async () => {
              try {
                await navigator.share({ title: entityName, url: window.location.href })
              } catch {}
            }} style={{
              background: primaryColor, color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              Apri in Safari
            </button>
          </>
        ) : isIOSSafari ? (
          <>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Aggiungi alla schermata Home</p>
            <p style={{ margin: 0, fontSize: 12, color: '#aaa', lineHeight: 1.4 }}>
              Tocca <strong style={{ color: '#fff' }}>Condividi</strong> <Share size={11} strokeWidth={2} color="#aaa" style={{ verticalAlign: 'middle' }} /> poi <strong style={{ color: '#fff' }}>"Aggiungi alla schermata Home"</strong>
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              Installa {entityName ? `"${entityName}"` : "l'app"}
            </p>
            <button onClick={install} style={{
              background: primaryColor, color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              Installa
            </button>
          </>
        )}
      </div>

      <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, color: '#666' }}>
        <X size={18} strokeWidth={1.5} color="#666" />
      </button>
    </div>
  )
}
