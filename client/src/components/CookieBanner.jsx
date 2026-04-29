import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const KEY = 'cookie_consent_v2'

export default function CookieBanner({ primaryColor = '#00b5b5', privacyUrl, cookieUrl }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true)
    } catch {}
  }, [])

  function accept() { try { localStorage.setItem(KEY, 'accepted') } catch {} setVisible(false) }
  function reject()  { try { localStorage.setItem(KEY, 'rejected') } catch {} setVisible(false) }

  if (!visible) return null

  return createPortal(
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2147483647,
      background: '#1a1a2e', color: '#fff',
      padding: '16px 20px', display: 'flex', alignItems: 'center',
      gap: 16, flexWrap: 'wrap', justifyContent: 'space-between',
      boxShadow: '0 -2px 16px rgba(0,0,0,0.2)',
    }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, flex: 1, minWidth: 200 }}>
        Questo sito utilizza cookie tecnici necessari al funzionamento.{' '}
        {privacyUrl && (
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer"
            style={{ color: primaryColor, fontWeight: 600 }}>Privacy Policy</a>
        )}
        {privacyUrl && cookieUrl && ' · '}
        {cookieUrl && (
          <a href={cookieUrl} target="_blank" rel="noopener noreferrer"
            style={{ color: primaryColor, fontWeight: 600 }}>Cookie Policy</a>
        )}
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={reject} style={{
          padding: '8px 16px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent', color: '#ccc', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Rifiuta
        </button>
        <button onClick={accept} style={{
          padding: '8px 20px', borderRadius: 50, border: 'none',
          background: primaryColor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          Accetto
        </button>
      </div>
    </div>,
    document.body
  )
}
