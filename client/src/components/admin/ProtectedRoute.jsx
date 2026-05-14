import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading, aalStatus } = useAuth()
  const location = useLocation()

  if (loading) return <div style={{ padding: 32 }}>Caricamento…</div>
  if (!user) return <Navigate to="/admin/login" replace />

  // Se l'utente ha il 2FA attivo ma la sessione non è ancora AAL2 → verifica TOTP
  const mfaRequired = aalStatus?.nextLevel === 'aal2' && aalStatus?.currentLevel !== 'aal2'
  const onMfaPage = location.pathname === '/admin/mfa-verify'
  if (mfaRequired && !onMfaPage) return <Navigate to="/admin/mfa-verify" replace />

  if (roles && profile && !roles.includes(profile.role)) {
    return <div style={{ padding: 32 }}>Accesso non autorizzato.</div>
  }

  return children
}
