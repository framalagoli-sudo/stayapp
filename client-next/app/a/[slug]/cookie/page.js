import PolicyPage from '@/components/public/PolicyPage'

export const metadata = { title: 'Cookie Policy', robots: { index: false } }

export default function Page() {
  return <PolicyPage type="cookie" entityType="attivita" />
}
