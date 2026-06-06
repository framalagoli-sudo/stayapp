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
  const { user, profile, loading, aalStatus, require2fa } = useAuth()
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
  }, [user, profile, loading, aalStatus, require2fa, pathname, mfaStillLoading])

  if (loading || mfaStillLoading) return <Spinner />
  if (!user && !isPublic) return null

  return children
}
