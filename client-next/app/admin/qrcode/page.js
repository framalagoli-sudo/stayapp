'use client'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/admin/AdminLayout'

const QRCodePage = dynamic(() => import('@/components/admin/QRCodePage'), { ssr: false })

export const dynamic_export = 'force-dynamic'

export default function Page() {
  return <AdminLayout><QRCodePage /></AdminLayout>
}
