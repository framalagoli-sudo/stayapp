import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AziendaProvider } from './context/AziendaContext'
import { CarrelloProvider } from './context/CarrelloContext'
import { PropertyIdContext } from './context/PropertyIdContext'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage'
import ResetPasswordPage from './pages/admin/ResetPasswordPage'
import DashboardPage from './pages/admin/DashboardPage'
import RequestsPage from './pages/admin/RequestsPage'
import ChatPage from './pages/admin/ChatPage'
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
import EventoPage from './pages/guest/EventoPage'
import PropertyInfoPage from './pages/admin/property/PropertyInfoPage'
import PropertyModulesPage from './pages/admin/property/PropertyModulesPage'
import PropertyServicesPage from './pages/admin/property/PropertyServicesPage'
import PropertyGalleryPage from './pages/admin/property/PropertyGalleryPage'
import PropertyThemePage from './pages/admin/property/PropertyThemePage'
import PropertyActivitiesPage from './pages/admin/property/PropertyActivitiesPage'
import PropertyExcursionsPage from './pages/admin/property/PropertyExcursionsPage'
import PropertyMiniSitoPage from './pages/admin/property/PropertyMiniSitoPage'
import RistoranteMiniSitoPage from './pages/admin/ristorante/RistoranteMiniSitoPage'
import EventiListPage from './pages/admin/eventi/EventiListPage'
import EventoEditPage from './pages/admin/eventi/EventoEditPage'
import EventoPrenotazioniPage from './pages/admin/eventi/EventoPrenotazioniPage'
import AdminBlogListPage from './pages/admin/blog/BlogListPage'
import BlogEditorPage from './pages/admin/blog/BlogEditorPage'
import BlogCategoriesPage from './pages/admin/blog/BlogCategoriesPage'
import BlogAutomazioniPage from './pages/admin/blog/BlogAutomazioniPage'
import ArticoloPage from './pages/public/ArticoloPage'
import BlogListPage from './pages/public/BlogListPage'
import ContattiPage from './pages/admin/ContattiPage'
import PolicyPage from './pages/public/PolicyPage'
import LandingPage from './pages/public/LandingPage'
import PropertyPrivacyPage from './pages/admin/property/PropertyPrivacyPage'
import RistorantePrivacyPage from './pages/admin/ristorante/RistorantePrivacyPage'
import AttivitaPrivacyPage from './pages/admin/attivita/AttivitaPrivacyPage'
import AttivitaListPage from './pages/admin/attivita/AttivitaListPage'
import AttivitaInfoPage from './pages/admin/attivita/AttivitaInfoPage'
import AttivitaGalleryPage from './pages/admin/attivita/AttivitaGalleryPage'
import AttivitaThemePage from './pages/admin/attivita/AttivitaThemePage'
import AttivitaMiniSitoPage from './pages/admin/attivita/AttivitaMiniSitoPage'
import AttivitaApp from './pages/guest/AttivitaApp'
import DemoRequestsPage from './pages/admin/DemoRequestsPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import SecurityPage from './pages/admin/SecurityPage'
import MfaVerifyPage from './pages/admin/MfaVerifyPage'
import BookingsPage from './pages/admin/BookingsPage'
import OffertaPage from './pages/guest/OffertaPage'
import PacchettoPage from './pages/guest/PacchettoPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import NewsletterPage from './pages/admin/NewsletterPage'
import NewsletterEditorPage from './pages/admin/NewsletterEditorPage'
import BookingCalendarioPage from './pages/admin/booking/BookingCalendarioPage'
import BookingRisorsePage from './pages/admin/booking/BookingRisorsePage'
import BookingPrenotazioniPage from './pages/admin/booking/BookingPrenotazioniPage'
import CancellaPrenotazionePage from './pages/public/CancellaPrenotazionePage'
import PropertyChatbotPage from './pages/admin/property/PropertyChatbotPage'
import RistoranteChatbotPage from './pages/admin/ristorante/RistoranteChatbotPage'
import AttivitaChatbotPage from './pages/admin/attivita/AttivitaChatbotPage'
import StaffPage from './pages/admin/StaffPage'
import IntegrazioniPage from './pages/admin/IntegrazioniPage'
import PagineListPage from './pages/admin/PagineListPage'
import PaginaEditorPage from './pages/admin/PaginaEditorPage'
import SitoPage from './pages/admin/SitoPage'
import AutomazioniPage from './pages/admin/AutomazioniPage'
import RecensioniPage from './pages/admin/RecensioniPage'
import RecensionePage from './pages/public/RecensionePage'
import SignupPage from './pages/public/SignupPage'
import PaginaPage from './pages/guest/PaginaPage'
import UnsubscribePage from './pages/public/UnsubscribePage'
import ConfirmSubscriptionPage from './pages/public/ConfirmSubscriptionPage'
import NewsletterArchivePage from './pages/guest/NewsletterArchivePage'
import OnboardingPage from './pages/admin/OnboardingPage'
import ImpostazioniPage from './pages/admin/ImpostazioniPage'
import SeoGeoPage from './pages/admin/SeoGeoPage'
import PreventivPage from './pages/admin/PreventivPage'
import PreventivoEditorPage from './pages/admin/PreventivoEditorPage'
import PreventivoPublicPage from './pages/public/PreventivoPublicPage'
import FormBuilderListPage from './pages/admin/FormBuilderListPage'
import FormBuilderEditorPage from './pages/admin/FormBuilderEditorPage'
import FormBuilderSubmissionsPage from './pages/admin/FormBuilderSubmissionsPage'
import FormPublicPage from './pages/public/FormPublicPage'
import PianoEditorialePage from './pages/admin/PianoEditorialePage'
import PostEditorialePage from './pages/admin/PostEditorialePage'
import DominiPage from './pages/admin/DominiPage'
import ShopPage from './pages/admin/shop/ShopPage'
import ProdottoEditorPage from './pages/admin/shop/ProdottoEditorPage'
import OrdineDetailPage from './pages/admin/shop/OrdineDetailPage'
import ContentStudioPage from './pages/admin/ContentStudioPage'
import SurveyPage from './pages/admin/SurveyPage'
import SurveyPublicPage from './pages/public/SurveyPublicPage'
import LoyaltyPage from './pages/admin/LoyaltyPage'
import HelpPage from './pages/admin/HelpPage'

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

