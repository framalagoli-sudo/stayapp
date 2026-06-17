import PolicyPage from '@/components/public/PolicyPage'

export const metadata = { title: 'Privacy Policy', robots: { index: false } }

export default function Page() {
  return <PolicyPage type="privacy" entityType="ristorante" />
}
