'use client'
import { useEffect, useMemo } from 'react'
import LandingBlockRenderer from '@/components/LandingBlockRenderer'
import { getTemplate } from '@/lib/siteTemplates'
import { getHeadingFamily, getBodyFamily, FONTS_URL } from '@/lib/fonts'

// Anteprima reale di un template: renderizza i suoi blocchi con LandingBlockRenderer
// e un'entità fittizia. Usata in iframe (scalata) dalla galleria template.
export default function TemplatePreviewClient({ id, blocks: blocksProp }) {
  const tpl = getTemplate(id)

  useEffect(() => {
    if (document.getElementById('tpl-fonts')) return
    const l = document.createElement('link')
    l.id = 'tpl-fonts'; l.rel = 'stylesheet'; l.href = FONTS_URL
    document.head.appendChild(l)
  }, [])

  const blocks = useMemo(() => {
    const src = blocksProp || tpl?.blocks
    if (!src) return []
    const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()))
    return src.map(b => ({
      ...b, id: uid(),
      data: { ...b.data, ...(Array.isArray(b.data.items) ? { items: b.data.items.map(i => ({ id: uid(), ...i })) } : {}) },
    }))
  }, [tpl, blocksProp])

  if (!tpl) return <div style={{ padding: 24, color: '#888' }}>Template non trovato.</div>

  const theme = tpl.theme || {}
  const entity = { name: 'La tua attività', slug: 'preview', azienda_id: null, description: '', address: '', phone: '', email: '' }

  return (
    <div style={{ fontFamily: getBodyFamily(theme.fontBody), color: theme.textColor || '#1a1a2e', background: theme.bgColor || '#fff' }}>
      <LandingBlockRenderer
        blocks={blocks}
        entity={entity}
        entityType="struttura"
        mini={{}}
        primary={theme.primaryColor || '#1a1a2e'}
        heading={getHeadingFamily(theme.fontHeading)}
        body={getBodyFamily(theme.fontBody)}
        slug="preview"
        privacyUrl="#"
        aziendaId={null}
        lang="it"
      />
    </div>
  )
}
