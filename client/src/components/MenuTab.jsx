import { useState } from 'react'
import {
  Utensils, ChevronDown, ChevronRight, ArrowLeft, X, Flame,
  Wheat, Shrimp, Egg, Fish, Nut, Bean, Milk, LeafyGreen,
  Flower2, Sprout, Wine, Shell,
} from 'lucide-react'

// ─── Costanti EU Reg. 1169/2011 ───────────────────────────────────────────────
export const EU_ALLERGENS = [
  { key: 'glutine',       label: 'Glutine',         icon: Wheat      },
  { key: 'crostacei',     label: 'Crostacei',       icon: Shrimp     },
  { key: 'uova',          label: 'Uova',            icon: Egg        },
  { key: 'pesce',         label: 'Pesce',           icon: Fish       },
  { key: 'arachidi',      label: 'Arachidi',        icon: Nut        },
  { key: 'soia',          label: 'Soia',            icon: Bean       },
  { key: 'latte',         label: 'Latte',           icon: Milk       },
  { key: 'frutta_guscio', label: 'Frutta a guscio', icon: Nut        },
  { key: 'sedano',        label: 'Sedano',          icon: LeafyGreen },
  { key: 'senape',        label: 'Senape',          icon: Flower2    },
  { key: 'sesamo',        label: 'Sesamo',          icon: Sprout     },
  { key: 'solfiti',       label: 'Solfiti',         icon: Wine       },
  { key: 'lupini',        label: 'Lupini',          icon: Bean       },
  { key: 'molluschi',     label: 'Molluschi',       icon: Shell      },
]

