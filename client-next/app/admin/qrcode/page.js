'use client'
import nextDynamic from 'next/dynamic'
import AdminLayout from '@/components/admin/AdminLayout'

const QRCodePage = nextDynamic(() => import('@/components/admin/QRCodePage'), { ssr: false })

export const dynamic = 'force-dynamic'

export default function Page() {
  return <AdminLayout><QRCodePage /></AdminLayout>
}
