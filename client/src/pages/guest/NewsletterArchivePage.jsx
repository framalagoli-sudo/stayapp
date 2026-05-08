import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'

const ENTITY_API = { struttura: slug => `/api/guest/${slug}`, ristorante: slug => `/api/guest/r/${slug}`, attivita: slug => `/api/guest/a/${slug}` }

export default function NewsletterArchivePage({ entityType }) {
  const { slug } = useParams()
  const [entity, setEntity] = useState(null)
  const [archive, setArchive] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiPath = ENTITY_API[entityType]?.(slug)
    if (!apiPath) return
    fetch(apiPath)
      .then(r => r.json())
      .then(async data => {
        setEntity(data)
        const res = await fetch(`/api/newsletter/archive/${entityType}/${data.id}`)
        const list = await res.json()
        setArchive(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, entityType])

  const primary = entity?.theme?.primaryColor || '#1a1a2e'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      Caricamento…
    </div>
  )

  if (selected) return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => setSelected(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 14, fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={16} strokeWidth={2} />
          Torna all'archivio
        </button>
      </div>
      <iframe
        srcDoc={selected._html}
        style={{ width: '100%', height: 'calc(100vh - 57px)', border: 'none', display: 'block' }}
      />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9fb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero */}
      <div style={{ background: '#1a1a2e', padding: '48px 20px 40px', textAlign: 'center' }}>
        {entity?.logo_url && (
          <img src={entity.logo_url} alt="" style={{ height: 52, objectFit: 'contain', marginBottom: 16, display: 'block', margin: '0 auto 16px', borderRadius: 8 }} />
        )}
        <h1 style={{ color: '#fff', margin: '0 0 8px', fontSize: 26, fontWeight: 700 }}>Newsletter</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 15 }}>{entity?.name}</p>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
        {archive.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <Mail size={40} strokeWidth={1.5} color="#ddd" style={{ display: 'block', margin: '0 auto 14px' }} />
            <p style={{ margin: 0, fontSize: 15 }}>Nessuna newsletter ancora.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {archive.map(nl => (
              <div key={nl.id}
                onClick={() => setSelected({ ...nl, _html: buildArchivePreview(nl, entity) })}
                style={{ background: '#fff', borderRadius: 12, padding: '18px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} strokeWidth={1.5} color={primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nl.subject || '(senza oggetto)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {new Date(nl.sent_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <ArrowLeft size={16} strokeWidth={2} color="#ccc" style={{ transform: 'rotate(180deg)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function buildArchivePreview(nl, entity) {
  const entityName = entity?.name || ''
  const entityLogo = entity?.logo_url || ''
  const primary = entity?.theme?.primaryColor || '#1a1a2e'
  const c = nl.content || {}
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let body = ''
  if (nl.template_id === 'promozione') {
    const orig = parseFloat(c.price_original), disc = parseFloat(c.price_discounted)
    const pct = orig && disc && orig > disc ? Math.round((1 - disc / orig) * 100) : null
    body = `
      ${c.image_url ? `<img src="${c.image_url}" style="width:100%;max-height:300px;object-fit:cover;display:block">` : ''}
      <div style="padding:32px">
        ${c.badge ? `<span style="display:inline-block;background:${primary}22;color:${primary};font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;text-transform:uppercase">${esc(c.badge)}</span>` : ''}
        ${c.heading ? `<h1 style="font-size:24px;margin:12px 0 16px;font-family:Georgia,serif">${esc(c.heading)}</h1>` : ''}
        ${(c.price_discounted || c.price_original) ? `<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px">
          <span style="font-size:40px;font-weight:800;color:${primary};font-family:Georgia,serif">€${esc(c.price_discounted || c.price_original)}</span>
          ${pct ? `<span style="background:#22c55e;color:#fff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:20px">-${pct}%</span>` : ''}
        </div>` : ''}
        ${c.text ? `<p style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
        ${c.cta_text && c.cta_url ? `<a href="${c.cta_url}" style="display:inline-block;margin-top:20px;padding:13px 26px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">${esc(c.cta_text)}</a>` : ''}
      </div>`
  } else if (nl.template_id === 'notizie') {
    body = `<div style="padding:32px">
      ${c.heading ? `<h1 style="font-size:24px;margin:0 0 12px;font-family:Georgia,serif">${esc(c.heading)}</h1>` : ''}
      ${c.intro ? `<p style="color:#666;line-height:1.8;margin:0 0 24px">${esc(c.intro)}</p>` : ''}
      ${(c.blocks || []).map(b => `<div style="border-top:1px solid #f0f0f0;padding-top:20px;margin-bottom:20px;display:flex;gap:14px">
        ${b.image_url ? `<img src="${b.image_url}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;flex-shrink:0">` : ''}
        <div><h3 style="margin:0 0 6px">${esc(b.title)}</h3><p style="margin:0;font-size:13px;color:#555;line-height:1.7">${esc(b.text)}</p></div>
      </div>`).join('')}
    </div>`
  } else if (nl.template_id === 'evento') {
    const dateStr = c.date ? new Date(c.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
    body = `
      ${c.image_url ? `<img src="${c.image_url}" style="width:100%;max-height:260px;object-fit:cover;display:block">` : ''}
      <div style="padding:32px">
        ${c.event_title ? `<h1 style="font-size:26px;margin:0 0 16px;font-family:Georgia,serif">${esc(c.event_title)}</h1>` : ''}
        ${(c.date || c.location) ? `<div style="background:#f9f9fb;border-radius:10px;padding:14px 18px;margin-bottom:18px">
          ${c.date ? `<div style="font-size:13px;margin-bottom:6px">📅 <strong>${dateStr}${c.time ? ' alle ' + c.time : ''}</strong></div>` : ''}
          ${c.location ? `<div style="font-size:13px">📍 ${esc(c.location)}</div>` : ''}
        </div>` : ''}
        ${c.text ? `<p style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
        ${c.cta_text && c.cta_url ? `<a href="${c.cta_url}" style="display:inline-block;margin-top:20px;padding:13px 26px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">${esc(c.cta_text)}</a>` : ''}
      </div>`
  } else {
    body = `
      ${c.image_url ? `<img src="${c.image_url}" style="width:100%;max-height:260px;object-fit:cover;display:block">` : ''}
      <div style="padding:32px">
        ${c.heading ? `<h1 style="font-size:24px;margin:0 0 14px;font-family:Georgia,serif">${esc(c.heading)}</h1>` : ''}
        ${c.text ? `<p style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
        ${c.cta_text && c.cta_url ? `<a href="${c.cta_url}" style="display:inline-block;margin-top:20px;padding:13px 26px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">${esc(c.cta_text)}</a>` : ''}
      </div>`
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#1a1a2e;padding:20px 28px;display:flex;align-items:center;gap:12px">
    ${entityLogo ? `<img src="${entityLogo}" style="height:36px;object-fit:contain;border-radius:6px;margin-right:10px">` : ''}
    <span style="font-size:18px;font-weight:700;color:#fff">${esc(entityName)}</span>
  </div>
  ${body}
  <div style="background:#f9f9fb;padding:16px 28px;text-align:center;border-top:1px solid #f0f0f0">
    <span style="font-size:11px;color:#bbb">Powered by StayApp</span>
  </div>
</div>
</body></html>`
}
