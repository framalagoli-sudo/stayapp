import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_MAIN = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/properties', label: 'Strutture', roles: ['super_admin', 'admin_gruppo'] },
  { to: '/admin/requests', label: 'Richieste' },
  { to: '/admin/qrcode', label: 'QR Code', roles: ['admin_struttura', 'staff'] },
]

const NAV_PROPERTY = [
  { to: '/admin/property/info',       label: 'Informazioni' },
  { to: '/admin/property/modules',    label: 'Moduli attivi' },
  { to: '/admin/property/services',   label: 'Servizi' },
  { to: '/admin/property/gallery',    label: 'Galleria foto' },
  { to: '/admin/property/restaurant', label: 'Ristorante' },
  { to: '/admin/property/theme',       label: 'Tema e colori' },
  { to: '/admin/property/activities',  label: 'Attività' },
]

const STYLES = `
  .admin-wrap { display: flex; min-height: 100vh; font-family: system-ui, sans-serif; }
  .admin-topbar { display: none; }
  .admin-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; }
  .admin-sidebar {
    width: 220px; background: #1a1a2e; color: #fff;
    display: flex; flex-direction: column; flex-shrink: 0;
  }
  .admin-main { flex: 1; padding: 32px; background: #f5f5f5; min-width: 0; overflow-x: hidden; }

  @media (max-width: 767px) {
    .admin-wrap { display: block; }

    .admin-topbar {
      display: flex; align-items: center; gap: 12px;
      position: fixed; top: 0; left: 0; right: 0; height: 56px;
      background: #1a1a2e; padding: 0 16px; z-index: 150;
    }

    .admin-sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 200;
      width: 260px; transform: translateX(-100%);
      transition: transform 0.24s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 4px 0 24px rgba(0,0,0,0.3);
    }
    .admin-sidebar.open { transform: translateX(0); }

    .admin-backdrop.open { display: block; }

    .admin-main { padding: 72px 16px 32px; }
  }
`

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close sidebar on route change (mobile nav tap)
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const role = profile?.role
  const showPropertySection = role && ['super_admin', 'admin_gruppo', 'admin_struttura', 'staff'].includes(role)

  const visibleMain = NAV_MAIN.filter(item =>
    !item.roles || (role && item.roles.includes(role))
  )

  const navLinkStyle = (isActive, sub = false) => ({
    display: 'block',
    padding: sub ? '8px 12px 8px 20px' : '10px 12px',
    marginBottom: 4,
    borderRadius: 8,
    color: isActive ? '#fff' : '#aaa',
    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
    textDecoration: 'none',
    fontSize: sub ? 13 : 14,
  })

  const sidebarContent = (
    <>
      <div style={{ padding: '24px 20px 16px', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
        StayApp
      </div>
      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
        {visibleMain.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end}
            style={({ isActive }) => navLinkStyle(isActive)}>
            {label}
          </NavLink>
        ))}

        {showPropertySection && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1, padding: '16px 12px 6px', textTransform: 'uppercase' }}>
              La mia struttura
            </div>
            {NAV_PROPERTY.map(({ to, label }) => (
              <NavLink key={to} to={to}
                style={({ isActive }) => navLinkStyle(isActive, true)}>
                {label}
              </NavLink>
            ))}
          </>
        )}
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
    </>
  )

  return (
    <>
      <style>{STYLES}</style>

      {/* Mobile: top bar */}
      <div className="admin-topbar">
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22, lineHeight: 1, padding: 4 }}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>StayApp</span>
      </div>

      {/* Mobile: backdrop */}
      <div
        className={`admin-backdrop${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className="admin-wrap">
        <aside className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
          {sidebarContent}
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  )
}