const STAYAPP_DOMAIN = import.meta.env.VITE_STAYAPP_DOMAIN || 'oltrenova.com'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Rileva se siamo su sottodominio *.oltrenova.com o dominio custom → redirige alla rotta giusta
function DomainDetector() {
  const [redirectTo, setRedirectTo] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const h = window.location.hostname
    const skip = h === 'localhost' || h === '127.0.0.1' ||
      h.includes('vercel.app') ||
      h === STAYAPP_DOMAIN || h === `www.${STAYAPP_DOMAIN}` ||
      h.startsWith('admin.')
    if (skip) { setChecked(true); return }

    fetch(`${API_BASE}/api/public/resolve-domain?d=${encodeURIComponent(h)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.entity_tipo && data?.entity_slug) {
          const prefix = data.entity_tipo === 'struttura' ? 's' : data.entity_tipo === 'ristorante' ? 'r' : 'a'
          setRedirectTo(`/${prefix}/${data.entity_slug}`)
        }
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  if (!checked) return null
  if (redirectTo && window.location.pathname === '/') {
    window.history.replaceState(null, '', redirectTo)
  }
  return null
}

export default function App() {
  return (
    <CarrelloProvider>
    <AuthProvider>
      <BrowserRouter>
        <DomainDetector />
        <Routes>
          {/* Guest PWA */}
          <Route path="/s/:slug" element={<GuestApp />} />
          <Route path="/r/:slug" element={<RestaurantApp />} />
          <Route path="/a/:slug" element={<AttivitaApp />} />
          <Route path="/eventi/:id" element={<EventoPage />} />

          {/* Dettaglio offerte e pacchetti struttura */}
          <Route path="/s/:slug/offerte/:id"   element={<OffertaPage />} />
          <Route path="/s/:slug/pacchetti/:id" element={<PacchettoPage />} />

          {/* Policy pubbliche — struttura */}
          <Route path="/s/:slug/privacy" element={<PolicyPage type="privacy" entityType="struttura" />} />
          <Route path="/s/:slug/cookie"  element={<PolicyPage type="cookie"  entityType="struttura" />} />
          {/* Policy pubbliche — ristorante */}
          <Route path="/r/:slug/privacy" element={<PolicyPage type="privacy" entityType="ristorante" />} />
          <Route path="/r/:slug/cookie"  element={<PolicyPage type="cookie"  entityType="ristorante" />} />
          {/* Policy pubbliche — attività */}
          <Route path="/a/:slug/privacy" element={<PolicyPage type="privacy" entityType="attivita" />} />
          <Route path="/a/:slug/cookie"  element={<PolicyPage type="cookie"  entityType="attivita" />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<ArticoloPage />} />
          <Route path="/cancella-prenotazione" element={<CancellaPrenotazionePage />} />
          <Route path="/recensione" element={<RecensionePage />} />
          <Route path="/preventivo" element={<PreventivoPublicPage />} />
          <Route path="/form" element={<FormPublicPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/survey" element={<SurveyPublicPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/confirm-subscription" element={<ConfirmSubscriptionPage />} />
          <Route path="/s/:slug/newsletter" element={<NewsletterArchivePage entityType="struttura" />} />
          <Route path="/r/:slug/newsletter" element={<NewsletterArchivePage entityType="ristorante" />} />
          <Route path="/a/:slug/newsletter" element={<NewsletterArchivePage entityType="attivita" />} />

          {/* Pagine sito */}
          <Route path="/s/:slug/p/:pageSlug" element={<PaginaPage entityType="struttura" />} />
          <Route path="/r/:slug/p/:pageSlug" element={<PaginaPage entityType="ristorante" />} />
          <Route path="/a/:slug/p/:pageSlug" element={<PaginaPage entityType="attivita" />} />

          {/* Admin — autenticazione */}
          <Route path="/admin/login"           element={<LoginPage />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/admin/mfa-verify"      element={<MfaVerifyPage />} />
          <Route path="/admin/onboarding"      element={<OnboardingPage />} />
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
            <Route path="analytics"     element={<AnalyticsPage />} />
            <Route path="requests"      element={<RequestsPage />} />
            <Route path="prenotazioni"  element={<BookingsPage />} />
            <Route path="demo"          element={<DemoRequestsPage />} />
            <Route path="audit-log"      element={<AuditLogPage />} />
            <Route path="security"       element={<SecurityPage />} />
            <Route path="impostazioni"   element={<ImpostazioniPage />} />
            <Route path="seo-geo"        element={<SeoGeoPage />} />
            <Route path="contatti"   element={<ContattiPage />} />
            <Route path="chat"       element={<ChatPage />} />
            <Route path="aziende"    element={<AziendePage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="users"      element={<UsersPage />} />
            <Route path="staff"        element={<StaffPage />} />
            <Route path="integrazioni" element={<IntegrazioniPage />} />
            <Route path="automazioni"  element={<AutomazioniPage />} />
            <Route path="recensioni"   element={<RecensioniPage />} />
            <Route path="preventivi"   element={<PreventivPage />} />
            <Route path="preventivi/:id" element={<PreventivoEditorPage />} />
            <Route path="form-builder" element={<FormBuilderListPage />} />
            <Route path="form-builder/:id" element={<FormBuilderEditorPage />} />
            <Route path="form-builder/:id/submissions" element={<FormBuilderSubmissionsPage />} />
            <Route path="piano-editoriale" element={<PianoEditorialePage />} />
            <Route path="piano-editoriale/:id" element={<PostEditorialePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="shop/:id" element={<ProdottoEditorPage />} />
            <Route path="shop/ordini/:id" element={<OrdineDetailPage />} />
            <Route path="loyalty" element={<LoyaltyPage />} />
            <Route path="help"    element={<HelpPage />} />
            <Route path="content-studio" element={<ContentStudioPage />} />
            <Route path="survey" element={<SurveyPage />} />
            <Route path="qrcode"       element={<QRCodePage />} />

            {/* Attività */}
            <Route path="attivita"                element={<AttivitaListPage />} />
            <Route path="attivita/:id/info"       element={<AttivitaInfoPage />} />
            <Route path="attivita/:id/gallery"    element={<AttivitaGalleryPage />} />
            <Route path="attivita/:id/theme"      element={<AttivitaThemePage />} />
            <Route path="attivita/:id/minisito"   element={<AttivitaMiniSitoPage />} />
            <Route path="attivita/:id/sito"       element={<SitoPage entityTipo="attivita" />} />
            <Route path="attivita/:id/privacy"    element={<AttivitaPrivacyPage />} />
            <Route path="attivita/:id/chatbot"    element={<AttivitaChatbotPage />} />
            <Route path="attivita/:id/pagine"     element={<PagineListPage entityTipo="attivita" />} />
            <Route path="attivita/:id/domini"     element={<DominiPage entityTipo="attivita" />} />

            {/* Ristoranti */}
            <Route path="ristoranti"              element={<RistorantiListPage />} />
            <Route path="ristoranti/:id/info"     element={<RistoranteInfoPage />} />
            <Route path="ristoranti/:id/menu"     element={<RistoranteMenuPage />} />
            <Route path="ristoranti/:id/gallery"  element={<RistoranteGalleryPage />} />
            <Route path="ristoranti/:id/theme"    element={<RistoranteThemePage />} />
            <Route path="ristoranti/:id/moduli"   element={<RistoranteModuliPage />} />
            <Route path="ristoranti/:id/minisito" element={<RistoranteMiniSitoPage />} />
            <Route path="ristoranti/:id/sito"     element={<SitoPage entityTipo="ristorante" />} />
            <Route path="ristoranti/:id/privacy"  element={<RistorantePrivacyPage />} />
            <Route path="ristoranti/:id/chatbot"  element={<RistoranteChatbotPage />} />
            <Route path="ristoranti/:id/pagine"   element={<PagineListPage entityTipo="ristorante" />} />
            <Route path="ristoranti/:id/domini"  element={<DominiPage entityTipo="ristorante" />} />

            {/* Struttura by ID (admin_azienda, super_admin) */}
            <Route path="struttura/:id" element={<StrutturaLayout />}>
              <Route path="info"       element={<PropertyInfoPage />} />
              <Route path="modules"    element={<PropertyModulesPage />} />
              <Route path="services"   element={<PropertyServicesPage />} />
              <Route path="gallery"    element={<PropertyGalleryPage />} />
              <Route path="theme"      element={<PropertyThemePage />} />
              <Route path="activities" element={<PropertyActivitiesPage />} />
              <Route path="excursions" element={<PropertyExcursionsPage />} />
              <Route path="sito"       element={<SitoPage entityTipo="struttura" />} />
              <Route path="minisito"   element={<PropertyMiniSitoPage />} />
              <Route path="privacy"    element={<PropertyPrivacyPage />} />
              <Route path="chatbot"    element={<PropertyChatbotPage />} />
              <Route path="pagine"     element={<PagineListPage entityTipo="struttura" />} />
              <Route path="domini"     element={<DominiPage entityTipo="struttura" />} />
            </Route>

            {/* Struttura legacy (admin_struttura, staff — usa profile.property_id) */}
            <Route path="property/info"       element={<PropertyInfoPage />} />
            <Route path="property/modules"    element={<PropertyModulesPage />} />
            <Route path="property/services"   element={<PropertyServicesPage />} />
            <Route path="property/gallery"    element={<PropertyGalleryPage />} />
            <Route path="property/theme"      element={<PropertyThemePage />} />
            <Route path="property/activities" element={<PropertyActivitiesPage />} />
            <Route path="property/excursions" element={<PropertyExcursionsPage />} />
            <Route path="property/sito"       element={<SitoPage entityTipo="struttura" />} />
            <Route path="property/minisito"   element={<PropertyMiniSitoPage />} />
            <Route path="property/privacy"    element={<PropertyPrivacyPage />} />
            <Route path="property/chatbot"    element={<PropertyChatbotPage />} />
            <Route path="property/pagine"     element={<PagineListPage entityTipo="struttura" />} />
            <Route path="property/domini"     element={<DominiPage entityTipo="struttura" />} />

            {/* Eventi */}
            <Route path="eventi"                         element={<EventiListPage />} />
            <Route path="eventi/:id"                     element={<EventoEditPage />} />
            <Route path="eventi/:id/prenotazioni"        element={<EventoPrenotazioniPage />} />

            {/* Blog */}
            <Route path="blog"                   element={<AdminBlogListPage />} />
            <Route path="blog/categories"        element={<BlogCategoriesPage />} />
            <Route path="blog/automazioni"       element={<BlogAutomazioniPage />} />
            <Route path="blog/:id"               element={<BlogEditorPage />} />

            {/* Newsletter */}
            <Route path="newsletter"     element={<NewsletterPage />} />
            <Route path="newsletter/:id" element={<NewsletterEditorPage />} />

            {/* Booking risorse */}
            <Route path="booking"                   element={<BookingCalendarioPage />} />
            <Route path="booking/risorse"            element={<BookingRisorsePage />} />
            <Route path="booking/prenotazioni"       element={<BookingPrenotazioniPage />} />

            {/* Editor pagina (shared, navigabile da PagineListPage) */}
            <Route path="pagine/:pageId" element={<PaginaEditorPage />} />
          </Route>

          {/* Root — landing page OltreNova */}
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </CarrelloProvider>
  )
}
