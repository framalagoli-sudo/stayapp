'use client'
import { useContext, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { PropertyIdContext } from '@/context/PropertyIdContext'
import { useAuth } from '@/context/AuthContext'
import {
  GripVertical, Home, FilePlus, Users, Briefcase, Mail, Tag, HelpCircle,
  Search, FileText, SearchX, Navigation, PenLine, Layers, History, Languages, Settings, Sparkles,
} from 'lucide-react'
import TraduzioniSito from '@/components/admin/TraduzioniSito'

// ── Template definitions ──────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'blank',     label: 'Pagina vuota', Icon: FilePlus,   color: '#888',    desc: 'Parti da zero e aggiungi i blocchi che vuoi', blockCount: 0 },
  { id: 'chi_siamo', label: 'Chi siamo',    Icon: Users,      color: '#5b6af8', desc: 'Presentazione, foto+testo, team', blockCount: 3 },
  { id: 'servizi',   label: 'Servizi',      Icon: Briefcase,  color: '#0891b2', desc: 'Card servizi, processo e call-to-action', blockCount: 4 },
  { id: 'contatti',  label: 'Contatti',     Icon: Mail,       color: '#16a34a', desc: 'Testo introduttivo, form contatti e mappa', blockCount: 3 },
  { id: 'promo',     label: 'Promozioni',   Icon: Tag,        color: '#f97316', desc: 'Statistiche, offerte, testimonianze e CTA', blockCount: 4 },
  { id: 'faq',       label: 'FAQ',          Icon: HelpCircle, color: '#9333ea', desc: 'Introduzione e accordion domande/risposte', blockCount: 2 },
]

function makeTemplateBlocks(templateId) {
  const id = () => crypto.randomUUID()
  switch (templateId) {
    case 'chi_siamo': return [
      { id: id(), type: 'about',      data: { title: 'Chi siamo', text: '' } },
      { id: id(), type: 'foto_testo', data: { title: '', text: '', image_url: '', inverti: false, button_label: '', button_url: '' } },
      { id: id(), type: 'team',       data: { titolo: 'Il nostro team', items: [] } },
    ]
    case 'servizi': return [
      { id: id(), type: 'about',      data: { title: 'I nostri servizi', text: '' } },
      { id: id(), type: 'paragrafi',  data: { titolo: 'Cosa offriamo', items: [] } },
      { id: id(), type: 'steps',      data: { titolo: 'Come funziona', items: [] } },
      { id: id(), type: 'cta_banner', data: { title: 'Pronto a iniziare?', subtitle: '', button_text: 'Contattaci', button_url: '' } },
    ]
    case 'contatti': return [
      { id: id(), type: 'about',    data: { title: 'Contattaci', text: 'Siamo a tua disposizione.' } },
      { id: id(), type: 'contatti', data: {} },
      { id: id(), type: 'show_map', data: {} },
    ]
    case 'promo': return [
      { id: id(), type: 'stats',         data: { titolo: '', items: [] } },
      { id: id(), type: 'promozioni',    data: { titolo: 'Le nostre offerte', items: [] } },
      { id: id(), type: 'testimonianze', data: { titolo: 'Cosa dicono di noi', items: [] } },
      { id: id(), type: 'cta_banner',    data: { title: 'Non perdere questa occasione', subtitle: '', button_text: 'Scopri di più', button_url: '' } },
    ]
    case 'faq': return [
      { id: id(), type: 'about', data: { title: 'Domande frequenti', text: '' } },
      { id: id(), type: 'faq',   data: { titolo: '', items: [] } },
    ]
    default: return []
  }
}

