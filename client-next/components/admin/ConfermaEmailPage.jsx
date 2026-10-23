'use client'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'

// Dove porta il link dell'email di conferma (lib/registrazione.js).
//
// ⚠️ Si conferma con un PULSANTE, non all'apertura: i programmi di posta e gli
// antivirus aprono i link da soli per controllarli, e un link che vale una
// volta sola verrebbe consumato prima che lo apra la persona.
export default function ConfermaEmailPage() {
  const tokenHash = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token_hash') : null
  const [stato, setStato] = useState('pronto')   // pronto · in_corso · errore
  const [errore, setErrore] = useState('')

  async function conferma() {
    setStato('in_corso'); setErrore('')
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (error) {
      setStato('errore')
      return setErrore('Il link è scaduto o è già stato usato. Accedi con email e password: se l’indirizzo non è ancora confermato, da lì puoi farti rimandare l’email.')
    }
    try {
      await apiFetch('/api/auth/completa-registrazione', { method: 'POST' })
    } catch {
      // Se fallisce si riprova al prossimo accesso (LoginPage): l'indirizzo è
      // confermato, e la registrazione in attesa resta lì.
    }
    // Ricarica vera, non `router`: il profilo in memoria è quello di un attimo
    // fa, ancora senza azienda.
    window.location.replace('/admin/onboarding')
  }

  return (
    <div style={pagina}>
      <div style={scheda}>
        <img src="/logo-onlight.png" alt="OltreNova" style={{ height: 38, width: 'auto', display: 'block', margin: '0 auto 20px' }} />
        {!tokenHash ? (
          <p style={{ color: '#c53030', fontSize: 14 }}>Link non valido.</p>
        ) : (
          <>
            <h1 style={{ fontSize: 20, margin: '0 0 10px', color: '#1a1a2e' }}>Conferma il tuo indirizzo</h1>
            <p style={{ margin: '0 0 24px', color: '#555', fontSize: 14, lineHeight: 1.6 }}>
              Un ultimo passo: premi il pulsante e il tuo account è pronto.
            </p>
            {errore && <p style={{ color: '#c53030', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>{errore}</p>}
            {stato !== 'errore' && (
              <button onClick={conferma} disabled={stato === 'in_corso'} style={{ ...pulsante, opacity: stato === 'in_corso' ? 0.7 : 1 }}>
                {stato === 'in_corso' ? 'Conferma in corso…' : 'Conferma e entra →'}
              </button>
            )}
          </>
        )}
        <div style={{ marginTop: 20, fontSize: 13 }}>
          <Link href="/admin/login" style={{ color: '#1a1a2e', fontWeight: 600 }}>Vai all’accesso</Link>
        </div>
      </div>
    </div>
  )
}

const pagina = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: 16, boxSizing: 'border-box', fontFamily: 'system-ui' }
const scheda = { background: '#fff', padding: '36px 28px', borderRadius: 12, width: '100%', maxWidth: 380, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', textAlign: 'center', boxSizing: 'border-box' }
const pulsante = { width: '100%', padding: 13, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }
