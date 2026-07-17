'use client'
import { useEffect, useState } from 'react'
import LangToggle from './LangToggle'
import { entityBasePath } from '@/lib/i18n'

// Header pubblico condiviso da tutte le entità (struttura/ristorante/attività) e
// dalle sotto-pagine. Sostituisce l'header inline duplicato nei 4 componenti.
// Config in mini.header_cfg:
//   layout: 'classic' | 'centered' | 'stacked'      (posizione logo/menu)
//   hover:  'underline' | 'highlight' | 'color' | 'none'  (effetto voci menu)
//   buttons: [{ id, label, url, shape:'rounded'|'pill'|'square', variant:'solid'|'outline'|'text', color:'primary'|'secondary'|'#hex' }]
//   + style/always_visible/scroll_behavior/logo_in_nav (già esistenti)

// URL sicuro (blocca javascript:/data: da input tenant). Ammette http(s)/mailto/tel e path interni.
function safeUrl(u) {
  const s = String(u || '').trim()
  return (/^(https?:|mailto:|tel:)/i.test(s) || s.startsWith('/')) ? s : '#'
}

const SHAPE_RADIUS = { rounded: 8, pill: 50, square: 0 }

function buttonStyle(b, { primary, secondary }) {
  const radius = SHAPE_RADIUS[b.shape] ?? 50
  const col = b.color === 'secondary' ? (secondary || primary)
    : (typeof b.color === 'string' && b.color.startsWith('#')) ? b.color
    : primary
  const base = { padding: '8px 20px', borderRadius: radius, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', lineHeight: 1.1, transition: 'opacity 0.2s' }
  if (b.variant === 'outline') return { ...base, color: col, border: `1.5px solid ${col}`, background: 'transparent' }
  if (b.variant === 'text')    return { ...base, color: col, background: 'transparent', padding: '8px 10px' }
  return { ...base, color: '#fff', background: col } // solid (default)
}

export default function SiteNav({ entity, mini, pagine = [], prefix, primary, secondary, heading, lang = 'it', domain = null, pwa = null, bookingUrl = null, currentSlug = null }) {
  const hdrCfg = mini?.header_cfg || mini?.header || {}
  const layout = ['classic', 'centered', 'stacked'].includes(hdrCfg.layout) ? hdrCfg.layout : 'classic'
  const hover  = ['underline', 'highlight', 'color', 'none'].includes(hdrCfg.hover) ? hdrCfg.hover : 'underline'
  const buttons = Array.isArray(hdrCfg.buttons) ? hdrCfg.buttons.filter(b => b && b.label) : []

  const navDark        = hdrCfg.style !== 'light'
  const showLogo       = hdrCfg.logo_in_nav !== false
  const navLogo        = (navDark && entity.logo_dark_url) ? entity.logo_dark_url : entity.logo_url
  const logoH          = { small: 24, medium: 32, large: 48 }[mini?.logo_size] || 32
  const navAlwaysVisible = hdrCfg.always_visible === true
  const smartNav       = hdrCfg.scroll_behavior === 'smart'
  const navBg          = navDark ? 'rgba(18,18,32,0.93)'    : 'rgba(255,255,255,0.95)'
  const navBorderColor = navDark ? 'rgba(255,255,255,0.08)' : '#eee'
  const navTextColor   = navDark ? 'rgba(255,255,255,0.8)'  : '#1a1a2e'
  const base           = entityBasePath(prefix, entity.slug, domain, lang)

  const [navVisible, setNavVisible] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    if (navAlwaysVisible) { setNavVisible(true); return }
    let last = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (smartNav) {
        if (y < 80) setNavVisible(true)
        else if (y > last + 4) setNavVisible(false)
        else if (y < last - 4) setNavVisible(true)
      } else setNavVisible(true)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [smartNav, navAlwaysVisible])

  const topPages = pagine.filter(p => !p.parent_id)
  const hasMenu = topPages.length > 0
  const hasActions = !!(pwa || bookingUrl || buttons.length)

  const brand = (
    <a href={base} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
      {showLogo && navLogo
        ? <img src={navLogo} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
        : <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 16, color: navTextColor }}>{entity.name}</span>}
    </a>
  )

  const menuLink = (p) => {
    const subs = pagine.filter(c => c.parent_id === p.id)
    return (
      <div key={p.id} className="snav-item" style={{ position: 'relative' }}
        onMouseEnter={() => subs.length && setOpenDropdown(p.id)}
        onMouseLeave={() => setOpenDropdown(null)}>
        <a href={`${base}/p/${p.slug}`} className="snav-link"
          style={{ color: navTextColor, textDecoration: 'none', fontSize: 13, padding: '6px 12px', borderRadius: 6, display: 'block', whiteSpace: 'nowrap', fontWeight: currentSlug && p.slug === currentSlug ? 700 : 400 }}>
          {p.titolo}{subs.length > 0 && <span style={{ marginLeft: 4, opacity: 0.5 }}>▾</span>}
        </a>
        {subs.length > 0 && openDropdown === p.id && (
          <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: 180, background: '#1a1a2e', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', padding: '6px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200 }}>
            {subs.map(s => (
              <a key={s.id} href={`${base}/p/${s.slug}`}
                style={{ display: 'block', padding: '9px 16px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 13 }}>{s.titolo}</a>
            ))}
          </div>
        )}
      </div>
    )
  }

  const actions = (
    <>
      {pwa && <a href={pwa.url} style={{ padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 600, textDecoration: 'none', color: navTextColor, border: `1px solid ${navDark ? 'rgba(255,255,255,0.3)' : '#ddd'}`, whiteSpace: 'nowrap' }}>{pwa.label}</a>}
      {bookingUrl && <a href={safeUrl(bookingUrl)} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: 'none', color: '#fff', background: primary, whiteSpace: 'nowrap' }}>Prenota</a>}
      {buttons.map(b => (
        <a key={b.id} href={safeUrl(b.url)} target={String(b.url).startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
          style={buttonStyle(b, { primary, secondary })}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
          {b.label}
        </a>
      ))}
    </>
  )

  const menuRow = hasMenu && <div className={`snav-desktop snav-h-${hover}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{topPages.map(menuLink)}</div>
  const actionRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {hasActions && <div className="snav-desktop" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
      <LangToggle lang={lang} color={navTextColor} />
      {(hasMenu || hasActions) && <button className="snav-burger" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">{mobileOpen ? '✕' : '☰'}</button>}
    </div>
  )

  // Layout centrato: menu diviso in due metà attorno al logo
  const half = Math.ceil(topPages.length / 2)
  const leftPages = topPages.slice(0, half)
  const rightPages = topPages.slice(half)

  return (
    <>
      <style>{`
        .snav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: ${navBg}; backdrop-filter: blur(14px); border-bottom: 1px solid ${navBorderColor}; padding: 0 32px; transform: translateY(${navVisible ? '0' : '-100%'}); transition: transform 0.3s ease; }
        .snav-classic  { display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .snav-centered { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: 64px; gap: 12px; }
        .snav-stacked  { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-top: 10px; padding-bottom: 10px; }
        .snav-stacked-top { display: flex; align-items: center; justify-content: center; width: 100%; position: relative; }
        .snav-stacked-actions { position: absolute; right: 0; top: 50%; transform: translateY(-50%); }
        .snav-link { position: relative; }
        .snav-h-underline .snav-link::after { content:''; position:absolute; left:12px; right:12px; bottom:2px; height:2px; background:currentColor; transform:scaleX(0); transform-origin:left; transition:transform .25s ease; }
        .snav-h-underline .snav-link:hover::after { transform:scaleX(1); }
        .snav-h-highlight .snav-link:hover { background: ${navDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}; }
        .snav-h-color .snav-link:hover { color: ${primary} !important; opacity: 1; }
        .snav-burger { display: none; background: none; border: none; cursor: pointer; color: ${navTextColor}; font-size: 22px; line-height: 1; padding: 6px; }
        .snav-mobile { position: fixed; top: 64px; left: 0; right: 0; z-index: 99; background: ${navBg}; backdrop-filter: blur(14px); border-bottom: 1px solid ${navBorderColor}; padding: 8px 16px 16px; display: flex; flex-direction: column; }
        @media (min-width: 769px) { .snav-mobile { display: none !important; } }
        @media (max-width: 768px) {
          .snav { padding: 0 16px; }
          .snav-centered, .snav-stacked { display: flex !important; flex-direction: row; align-items: center; justify-content: space-between; height: 64px; padding-top: 0; padding-bottom: 0; }
          .snav-stacked-top { width: auto; }
          .snav-stacked-actions { position: static; transform: none; }
          .snav-desktop { display: none !important; }
          .snav-burger { display: flex !important; align-items: center; }
        }
      `}</style>

      {layout === 'centered' ? (
        <nav className="snav snav-centered">
          <div className="snav-centered-spacer" />
          <div style={{ justifySelf: 'center', display: 'flex', alignItems: 'center', gap: 20 }}>
            {hasMenu && <div className={`snav-desktop snav-h-${hover}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{leftPages.map(menuLink)}</div>}
            {brand}
            {hasMenu && rightPages.length > 0 && <div className={`snav-desktop snav-h-${hover}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{rightPages.map(menuLink)}</div>}
          </div>
          <div style={{ justifySelf: 'end' }}>{actionRow}</div>
        </nav>
      ) : layout === 'stacked' ? (
        <nav className="snav snav-stacked">
          <div className="snav-stacked-top">
            {brand}
            <div className="snav-stacked-actions">{actionRow}</div>
          </div>
          {menuRow}
        </nav>
      ) : (
        <nav className="snav snav-classic">
          {brand}
          {menuRow}
          {actionRow}
        </nav>
      )}

      {mobileOpen && (
        <div className="snav-mobile">
          {topPages.map(p => (
            <a key={p.id} href={`${base}/p/${p.slug}`} onClick={() => setMobileOpen(false)}
              style={{ color: navTextColor, textDecoration: 'none', fontSize: 15, padding: '11px 4px', borderBottom: `1px solid ${navBorderColor}` }}>{p.titolo}</a>
          ))}
          {hasActions && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>{actions}</div>
          )}
        </div>
      )}
    </>
  )
}
