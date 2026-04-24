import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AziendaProvider } from './context/AziendaContext'
import { PropertyIdContext } from './context/PropertyIdContext'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import RequestsPage from './pages/admin/RequestsPage'
import PropertiesPage from './pages/admin/PropertiesPage'
import AziendePage from './pages/admin/AziendePage'
import RistorantiListPage from './pages/admin/RistorantiListPage'
import RistoranteInfoPage from './pages/admin/ristorante/RistoranteInfoPage'
import RistoranteMenuPage from './pages/admin/ristorante/RistoranteMenuPage'
import RistoranteGalleryPage from './pages/admin/ristorante/RistoranteGalleryPage'
import RistoranteThemePage from './pages/admin/ristorante/RistoranteThemePage'
import RistoranteModuliPage from './pages/admin/ristorante/RistoranteModuliPage'
import QRCodePage from './pages/admin/QRCodePage'
import UsersPage from './pages/admin/UsersPage'
import GuestApp from './pages/guest/GuestApp'
import RestaurantApp from './pages/guest/RestaurantApp'
import PropertyInfoPage from './pages/admin/property/PropertyInfoPage'
import PropertyModulesPage from './pages/admin/property/PropertyModulesPage'
import PropertyServicesPage from './pages/admin/property/PropertyServicesPage'
import PropertyGalleryPage from './pages/admin/property/PropertyGalleryPage'
import PropertyThemePage from './pages/admin/property/PropertyThemePage'
import PropertyActivitiesPage from './pages/admin/property/PropertyActivitiesPage'
import PropertyExcursionsPage from './pages/admin/property/PropertyExcursionsPage'

// Injects property ID from URL params into PropertyIdContext
// so all property sub-pages work without modification
function StrutturaLayout() {
  const { id } = useParams()
  return (
    <PropertyIdContext.Provider value={id}>
      <Outlet />
    </PropertyIdContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest PWA */}
          <Route path="/s/:slug" element={<GuestApp />} />
          <Route path="/r/:slug" element={<RestaurantApp />} />

          {/* Admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AziendaProvider>
                  <AdminLayout />
                </AziendaProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="requests"   element={<RequestsPage />} />
            <Route path="aziende"    element={<AziendePage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="users"      element={<UsersPage />} />
            <Route path="qrcode"     element={<QRCodePage />} />

            {/* Ristoranti */}
            <Route path="ristoranti"              element={<RistorantiListPage />} />
            <Route path="ristoranti/:id/info"     element={<RistoranteInfoPage />} />
            <Route path="ristoranti/:id/menu"     element={<RistoranteMenuPage />} />
            <Route path="ristoranti/:id/gallery"  element={<RistoranteGalleryPage />} />
            <Route path="ristoranti/:id/theme"    element={<RistoranteThemePage />} />
            <Route path="ristoranti/:id/moduli"   element={<RistoranteModuliPage />} />

            {/* Struttura by ID (admin_azienda, super_admin) */}
            <Route path="struttura/:id" element={<StrutturaLayout />}>
              <Route path="info"       element={<PropertyInfoPage />} />
              <Route path="services"   element={<PropertyServicesPage />} />
              <Route path="gallery"    element={<PropertyGalleryPage />} />
              <Route path="theme"      element={<PropertyThemePage />} />
              <Route path="activities" element={<PropertyActivitiesPage />} />
              <Route path="excursions" element={<PropertyExcursionsPage />} />
            </Route>

            {/* Struttura legacy (admin_struttura, staff — usa profile.property_id) */}
            <Route path="property/info"       element={<PropertyInfoPage />} />
            <Route path="property/modules"    element={<PropertyModulesPage />} />
            <Route path="property/services"   element={<PropertyServicesPage />} />
            <Route path="property/gallery"    element={<PropertyGalleryPage />} />
            <Route path="property/theme"      element={<PropertyThemePage />} />
            <Route path="property/activities" element={<PropertyActivitiesPage />} />
            <Route path="property/excursions" element={<PropertyExcursionsPage />} />
          </Route>

          {/* Root */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
