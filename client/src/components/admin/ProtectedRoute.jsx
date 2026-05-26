import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading, aalStatus, require2fa } = useAuth()
  const location = useLocation()

  if (loading) return <div style={{ padding: 32 }}>Caricamento…</div>
  if (!user) return <Navigate to="/admin/login" replace />

  // 2FA attivo ma sessione non ancora a livello AAL2 → verifica TOTP
  const mfaRequired = aalStatus?.nextLevel === 'aal2' && aalStatus?.currentLevel !== 'aal2'
  const onMfaPage = location.pathname === '/admin/mfa-verify'
  if (mfaRequired && !onMfaPage) return <Navigate to="/admin/mfa-verify" replace />

  // L'azienda richiede 2FA ma l'utente non lo ha ancora enrollato → forza attivazione
  const mfaNotEnrolled = require2fa && aalStatus !== null && aalStatus?.nextLevel !== 'aal2'
  const onSecurityPage = location.pathname === '/admin/security'
  if (mfaNotEnrolled && !onSecurityPage && !onMfaPage) return <Navigate to="/admin/security" replace />

  if (roles && profile && !roles.includes(profile.role)) {
    return <div style={{ padding: 32 }}>Accesso non autorizzato.</div>
  }

  return children
}
