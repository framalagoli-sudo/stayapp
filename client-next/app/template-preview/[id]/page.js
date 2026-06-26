import TemplatePreviewClient from '@/components/TemplatePreviewClient'

export const metadata = { title: 'Anteprima template', robots: { index: false } }

export default async function Page({ params }) {
  const { id } = await params
  return <TemplatePreviewClient id={id} />
}