// ── Template Picker Modal ─────────────────────────────────────────────────────
function NewPageModal({ onClose, onConfirm, creating }) {
  const [title,    setTitle]    = useState('')
  const [template, setTemplate] = useState('blank')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onConfirm(title.trim(), template)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>Nuova pagina</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title input */}
          <div style={{ padding: '20px 24px 0' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Titolo della pagina *</label>
            <input
              autoFocus required
              placeholder="es. Chi siamo, Servizi, Contatti…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 9, fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>

          {/* Template grid */}
          <div style={{ padding: '20px 24px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>Scegli un template di partenza</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
              {TEMPLATES.map(t => {
                const sel = template === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    style={{
                      textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      border: sel ? '2px solid #1a1a2e' : '2px solid #e8e8ee',
                      background: sel ? '#f0f2ff' : '#f9f9fb',
                      transition: 'border-color 0.12s, background 0.12s',
                      position: 'relative',
                    }}
                  >
                    {sel && <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 13, color: '#1a1a2e', fontWeight: 700 }}>✓</div>}
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <div style={{ background: `${t.color}18`, borderRadius: 8, padding: '7px 8px', display: 'inline-flex' }}>
                        <t.Icon size={20} strokeWidth={1.5} color={t.color} />
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e', marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.35 }}>{t.desc}</div>
                    {t.blockCount > 0 && (
                      <div style={{ marginTop: 8, fontSize: 10, color: '#aaa' }}>{t.blockCount} blocchi pre-compilati</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 22px', borderTop: '1px solid #f0f0f0', paddingTop: 18 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
              Annulla
            </button>
            <button type="submit" disabled={creating || !title.trim()}
              style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: title.trim() ? '#1a1a2e' : '#ccc', color: '#fff', cursor: title.trim() ? 'pointer' : 'default', fontSize: 14, fontWeight: 600 }}>
              {creating ? 'Creazione...' : 'Crea pagina →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SitoPage({ entityTipo }) {
  const router      = useRouter()
  const { id: paramId } = useParams()
  const ctxId       = useContext(PropertyIdContext)
  const { profile } = useAuth()

  const entityId = entityTipo === 'struttura'
    ? (ctxId || paramId || profile?.property_id)
    : paramId

  const [activeTab,    setActiveTab]    = useState('home')
  const [pagine,       setPagine]       = useState([])
  const [entitySlug,   setEntitySlug]   = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  // Search / filter
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('tutti')
  const [filterMenu,   setFilterMenu]   = useState('tutti')

  // Drag & drop state
  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  // Header/Footer config
  const DEFAULT_HEADER = { style: 'dark', always_visible: false, scroll_behavior: 'appear', logo_in_nav: true, show_cta: false, cta_text: 'Prenota ora', cta_url: '', show_phone: false, bg_color: '' }
  const DEFAULT_FOOTER = { layout: 'standard', style: 'dark', copyright: '', show_socials: true, show_description: true, show_contact: true, extra_links: [] }
  const DEFAULT_TRACKING = { meta_pixel_id: '', ga4_id: '', gtm_id: '', tiktok_pixel_id: '' }
  const DEFAULT_SEO = { seo_title: '', seo_description: '', google_site_verification: '', booking_url: '', tagline: '', show_pwa_link: true, social: { instagram: '', facebook: '', tripadvisor: '', whatsapp: '' }, tracking_cfg: DEFAULT_TRACKING }
  const [entityData,  setEntityData]  = useState(null)
  const [headerCfg,   setHeaderCfg]   = useState(DEFAULT_HEADER)
  const [footerCfg,   setFooterCfg]   = useState(DEFAULT_FOOTER)
  const [seoForm,     setSeoForm]     = useState(DEFAULT_SEO)
  const [savingCfg,   setSavingCfg]   = useState(false)
  const [savedCfg,    setSavedCfg]    = useState(false)
  const [savingSeo,   setSavingSeo]   = useState(false)
  const [savedSeo,    setSavedSeo]    = useState(false)

  useEffect(() => { if (entityId) load() }, [entityId])

  async function load() {
    setLoading(true)
    const [pData, eData] = await Promise.all([
      apiFetch(`/api/pagine?entity_tipo=${entityTipo}&entity_id=${entityId}`),
      loadEntitySlug(),
    ])
    setPagine(Array.isArray(pData) ? pData : [])
    if (eData?.slug) setEntitySlug(eData.slug)
    if (eData) {
      setEntityData(eData)
      const mini = eData.minisito || {}
      if (mini.header_cfg) setHeaderCfg(h => ({ ...h, ...mini.header_cfg }))
      if (mini.footer_cfg) setFooterCfg(f => ({ ...f, ...mini.footer_cfg }))
      setSeoForm({
        seo_title: mini.seo_title || '', seo_description: mini.seo_description || '',
        google_site_verification: mini.google_site_verification || '',
        booking_url: mini.booking_url || '', tagline: mini.tagline || '',
        show_pwa_link: mini.show_pwa_link !== false,
        social: { instagram: '', facebook: '', tripadvisor: '', whatsapp: '', ...(mini.social || {}) },
        tracking_cfg: { meta_pixel_id: '', ga4_id: '', gtm_id: '', tiktok_pixel_id: '', ...(mini.tracking_cfg || {}) },
      })
    }
    setLoading(false)
  }

  async function loadEntitySlug() {
    if (entityTipo === 'struttura')  return apiFetch(`/api/properties/${entityId}`)
    if (entityTipo === 'ristorante') return apiFetch(`/api/ristoranti/${entityId}`)
    if (entityTipo === 'attivita')   return apiFetch(`/api/attivita/${entityId}`)
    return null
  }

  async function saveHeaderFooter() {
    if (!entityData) return
    setSavingCfg(true)
    const endpoint = entityTipo === 'struttura' ? `/api/properties/${entityId}`
      : entityTipo === 'ristorante' ? `/api/ristoranti/${entityId}`
      : `/api/attivita/${entityId}`
    await apiFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ minisito: { ...(entityData.minisito || {}), header_cfg: headerCfg, footer_cfg: footerCfg } }),
    })
    setEntityData(d => ({ ...d, minisito: { ...(d?.minisito || {}), header_cfg: headerCfg, footer_cfg: footerCfg } }))
    setSavingCfg(false)
    setSavedCfg(true)
    setTimeout(() => setSavedCfg(false), 2500)
  }

  async function saveSeo() {
    if (!entityData) return
    setSavingSeo(true)
    const endpoint = entityTipo === 'struttura' ? `/api/properties/${entityId}`
      : entityTipo === 'ristorante' ? `/api/ristoranti/${entityId}`
      : `/api/attivita/${entityId}`
    const patch = {
      seo_title: seoForm.seo_title, seo_description: seoForm.seo_description,
      google_site_verification: seoForm.google_site_verification,
      booking_url: seoForm.booking_url, tagline: seoForm.tagline,
      show_pwa_link: seoForm.show_pwa_link, social: seoForm.social,
      tracking_cfg: seoForm.tracking_cfg,
    }
    await apiFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ minisito: { ...(entityData.minisito || {}), ...patch } }),
    })
    setEntityData(d => ({ ...d, minisito: { ...(d?.minisito || {}), ...patch } }))
    setSavingSeo(false)
    setSavedSeo(true)
    setTimeout(() => setSavedSeo(false), 2500)
  }

  function previewUrl(p) {
    if (!entitySlug) return null
    const base = entityTipo === 'struttura' ? `/s/${entitySlug}` : entityTipo === 'ristorante' ? `/r/${entitySlug}` : `/a/${entitySlug}`
    return `${base}/p/${p.slug}`
  }

  async function createPage(title, templateId) {
    setCreating(true)
    const res = await apiFetch('/api/pagine', {
      method: 'POST',
      body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, titolo: title }),
    })
    if (res?.id) {
      const blocks = makeTemplateBlocks(templateId)
      if (blocks.length > 0) {
        await apiFetch(`/api/pagine/${res.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ blocks }),
        })
      }
      router.push(`/admin/pagine/${res.id}`)
    } else {
      setCreating(false)
      setShowNewModal(false)
      load()
    }
  }

  async function duplicatePage(p) {
    const res = await apiFetch('/api/pagine', {
      method: 'POST',
      body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, titolo: `${p.titolo} (copia)` }),
    })
    if (!res?.id) return
    await apiFetch(`/api/pagine/${res.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ blocks: p.blocks ?? [], nel_menu: false }),
    })
    load()
  }

  async function toggleStatus(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: p.status === 'pubblicata' ? 'bozza' : 'pubblicata' }) })
    load()
  }

  async function addToMenu(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ nel_menu: true }) })
    load()
  }

  async function removeFromMenu(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ nel_menu: false }) })
    load()
  }

  async function deletePage(p) {
    if (!confirm(`Elimina "${p.titolo}"?`)) return
    await apiFetch(`/api/pagine/${p.id}`, { method: 'DELETE' })
    load()
  }

  function move(p, dir) {
    const arr = [...pagine]
    const idx = arr.indexOf(p)
    const t   = idx + dir
    if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]
    setPagine(arr)
    apiFetch('/api/pagine/reorder', {
      method: 'POST',
      body: JSON.stringify({ items: arr.map((x, i) => ({ id: x.id, ordine: i, parent_id: x.parent_id })) }),
    })
  }

  async function makeChild(p) {
    const topMenu = pagine.filter(x => x.nel_menu && !x.parent_id)
    const idx = topMenu.indexOf(p)
    if (idx <= 0) return
    const parent = topMenu[idx - 1]
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: parent.id }) })
    load()
  }

  async function makeTopLevel(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: null }) })
    load()
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  function onDragOver(e, p) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (p.id !== dragId && dragOverId !== p.id) setDragOverId(p.id)
  }

  async function onDrop(e, target) {
    e.preventDefault()
    if (!dragId || dragId === target.id) { resetDrag(); return }
    const arr = [...menuTop]
    const fromIdx = arr.findIndex(x => x.id === dragId)
    const toIdx   = arr.findIndex(x => x.id === target.id)
    if (fromIdx === -1 || toIdx === -1) { resetDrag(); return }
    arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0])
    const updated = pagine.map(p => {
      const found = arr.findIndex(x => x.id === p.id)
      return found !== -1 ? { ...p, ordine: found } : p
    })
    setPagine(updated)
    resetDrag()
    apiFetch('/api/pagine/reorder', {
      method: 'POST',
      body: JSON.stringify({ items: arr.map((x, i) => ({ id: x.id, ordine: i, parent_id: x.parent_id })) }),
    })
  }

  function resetDrag() { setDragId(null); setDragOverId(null) }

  // ── Derived lists ─────────────────────────────────────────────────────────────
  const homePage   = pagine.find(p => p.slug === '__home__') || null
  const menuTop   = pagine.filter(p => p.nel_menu && !p.parent_id).sort((a, b) => a.ordine - b.ordine)
  const menuSubs  = id => pagine.filter(p => p.nel_menu && p.parent_id === id).sort((a, b) => a.ordine - b.ordine)
  const notInMenu = pagine.filter(p => !p.nel_menu)

  const activeFilters = search || filterStatus !== 'tutti' || filterMenu !== 'tutti'
  const filteredPagine = pagine.filter(p => {
    if (search && !p.titolo.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'tutti' && p.status !== filterStatus) return false
    if (filterMenu === 'si'  && !p.nel_menu) return false
    if (filterMenu === 'no'  &&  p.nel_menu) return false
    return true
  })

  // ── Stili ─────────────────────────────────────────────────────────────────────
  const cardStyle = {
    background: '#fff', borderRadius: 10, border: '1px solid #eeeeee',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  }
  const btnTiny = {
    background: '#f0f0f0', border: 'none', borderRadius: 6,
    padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#444',
  }
  const btnAction = (variant = 'default') => ({
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
    padding: '5px 12px', fontWeight: 500,
    ...(variant === 'primary'  ? { background: '#1a1a2e', color: '#fff' } :
        variant === 'danger'   ? { background: '#fce8e8', color: '#c00' } :
        variant === 'add'      ? { background: '#e8f4fb', color: '#0066aa', border: '1px solid #c8e4f4' } :
        variant === 'remove'   ? { background: '#fff3f3', color: '#c00', border: '1px solid #f4c8c8' } :
                                 { background: '#f4f4f6', color: '#444', border: '1px solid #e4e4e8' }),
  })

  const filterChip = (active) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
    border: active ? '1.5px solid #1a1a2e' : '1.5px solid #e0e0e0',
    background: active ? '#1a1a2e' : '#fff',
    color: active ? '#fff' : '#555',
    fontWeight: active ? 600 : 400,
  })

  // ── renderMenuRow — funzione (non componente React!) per evitare unmount/remount durante drag ──
  function renderMenuRow(p, isChild = false) {
    const topIdx    = menuTop.indexOf(p)
    const canIndent = !isChild && topIdx > 0 && menuSubs(menuTop[topIdx - 1]?.id).length === 0
    const isDragging = dragId === p.id
    const isDragOver = dragOverId === p.id && !isChild
    return (
      <div
        key={p.id}
        onDragOver={!isChild ? e => onDragOver(e, p) : undefined}
        onDrop={!isChild ? e => onDrop(e, p) : undefined}
        onDragEnd={resetDrag}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 8px 10px 14px',
          background: isDragging ? '#f0f4ff' : '#fff',
          borderRadius: 8, marginBottom: 4,
          border: isDragOver ? '2px solid #4a7cdc' : '1px solid #eeeeee',
          boxShadow: isDragging ? '0 4px 12px rgba(74,124,220,0.18)' : '0 1px 2px rgba(0,0,0,0.04)',
          marginLeft: isChild ? 28 : 0,
          position: 'relative',
          opacity: isDragging ? 0.55 : 1,
          transition: 'box-shadow 0.15s, border-color 0.15s',
        }}
      >
        {isChild && <div style={{ position: 'absolute', left: -20, top: '50%', width: 14, height: 1, background: '#ddd' }} />}
        {!isChild ? (
          <div
            draggable={true}
            onDragStart={e => { e.stopPropagation(); setDragId(p.id); e.dataTransfer.effectAllowed = 'move' }}
            style={{ padding: '4px 6px', cursor: 'grab', color: '#bbb', flexShrink: 0, display: 'flex', alignItems: 'center', userSelect: 'none' }}
          >
            <GripVertical size={15} strokeWidth={1.5} />
          </div>
        ) : (
          <div style={{ width: 16, flexShrink: 0 }} />
        )}
        {!isChild && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); move(p, -1) }} style={btnTiny} title="Sposta su">▲</button>
            <button onClick={e => { e.stopPropagation(); move(p, 1) }}  style={btnTiny} title="Sposta giù">▼</button>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.titolo}</span>
          {p.status === 'bozza' && (
            <span style={{ marginLeft: 8, fontSize: 10, background: '#fff3cd', color: '#856404', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>BOZZA</span>
          )}
          <span style={{ marginLeft: 6, fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>/{p.slug}</span>
        </div>
        {canIndent && (
          <button onClick={() => makeChild(p)} style={btnAction()}>Rendi sottopagina ↳</button>
        )}
        {isChild && (
          <button onClick={() => makeTopLevel(p)} style={btnAction()}>↱ Al primo livello</button>
        )}
        <button onClick={() => removeFromMenu(p)} style={btnAction('remove')}>✕ Rimuovi</button>
      </div>
    )
  }

  // ── Entity name for Home tab ──────────────────────────────────────────────────
  const entityName = entityData?.nome || entityData?.name || entityData?.titolo || null
  const entitySiteUrl = entitySlug
    ? (entityTipo === 'struttura' ? `/s/${entitySlug}` : entityTipo === 'ristorante' ? `/r/${entitySlug}` : `/a/${entitySlug}`)
    : null

  // ── Tabs config ───────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'home',   label: 'Home',         Icon: Home },
    { id: 'pagine', label: 'Pagine',        Icon: FileText },
    { id: 'layout', label: 'Menu & Layout', Icon: Navigation },
    { id: 'impostazioni', label: 'SEO & Impostazioni', Icon: Settings },
    { id: 'traduzioni', label: 'Traduzioni', Icon: Languages },
    { id: 'versioni', label: 'Versioni',    Icon: History },
  ]

  return (
    <div style={{ maxWidth: 820 }}>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '2px solid #eeeeee' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 14,
                fontWeight: active ? 700 : 400,
                color: active ? '#1a1a2e' : '#888',
                borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent',
                marginBottom: -2,
                transition: 'color 0.15s',
              }}
            >
              <tab.Icon size={15} strokeWidth={1.5} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB: VERSIONI (snapshot/ripristino del sito) */}
      {activeTab === 'versioni' && (
        <VersioniSito entityTipo={entityTipo} entityId={entityId} onRestored={load} />
      )}

      {activeTab === 'traduzioni' && (
        <TraduzioniSito entityTipo={entityTipo} entityId={entityId} />
      )}

      {activeTab === 'impostazioni' && (() => {
        const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
        const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6, marginTop: 16 }
        const setF = (k, v) => setSeoForm(f => ({ ...f, [k]: v }))
        const setSoc = (k, v) => setSeoForm(f => ({ ...f, social: { ...f.social, [k]: v } }))
        const setTrack = (k, v) => setSeoForm(f => ({ ...f, tracking_cfg: { ...(f.tracking_cfg || {}), [k]: v } }))
        const trk = seoForm.tracking_cfg || {}
        return (
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>SEO & Impostazioni</h3>
            <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 8 }}>Titolo e descrizione per Google e social, link prenotazione, social del sito.</p>

            <label style={lbl}>Titolo SEO</label>
            <input style={inp} value={seoForm.seo_title} maxLength={70} onChange={e => setF('seo_title', e.target.value)} placeholder="Es. Hotel Belvedere — Mare e relax in Puglia" />
            <span style={{ fontSize: 11, color: '#aaa' }}>{seoForm.seo_title.length}/60 consigliati</span>

            <label style={lbl}>Descrizione SEO</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={seoForm.seo_description} maxLength={180} onChange={e => setF('seo_description', e.target.value)} placeholder="Breve descrizione mostrata nei risultati di ricerca." />
            <span style={{ fontSize: 11, color: '#aaa' }}>{seoForm.seo_description.length}/160 consigliati</span>

            <label style={lbl}>Tagline (sottotitolo)</label>
            <input style={inp} value={seoForm.tagline} onChange={e => setF('tagline', e.target.value)} placeholder="Es. La tua vacanza inizia qui" />

            <label style={lbl}>Link prenotazione (booking esterno)</label>
            <input style={inp} value={seoForm.booking_url} onChange={e => setF('booking_url', e.target.value)} placeholder="https://..." />

            <label style={lbl}>Verifica Google Search Console</label>
            <input style={inp} value={seoForm.google_site_verification} onChange={e => setF('google_site_verification', e.target.value)} placeholder="codice meta google-site-verification" />

            <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={seoForm.show_pwa_link} onChange={e => setF('show_pwa_link', e.target.checked)} />
              Mostra il link "App ospiti" nell'header del sito
            </label>

            <h4 style={{ margin: '24px 0 4px', fontSize: 14, fontWeight: 700 }}>Social</h4>
            {[['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tripadvisor', 'TripAdvisor'], ['whatsapp', 'WhatsApp (numero)']].map(([k, label]) => (
              <div key={k}>
                <label style={lbl}>{label}</label>
                <input style={inp} value={seoForm.social[k] || ''} onChange={e => setSoc(k, e.target.value)} placeholder={k === 'whatsapp' ? '+39...' : 'https://...'} />
              </div>
            ))}

            <h4 style={{ margin: '24px 0 4px', fontSize: 14, fontWeight: 700 }}>Tracking / Pixel</h4>
            <p style={{ color: '#888', fontSize: 12, marginTop: 0, marginBottom: 4 }}>Codici di monitoraggio iniettati sul sito pubblico. Lascia vuoto se non li usi.</p>
            {[
              ['meta_pixel_id',   'Meta Pixel ID',                        'es. 1234567890123456',   'Meta Business Suite → Gestione eventi → Pixel'],
              ['ga4_id',          'Google Analytics 4 — Measurement ID',  'es. G-XXXXXXXXXX',       'Google Analytics → Amministrazione → Stream dati'],
              ['gtm_id',          'Google Tag Manager — Container ID',    'es. GTM-XXXXXXX',        'Google Tag Manager → Container ID'],
              ['tiktok_pixel_id', 'TikTok Pixel ID',                      'es. C4ABCDE12345678901', 'TikTok Ads Manager → Assets → Events → Web'],
            ].map(([k, label, ph, hint]) => (
              <div key={k}>
                <label style={lbl}>{label}</label>
                <input style={inp} value={trk[k] || ''} onChange={e => setTrack(k, e.target.value.trim())} placeholder={ph} />
                <span style={{ fontSize: 11, color: '#bbb' }}>{hint}</span>
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button type="button" onClick={saveSeo} disabled={savingSeo}
                style={{ padding: '11px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: savingSeo ? 'not-allowed' : 'pointer' }}>
                {savingSeo ? 'Salvataggio…' : 'Salva'}
              </button>
              {savedSeo && <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✓ Salvato</span>}
            </div>
          </div>
        )
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: HOME
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'home' && (
        <div>
          {/* Hero card */}
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%)', borderRadius: 16, padding: '28px 28px', color: '#fff', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, flexShrink: 0 }}>
                <Home size={26} strokeWidth={1.5} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase' }}>Home page</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: entityData?.minisito?.tagline ? 4 : 16 }}>
                  {entityName || 'Il tuo sito'}
                </div>
                {entityData?.minisito?.tagline && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>{entityData.minisito.tagline}</div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {homePage ? (
                    <button onClick={() => router.push(`/admin/pagine/${homePage.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', background: '#fff', color: '#1a1a2e', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                      <PenLine size={15} strokeWidth={2} />
                      Modifica homepage
                    </button>
                  ) : (
                    <button onClick={() => router.push('/admin/ai-site-builder')}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', background: '#fff', color: '#1a1a2e', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                      <Sparkles size={15} strokeWidth={2} />
                      Crea la home
                    </button>
                  )}
                  <button onClick={() => setActiveTab('impostazioni')}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 9, cursor: 'pointer', fontSize: 13 }}>
                    Impostazioni sito
                  </button>
                  {entitySiteUrl && (
                    <a href={entitySiteUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 9, textDecoration: 'none', fontSize: 13 }}>
                      Vedi sito ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info home */}
          <div style={{ background: '#f9f9fb', borderRadius: 12, padding: '20px 24px', border: '1px solid #eeeeee' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Layers size={14} strokeWidth={1.5} color="#888" />
              La tua home
            </div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
              La home è una pagina a blocchi: modificala con l'editor visuale (trascina, aggiungi sezioni, immagini). Non ne hai ancora una? Creala con l'<strong>AI Site Builder</strong>. Per aggiungere pagine extra usa il tab <strong>Pagine</strong>.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PAGINE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pagine' && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a1a2e' }}>Pagine del sito</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                Crea e modifica il contenuto. Pubblica le pagine per renderle visibili.
              </p>
            </div>
            <button onClick={() => setShowNewModal(true)}
              style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
              + Nuova pagina
            </button>
          </div>

          {/* Search + filter bar */}
          {pagine.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} strokeWidth={1.5} color="#bbb" />
                </span>
                <input
                  type="text"
                  placeholder="Cerca per titolo o slug…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e0e0e0', borderRadius: 9, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa', lineHeight: 1 }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#aaa', marginRight: 2 }}>Stato:</span>
                {[['tutti','Tutti'],['bozza','Bozze'],['pubblicata','Pubblicate']].map(([val, label]) => (
                  <button key={val} onClick={() => setFilterStatus(val)} style={filterChip(filterStatus === val)}>{label}</button>
                ))}
                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 10, marginRight: 2 }}>Menu:</span>
                {[['tutti','Tutti'],['si','In menu'],['no','Fuori menu']].map(([val, label]) => (
                  <button key={val} onClick={() => setFilterMenu(val)} style={filterChip(filterMenu === val)}>{label}</button>
                ))}
                {activeFilters && (
                  <button onClick={() => { setSearch(''); setFilterStatus('tutti'); setFilterMenu('tutti') }}
                    style={{ marginLeft: 6, fontSize: 11, color: '#c00', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
                    Reset filtri
                  </button>
                )}
              </div>

              {activeFilters && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                  {filteredPagine.length === pagine.length
                    ? `${pagine.length} pagine`
                    : `${filteredPagine.length} di ${pagine.length} pagine`}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <p style={{ color: '#888' }}>Caricamento...</p>
          ) : pagine.length === 0 ? (
            <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center', color: '#aaa' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ background: '#f0f0f0', borderRadius: 16, padding: 18 }}>
                  <FileText size={32} strokeWidth={1} color="#ccc" />
                </div>
              </div>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#888', fontSize: 15 }}>Nessuna pagina ancora</p>
              <p style={{ margin: '0 0 20px', fontSize: 13 }}>
                Aggiungi pagine come "Chi siamo", "Servizi", "Contatti" e personalizzale con blocchi di contenuto.
              </p>
              <button onClick={() => setShowNewModal(true)} style={btnAction('primary')}>
                + Crea la prima pagina
              </button>
            </div>
          ) : filteredPagine.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: '#aaa', background: '#f9f9fb', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <SearchX size={24} strokeWidth={1.5} color="#ccc" />
              </div>
              <div style={{ fontSize: 13 }}>Nessuna pagina corrisponde ai filtri selezionati.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredPagine.map(p => {
                const url = previewUrl(p)
                const seoScore = [p.seo_title, p.seo_description].filter(Boolean).length
                return (
                  <div key={p.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', flexWrap: 'wrap' }}>

                    <div style={{ flex: 1, minWidth: 140 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                        {p.parent_id ? '└─ ' : ''}{p.titolo}
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>/{p.slug}</span>
                    </div>

                    <button onClick={() => toggleStatus(p)} style={{
                      ...btnAction(), flexShrink: 0,
                      background: p.status === 'pubblicata' ? '#d4edda' : '#fff3cd',
                      color:      p.status === 'pubblicata' ? '#155724' : '#856404',
                      fontWeight: 600, border: 'none',
                    }}>
                      {p.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
                    </button>

                    <span style={{ fontSize: 11, color: p.nel_menu ? '#0066aa' : '#bbb', flexShrink: 0 }}>
                      {p.nel_menu ? '☰ In menu' : '— Fuori menu'}
                    </span>

                    <span title={['SEO non configurato','SEO incompleto','SEO completo'][seoScore]}
                      style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, flexShrink: 0, fontWeight: 700,
                        background: ['#fce8e8','#fff3cd','#d4edda'][seoScore],
                        color:      ['#c00','#856404','#155724'][seoScore] }}>
                      SEO {['✗','~','✓'][seoScore]}
                    </span>

                    {p.updated_at && (
                      <span style={{ fontSize: 11, color: '#ccc', flexShrink: 0 }} title="Ultima modifica">
                        {new Date(p.updated_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </span>
                    )}

                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ ...btnAction(), flexShrink: 0, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        ↗ Apri
                      </a>
                    )}

                    <button onClick={() => duplicatePage(p)} style={{ ...btnAction(), flexShrink: 0 }} title="Duplica pagina">
                      ⧉ Duplica
                    </button>

                    <button onClick={() => router.push(`/admin/pagine/${p.id}`)} style={btnAction('primary')}>
                      Modifica
                    </button>

                    <button onClick={() => deletePage(p)} style={btnAction('danger')}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MENU & LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'layout' && (
        <div>

          {/* ── Menu di navigazione ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a1a2e' }}>Menu di navigazione</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                Queste voci appaiono nella barra in cima al sito. Trascina per riordinare. Solo le pagine <strong>Pubblicate</strong> sono visibili ai visitatori.
              </p>
            </div>

            {/* Home — fisso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', ...cardStyle, marginBottom: 4, background: '#fafafa' }}>
              <span style={{ color: '#ddd', fontSize: 15, userSelect: 'none' }}>⠿</span>
              <Home size={16} strokeWidth={1.5} color="#bbb" />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Home</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>/</span>
              </div>
              <span style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>sempre presente</span>
              <button onClick={() => { setActiveTab('home') }} style={btnAction()}>Modifica sezioni →</button>
            </div>

            {!loading && menuTop.length > 0 && (
              <div>
                {menuTop.map(p => (
                  <div key={p.id}>
                    {renderMenuRow(p, false)}
                    {menuSubs(p.id).map(child => renderMenuRow(child, true))}
                  </div>
                ))}
              </div>
            )}

            {notInMenu.length > 0 && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#f9f9fb', borderRadius: 10, border: '1px dashed #ddd' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10 }}>
                  Pagine non nel menu — clicca per aggiungerle
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {notInMenu.map(p => (
                    <button key={p.id} onClick={() => addToMenu(p)} style={{ ...btnAction('add'), display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>+</span>
                      <span style={{ fontWeight: 600 }}>{p.titolo}</span>
                      {p.status === 'bozza' && <span style={{ fontSize: 10, opacity: 0.6 }}>(bozza)</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && pagine.length === 0 && (
              <div style={{ padding: '20px 16px', background: '#f9f9fb', borderRadius: 10, border: '1px dashed #ddd', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                Crea le tue prime pagine nel tab <strong>Pagine</strong>, poi aggiungile al menu.
              </div>
            )}
          </div>

          {/* ── Header & Footer ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a1a2e' }}>Header & Footer</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Personalizza la barra di navigazione e il footer del sito.</p>
              </div>
              <button
                onClick={saveHeaderFooter}
                disabled={savingCfg || !entityData}
                style={{ background: savedCfg ? '#d4edda' : '#1a1a2e', color: savedCfg ? '#155724' : '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'background 0.3s' }}
              >
                {savingCfg ? 'Salvataggio…' : savedCfg ? '✓ Salvato' : 'Salva modifiche'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

              {/* ── Navbar ── */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>Navigazione (navbar)</div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 8 }}>Stile sfondo</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                    {[
                      ['dark',        '████', '#1a1a2e', 'Scuro'],
                      ['light',       '████', '#ffffff', 'Chiaro'],
                      ['colored',     '████', null,      'Colore brand'],
                      ['transparent', '░░░░', '#ffffff', 'Trasparente'],
                    ].map(([val, preview, bg, lbl]) => {
                      const sel = headerCfg.style === val
                      return (
                        <button key={val} onClick={() => setHeaderCfg(h => ({ ...h, style: val }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                            border: sel ? '2px solid #1a1a2e' : '1.5px solid #e8e8e8',
                            background: sel ? '#f0f2ff' : '#f9f9fb' }}>
                          <span style={{ fontSize: 10, color: bg || '#999', letterSpacing: -1 }}>{preview}</span>
                          <span style={{ fontSize: 12, fontWeight: sel ? 700 : 400, color: '#1a1a2e' }}>{lbl}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {headerCfg.style === 'colored' && (
                  <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>Colore:</label>
                    <input type="color" value={headerCfg.bg_color || '#1a1a2e'}
                      onChange={e => setHeaderCfg(h => ({ ...h, bg_color: e.target.value }))}
                      style={{ width: 40, height: 32, border: '1px solid #ddd', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                    <span style={{ fontSize: 11, color: '#888' }}>{headerCfg.bg_color || '#1a1a2e'}</span>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Comportamento allo scroll</label>
                  <select value={headerCfg.scroll_behavior || 'appear'} disabled={headerCfg.always_visible}
                    onChange={e => setHeaderCfg(h => ({ ...h, scroll_behavior: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: headerCfg.always_visible ? '#f5f5f5' : '#fff', color: headerCfg.always_visible ? '#aaa' : '#1a1a2e' }}>
                    <option value="appear">Appare dopo lo scroll</option>
                    <option value="smart">Intelligente — si nasconde scorrendo giù, riappare scorrendo su</option>
                  </select>
                  {headerCfg.always_visible && <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>Ignorato: "Sempre visibile" è attivo.</p>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={headerCfg.always_visible} onChange={e => setHeaderCfg(h => ({ ...h, always_visible: e.target.checked }))} />
                    <span><strong>Sempre visibile</strong> <span style={{ color: '#888', fontSize: 11 }}>(default: appare dopo scroll)</span></span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={headerCfg.logo_in_nav} onChange={e => setHeaderCfg(h => ({ ...h, logo_in_nav: e.target.checked }))} />
                    <span><strong>Mostra logo</strong> nel nav</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={headerCfg.show_phone} onChange={e => setHeaderCfg(h => ({ ...h, show_phone: e.target.checked }))} />
                    <span><strong>Mostra telefono</strong> nel nav</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={headerCfg.show_cta} onChange={e => setHeaderCfg(h => ({ ...h, show_cta: e.target.checked }))} />
                    <span><strong>Bottone CTA</strong></span>
                  </label>
                </div>

                {headerCfg.show_cta && (
                  <div style={{ padding: 12, background: '#f9f9fb', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" placeholder="Testo (es. Prenota ora)" value={headerCfg.cta_text}
                      onChange={e => setHeaderCfg(h => ({ ...h, cta_text: e.target.value }))}
                      style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
                    <input type="url" placeholder="URL destinazione" value={headerCfg.cta_url}
                      onChange={e => setHeaderCfg(h => ({ ...h, cta_url: e.target.value }))}
                      style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>Footer</div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 8 }}>Layout</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      ['minimal',  'Minimale',  'Solo copyright e link policy'],
                      ['standard', 'Standard',  'Logo + descrizione + social + link menu'],
                      ['full',     'Completo',  '3 colonne: logo/socials, menu, contatti'],
                    ].map(([val, lbl, desc]) => {
                      const sel = (footerCfg.layout || 'standard') === val
                      return (
                        <button key={val} onClick={() => setFooterCfg(f => ({ ...f, layout: val }))}
                          style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                            border: sel ? '2px solid #1a1a2e' : '1.5px solid #e8e8e8',
                            background: sel ? '#f0f2ff' : '#f9f9fb' }}>
                          <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: '#1a1a2e' }}>{lbl}</span>
                          <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 8 }}>Sfondo</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['dark','Scuro'],['light','Chiaro']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setFooterCfg(f => ({ ...f, style: val }))}
                        style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: footerCfg.style === val ? 700 : 400,
                          border: footerCfg.style === val ? '2px solid #1a1a2e' : '1.5px solid #e0e0e0',
                          background: footerCfg.style === val ? '#1a1a2e' : '#fff',
                          color: footerCfg.style === val ? '#fff' : '#555' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {footerCfg.layout !== 'minimal' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={footerCfg.show_description !== false} onChange={e => setFooterCfg(f => ({ ...f, show_description: e.target.checked }))} />
                      <span>Mostra tagline/descrizione</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={footerCfg.show_socials !== false} onChange={e => setFooterCfg(f => ({ ...f, show_socials: e.target.checked }))} />
                      <span>Mostra social links</span>
                    </label>
                    {footerCfg.layout === 'full' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={footerCfg.show_contact !== false} onChange={e => setFooterCfg(f => ({ ...f, show_contact: e.target.checked }))} />
                        <span>Mostra colonna contatti</span>
                      </label>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Testo copyright</label>
                    <input type="text" placeholder="Lascia vuoto per testo automatico"
                      value={footerCfg.copyright}
                      onChange={e => setFooterCfg(f => ({ ...f, copyright: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6 }}>Link aggiuntivi</label>
                    {(footerCfg.extra_links || []).map((lnk, i) => (
                      <div key={lnk.id || i} style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                        <input type="text" placeholder="Testo" value={lnk.label}
                          onChange={e => setFooterCfg(f => ({ ...f, extra_links: f.extra_links.map((l, j) => j === i ? { ...l, label: e.target.value } : l) }))}
                          style={{ flex: 1, padding: '5px 7px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }} />
                        <input type="url" placeholder="URL" value={lnk.url}
                          onChange={e => setFooterCfg(f => ({ ...f, extra_links: f.extra_links.map((l, j) => j === i ? { ...l, url: e.target.value } : l) }))}
                          style={{ flex: 2, padding: '5px 7px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }} />
                        <button onClick={() => setFooterCfg(f => ({ ...f, extra_links: f.extra_links.filter((_, j) => j !== i) }))}
                          style={{ background: '#fce8e8', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#c00', fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => setFooterCfg(f => ({ ...f, extra_links: [...(f.extra_links || []), { id: crypto.randomUUID(), label: '', url: '' }] }))}
                      style={{ ...btnAction('add'), marginTop: 2, fontSize: 11 }}>+ Aggiungi link</button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── Modal nuova pagina ── */}
      {showNewModal && (
        <NewPageModal
          onClose={() => setShowNewModal(false)}
          onConfirm={createPage}
          creating={creating}
        />
      )}
    </div>
  )
}

// ── Versioni del sito (snapshot / ripristino) ─────────────────────────────────
function VersioniSito({ entityTipo, entityId, onRestored }) {
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [busyId,  setBusyId]  = useState(null)
  const [label,   setLabel]   = useState('')
  const [msg,     setMsg]     = useState(null)

  async function load() {
    setLoading(true)
    try { setList(await apiFetch(`/api/sito-snapshots?entity_tipo=${entityTipo}&entity_id=${entityId}`)) }
    catch { setList([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { if (entityId) load() }, [entityId])

  async function salva() {
    setSaving(true); setMsg(null)
    try {
      await apiFetch('/api/sito-snapshots', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, label: label.trim() }),
      })
      setLabel(''); setMsg('Versione salvata.'); await load()
    } catch (e) { setMsg('Errore: ' + e.message) }
    finally { setSaving(false) }
  }

  async function ripristina(s) {
    const nome = s.label || fmt(s.created_at)
    if (!confirm(`Ripristinare la versione "${nome}"?\nLo stato attuale del sito verrà salvato come backup automatico, così potrai annullare.`)) return
    setBusyId(s.id); setMsg(null)
    try {
      await apiFetch(`/api/sito-snapshots/${s.id}/restore`, { method: 'POST' })
      setMsg('Sito ripristinato a questa versione.')
      await load()
      onRestored?.()
    } catch (e) { setMsg('Errore: ' + e.message) }
    finally { setBusyId(null) }
  }

  async function elimina(s) {
    if (!confirm('Eliminare questa versione? (non tocca il sito attuale)')) return
    setBusyId(s.id)
    try { await apiFetch(`/api/sito-snapshots/${s.id}`, { method: 'DELETE' }); await load() }
    catch (e) { alert(e.message) }
    finally { setBusyId(null) }
  }

  function fmt(d) {
    return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <p style={{ color: '#666', fontSize: 14, margin: '0 0 18px', lineHeight: 1.6 }}>
        Salva una "fotografia" del tuo sito (contenuti, tema, pagine) e ripristinala con un clic se qualcosa va storto.
        Prima di ogni ripristino lo stato attuale viene salvato in automatico, così puoi sempre tornare indietro.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Etichetta (es. prima del restyling)"
          style={{ flex: 1, minWidth: 220, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
        <button onClick={salva} disabled={saving}
          style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Salvataggio…' : '+ Salva versione'}
        </button>
      </div>
      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Errore') ? '#c00' : '#276749', margin: '0 0 14px' }}>{msg}</p>}

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : list.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14 }}>Nessuna versione salvata. Salvane una prima di fare modifiche importanti.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {list.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #eee', borderRadius: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {s.label || 'Versione'}
                  {s.kind === 'auto_pre_restore' && (
                    <span style={{ marginLeft: 8, fontSize: 11, background: '#fff7ed', color: '#c05600', padding: '2px 7px', borderRadius: 5 }}>auto · pre-ripristino</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{fmt(s.created_at)}{s.created_by ? ` · ${s.created_by}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => ripristina(s)} disabled={busyId === s.id}
                  style={{ padding: '6px 14px', background: '#f0f4ff', color: '#1a1a2e', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {busyId === s.id ? '…' : 'Ripristina'}
                </button>
                <button onClick={() => elimina(s)} disabled={busyId === s.id}
                  style={{ padding: '6px 12px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
