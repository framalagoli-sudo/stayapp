'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const PUBLIC_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/admin/accept-invite', '/admin/mfa-verify']

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #eee', borderTopColor: '#0F7B6C', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

export default function AdminGuard({ children }) {
  const { user, profile, loading, aalStatus, require2fa, conPasskey, erroreProfilo, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Aspetta sempre aalStatus prima di decidere — refreshAAL è asincrono
  const mfaStillLoading = user && aalStatus === null

  useEffect(() => {
    if (loading || mfaStillLoading) return

    if (!user && !isPublic) {
      router.replace('/admin/login')
      return
    }

    // Chi e' entrato con una passkey ha gia' fatto l'accesso piu' forte che
    // abbiamo: non gli si chiede anche il codice.
    if (user && conPasskey) return

    // Sessione richiede MFA (utente ha TOTP enrollato ma non ancora verificato)
    // Valido per tutti i ruoli, incluso super_admin
    if (user &&
        aalStatus?.nextLevel === 'aal2' &&
        aalStatus?.currentLevel !== 'aal2' &&
        !pathname.startsWith('/admin/mfa-verify')) {
      router.replace('/admin/mfa-verify')
      return
    }

    // L'azienda richiede 2FA ma l'utente non ha ancora enrollato TOTP
    if (user && require2fa &&
        aalStatus?.nextLevel !== 'aal2' &&
        !pathname.startsWith('/admin/mfa-verify') &&
        !pathname.startsWith('/admin/security')) {
      router.replace('/admin/security')
      return
    }

    if (user && isPublic && pathname === '/admin/login') {
      router.replace('/admin')
    }
  }, [user, profile, loading, aalStatus, require2fa, conPasskey, pathname, mfaStillLoading])

  if (loading || mfaStillLoading) return <Spinner />

  // Profilo non caricato: senza questo l'utente restava davanti a uno spinner
  // eterno, senza sapere che qualcosa era andato storto né cosa fare.
  if (user && !profile && erroreProfilo && !isPublic) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 14, padding: 24, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>Non riusciamo a caricare il tuo profilo</p>
        <p style={{ margin: 0, fontSize: 13, color: '#888', maxWidth: 380, lineHeight: 1.5 }}>
          {erroreProfilo} Riprova: se il problema resta, esci e rientra.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.location.reload()} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Riprova
          </button>
          <button onClick={() => signOut?.()} style={{ background: 'transparent', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Esci
          </button>
        </div>
      </div>
    )
  }

  if (!user && !isPublic) return null

  return children
}
