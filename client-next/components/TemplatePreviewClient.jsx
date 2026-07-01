'use client'
import { useEffect, useMemo, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import LandingBlockRenderer from '@/components/LandingBlockRenderer'
import LandingFooter from '@/components/guest/LandingFooter'
import { getTemplate } from '@/lib/siteTemplates'
import { getHeadingFamily, getBodyFamily, FONTS_URL } from '@/lib/fonts'

// Anteprima reale di un template: nav + blocchi (LandingBlockRenderer) + footer,
// con un'entità fittizia. Come il sito vero, così si vede il template completo.
// - Embedded (dentro un iframe: thumbnail galleria o vista mobile): solo il chrome.
// - Standalone (nuova scheda): barra Desktop/Mobile in alto; Mobile = iframe a 390px
//   (viewport reale → scattano i media query, anteprima mobile fedele).
export default function TemplatePreviewClient({ id, blocks: blocksProp }) {
  const tpl = getTemplate(id)
  const [device, setDevice] = useState('desktop')
  const [embedded, setEmbedded] = useState(true) // finché non montato, assumi embedded (niente barra)
  const [navHidden, setNavHidden] = useState(false) // header "smart": nascondi giù, mostra su

  useEffect(() => {
    setEmbedded(window.self !== window.top)
    if (document.getElementById('tpl-fonts')) return
    const l = document.createElement('link')
    l.id = 'tpl-fonts'; l.rel = 'stylesheet'; l.href = FONTS_URL
    document.head.appendChild(l)
  }, [])

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < 80) setNavHidden(false)
      else if (y > last + 4) setNavHidden(true)
      else if (y < last - 4) setNavHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const blocks = useMemo(() => {
    const src = blocksProp || tpl?.blocks
    if (!src) return []
    const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()))
    return src.map(b => ({
      ...b, id: uid(),
      data: {
        ...b.data,
        ...(Array.isArray(b.data.items)  ? { items:  b.data.items.map(i => ({ id: uid(), ...i })) } : {}),
        ...(Array.isArray(b.data.slides) ? { slides: b.data.slides.map(s => ({ id: uid(), ...s })) } : {}),
      },
    }))
  }, [tpl, blocksProp])

  if (!tpl) return <div style={{ padding: 24, color: '#888' }}>Template non trovato.</div>

  const theme    = tpl.theme || {}
  const primary  = theme.primaryColor || '#1a1a2e'
  const heading  = getHeadingFamily(theme.fontHeading)
  const body     = getBodyFamily(theme.fontBody)

  // Entità fittizia realistica: dà sostanza a nav e footer.
  const entity = {
    name: 'La tua attività', slug: 'preview', azienda_id: null,
    description: 'Una breve descrizione di ciò che offri e di cosa ti rende speciale.',
    address: 'Via Roma 1, Città', phone: '+39 000 000 000', email: 'info@esempio.it',
    azienda_legale: null,
  }
  const previewMini = { social: { instagram: '#', facebook: '#' }, footer: {} }

  const content = (
    <div style={{ fontFamily: body, color: theme.textColor || '#1a1a2e', background: theme.bgColor || '#fff', position: 'relative' }}>
      <style>{`
        .tpl-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 20px clamp(20px,5vw,52px); background: linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0)); transition: transform 0.3s ease; }
        .tpl-nav-links { display: flex; align-items: center; gap: 26px; }
        @media (max-width: 700px) { .tpl-nav-links a:not(.tpl-cta) { display: none; } .tpl-nav { padding: 16px 18px; } }
      `}</style>

      <nav className="tpl-nav" style={{ transform: navHidden ? 'translateY(-100%)' : 'translateY(0)' }}>
        <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 19, color: '#fff', textShadow: '0 1px 12px rgba(0,0,0,0.3)' }}>{entity.name}</span>
        <div className="tpl-nav-links">
          {['Home', 'Chi siamo', 'Servizi', 'Contatti'].map(l => (
            <a key={l} href="#" onClick={e => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, textDecoration: 'none', textShadow: '0 1px 10px rgba(0,0,0,0.3)' }}>{l}</a>
          ))}
          <a href="#" onClick={e => e.preventDefault()} className="tpl-cta" style={{ padding: '9px 20px', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 50, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Prenota</a>
        </div>
      </nav>

      <LandingBlockRenderer
        blocks={blocks} entity={entity} entityType="struttura" mini={previewMini}
        primary={primary} heading={heading} body={body}
        slug="preview" privacyUrl="#" aziendaId={null} lang="it"
      />

      <LandingFooter entity={entity} mini={previewMini} primary={primary} heading={heading} body={body} entityType="struttura" lang="it" />
    </div>
  )

  // Dentro un iframe (thumbnail o vista mobile): solo il chrome, niente barra.
  if (embedded) return content

  // Standalone: barra strumenti con Desktop / Mobile.
  const tab = active => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none',
    background: active ? '#1a1a2e' : 'transparent', color: active ? '#fff' : '#555',
  })
  return (
    <div style={{ minHeight: '100vh', background: '#ececef' }}>
      <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: 6, padding: 6, background: '#fff', borderRadius: 50, boxShadow: '0 8px 28px rgba(0,0,0,0.22)', border: '1px solid #e5e5ea' }}>
        <button onClick={() => setDevice('desktop')} style={tab(device === 'desktop')}><Monitor size={16} strokeWidth={1.5} /> Desktop</button>
        <button onClick={() => setDevice('mobile')}  style={tab(device === 'mobile')}><Smartphone size={16} strokeWidth={1.5} /> Mobile</button>
      </div>
      {device === 'desktop' ? (
        content
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 16px' }}>
          <div style={{ width: 390, height: 'min(800px, 82vh)', borderRadius: 40, border: '10px solid #1a1a2e', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', background: '#fff' }}>
            <iframe src={`/template-preview/${id}`} title="Anteprima mobile" style={{ width: '100%', height: '100%', border: 0 }} />
          </div>
        </div>
      )}
    </div>
  )
}
