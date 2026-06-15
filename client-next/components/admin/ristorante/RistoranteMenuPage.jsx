'use client'
// Modifiche 2026-06-09:
// - Collapse/espandi cataloghi e categorie (accordion per categorie)
// - Drag & drop per riordinare cataloghi e categorie (@dnd-kit)
// - "Includi in altro catalogo" ora usa <optgroup> raggruppato per catalogo

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ChevronDown, GripVertical,
  Utensils, UtensilsCrossed, Pizza, Wine, Beer, Coffee, GlassWater,
  Flame, ChefHat, Fish, Beef, Cookie, Leaf, Waves, Sun, Moon, Sunset,
  Star, Sparkles, Droplets, Grape, IceCream2, Sandwich, Salad, CupSoda,
} from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRistorante } from '../../../hooks/useRistorante'
import { uploadMedia } from '../../../lib/api'

const BLANK_ITEM = { name: '', description: '', price: '', allergens: [], dietary: [], photo_url: '', active: true }

const EU_ALLERGENS = [
  { key: 'glutine',       label: 'Glutine',         abbr: 'Gl'  },
  { key: 'crostacei',     label: 'Crostacei',       abbr: 'Cr'  },
  { key: 'uova',          label: 'Uova',            abbr: 'Uo'  },
  { key: 'pesce',         label: 'Pesce',           abbr: 'Pe'  },
  { key: 'arachidi',      label: 'Arachidi',        abbr: 'Ar'  },
  { key: 'soia',          label: 'Soia',            abbr: 'So'  },
  { key: 'latte',         label: 'Latte',           abbr: 'La'  },
  { key: 'frutta_guscio', label: 'Frutta a guscio', abbr: 'Fg'  },
  { key: 'sedano',        label: 'Sedano',          abbr: 'Se'  },
  { key: 'senape',        label: 'Senape',          abbr: 'Sn'  },
  { key: 'sesamo',        label: 'Sesamo',          abbr: 'Ss'  },
  { key: 'solfiti',       label: 'Solfiti',         abbr: 'So2' },
  { key: 'lupini',        label: 'Lupini',          abbr: 'Lu'  },
  { key: 'molluschi',     label: 'Molluschi',       abbr: 'Mo'  },
]
const DIETARY_FLAGS = [
  { key: 'vegetariano',    label: 'Vegetariano'    },
  { key: 'vegano',         label: 'Vegano'         },
  { key: 'senza_glutine',  label: 'Senza glutine'  },
  { key: 'senza_lattosio', label: 'Senza lattosio' },
  { key: 'piccante',       label: 'Piccante'       },
]

function normalizeAllergens(val) {
  if (Array.isArray(val)) return val
  if (!val || typeof val !== 'string') return []
  const lower = val.toLowerCase()
  return EU_ALLERGENS.filter(e => lower.includes(e.key.replace('_', ' ')) || lower.includes(e.key)).map(e => e.key)
}

// Icone selezionabili per i cataloghi
const CATALOGO_ICONS = [
  { key: 'utensils',         Icon: Utensils,        label: 'Ristorante'   },
  { key: 'utensils-crossed', Icon: UtensilsCrossed,  label: 'Menu'         },
  { key: 'pizza',            Icon: Pizza,            label: 'Pizza'        },
  { key: 'wine',             Icon: Wine,             label: 'Vini'         },
  { key: 'grape',            Icon: Grape,            label: 'Cantina'      },
  { key: 'beer',             Icon: Beer,             label: 'Birre'        },
  { key: 'cup-soda',         Icon: CupSoda,          label: 'Cocktail'     },
  { key: 'glass-water',      Icon: GlassWater,       label: 'Soft drinks'  },
  { key: 'droplets',         Icon: Droplets,         label: 'Drinks'       },
  { key: 'coffee',           Icon: Coffee,           label: 'Caffè'        },
  { key: 'sandwich',         Icon: Sandwich,         label: 'Pranzo/Panini'},
  { key: 'salad',            Icon: Salad,            label: 'Insalate'     },
  { key: 'fish',             Icon: Fish,             label: 'Pesce'        },
  { key: 'beef',             Icon: Beef,             label: 'Carne'        },
  { key: 'flame',            Icon: Flame,            label: 'Grill/BBQ'    },
  { key: 'chef-hat',         Icon: ChefHat,          label: 'Chef special' },
  { key: 'ice-cream-2',      Icon: IceCream2,        label: 'Gelati/Dolci' },
  { key: 'cookie',           Icon: Cookie,           label: 'Snack'        },
  { key: 'leaf',             Icon: Leaf,             label: 'Vegan/Green'  },
  { key: 'waves',            Icon: Waves,            label: 'Pool Bar'     },
  { key: 'sun',              Icon: Sun,              label: 'Lunch'        },
  { key: 'moon',             Icon: Moon,             label: 'Dinner'       },
  { key: 'sunset',           Icon: Sunset,           label: 'Aperitivo'    },
  { key: 'star',             Icon: Star,             label: 'Premium'      },
  { key: 'sparkles',         Icon: Sparkles,         label: 'Speciale'     },
]

