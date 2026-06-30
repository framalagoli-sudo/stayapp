import TemplatePreviewClient from '@/components/TemplatePreviewClient'
import { getTemplate } from '@/lib/siteTemplates'
import { resolveBlockImages } from '@/lib/unsplash'

export const metadata = { title: 'Anteprima template', robots: { index: false } }

export default async function Page({ params }) {
  const { id } = await params
  const tpl = getTemplate(id)
  // Risolve le immagini (image_query → URL Unsplash) lato server: la chiave c'è solo qui.
  const blocks = tpl ? await resolveBlockImages(tpl.blocks, []) : null
  return <TemplatePreviewClient id={id} blocks={blocks} />
}
