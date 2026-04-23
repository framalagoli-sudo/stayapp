import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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
import QRCodePage from './pages/admin/QRCodePage'
import GuestApp from './pages/guest/GuestApp'
import PropertyInfoPage from './pages/admin/property/PropertyInfoPage'
import PropertyModulesPage from './pages/admin/property/PropertyModulesPage'
import PropertyServicesPage from './pages/admin/property/PropertyServicesPage'
import PropertyGalleryPage from './pages/admin/property/PropertyGalleryPage'
import PropertyRestaurantPage from './pages/admin/property/PropertyRestaurantPage'
import PropertyThemePage from './pages/admin/property/PropertyThemePage'
import PropertyActivitiesPage from './pages/admin/property/PropertyActivitiesPage'
import PropertyExcursionsPage from './pages/admin/property/PropertyExcursionsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest PWA */}
          <Route path="/s/:slug" element={<GuestApp />} />

          {/* Admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="aziende" element={<AziendePage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="ristoranti" element={<RistorantiListPage />} />
            <Route path="ristoranti/:id/info"    element={<RistoranteInfoPage />} />
            <Route path="ristoranti/:id/menu"    element={<RistoranteMenuPage />} />
            <Route path="ristoranti/:id/gallery" element={<RistoranteGalleryPage />} />
            <Route path="ristoranti/:id/theme"   element={<RistoranteThemePage />} />
            <Route path="qrcode" element={<QRCodePage />} />
            <Route path="property" element={<Navigate to="/admin/property/info" replace />} />
            <Route path="property/info" element={<PropertyInfoPage />} />
            <Route path="property/modules" element={<PropertyModulesPage />} />
            <Route path="property/services" element={<PropertyServicesPage />} />
            <Route path="property/gallery" element={<PropertyGalleryPage />} />
            <Route path="property/restaurant" element={<PropertyRestaurantPage />} />
            <Route path="property/theme" element={<PropertyThemePage />} />
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
