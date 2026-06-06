'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const PUBLIC_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/admin/accept-invite', '/admin/mfa-verify']

export default function AdminGuard({ children }) {
  const { user, profile, loading, aalStatus, require2fa } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (loading) return

    if (!user && !isPublic) {
      router.replace('/admin/login')
      return
    }

    if (user && require2fa && aalStatus?.currentLevel === 'aal1' && aalStatus?.nextLevel === 'aal2' && !pathname.startsWith('/admin/mfa-verify')) {
      router.replace('/admin/mfa-verify')
      return
    }

    if (user && isPublic && pathname === '/admin/login') {
      router.replace('/admin')
    }
  }, [user, profile, loading, aalStatus, require2fa, pathname])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #eee', borderTopColor: '#0F7B6C', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!user && !isPublic) return null

  return children
}
