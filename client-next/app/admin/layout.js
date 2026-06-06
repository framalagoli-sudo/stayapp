'use client'
import { AuthProvider } from '@/context/AuthContext'
import { AziendaProvider } from '@/context/AziendaContext'
import AdminGuard from '@/components/admin/AdminGuard'

export default function RootAdminLayout({ children }) {
  return (
    <AuthProvider>
      <AziendaProvider>
        <AdminGuard>{children}</AdminGuard>
      </AziendaProvider>
    </AuthProvider>
  )
}