export const DIETARY_FLAGS = [
  { key: 'vegetariano',    label: 'Veg',   filterLabel: 'Vegetariano',   color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  { key: 'vegano',         label: 'Vegan', filterLabel: 'Vegano',        color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  { key: 'senza_glutine',  label: 'GF',    filterLabel: 'Senza glutine', color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  { key: 'senza_lattosio', label: 'LF',    filterLabel: 'Senza lattosio',color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  { key: 'piccante',       label: null,    filterLabel: 'Piccante',      color: '#9A3412', bg: '#FEF3C7', border: '#FDE68A', icon: true },
]

const TIPO_SING = { piatto: 'piatto', vino: 'vino', cocktail: 'cocktail', pizza: 'pizza', dolce: 'dolce', birra: 'birra', panino: 'panino' }
const TIPO_PLUR = { piatto: 'piatti', vino: 'vini',  cocktail: 'cocktail', pizza: 'pizze', dolce: 'dolci', birra: 'birre', panino: 'panini' }

function getTipoLabel(cat, count) {
  const t = cat.tipo || 'piatto'
  if (count === 1) return TIPO_SING[t] || t
  return TIPO_PLUR[t] || t
}

export function normalizeAllergens(val) {
  if (Array.isArray(val)) return val
  if (!val || typeof val !== 'string') return []
  const lower = val.toLowerCase()
  return EU_ALLERGENS.filter(e => lower.includes(e.key.replace('_', ' ')) || lower.includes(e.key)).map(e => e.key)
}

// ─── Chips & badge ────────────────────────────────────────────────────────────
export function AllergenChip({ label, icon: Icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', whiteSpace: 'nowrap' }}>
      {Icon && <Icon size={10} strokeWidth={1.5} color="#92400E" />}
      {label}
    </span>
  )
}

export function DietaryBadge({ flag }) {
  const d = DIETARY_FLAGS.find(f => f.key === flag)
  if (!d) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: d.bg, color: d.color, border: `1px solid ${d.border}`, whiteSpace: 'nowrap' }}>
      {d.icon ? <Flame size={10} strokeWidth={1.5} color={d.color} /> : d.label}
    </span>
  )
}

export function AllergenFilterBar({ excluded, setExcluded, dietaryFilters, setDietaryFilters, subText, cardBg, borderColor }) {
  const hasFilters = excluded.length > 0 || dietaryFilters.length > 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: subText, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, opacity: 0.7 }}>ESCLUDI ALLERGENI</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {EU_ALLERGENS.map(a => {
          const active = excluded.includes(a.key)
          const Icon = a.icon
          return (
            <button key={a.key} type="button"
              onClick={() => setExcluded(prev => active ? prev.filter(k => k !== a.key) : [...prev, a.key])}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 20, border: `1.5px solid ${active ? '#92400E' : borderColor}`, background: active ? '#FEF3C7' : cardBg, color: active ? '#92400E' : subText, fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              {Icon && <Icon size={12} strokeWidth={1.5} color={active ? '#92400E' : subText} />}
              {a.label}
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 10, color: subText, fontWeight: 700, marginBottom: 6, marginTop: 10, letterSpacing: 0.8, opacity: 0.7 }}>MOSTRA SOLO</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DIETARY_FLAGS.map(d => {
          const active = dietaryFilters.includes(d.key)
          return (
            <button key={d.key} type="button"
              onClick={() => setDietaryFilters(prev => active ? prev.filter(k => k !== d.key) : [...prev, d.key])}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 20, border: `1.5px solid ${active ? d.border : borderColor}`, background: active ? d.bg : cardBg, color: active ? d.color : subText, fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              {d.icon && <Flame size={12} strokeWidth={1.5} color={active ? d.color : subText} />}
              {d.filterLabel}
            </button>
          )
        })}
      </div>

      {hasFilters && (
        <button type="button" onClick={() => { setExcluded([]); setDietaryFilters([]) }}
          style={{ fontSize: 11, color: '#92400E', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 4, fontWeight: 600 }}>
          ✕ Rimuovi filtri ({excluded.length + dietaryFilters.length})
        </button>
      )}
    </div>
  )
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────
export function MenuItem({ item, primary, textColor, subText, isDark, radius, cardBg, borderColor, onOpenPhoto, showAllergens }) {
  const shadow = isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.06)'
  const allergens = showAllergens ? normalizeAllergens(item.allergens) : []
  const dietary   = showAllergens ? (item.dietary || []) : []
  const hasBadges = allergens.length > 0 || dietary.length > 0
  return (
    <div style={{ background: cardBg, borderRadius: radius, overflow: 'hidden', boxShadow: shadow, border: `1px solid ${borderColor}`, display: 'flex' }}>
      {item.photo_url && (
        <div onClick={onOpenPhoto} style={{ width: 90, flexShrink: 0, position: 'relative', cursor: onOpenPhoto ? 'pointer' : 'default' }}>
          <img src={item.photo_url} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: item.description ? 4 : 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: textColor, lineHeight: 1.3 }}>{item.name}</div>
          {item.price && (
            <div style={{ fontSize: 15, fontWeight: 700, color: primary, flexShrink: 0 }}>
              €{Number(item.price) % 1 === 0 ? Number(item.price) : Number(item.price).toFixed(2)}
            </div>
          )}
        </div>
        {item.description && <p style={{ margin: '0 0 8px', fontSize: 13, color: subText, lineHeight: 1.5 }}>{item.description}</p>}
        {hasBadges && (
          <div style={{ marginTop: item.description ? 0 : 4 }}>
            {dietary.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: allergens.length > 0 ? 6 : 0 }}>
                {dietary.map(d => <DietaryBadge key={d} flag={d} />)}
              </div>
            )}
            {allergens.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#92400E', letterSpacing: 0.7, marginBottom: 3, opacity: 0.75 }}>ALLERGENI</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {allergens.map(a => {
                    const obj = EU_ALLERGENS.find(e => e.key === a)
                    return obj ? <AllergenChip key={a} label={obj.label} icon={obj.icon} /> : null
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AllergenLegend ───────────────────────────────────────────────────────────
function AllergenLegend({ subText, cardBg, borderColor }) {
  return (
    <div style={{ marginTop: 20, padding: '14px 16px', background: cardBg, borderRadius: 10, border: `1px solid ${borderColor}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: subText, letterSpacing: 0.7, marginBottom: 10, opacity: 0.7 }}>
        ALLERGENI — REG. UE 1169/2011
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '7px 10px' }}>
        {EU_ALLERGENS.map(a => {
          const Icon = a.icon
          return (
            <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: subText }}>
              {Icon && <Icon size={12} strokeWidth={1.5} color={subText} style={{ flexShrink: 0 }} />}
              <span>{a.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CatalogoDetail ───────────────────────────────────────────────────────────
function CatalogoDetail({ selected, onBack, primary, textColor, subText, isDark, radius, headingFamily, cardBg, borderColor, showAllergens, excluded, setExcluded, dietaryFilters, setDietaryFilters }) {
  const firstId = selected.categories?.[0]?.id || null
  const [openCat,  setOpenCat]  = useState(firstId)
  const [lightbox, setLightbox] = useState(null)

  function toggleCat(id) { setOpenCat(prev => prev === id ? null : id) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${borderColor}` }}>
        <button type="button" onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: primary, fontWeight: 600, fontSize: 13, padding: 0 }}>
          <ArrowLeft size={16} strokeWidth={2} color={primary} /> Menu
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: textColor, fontFamily: headingFamily }}>{selected.name}</span>
      </div>

      {showAllergens && <AllergenFilterBar excluded={excluded} setExcluded={setExcluded} dietaryFilters={dietaryFilters} setDietaryFilters={setDietaryFilters} subText={subText} cardBg={cardBg} borderColor={borderColor} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(selected.categories || []).map(cat => {
          const activeItems = (cat.items || [])
            .filter(i => i.active !== false)
            .filter(i => excluded.length === 0 || !normalizeAllergens(i.allergens).some(a => excluded.includes(a)))
            .filter(i => dietaryFilters.length === 0 || dietaryFilters.some(f => (i.dietary || []).includes(f)))
          if (!activeItems.length) return null
          const isOpen = openCat === cat.id
          return (
            <section key={cat.id} style={{ borderRadius: radius || 10, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
              <button type="button" onClick={() => toggleCat(cat.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: isOpen ? `${primary}0c` : cardBg, border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: headingFamily, color: isOpen ? primary : textColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {cat.name}
                  </h2>
                  <span style={{ fontSize: 11, color: subText }}>{activeItems.length} {getTipoLabel(cat, activeItems.length)}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} color={isOpen ? primary : subText}
                  style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
              </button>
              {isOpen && (
                <div className="fade-up" style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: isDark ? cardBg : '#fafafa' }}>
                  {activeItems.map(item => (
                    <MenuItem key={item.id} item={item} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} cardBg={cardBg} borderColor={borderColor} showAllergens={showAllergens} onOpenPhoto={item.photo_url ? () => setLightbox(item.photo_url) : null} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {showAllergens && <AllergenLegend subText={subText} cardBg={cardBg} borderColor={borderColor} />}

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain', display: 'block' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2} color="#fff" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MenuTab (export default) ─────────────────────────────────────────────────
export default function MenuTab({ menu, primary, textColor, subText, isDark, radius, headingFamily, cardBg, surfaceBg, borderColor, showAllergens }) {
  const isCatalogo = menu.length > 0 && menu[0].type === 'catalogo'
  const [selectedId, setSelectedId] = useState(null)
  const firstCatId = !isCatalogo ? (menu[0]?.id || null) : null
  const [openCat,  setOpenCat]  = useState(firstCatId)
  const [lightbox, setLightbox] = useState(null)
  const [excluded,       setExcluded]       = useState([])
  const [dietaryFilters, setDietaryFilters] = useState([])

  function toggleCat(id) { setOpenCat(prev => prev === id ? null : id) }

  if (!menu.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: subText }}>
        <Utensils size={40} strokeWidth={1.5} color={primary} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
        <p style={{ margin: 0, fontSize: 15 }}>Menu non ancora disponibile.</p>
      </div>
    )
  }

  function renderCategoryAccordion(cat) {
    const activeItems = (cat.items || [])
      .filter(i => i.active !== false)
      .filter(i => excluded.length === 0 || !normalizeAllergens(i.allergens).some(a => excluded.includes(a)))
      .filter(i => dietaryFilters.length === 0 || dietaryFilters.some(f => (i.dietary || []).includes(f)))
    if (activeItems.length === 0) return null
    const isOpen = openCat === cat.id
    return (
      <section key={cat.id} style={{ marginBottom: 4, borderRadius: radius || 10, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
        <button type="button" onClick={() => toggleCat(cat.id)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: isOpen ? `${primary}0c` : cardBg, border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: headingFamily, color: isOpen ? primary : textColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {cat.name}
            </h2>
            <span style={{ fontSize: 11, color: subText, fontWeight: 400 }}>{activeItems.length} {getTipoLabel(cat, activeItems.length)}</span>
          </div>
          <ChevronDown size={16} strokeWidth={2} color={isOpen ? primary : subText}
            style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
        </button>
        {isOpen && (
          <div className="fade-up" style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: isDark ? cardBg : '#fafafa' }}>
            {activeItems.map(item => (
              <MenuItem key={item.id} item={item} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} cardBg={cardBg} borderColor={borderColor} showAllergens={showAllergens} onOpenPhoto={item.photo_url ? () => setLightbox(item.photo_url) : null} />
            ))}
          </div>
        )}
      </section>
    )
  }

  function renderLightbox() {
    if (!lightbox) return null
    return (
      <div onClick={() => setLightbox(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
        <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain', display: 'block' }} />
        <button onClick={() => setLightbox(null)}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} strokeWidth={2} color="#fff" />
        </button>
      </div>
    )
  }

  if (isCatalogo) {
    const selected = menu.find(c => c.id === selectedId)
    if (!selected) {
      return (
        <div>
          <h2 style={{ fontFamily: headingFamily, fontSize: 18, fontWeight: 700, color: textColor, margin: '0 0 16px' }}>Scegli il menu</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {menu.map(c => {
              const activeCount = (c.categories || []).reduce((n, cat) => n + (cat.items || []).filter(i => i.active !== false).length, 0)
              return (
                <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: cardBg, borderRadius: radius || 14, border: `1px solid ${borderColor}`, cursor: 'pointer', textAlign: 'left', boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Utensils size={22} strokeWidth={1.5} color={primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: textColor, fontFamily: headingFamily }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: subText, marginTop: 2 }}>{activeCount} {activeCount === 1 ? 'voce' : 'voci'}</div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.5} color={subText} />
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    return <CatalogoDetail selected={selected} onBack={() => setSelectedId(null)} primary={primary} textColor={textColor} subText={subText} isDark={isDark} radius={radius} headingFamily={headingFamily} cardBg={cardBg} borderColor={borderColor} showAllergens={showAllergens} excluded={excluded} setExcluded={setExcluded} dietaryFilters={dietaryFilters} setDietaryFilters={setDietaryFilters} />
  }

  // Single menu
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {showAllergens && <AllergenFilterBar excluded={excluded} setExcluded={setExcluded} dietaryFilters={dietaryFilters} setDietaryFilters={setDietaryFilters} subText={subText} cardBg={cardBg} borderColor={borderColor} />}
      {menu.map(cat => renderCategoryAccordion(cat))}
      {showAllergens && <AllergenLegend subText={subText} cardBg={cardBg} borderColor={borderColor} />}
      {renderLightbox()}
    </div>
  )
}
