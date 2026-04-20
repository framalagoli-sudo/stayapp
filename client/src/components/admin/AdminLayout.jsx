import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/properties', label: 'Strutture' },
  { to: '/admin/requests', label: 'Richieste' },
  { to: '/admin/property', label: 'La mia struttura' },
  { to: '/admin/qrcode', label: 'QR Code' },
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const visibleItems = navItems.filter(item => {
    if (item.to === '/admin/properties') {
      // solo super_admin e admin_gruppo gestiscono più strutture
      return profile && ['super_admin', 'admin_gruppo'].includes(profile.role)
    }
    if (item.to === '/admin/qrcode') {
      // super_admin e admin_gruppo generano QR dalla pagina Strutture
      return profile && ['admin_struttura', 'staff'].includes(profile.role)
    }
    return true
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ width: 220, background: '#1a1a2e', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px 16px', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
          StayApp
        </div>
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {visibleItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                marginBottom: 4,
                borderRadius: 8,
                color: isActive ? '#fff' : '#aaa',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', fontSize: 12, color: '#888' }}>
          <div>{profile?.full_name || profile?.role}</div>
          <button
            onClick={handleSignOut}
            style={{ marginTop: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, fontSize: 12 }}
          >
            Esci
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  )
}
