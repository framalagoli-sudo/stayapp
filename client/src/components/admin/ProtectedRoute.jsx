import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div style={{ padding: 32 }}>Caricamento…</div>
  if (!user) return <Navigate to="/admin/login" replace />
  if (roles && profile && !roles.includes(profile.role)) {
    return <div style={{ padding: 32 }}>Accesso non autorizzato.</div>
  }

  return children
}
