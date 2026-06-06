'use client'
import { AuthProvider } from '@/context/AuthContext'
import AdminGuard from '@/components/admin/AdminGuard'

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  )
}