const TIPO_PRESETS = ['piatto', 'vino', 'cocktail', 'pizza', 'dolce', 'birra', 'panino']
const TIPO_LABELS  = { piatto: 'Piatti', vino: 'Vini', cocktail: 'Cocktail', pizza: 'Pizze', dolce: 'Dolci', birra: 'Birre', panino: 'Panini' }

// Wrapper drag & drop — definito a livello modulo (non dentro un componente) per evitare unmount/remount durante il drag.
// children è una render-prop: (listeners, attributes) => JSX
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return <div ref={setNodeRef} style={style}>{children(listeners, attributes)}</div>
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RistoranteMenuPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, saveError, save } = useRistorante(id)
  const [menu, setMenu] = useState([])
  const menuLoaded = useRef(false)
  const menuRef    = useRef([])
  const [dirty, setDirty] = useState(false)

  // Stato collapse — catalogi: Set di ID aperti; categorie: { [catalogoId]: categoryId | null }
  const [openCatalogos,   setOpenCatalogos]   = useState(() => new Set())
  const [openCategory,    setOpenCategory]    = useState({})
  const [openSingleCatId, setOpenSingleCatId] = useState(null) // accordion legacy single-mode

  const isCatalogo = menu.length > 0 && menu[0].type === 'catalogo'

  // distance: 5 previene drag accidentali quando si clicca sui pulsanti
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (ristorante && !menuLoaded.current) {
      setMenu(ristorante.menu || [])
      menuRef.current = ristorante.menu || []
      menuLoaded.current = true
    }
  }, [ristorante])

  function persist(newMenu) {
    setMenu(newMenu)
    menuRef.current = newMenu
    setDirty(true)
  }

  async function handleSave() {
    setDirty(false)
    try { await save({ menu: menuRef.current }) }
    catch { setDirty(true) }
  }

  // Avvisa prima di chiudere/ricaricare la pagina con modifiche al menu non salvate.
  useEffect(() => {
    if (!dirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // ── Toggle collapse ────────────────────────────────────────────────────────

  function toggleCatalogo(catalogoId) {
    setOpenCatalogos(prev => {
      const next = new Set(prev)
      if (next.has(catalogoId)) next.delete(catalogoId)
      else next.add(catalogoId)
      return next
    })
  }

  function toggleCategory(catalogoId, categoryId) {
    setOpenCategory(prev => ({
      ...prev,
      [catalogoId]: prev[catalogoId] === categoryId ? null : categoryId,
    }))
  }

  // ── Drag & drop handlers ───────────────────────────────────────────────────

  function handleCatalogoDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = menu.findIndex(c => c.id === active.id)
    const newIdx = menu.findIndex(c => c.id === over.id)
    persist(arrayMove(menu, oldIdx, newIdx))
  }

  function handleCategoryDragEnd({ active, over }, ci) {
    if (!over || active.id === over.id) return
    const cats = menu[ci].categories || []
    const oldIdx = cats.findIndex(c => c.id === active.id)
    const newIdx = cats.findIndex(c => c.id === over.id)
    persist(menu.map((c, i) => i !== ci ? c : { ...c, categories: arrayMove(cats, oldIdx, newIdx) }))
  }

  function handleSingleCatDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = menu.findIndex(c => c.id === active.id)
    const newIdx = menu.findIndex(c => c.id === over.id)
    persist(arrayMove(menu, oldIdx, newIdx))
  }

  function handleItemDragEnd({ active, over }, ci, catIdx) {
    if (!over || active.id === over.id) return
    const items = menu[ci].categories[catIdx].items
    const oldIdx = items.findIndex(it => it.id === active.id)
    const newIdx = items.findIndex(it => it.id === over.id)
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: c.categories.map((cat, j) => j !== catIdx ? cat : {
        ...cat, items: arrayMove(items, oldIdx, newIdx),
      }),
    }))
  }

  function handleSingleItemDragEnd({ active, over }, ci) {
    if (!over || active.id === over.id) return
    const items = menu[ci].items
    const oldIdx = items.findIndex(it => it.id === active.id)
    const newIdx = items.findIndex(it => it.id === over.id)
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: arrayMove(items, oldIdx, newIdx),
    }))
  }

  // ── Multi-catalogo CRUD ────────────────────────────────────────────────────

  function addCatalogo() {
    const name = prompt('Nome del catalogo (es. Ristorante, Pool Bar, Light Lunch):')?.trim()
    if (!name) return
    persist([...menu, { id: crypto.randomUUID(), name, type: 'catalogo', categories: [] }])
  }

  function renameCatalogo(ci, name) {
    persist(menu.map((c, i) => i === ci ? { ...c, name } : c))
  }

  function removeCatalogo(ci) {
    if (!confirm('Eliminare questo catalogo e tutti i suoi contenuti?')) return
    persist(menu.filter((_, i) => i !== ci))
  }

  function updateCatalogo(ci, patch) {
    persist(menu.map((c, i) => i === ci ? { ...c, ...patch } : c))
  }

  function addCategoryToCatalogo(ci) {
    const name = prompt('Nome della categoria:')?.trim()
    if (!name) return
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: [...(c.categories || []), { id: crypto.randomUUID(), name, tipo: 'piatto', items: [] }],
    }))
  }

  function renameCatInCatalogo(ci, catIdx, name) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: (c.categories || []).map((cat, j) => j !== catIdx ? cat : { ...cat, name }),
    }))
  }

  function updateCatInCatalogo(ci, catIdx, patch) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: (c.categories || []).map((cat, j) => j !== catIdx ? cat : { ...cat, ...patch }),
    }))
  }

  function removeCatFromCatalogo(ci, catIdx) {
    if (!confirm('Eliminare questa categoria e tutti i suoi piatti?')) return
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: (c.categories || []).filter((_, j) => j !== catIdx),
    }))
  }

  function addItemToCatalogo(ci, catIdx) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: (c.categories || []).map((cat, j) => j !== catIdx ? cat : {
        ...cat, items: [...cat.items, { ...BLANK_ITEM, id: crypto.randomUUID() }],
      }),
    }))
  }

  function updateItemInCatalogo(ci, catIdx, ii, patch) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: (c.categories || []).map((cat, j) => j !== catIdx ? cat : {
        ...cat, items: cat.items.map((it, k) => k !== ii ? it : { ...it, ...patch }),
      }),
    }))
  }

  function removeItemFromCatalogo(ci, catIdx, ii) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, categories: (c.categories || []).map((cat, j) => j !== catIdx ? cat : {
        ...cat, items: cat.items.filter((_, k) => k !== ii),
      }),
    }))
  }

  function includeItemInCatalogo(sourceCi, sourceCatIdx, sourceItemIdx, targetCi, targetCatIdx) {
    const source = menu[sourceCi].categories[sourceCatIdx].items[sourceItemIdx]
    const targetCat = menu[targetCi].categories[targetCatIdx]
    if (targetCat.items.some(it => it.id === source.id || it.shared_from === source.id)) return
    const copy = { ...source, id: crypto.randomUUID(), shared_from: source.id }
    persist(menu.map((c, ci) => ci !== targetCi ? c : {
      ...c, categories: c.categories.map((cat, catIdx) => catIdx !== targetCatIdx ? cat : {
        ...cat, items: [...cat.items, copy],
      }),
    }))
  }

  function includeCategoryInCatalogo(sourceCi, sourceCatIdx, targetCi) {
    const sourceCat = menu[sourceCi].categories[sourceCatIdx]
    const copiedCat = {
      ...sourceCat,
      id: crypto.randomUUID(),
      items: sourceCat.items.map(item => ({ ...item, id: crypto.randomUUID(), shared_from: item.id })),
    }
    persist(menu.map((c, ci) => ci !== targetCi ? c : {
      ...c, categories: [...(c.categories || []), copiedCat],
    }))
  }

  function switchToMulti() {
    const name = prompt('Nome del primo catalogo:', 'Menu principale')?.trim()
    if (!name) return
    persist([{ id: crypto.randomUUID(), name, type: 'catalogo', categories: menu }])
  }

  // ── Single CRUD (legacy) ───────────────────────────────────────────────────

  function addCategory() {
    const name = prompt('Nome della categoria:')?.trim()
    if (!name) return
    persist([...menu, { id: crypto.randomUUID(), name, tipo: 'piatto', items: [] }])
  }

  function renameCategory(ci, name) {
    persist(menu.map((c, i) => i === ci ? { ...c, name } : c))
  }

  function updateCategory(ci, patch) {
    persist(menu.map((c, i) => i === ci ? { ...c, ...patch } : c))
  }

  function removeCategory(ci) {
    if (!confirm('Eliminare questa categoria e tutti i suoi piatti?')) return
    persist(menu.filter((_, i) => i !== ci))
  }

  function addItem(ci) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: [...c.items, { ...BLANK_ITEM, id: crypto.randomUUID() }],
    }))
  }

  function updateItem(ci, ii, patch) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: c.items.map((it, j) => j !== ii ? it : { ...it, ...patch }),
    }))
  }

  function removeItem(ci, ii) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: c.items.filter((_, j) => j !== ii),
    }))
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={titleStyle}>Menu</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveError && <span style={{ fontSize: 12, color: '#e53e3e', fontWeight: 500 }}>Errore: {saveError}</span>}
          {saved && !dirty && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
          <button onClick={handleSave} disabled={!dirty || saving}
            style={{ ...addMainBtnStyle, fontSize: 13, padding: '7px 18px', opacity: (!dirty || saving) ? 0.4 : 1, cursor: (!dirty || saving) ? 'default' : 'pointer' }}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>

      {isCatalogo ? (
        // ── Multi-catalogo view ──────────────────────────────────────────────
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ ...descStyle, margin: 0 }}>
              Modalità <strong>multi-menu</strong> — ogni catalogo ha le proprie categorie e piatti.
            </p>
            <button onClick={addCatalogo} style={addMainBtnStyle}>
              + Nuovo catalogo
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatalogoDragEnd}>
            <SortableContext items={menu.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {menu.map((catalogo, ci) => (
                <SortableItem key={catalogo.id} id={catalogo.id}>
                  {(dragListeners, dragAttrs) => (
                    <div style={{ ...cardStyle, borderLeft: '4px solid #1a1a2e', marginBottom: 16, padding: '16px 20px' }}>
                      {/* Header catalogo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          {...dragAttrs} {...dragListeners}
                          style={{ cursor: 'grab', padding: '4px 2px', flexShrink: 0, touchAction: 'none', display: 'flex', alignItems: 'center' }}
                        >
                          <GripVertical size={16} strokeWidth={1.5} color="#ccc" />
                        </div>
                        <CatalogoHeader
                          name={catalogo.name}
                          icon={catalogo.icon}
                          open={openCatalogos.has(catalogo.id)}
                          onToggle={() => toggleCatalogo(catalogo.id)}
                          onRename={name => renameCatalogo(ci, name)}
                          onDelete={() => removeCatalogo(ci)}
                          onUpdateIcon={icon => updateCatalogo(ci, { icon })}
                        />
                      </div>

                      {/* Contenuto catalogo espanso */}
                      {openCatalogos.has(catalogo.id) && (
                        <div style={{ marginTop: 16, paddingLeft: 24 }}>
                          <button onClick={() => addCategoryToCatalogo(ci)} style={{ ...addCatBtnStyle, marginBottom: 12 }}>
                            + Nuova categoria
                          </button>

                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleCategoryDragEnd(e, ci)}>
                            <SortableContext items={(catalogo.categories || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                              {(catalogo.categories || []).map((cat, catIdx) => (
                                <SortableItem key={cat.id} id={cat.id}>
                                  {(catListeners, catAttrs) => (
                                    <div style={{ marginBottom: 8, background: '#fafafa', borderRadius: 8, border: '1px solid #ebebeb', overflow: 'hidden' }}>
                                      {/* Header categoria */}
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '10px 14px' }}>
                                        <div
                                          {...catAttrs} {...catListeners}
                                          style={{ cursor: 'grab', padding: '3px 2px', flexShrink: 0, touchAction: 'none', display: 'flex', alignItems: 'center', marginTop: 2 }}
                                        >
                                          <GripVertical size={13} strokeWidth={1.5} color="#ccc" />
                                        </div>
                                        <CategoryHeader
                                          name={cat.name}
                                          tipo={cat.tipo}
                                          itemCount={cat.items.length}
                                          open={openCategory[catalogo.id] === cat.id}
                                          onToggle={() => toggleCategory(catalogo.id, cat.id)}
                                          onRename={name => renameCatInCatalogo(ci, catIdx, name)}
                                          onChangeTipo={tipo => updateCatInCatalogo(ci, catIdx, { tipo })}
                                          onDelete={() => removeCatFromCatalogo(ci, catIdx)}
                                          allCatalogues={menu}
                                          currentCi={ci}
                                          onIncludeCategoryIn={targetCi => includeCategoryInCatalogo(ci, catIdx, targetCi)}
                                        />
                                      </div>

                                      {/* Contenuto categoria espanso */}
                                      {openCategory[catalogo.id] === cat.id && (
                                        <div style={{ borderTop: '1px solid #ebebeb', padding: '10px 14px 14px' }}>
                                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleItemDragEnd(e, ci, catIdx)}>
                                            <SortableContext items={cat.items.map(it => it.id)} strategy={verticalListSortingStrategy}>
                                              <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                                                {cat.items.map((item, ii) => (
                                                  <SortableItem key={item.id} id={item.id}>
                                                    {(itemListeners, itemAttrs) => (
                                                      <ItemRow
                                                        item={item}
                                                        ristoranteId={id}
                                                        onChange={patch => updateItemInCatalogo(ci, catIdx, ii, patch)}
                                                        onDelete={() => removeItemFromCatalogo(ci, catIdx, ii)}
                                                        allCatalogues={menu}
                                                        currentCi={ci}
                                                        currentCatIdx={catIdx}
                                                        onIncludeIn={(targetCi, targetCatIdx) => includeItemInCatalogo(ci, catIdx, ii, targetCi, targetCatIdx)}
                                                        dragListeners={itemListeners}
                                                        dragAttrs={itemAttrs}
                                                      />
                                                    )}
                                                  </SortableItem>
                                                ))}
                                              </div>
                                            </SortableContext>
                                          </DndContext>
                                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <button onClick={() => addItemToCatalogo(ci, catIdx)} style={addItemBtnStyle}>
                                              + Aggiungi piatto
                                            </button>
                                            {dirty && (
                                              <button onClick={handleSave} disabled={saving} style={saveInlineBtnStyle}>
                                                {saving ? 'Salvataggio…' : '✓ Salva'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </SortableItem>
                              ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  )}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        // ── Single menu view (legacy) ────────────────────────────────────────
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            <p style={{ ...descStyle, margin: 0 }}>Organizza il menu in categorie. Ogni modifica viene salvata automaticamente.</p>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={addCategory} style={addMainBtnStyle}>+ Categoria</button>
              <button onClick={switchToMulti} style={switchBtnStyle} title="Crea più menu separati (Pool Bar, Ristorante, Light Lunch...)">
                Multi-menu →
              </button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSingleCatDragEnd}>
            <SortableContext items={menu.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {menu.map((cat, ci) => (
                <SortableItem key={cat.id} id={cat.id}>
                  {(catListeners, catAttrs) => (
                    <div style={cardStyle}>
                      {/* Header categoria */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div
                          {...catAttrs} {...catListeners}
                          style={{ cursor: 'grab', padding: '4px 2px', flexShrink: 0, touchAction: 'none', display: 'flex', alignItems: 'center', marginTop: 3 }}
                        >
                          <GripVertical size={16} strokeWidth={1.5} color="#ccc" />
                        </div>
                        <CategoryHeader
                          name={cat.name}
                          tipo={cat.tipo}
                          itemCount={cat.items.length}
                          open={openSingleCatId === cat.id}
                          onToggle={() => setOpenSingleCatId(prev => prev === cat.id ? null : cat.id)}
                          onRename={name => renameCategory(ci, name)}
                          onChangeTipo={tipo => updateCategory(ci, { tipo })}
                          onDelete={() => removeCategory(ci)}
                        />
                      </div>

                      {/* Contenuto categoria espanso */}
                      {openSingleCatId === cat.id && (
                        <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleSingleItemDragEnd(e, ci)}>
                            <SortableContext items={cat.items.map(it => it.id)} strategy={verticalListSortingStrategy}>
                              <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                                {cat.items.map((item, ii) => (
                                  <SortableItem key={item.id} id={item.id}>
                                    {(itemListeners, itemAttrs) => (
                                      <ItemRow
                                        item={item}
                                        ristoranteId={id}
                                        onChange={patch => updateItem(ci, ii, patch)}
                                        onDelete={() => removeItem(ci, ii)}
                                        dragListeners={itemListeners}
                                        dragAttrs={itemAttrs}
                                      />
                                    )}
                                  </SortableItem>
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={() => addItem(ci)} style={addItemBtnStyle}>
                              + Aggiungi piatto
                            </button>
                            {dirty && (
                              <button onClick={handleSave} disabled={saving} style={saveInlineBtnStyle}>
                                {saving ? 'Salvataggio…' : '✓ Salva'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function CatalogoHeader({ name, icon, open, onToggle, onRename, onDelete, onUpdateIcon }) {
  const [editing,   setEditing]   = useState(false)
  const [val,       setVal]       = useState(name)
  const [showIcons, setShowIcons] = useState(false)

  function commit() {
    if (val.trim() && val !== name) onRename(val.trim())
    setEditing(false)
  }

  const entry      = CATALOGO_ICONS.find(i => i.key === icon)
  const SelectedIcon = entry ? entry.Icon : Utensils

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
      >
        <ChevronDown
          size={18} strokeWidth={1.5} color="#1a1a2e"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {/* Icon picker */}
      <div
        style={{ position: 'relative', flexShrink: 0 }}
        tabIndex={-1}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setShowIcons(false) }}
      >
        <button
          onClick={e => { e.stopPropagation(); setShowIcons(v => !v) }}
          title="Cambia icona"
          style={{
            background: showIcons ? '#ede9fe' : 'none',
            border: showIcons ? '1.5px solid #a78bfa' : '1.5px solid transparent',
            borderRadius: 7, padding: '5px 7px', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <SelectedIcon size={18} strokeWidth={1.5} color="#1a1a2e" />
        </button>

        {showIcons && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 200,
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12,
            padding: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
            minWidth: 230,
          }}>
            {CATALOGO_ICONS.map(({ key, Icon, label }) => (
              <button
                key={key}
                onClick={e => { e.stopPropagation(); onUpdateIcon(key); setShowIcons(false) }}
                title={label}
                style={{
                  background: icon === key ? '#ede9fe' : 'none',
                  border: icon === key ? '1.5px solid #7c3aed' : '1.5px solid transparent',
                  borderRadius: 7, padding: '7px 5px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}
              >
                <Icon size={16} strokeWidth={1.5} color={icon === key ? '#7c3aed' : '#555'} />
                <span style={{ fontSize: 9, color: icon === key ? '#7c3aed' : '#999', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 36, textOverflow: 'ellipsis' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Name (inline edit) */}
      {editing ? (
        <input
          autoFocus value={val} onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ flex: 1, fontSize: 17, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: '2px solid #1a1a2e' }}
        />
      ) : (
        <h3
          onClick={() => setEditing(true)}
          style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 700, cursor: 'pointer', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title="Clicca per rinominare"
        >
          {name}
        </h3>
      )}

      <button
        onClick={onDelete}
        style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
      >
        Elimina
      </button>
    </div>
  )
}

function CategoryHeader({ name, tipo, itemCount, open, onToggle, onRename, onChangeTipo, onDelete, allCatalogues, currentCi, onIncludeCategoryIn }) {
  const [editing,    setEditing]    = useState(false)
  const [val,        setVal]        = useState(name)
  const isCustom                    = tipo && !TIPO_PRESETS.includes(tipo)
  const [showCustom, setShowCustom] = useState(isCustom)
  const [customVal,  setCustomVal]  = useState(isCustom ? tipo : '')

  function commit() {
    if (val.trim() && val !== name) onRename(val.trim())
    setEditing(false)
  }

  function handleTipoChange(e) {
    const v = e.target.value
    if (v === '__custom') { setShowCustom(true); setCustomVal(''); return }
    setShowCustom(false); setCustomVal(''); onChangeTipo(v)
  }

  function commitCustom() {
    const v = customVal.trim()
    if (v) onChangeTipo(v)
  }

  const selectVal = (showCustom || isCustom) ? '__custom' : (tipo || 'piatto')

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Riga nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <ChevronDown
            size={14} strokeWidth={1.5} color="#888"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </button>
        {editing ? (
          <input
            autoFocus value={val} onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: '3px 6px', borderRadius: 6, border: '2px solid #1a1a2e' }}
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            style={{ flex: 1, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title="Clicca per rinominare"
          >
            {name}
            {itemCount !== undefined && (
              <span style={{ marginLeft: 6, fontSize: 11, color: '#aaa', fontWeight: 400 }}>
                {itemCount} {TIPO_LABELS[tipo] || (tipo ? tipo : 'voci')}
              </span>
            )}
          </span>
        )}
        {allCatalogues && allCatalogues.filter((_, i) => i !== currentCi).length > 0 && (
          <select
            value=""
            onChange={e => { if (e.target.value !== '') { onIncludeCategoryIn(Number(e.target.value)); e.target.value = '' } }}
            onClick={e => e.stopPropagation()}
            title="Copia l'intera categoria in un altro catalogo"
            style={{ fontSize: 11, padding: '2px 5px', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', color: '#6366f1', background: '#f8f7ff', flexShrink: 0 }}
          >
            <option value="" disabled>Copia in…</option>
            {allCatalogues.map((cat, ci) => ci === currentCi ? null : (
              <option key={ci} value={ci}>{cat.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={onDelete}
          style={{ fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {/* Selettore tipo — visibile solo quando espansa */}
      {open && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingLeft: 22, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>Tipo voci:</span>
          <select
            value={selectVal} onChange={handleTipoChange}
            style={{ fontSize: 12, padding: '3px 6px', border: '1px solid #e0e0e0', borderRadius: 6, background: '#fafafa', color: '#444', cursor: 'pointer' }}
          >
            {TIPO_PRESETS.map(t => (
              <option key={t} value={t}>{TIPO_LABELS[t]}</option>
            ))}
            <option value="__custom">Personalizzato…</option>
          </select>
          {(showCustom || isCustom) && (
            <input
              autoFocus={showCustom && !isCustom}
              value={customVal}
              onChange={e => setCustomVal(e.target.value)}
              onBlur={commitCustom}
              onKeyDown={e => {
                if (e.key === 'Enter') { commitCustom(); e.target.blur() }
                if (e.key === 'Escape') { setShowCustom(false); setCustomVal('') }
              }}
              placeholder="es. tapas, sushi…"
              style={{ fontSize: 12, padding: '3px 8px', border: '1px solid #1a1a2e', borderRadius: 6, width: 140, background: '#fff', color: '#1a1a2e', outline: 'none' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, ristoranteId, onChange, onDelete, allCatalogues, currentCi, currentCatIdx, onIncludeIn, dragListeners, dragAttrs }) {
  const [open,      setOpen]      = useState(!item.name)
  const [name,      setName]      = useState(item.name)
  const [desc,      setDesc]      = useState(item.description)
  const [price,     setPrice]     = useState(item.price)
  const [allergens, setAllergens] = useState(normalizeAllergens(item.allergens))
  const [dietary,   setDietary]   = useState(item.dietary || [])
  const [uploading, setUploading] = useState(false)
  const active = item.active !== false

  async function handlePhoto(file) {
    if (!file || file.size > 2 * 1024 * 1024) { alert('Max 2 MB'); return }
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/restaurant-gallery?ristorante_id=${ristoranteId}`, file)
      onChange({ photo_url: url })
    } catch (e) { alert(e.message) }
    finally { setUploading(false) }
  }

  // Verifica se ci sono cataloghi target disponibili (solo altri cataloghi, non il corrente)
  const hasIncludeTargets = allCatalogues && allCatalogues.some((cat, ci) => {
    if (ci === currentCi) return false
    return (cat.categories || []).some(
      category => !category.items.some(it => it.id === item.id || it.shared_from === item.id)
    )
  })

  return (
    <div style={{ background: active ? '#f9f9f9' : '#f0f0f0', borderRadius: 10, border: active ? '1px solid #eee' : '1px dashed #ccc', opacity: active ? 1 : 0.7, overflow: 'hidden' }}>
      {/* Header collassato — sempre visibile */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', userSelect: 'none' }}
      >
        {dragListeners && (
          <div {...dragAttrs} {...dragListeners} onClick={e => e.stopPropagation()}
            style={{ cursor: 'grab', padding: '3px 2px', flexShrink: 0, touchAction: 'none', display: 'flex', alignItems: 'center' }}>
            <GripVertical size={13} strokeWidth={1.5} color="#ccc" />
          </div>
        )}
        {/* Thumbnail foto */}
        <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#e8e8e8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          {item.photo_url
            ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🍽'}
        </div>
        {/* Nome + prezzo + badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: name ? '#1a1a2e' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name || 'Nuova voce'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
            {price && <span style={{ fontSize: 11, color: '#666' }}>€ {price}</span>}
            {allergens.length > 0 && <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400e', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{allergens.length} all.</span>}
            {dietary.length > 0 && <span style={{ fontSize: 10, background: '#DCFCE7', color: '#166534', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{dietary.length} car.</span>}
            {item.shared_from && <span style={{ fontSize: 10, color: '#6366f1', background: '#eef2ff', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>condiviso</span>}
          </div>
        </div>
        {/* Toggle visibilità */}
        <button
          onClick={e => { e.stopPropagation(); onChange({ active: !active }) }}
          title={active ? 'Nascondi dal menu' : 'Mostra nel menu'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '4px', opacity: active ? 1 : 0.5, flexShrink: 0 }}
        >
          {active ? '👁' : '🚫'}
        </button>
        {/* Elimina */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 15, lineHeight: 1, padding: '4px', flexShrink: 0 }}
          title="Elimina piatto"
        >
          ✕
        </button>
        {/* Chevron */}
        <ChevronDown size={15} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </div>

      {/* Form espanso */}
      {open && (
        <div style={{ padding: '0 12px 14px', borderTop: '1px solid #ebebeb' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: 12 }}>
            {/* Upload foto */}
            <label style={{ flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {item.photo_url
                  ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : uploading ? '…' : '🍽'}
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
            </label>

            {/* Campi */}
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px 12px' }}>
              <input value={name} onChange={e => setName(e.target.value)} onBlur={() => onChange({ name })} placeholder="Nome *" style={inpStyle} />
              <input value={price} onChange={e => setPrice(e.target.value)} onBlur={() => onChange({ price })} placeholder="Prezzo €" style={inpStyle} type="number" min="0" step="0.5" />
              <input value={desc} onChange={e => setDesc(e.target.value)} onBlur={() => onChange({ description: desc })} placeholder="Descrizione" style={{ ...inpStyle, gridColumn: '1 / -1' }} />
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 5, letterSpacing: 0.5 }}>ALLERGENI (EU)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {EU_ALLERGENS.map(a => {
                    const on = allergens.includes(a.key)
                    return (
                      <button key={a.key} type="button" title={a.label}
                        onClick={() => { const next = on ? allergens.filter(k => k !== a.key) : [...allergens, a.key]; setAllergens(next); onChange({ allergens: next }) }}
                        style={{ padding: '4px 9px', borderRadius: 6, border: `1px solid ${on ? '#92400e' : '#e0e0e0'}`, background: on ? '#FEF3C7' : '#f5f5f5', color: on ? '#92400e' : '#bbb', fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer' }}
                      >
                        {a.abbr}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 5, marginTop: 8, letterSpacing: 0.5 }}>CARATTERISTICHE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {DIETARY_FLAGS.map(d => {
                    const on = dietary.includes(d.key)
                    return (
                      <button key={d.key} type="button"
                        onClick={() => { const next = on ? dietary.filter(k => k !== d.key) : [...dietary, d.key]; setDietary(next); onChange({ dietary: next }) }}
                        style={{ padding: '4px 9px', borderRadius: 6, border: `1px solid ${on ? '#166534' : '#e0e0e0'}`, background: on ? '#DCFCE7' : '#f5f5f5', color: on ? '#166534' : '#bbb', fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer' }}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Includi in altro catalogo — dropdown raggruppato per catalogo */}
              {hasIncludeTargets && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <select
                    value=""
                    onChange={e => {
                      if (!e.target.value) return
                      const [ci, catIdx] = e.target.value.split('-').map(Number)
                      onIncludeIn(ci, catIdx)
                      e.target.value = ''
                    }}
                    style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', color: '#555', background: '#fff' }}
                  >
                    <option value="" disabled>+ Includi in un altro catalogo</option>
                    {allCatalogues.map((cat, ci) => {
                      if (ci === currentCi) return null
                      const available = (cat.categories || [])
                        .map((category, catIdx) => ({ category, catIdx }))
                        .filter(({ category }) =>
                          !category.items.some(it => it.id === item.id || it.shared_from === item.id)
                        )
                      if (available.length === 0) return null
                      return (
                        <optgroup key={ci} label={cat.name}>
                          {available.map(({ category, catIdx }) => (
                            <option key={catIdx} value={`${ci}-${catIdx}`}>{category.name}</option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stili ─────────────────────────────────────────────────────────────────────
const inpStyle           = { padding: '8px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, width: '100%', boxSizing: 'border-box', background: '#fff' }
const titleStyle         = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle          = { margin: '0 0 20px', color: '#888', fontSize: 14 }
const cardStyle          = { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }
const loadingStyle       = { padding: 32, color: '#888' }
const errorStyle         = { padding: 32, color: '#e53e3e' }
const addMainBtnStyle    = { padding: '10px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const addCatBtnStyle     = { fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', marginBottom: 8 }
const addItemBtnStyle    = { fontSize: 12, fontWeight: 600, color: '#555', background: '#f5f5f5', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer' }
const switchBtnStyle     = { fontSize: 12, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }
const saveInlineBtnStyle = { fontSize: 12, fontWeight: 700, color: '#fff', background: '#38a169', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }
