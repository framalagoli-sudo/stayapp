'use client'
import { useEffect, useRef, useState, useCallback, useMemo, createContext, useContext } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { LinkPicker, buildInternalLinks } from '@/components/admin/LinkPicker'
import { IconPicker } from '@/components/admin/IconPicker'
import { FocalPointPicker } from '@/components/admin/FocalPointPicker'
import { SelettoreFormato } from '@/components/admin/SelettoreFormato'
import { FORMATI, FORME_SCHEDA, FORMA_SCHEDA_PREDEFINITA, formaScheda, rapportoOppure, formatiConPredefinito } from '@/lib/formati-foto'
import { CampoImmagine } from '@/components/admin/CampoImmagine'
import { getPreset as getVetrinaPreset } from '@/lib/vetrinePresets'
import {
  GripVertical, AlignLeft, Image, Grid, Users, List, Star, BarChart2, Zap,
  MessageCircle, Tag, Package, HelpCircle, Video, Settings, Compass, Map,
  Calendar, FileText, Clock, Mail, Phone, MapPin, ChevronDown, ChevronUp,
  Plus, Trash2, Copy, Clipboard, ImageIcon, Layers, Building2, GalleryHorizontal, Columns, Minus, Megaphone, Utensils, Share2, Code, SlidersHorizontal, Sparkles,
  Heading, Quote, Table, PanelTop, AppWindow, Smartphone,
} from 'lucide-react'
import AiButton from '@/components/admin/AiButton'
import RichTextEditor from '@/components/admin/RichTextEditor'
import MediaPickerButton from '@/components/admin/MediaPicker'
import UnsplashPicker from '@/components/admin/UnsplashPicker'
import { BLOCK_PATTERNS, blocchiDiSezione } from '@/lib/blockPatterns'
import GalleriaSezioni from '@/components/admin/GalleriaSezioni'
import MarchioEStile from '@/components/admin/MarchioEStile'
import DimmiCosaCambiare from '@/components/admin/DimmiCosaCambiare'
import { applicaMosse } from '@/lib/interprete'
import { TIPO_SEZIONE, MAX_BLOCCHI_SEZIONE, idSezione, soloRiferimenti } from '@/lib/sezioni-regole'
import { testiDaRiscrivere, conTestiRiscritti } from '@/lib/ai-blocco'
import { datiDiNascita, scriviCampo, scriviParagrafo, campiDiTesto, postoPerFoto, scriviImmagine, azioneSuElemento } from '@/lib/editor-visuale'
import { TIPO_TRASCINATO } from '@/components/EditorNelRiquadro'
import { BLOCK_TYPES, BLOCK_GROUPS, BLOCK_DEFAULTS, blockLabel, BLOCK_BG_OPTIONS, BLOCK_GLOW_OPTIONS, BLOCK_PADY_OPTIONS, blockSupportsBg, BLOCK_TEXT_SIZE_OPTIONS, BLOCK_TEXT_COLOR_OPTIONS, BLOCK_ICON_COLOR_OPTIONS, blockHasText, GRID_AUTO_BLOCKS, BLOCK_COLUMNS_OPTIONS } from '@/lib/blockTypes'

function uid() { return crypto.randomUUID() }

// Le righe del blocco «Contatti e orari» che si possono spegnere.
const RIGHE_RECAPITI = [
  { key: 'indirizzo', label: 'Indirizzo' }, { key: 'telefono', label: 'Telefono' }, { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' }, { key: 'orari', label: 'Orari' },
]

// La larghezza a cui l'editor visuale disegna la pagina «da computer».
const LARGO_COMPUTER = 1280
const LARGO_TABLET = 820

// Carica una foto fra le immagini del sito e ne restituisce l'indirizzo.
async function caricaImmagine(file, entityTipo, entityId) {
  const fd = new FormData(); fd.append('file', file)
  const { supabase } = await import('../../lib/supabase')
  const token = (await supabase.auth.getSession())?.data?.session?.access_token
  const res = await fetch(`/api/upload/minisito-image?entity_type=${entityTipo}&entity_id=${entityId}`, { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 413) throw new Error('La foto è troppo pesante: il limite è 4 MB.')
  const json = await res.json().catch(() => ({}))
  if (!json.url) throw new Error(json.error || 'Caricamento non riuscito: riprova.')
  return json.url
}

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i')
    .replace(/[òó]/g,'o').replace(/[ùú]/g,'u').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'pagina'
}

// ── Block icon + color mapping ────────────────────────────────────────────────
const BLOCK_ICON_MAP = {
  hero: Layers, hero_slider: GalleryHorizontal, carosello: GalleryHorizontal, about: AlignLeft, pulsante: Zap, foto_testo: Image, paragrafi: Grid,
  colonne: Columns, divisore: Minus, annuncio: Megaphone, menu: Utensils,
  accordion: ChevronDown, social: Share2, countdown: Clock, before_after: SlidersHorizontal, embed: Code,
  team: Users, steps: List, highlights: Star, stats: BarChart2,
  cta_banner: Zap, testimonianze: MessageCircle, promozioni: Tag,
  pacchetti: Package, faq: HelpCircle, immagine: Image, galleria_immagini: Grid, gallery: ImageIcon, video: Video,
  services: Settings, activities: Compass, excursions: Map, eventi: Calendar, eventi_slider: GalleryHorizontal, vetrina: Package,
  news: FileText, booking: Clock, newsletter: Mail, contatti: Phone,
  show_map: MapPin, clienti: Building2, recapiti: MapPin, listino: List, sezione: Layers,
  titolo: Heading, citazione: Quote, tabella: Table, linguette: PanelTop, popup: AppWindow,
  mosaico: Grid, scorrevole: Megaphone,
}
const GROUP_COLORS = {
  layout: '#5b6af8', marketing: '#f97316', media: '#0891b2',
  servizi: '#16a34a', conversione: '#9333ea',
}
function blockColor(type) {
  const grp = BLOCK_TYPES.find(b => b.type === type)?.group
  return GROUP_COLORS[grp] || '#666'
}
function BlockTypeIcon({ type, size = 15, muted = false }) {
  const Icon = BLOCK_ICON_MAP[type] || FileText
  return <Icon size={size} strokeWidth={1.5} color={muted ? '#aaa' : blockColor(type)} />
}

// Destinazioni interne (Home/pagine/Privacy/Cookie) condivise da tutti gli editor
// di blocco senza prop-drilling. Riempito dal componente principale.
const LinkContext = createContext([])
// Le sezioni condivise del sito e quello che ci si può fare: lo usa la scheda
// del blocco «Sezione condivisa», a qualunque profondità si trovi.
const SezioniContext = createContext(null)

// Un blocco `sezione` appena aggiunto, duplicato o incollato non porta le
// modifiche non ancora salvate: le prende dal gemello che mostra la stessa sezione.
function allineaSezioni(blocks) {
  // ⚠️ In questo file `Map` è l'icona di lucide: qui serve un oggetto semplice.
  const modificate = {}
  for (const b of blocks) { const sid = idSezione(b); if (sid && (b._blocchi || typeof b._nome === 'string') && !modificate[sid]) modificate[sid] = b }
  if (!Object.keys(modificate).length) return blocks
  return blocks.map(b => {
    const m = modificate[idSezione(b)] || null
    if (!m || m === b || (b._blocchi === m._blocchi && b._nome === m._nome)) return b
    return { ...b, ...(m._blocchi ? { _blocchi: m._blocchi } : {}), ...(typeof m._nome === 'string' ? { _nome: m._nome } : {}) }
  })
}

// Campo URL con selettore di pagine interne. Drop-in per <Field> sui link.
function LinkField({ label, value, onChange, placeholder = 'https://...', style: extraStyle }) {
  const links = useContext(LinkContext)
  return (
    <div style={extraStyle}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>{label}</label>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle()} />
        <LinkPicker links={links} onPick={onChange} />
      </div>
    </div>
  )
}

// ── ItemListEditor ────────────────────────────────────────────────────────────
function ItemListEditor({ items = [], onChange, fields, newItem, entityId, entityTipo }) {
  const links = useContext(LinkContext)
  function update(idx, key, val) { onChange(items.map((it, i) => i === idx ? { ...it, [key]: val } : it)) }
  function add() { onChange([...items, { id: uid(), ...newItem }]) }
  function remove(idx) { onChange(items.filter((_, i) => i !== idx)) }
  function move(idx, dir) {
    const arr = [...items]; const t = idx + dir
    if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]; onChange(arr)
  }
  return (
    <div>
      {items.map((it, idx) => (
        <div key={it.id || idx} style={{ background: '#f9f9fb', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => move(idx, -1)} style={tinyBtn}>▲</button>
              <button onClick={() => move(idx, 1)} style={tinyBtn}>▼</button>
            </div>
            <button onClick={() => remove(idx)} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
          </div>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 8 }}>
              {f.label && <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 3 }}>{f.label}</label>}
              {f.type === 'image'
                ? <div>
                    {it[f.key] && <img src={it[f.key]} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <UnsplashPicker label="Unsplash" defaultQuery={it.title || ''} onPick={url => update(idx, f.key, url)} />
                      <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => update(idx, f.key, url)} />
                    </div>
                    <input type="text" value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} placeholder="https://..." style={inputStyle()} />
                    {/* Il ritaglio taglia: senza dire quale parte tenere, una foto
                        di gruppo o un viso di lato finisce fuori dal cerchio.
                        Stesso selettore della copertina di un evento. */}
                    {f.focalKey && it[f.key] && (
                      <div style={{ marginTop: 8 }}>
                        <FocalPointPicker src={it[f.key]} value={it[f.focalKey]} onChange={v => update(idx, f.focalKey, v)} hint={false} intera />
                        {/* L'anteprima ha la forma VERA che avrà sul sito: se
                            mostrasse sempre un cerchio, chi ha scelto il
                            verticale sceglierebbe il ritaglio guardando la
                            forma sbagliata. */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <img src={it[f.key]} alt="" style={{ width: 56, aspectRatio: f.anteprimaTonda ? '1 / 1' : (f.anteprima || '1 / 1'), borderRadius: f.anteprimaTonda ? '50%' : 8, objectFit: 'cover', objectPosition: it[f.focalKey] || 'center', display: 'block', border: '1px solid #e8e8ee' }} />
                          <span style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                            Clicca sul viso qui sopra: è la parte che resta nella scheda.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                : f.type === 'textarea'
                ? <textarea value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} rows={f.rows || 3} style={inputStyle()} />
                : f.type === 'toggle'
                ? <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={!!it[f.key]} onChange={e => update(idx, f.key, e.target.checked)} />
                    {f.toggleLabel || f.label}
                  </label>
                : f.type === 'number'
                ? <input type="number" value={it[f.key] ?? ''} onChange={e => update(idx, f.key, Number(e.target.value))} style={{ ...inputStyle(), width: 80 }} />
                : f.type === 'link'
                ? <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                    <input type="text" value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} placeholder={f.placeholder || 'https://...'} style={inputStyle()} />
                    <LinkPicker links={links} onPick={url => update(idx, f.key, url)} />
                  </div>
                : f.type === 'select'
                ? <select value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} style={inputStyle()}>
                    {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                : f.type === 'icon'
                ? <IconPicker value={it[f.key] || ''} onChange={v => update(idx, f.key, v)} />
                : <input type="text" value={it[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} placeholder={f.placeholder || ''} style={inputStyle()} />
              }
            </div>
          ))}
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: '8px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
        + Aggiungi elemento
      </button>
    </div>
  )
}

// ── SlidesEditor (hero_slider) ────────────────────────────────────────────────
function SlidesEditor({ slides = [], onChange, entityId, entityTipo }) {
  function update(idx, key, val) { onChange(slides.map((s, i) => i === idx ? { ...s, [key]: val } : s)) }
  function add() { onChange([...slides, { id: uid(), image_url: '', title: '', subtitle: '', cta1_text: '', cta1_url: '', cta2_text: '', cta2_url: '' }]) }
  function remove(idx) { onChange(slides.filter((_, i) => i !== idx)) }
  function move(idx, dir) { const a = [...slides]; const t = idx + dir; if (t < 0 || t >= a.length) return; [a[idx], a[t]] = [a[t], a[idx]]; onChange(a) }
  return (
    <div>
      {slides.map((s, idx) => (
        <div key={s.id || idx} style={{ background: '#f9f9fb', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Slide {idx + 1}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => move(idx, -1)} style={tinyBtn}>▲</button>
              <button onClick={() => move(idx, 1)} style={tinyBtn}>▼</button>
              <button onClick={() => remove(idx)} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
            </div>
          </div>
          {s.image_url && <FocalPointPicker src={s.image_url} value={s.focal} onChange={v => update(idx, 'focal', v)} />}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            <UnsplashPicker label="Cerca su Unsplash" defaultQuery={s.title} onPick={url => update(idx, 'image_url', url)} />
            <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => update(idx, 'image_url', url)} />
          </div>
          <Field label="URL immagine" value={s.image_url} onChange={v => update(idx, 'image_url', v)} placeholder="https://..." style={{ marginBottom: 8 }} />
          <Field label="Titolo" value={s.title} onChange={v => update(idx, 'title', v)} style={{ marginBottom: 8 }} />
          <Field label="Sottotitolo (corsivo)" value={s.subtitle} onChange={v => update(idx, 'subtitle', v)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="Pulsante 1 — testo" value={s.cta1_text} onChange={v => update(idx, 'cta1_text', v)} style={{ flex: 1 }} />
            <LinkField label="Pulsante 1 — URL" value={s.cta1_url} onChange={v => update(idx, 'cta1_url', v)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Field label="Pulsante 2 — testo (opz.)" value={s.cta2_text} onChange={v => update(idx, 'cta2_text', v)} style={{ flex: 1 }} />
            <LinkField label="Pulsante 2 — URL" value={s.cta2_url} onChange={v => update(idx, 'cta2_url', v)} style={{ flex: 1 }} />
          </div>
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: '9px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
        + Aggiungi slide
      </button>
    </div>
  )
}

// ── BlockEditor ───────────────────────────────────────────────────────────────
function BlockEditor({ block, onChange, entityId, entityTipo }) {
  const { type, data } = block
  const upd = (key, val) => onChange({ ...data, [key]: val })
  const links = useContext(LinkContext)

  if (type === TIPO_SEZIONE) return <SezioneCondivisa block={block} entityId={entityId} entityTipo={entityTipo} />

  if (GRID_AUTO_BLOCKS.includes(type)) {
    const numStyle = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
          <BlockTypeIcon type={type} size={16} />
          <p style={{ fontSize: 12, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            Mostra i dati dell'entità (condivisi con l'app). Personalizza titolo e impaginazione qui sotto.
          </p>
        </div>
        <Field label="Titolo sezione (vuoto = predefinito)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <Field label="Sottotitolo (vuoto = predefinito)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Quanti elementi</label>
            <input type="number" min="1" value={data.limit ?? ''} onChange={e => upd('limit', e.target.value ? Number(e.target.value) : undefined)} placeholder="Tutti" style={numStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Colonne (desktop)</label>
            <select value={data.columns || ''} onChange={e => upd('columns', e.target.value)} style={{ ...numStyle, background: '#fff' }}>
              {BLOCK_COLUMNS_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Su mobile le colonne si adattano automaticamente.</p>
        {/* Assente = acceso: i blocchi eventi già sui siti li mostrano senza
            che nessuno debba tornare a spuntarli. */}
        {type === 'eventi' && (
          <SelettoreFormato
            valore={data.formato || ''} onChange={v => upd('formato', v)}
            formati={[{ chiave: '', etichetta: 'Fascia', misura: 'come adesso', rapporto: '16 / 9' }, ...FORMATI]}
            titolo="Forma delle locandine"
            aiuto="«Fascia» taglia la foto a una striscia bassa: una locandina verticale si vede a metà. Le altre forme valgono per tutte le schede insieme."
          />
        )}
        {type === 'eventi' && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#333', cursor: 'pointer', lineHeight: 1.5 }}>
            <input type="checkbox" checked={data.mostra_passati !== false} onChange={e => upd('mostra_passati', e.target.checked)} style={{ marginTop: 3 }} />
            <span>Mostra anche gli eventi passati<br />
              <span style={{ fontSize: 11.5, color: '#888' }}>Sotto quelli in programma, gli ultimi conclusi. Si aprono ma non si prenotano più.</span>
            </span>
          </label>
        )}
      </div>
    )
  }
  // ⚠️ `booking` stava qui dentro, e questa scorciatoia scatta **prima** dello
  // switch: il suo editor esisteva ma non veniva mai raggiunto. Aggiungendo un
  // `case` va sempre controllato che qualcosa non lo intercetti prima.
  if (['show_map'].includes(type)) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
        <BlockTypeIcon type={type} size={16} />
        <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          Questo blocco visualizza automaticamente i dati dell'entità — nessuna configurazione necessaria.
        </p>
      </div>
    )
  }

  switch (type) {
    case 'hero': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Impaginazione</label>
          <select data-hero-layout value={data.layout || ''} onChange={e => upd('layout', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="">Classica — la foto a tutto schermo, il testo sopra</option>
            <option value="split">Divisa — il testo da una parte, la foto dall'altra</option>
            <option value="tipo">Solo titolo — parole enormi su fondo scuro, senza foto</option>
          </select>
        </div>
        {data.layout && <Field label="Riga piccola sopra il titolo (opz.)" value={data.occhiello} onChange={v => upd('occhiello', v)} placeholder="es. Dal 1998 a Terni" />}
        <Field label="Titolo principale" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Tagline / Sottotitolo" value={data.tagline} onChange={v => upd('tagline', v)} />
        <Field label="URL immagine di sfondo" value={data.bg_image_url} onChange={v => upd('bg_image_url', v)} placeholder="https://..." />
        {data.bg_image_url && <FocalPointPicker src={data.bg_image_url} value={data.focal} onChange={v => upd('focal', v)} />}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <UnsplashPicker label="Cerca su Unsplash" defaultQuery={data.title} onPick={url => upd('bg_image_url', url)} />
          <UploadBtn label="Carica immagine sfondo" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('bg_image_url', url)} />
        </div>
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Consigliato: orizzontale, almeno 2000×1200 px (nitida su schermi grandi).</p>
        <Field label="Video di sfondo (URL mp4, opz.)" value={data.bg_video} onChange={v => upd('bg_video', v)} placeholder="https://....mp4" />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Opacità overlay ({Math.round((data.overlay_opacity ?? 0.5) * 100)}%)</label>
          <input type="range" min="0" max="1" step="0.05" value={data.overlay_opacity ?? 0.5} onChange={e => upd('overlay_opacity', parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Altezza</label>
          <select value={data.height || 'large'} onChange={e => upd('height', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="full">Piena (100vh)</option>
            <option value="large">Grande (85vh)</option>
            <option value="medium">Media (65vh)</option>
            <option value="compatta">Compatta (46vh)</option>
          </select>
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 8 }}>CTA primario</div>
          <Field label="Testo pulsante" value={data.cta1_text} onChange={v => upd('cta1_text', v)} />
          <div style={{ marginTop: 8 }}>
            <LinkField label="URL pulsante" value={data.cta1_url} onChange={v => upd('cta1_url', v)} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 8 }}>CTA secondario (opz.)</div>
          <Field label="Testo pulsante" value={data.cta2_text} onChange={v => upd('cta2_text', v)} />
          <div style={{ marginTop: 8 }}>
            <LinkField label="URL pulsante" value={data.cta2_url} onChange={v => upd('cta2_url', v)} />
          </div>
        </div>
      </div>
    )
    case 'hero_slider': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SlidesEditor slides={data.slides} onChange={v => upd('slides', v)} entityId={entityId} entityTipo={entityTipo} />
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Altezza</label>
              <select value={data.height || 'full'} onChange={e => upd('height', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <option value="full">Piena (100vh)</option>
                <option value="large">Grande (85vh)</option>
                <option value="medium">Media (65vh)</option>
            <option value="compatta">Compatta (46vh)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Allineamento testo</label>
              <select value={data.text_align || 'center'} onChange={e => upd('text_align', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <option value="center">Centrato</option>
                <option value="left">A sinistra</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Opacità velo scuro ({Math.round((data.overlay_opacity ?? 0.45) * 100)}%)</label>
            <input type="range" min="0" max="0.85" step="0.05" value={data.overlay_opacity ?? 0.45} onChange={e => upd('overlay_opacity', parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.autoplay !== false} onChange={e => upd('autoplay', e.target.checked)} />
              Scorrimento automatico
            </label>
            {data.autoplay !== false && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                ogni
                <input type="number" min="2" max="20" value={data.interval ?? 6} onChange={e => upd('interval', Number(e.target.value))} style={{ width: 60, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
                secondi
              </label>
            )}
          </div>
        </div>
      </div>
    )
    case 'carosello': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <SelettoreFormato
          valore={data.formato || ''} onChange={v => upd('formato', v)}
          formati={formatiConPredefinito('4 / 3')}
          titolo="Forma delle immagini"
          aiuto="Vale per tutte le schede insieme: se ognuna tenesse la propria, una foto verticale sfonderebbe la riga."
        />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)} entityId={entityId} entityTipo={entityTipo}
          newItem={{ image_url: '', image_focal: '', title: '', text: '', button_label: '', button_url: '' }}
          fields={[
            { key: 'image_url', label: 'Immagine', type: 'image', focalKey: 'image_focal', anteprima: rapportoOppure(data.formato, '4 / 3') },
            { key: 'title', label: 'Titolo' },
            { key: 'text', label: 'Testo', type: 'textarea', rows: 2 },
            { key: 'button_label', label: 'Pulsante (opz.)' },
            { key: 'button_url', label: 'URL pulsante', type: 'link' },
          ]} />
        <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Card visibili (desktop)</label>
            <select value={data.per_view || 3} onChange={e => upd('per_view', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
            <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>Su mobile si adatta automaticamente (1 per volta).</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.autoplay !== false} onChange={e => upd('autoplay', e.target.checked)} /> Scorrimento automatico
            </label>
            {data.autoplay !== false && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                ogni <input type="number" min="2" max="20" value={data.interval ?? 5} onChange={e => upd('interval', Number(e.target.value))} style={{ width: 60, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} /> secondi
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.show_arrows !== false} onChange={e => upd('show_arrows', e.target.checked)} /> Frecce
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.show_dots !== false} onChange={e => upd('show_dots', e.target.checked)} /> Puntini
            </label>
          </div>
        </div>
      </div>
    )
    case 'eventi_slider': {
      const sel = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff', boxSizing: 'border-box' }
      const etichetta = { fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
            <BlockTypeIcon type={type} size={16} />
            <p style={{ fontSize: 12, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              Mostra da solo gli eventi in programma, dal più vicino: locandina, titolo e data. Chi tocca una scheda apre quell'evento.
            </p>
          </div>
          <Field label="Titolo sezione (vuoto = predefinito)" value={data.titolo} onChange={v => upd('titolo', v)} />
          <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} />
          <SelettoreFormato
            valore={data.formato || 'verticale'} onChange={v => upd('formato', v)}
            formati={FORMATI}
            titolo="Forma delle locandine"
            aiuto="Vale per tutte le schede insieme. Quale parte della foto resta visibile lo dice il punto focale scelto nell'evento."
          />
          <div>
            <label style={etichetta}>Cosa c'è in ogni scheda</label>
            <select value={data.scheda || 'completa'} onChange={e => upd('scheda', e.target.value)} style={sel}>
              <option value="completa">Locandina, titolo, data e prezzo</option>
              <option value="locandina">Solo la locandina</option>
            </select>
            <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>«Solo la locandina» è per le locandine che hanno già tutto scritto sopra. Un evento senza foto mostra comunque titolo e data.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={etichetta}>Schede per volta — telefono</label>
              <select value={data.per_view_mobile || 1} onChange={e => upd('per_view_mobile', Number(e.target.value))} style={sel}>
                <option value={1}>1</option><option value={2}>2</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={etichetta}>Schede per volta — computer</label>
              <select value={data.per_view_desktop || 3} onChange={e => upd('per_view_desktop', Number(e.target.value))} style={sel}>
                <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={etichetta}>Quanti eventi</label>
              <input type="number" min="1" value={data.limit ?? ''} onChange={e => upd('limit', e.target.value ? Number(e.target.value) : undefined)} placeholder="Tutti" style={sel} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.autoplay !== false} onChange={e => upd('autoplay', e.target.checked)} /> Scorre da solo
            </label>
            {data.autoplay !== false && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                ogni <input type="number" min="2" max="20" value={data.interval ?? 5} onChange={e => upd('interval', Number(e.target.value))} style={{ width: 60, border: '1px solid #ddd', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} /> secondi
              </label>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Su telefono si scorre col dito (le frecce lì non ci sono), su computer con le frecce. Si ferma mentre ci si passa sopra.</p>
          <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Testo del pulsante" value={data.cta_label} onChange={v => upd('cta_label', v)} placeholder="Scopri tutti gli eventi" />
            <LinkField label="Dove porta il pulsante" value={data.cta_url} onChange={v => upd('cta_url', v)} placeholder="Scegli una pagina o incolla un indirizzo" />
            <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Di solito la pagina con tutti gli eventi. Senza una destinazione il pulsante non compare.</p>
          </div>
        </div>
      )
    }
    case 'accordion': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ title: '', text: '' }}
          fields={[{ key: 'title', label: 'Titolo' }, { key: 'text', label: 'Contenuto', type: 'textarea', rows: 3 }]} />
      </div>
    )
    case 'linguette': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ title: '', text: '' }}
          fields={[{ key: 'title', label: 'Nome della linguetta (breve)' }, { key: 'text', label: 'Contenuto', type: 'textarea', rows: 4 }]} />
        <p style={{ fontSize: 11, color: '#aaa', margin: '8px 0 0' }}>Sul sito si vede una linguetta per volta; la prima è quella aperta. Su telefono, se sono tante, scorrono di lato.</p>
      </div>
    )
    case 'mosaico': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <Field label="Riga sotto il titolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)} entityId={entityId} entityTipo={entityTipo}
          newItem={{ title: '', text: '', value: '', icon: '', image_url: '', size: '', style: '' }}
          fields={[
            { key: 'title', label: 'Titolo' },
            { key: 'text', label: 'Testo (opz.)', type: 'textarea', rows: 2 },
            { key: 'value', label: 'Numero o parola in grande (opz.)', placeholder: 'es. 25 · 4,9 · 100%' },
            { key: 'size', label: 'Misura', type: 'select', options: [
              { value: '', label: 'Normale' }, { value: 'wide', label: 'Largo (due colonne)' },
              { value: 'tall', label: 'Alto (due righe)' }, { value: 'big', label: 'Grande (due colonne, due righe)' },
            ] },
            { key: 'style', label: 'Fondo', type: 'select', options: [
              { value: '', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' }, { value: 'color', label: 'Colore del sito' },
            ] },
            { key: 'image_url', label: 'Foto (opz.) — riempie il riquadro, il testo ci va sopra', type: 'image', focalKey: 'image_focal' },
            { key: 'icon', label: 'Icona (opz.) — senza foto', type: 'icon' },
          ]} />
        <p style={{ fontSize: 11, color: '#aaa', margin: '8px 0 0' }}>Da computer i riquadri stanno su quattro colonne e si incastrano da soli; da telefono vanno uno sotto l'altro. Funziona meglio con un riquadro grande e gli altri attorno.</p>
      </div>
    )
    case 'scorrevole': return (
      <div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ text: '' }}
          fields={[{ key: 'text', label: 'Parola o frase breve' }]} />
        <p style={{ fontSize: 11, color: '#aaa', margin: '8px 0 0' }}>Poche parole, corte: scorrono in grande, una piena e una a contorno. Chi ha chiesto al proprio dispositivo meno movimento le vede ferme.</p>
      </div>
    )
    case 'titolo': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Riga sotto il titolo (opz.)" value={data.subtitle} onChange={v => upd('subtitle', v)} multiline rows={2} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Dimensione</label>
          <select value={data.size || 'medium'} onChange={e => upd('size', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="small">Piccolo</option>
            <option value="medium">Medio</option>
            <option value="large">Grande</option>
          </select>
        </div>
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Sta al centro; l'allineamento si cambia dallo Stile. La sezione che viene dopo ha il suo spazio sopra: se ti sembra troppo, lì scegli la spaziatura «Compatta».</p>
      </div>
    )
    case 'citazione': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="La frase" value={data.text} onChange={v => upd('text', v)} multiline rows={4} />
        <Field label="Chi l'ha detta (opz.)" value={data.author} onChange={v => upd('author', v)} />
        <Field label="Chi è (opz.)" value={data.role} onChange={v => upd('role', v)} placeholder="es. Fondatrice · La Repubblica · Cliente dal 2019" />
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Per le recensioni dei clienti con le stelle c'è il blocco «Testimonianze».</p>
      </div>
    )
    case 'tabella': return <TabellaEditor data={data} onChange={onChange} />
    case 'popup': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div data-popup-nota style={{ fontSize: 12.5, color: '#555', lineHeight: 1.55, padding: 12, background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
          Compare sopra la pagina in cui lo metti, qualunque sia il punto. Aspetta che il visitatore abbia risposto al banner dei cookie e si chiude con la ✕, con Esc o toccando fuori.
        </div>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Messaggio" value={data.text} onChange={v => upd('text', v)} multiline rows={3} />
        <CampoImmagine
          etichetta="Immagine in cima (opz.)"
          valore={data.image_url}
          onChange={v => upd('image_url', v)}
          endpoint={`/api/upload/minisito-image?entity_type=${entityTipo}&entity_id=${entityId}`}
          indirizzo
          anteprima="16 / 9"
        />
        <Field label="Testo del pulsante (opz.)" value={data.button_text} onChange={v => upd('button_text', v)} />
        <LinkField label="Dove porta il pulsante" value={data.button_url} onChange={v => upd('button_url', v)} placeholder="Scegli una pagina o incolla un indirizzo" />
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Senza una destinazione il pulsante non compare.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Quando compare</label>
            <select value={data.dopo ?? 5} onChange={e => upd('dopo', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value={0}>Appena si apre la pagina</option>
              {[3, 5, 10, 20, 30, 60].map(s => <option key={s} value={s}>Dopo {s} secondi</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>A chi l'ha già visto</label>
            <select value={data.giorni ?? 7} onChange={e => upd('giorni', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value={0}>Lo rivede alla prossima visita</option>
              <option value={1}>Non lo rivede per un giorno</option>
              <option value={7}>Non lo rivede per una settimana</option>
              <option value={30}>Non lo rivede per un mese</option>
            </select>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Vale anche per te: dopo averlo visto sul sito, per riprovarlo apri il sito in una finestra anonima. Se cambi il messaggio lo rivedono tutti. Nell'anteprima qui accanto compare ogni volta.</p>
      </div>
    )
    case 'social': return (
      <div>
        <Field label="Titolo (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ network: 'instagram', url: '' }}
          fields={[{ key: 'network', label: 'Social', placeholder: 'instagram, facebook, whatsapp, youtube…' }, { key: 'url', label: 'Link', type: 'link' }]} />
      </div>
    )
    case 'countdown': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Data e ora di fine</label>
          <input type="datetime-local" value={data.target || ''} onChange={e => upd('target', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
        </div>
      </div>
    )
    case 'before_after': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {['before', 'after'].map(side => {
          const key = `${side}_url`
          return (
            <div key={side}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 600 }}>{side === 'before' ? 'Immagine PRIMA' : 'Immagine DOPO'}</label>
              {data[key] && <img src={data[key]} alt="" style={{ width: '100%', maxHeight: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <UnsplashPicker label="Unsplash" onPick={url => upd(key, url)} />
                <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd(key, url)} />
              </div>
              <input type="text" value={data[key] || ''} onChange={e => upd(key, e.target.value)} placeholder="https://..." style={{ width: '100%', border: '1px solid #e0e0e8', borderRadius: 7, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Etichetta PRIMA" value={data.before_label} onChange={v => upd('before_label', v)} style={{ flex: 1 }} />
          <Field label="Etichetta DOPO" value={data.after_label} onChange={v => upd('after_label', v)} style={{ flex: 1 }} />
        </div>
      </div>
    )
    case 'embed': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Codice HTML / iframe</label>
          <textarea value={data.html || ''} onChange={e => upd('html', e.target.value)} rows={6} placeholder="<iframe src=... ></iframe>" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>Incolla il codice fornito dal servizio (mappe, prenotazioni, widget). Mostrato in una sandbox sicura.</p>
        </div>
        <div style={{ maxWidth: 160 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Altezza (px)</label>
          <input type="number" min="100" value={data.height || 400} onChange={e => upd('height', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
        </div>
      </div>
    )
    case 'menu': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
          <BlockTypeIcon type="menu" size={16} />
          <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>Mostra il menù del ristorante (categorie, piatti, prezzi, allergeni). Le voci si gestiscono nella tab <strong>Menu</strong> del ristorante.</p>
        </div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
      </div>
    )
    case 'colonne': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Numero colonne</label>
          <select value={data.columns || 2} onChange={e => upd('columns', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value={2}>2</option><option value={3}>3</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ title: '', text: '' }}
          fields={[{ key: 'title', label: 'Titolo colonna' }, { key: 'text', label: 'Testo', type: 'textarea', rows: 3 }]} />
      </div>
    )
    case 'divisore': return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
          <select value={data.variant || 'space'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="space">Spazio vuoto</option>
            <option value="line">Linea sottile</option>
            <option value="wave">Onda</option>
            <option value="diagonal">Diagonale</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Dimensione</label>
          <select value={data.size || 'medium'} onChange={e => upd('size', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="small">Piccola</option><option value="medium">Media</option><option value="large">Grande</option>
          </select>
        </div>
        {(data.variant === 'wave' || data.variant === 'diagonal') && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Colore forma</label>
            <select value={data.color || 'auto'} onChange={e => upd('color', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="auto">Come la sezione sotto</option>
              <option value="muted">Grigio</option>
              <option value="primary">Colore tema</option>
              <option value="secondary">Accento</option>
              <option value="dark">Scuro</option>
            </select>
            <div style={{ fontSize: 11.5, color: '#888', marginTop: 5, lineHeight: 1.5 }}>
              La forma è il bordo in alto della sezione che viene dopo: col suo stesso colore sembra parte di quella, con un colore diverso sembra una fascia a sé.
            </div>
          </div>
        )}
      </div>
    )
    case 'annuncio': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Testo annuncio" value={data.text} onChange={v => upd('text', v)} placeholder="Es. Spedizione gratuita sopra i 50€" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Field label="Testo link (opz.)" value={data.link_text} onChange={v => upd('link_text', v)} style={{ flex: 1 }} />
          <LinkField label="URL link" value={data.link_url} onChange={v => upd('link_url', v)} style={{ flex: 1 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Colore</label>
          <select value={data.bg || 'primary'} onChange={e => upd('bg', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="primary">Colore principale</option>
            <option value="secondary">Colore accento</option>
            <option value="dark">Scuro</option>
          </select>
        </div>
      </div>
    )
    case 'about': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione" value={data.title} onChange={v => upd('title', v)} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>Testo</label>
            <AiButton
              tipo="minisito_about"
              contesto={data.title ? `Sezione: "${data.title}"` : ''}
              temaSuggerito={data.title || ''}
              label="✨ Genera"
              showTono={false}
              placeholder="Descrivi brevemente di cosa tratta questa sezione…"
              onInsert={v => upd('text', v)}
            />
          </div>
          <RichTextEditor content={data.text} onChange={v => upd('text', v)} format="json" minimal placeholder="Scrivi il testo…" />
        </div>
      </div>
    )
    case 'foto_testo': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Testo</label>
          <RichTextEditor content={data.text} onChange={v => upd('text', v)} format="json" minimal placeholder="Scrivi il testo…" />
        </div>
        <CampoImmagine
          etichetta="Immagine"
          valore={data.image_url}
          onChange={v => upd('image_url', v)}
          endpoint={`/api/upload/minisito-image?entity_type=${entityTipo}&entity_id=${entityId}`}
          unsplash unsplashQuery={typeof data.title === 'string' ? data.title : ''}
          indirizzo
          anteprima={rapportoOppure(data.formato, '4 / 3')}
          focale={data.focal} onFocale={v => upd('focal', v)}
        />
        <SelettoreFormato
          valore={data.formato || ''} onChange={v => upd('formato', v)}
          formati={formatiConPredefinito('4 / 3')}
          titolo="Forma dell'immagine"
          aiuto="Come si vede la foto accanto al testo. «Predefinito» è la forma che ha sempre avuto."
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!data.inverti} onChange={e => upd('inverti', e.target.checked)} />
          Inverti: testo a sinistra, immagine a destra
        </label>
        <Field label="Testo pulsante (opz.)" value={data.button_label} onChange={v => upd('button_label', v)} />
        <LinkField label="URL pulsante (opz.)" value={data.button_url} onChange={v => upd('button_url', v)} />
      </div>
    )
    case 'cta_banner': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'center'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="center">Centrato</option>
            <option value="split">Diviso (testo + pulsante a lato)</option>
          </select>
        </div>
        <Field label="Titolo" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
        <Field label="Testo pulsante" value={data.button_text} onChange={v => upd('button_text', v)} />
        <LinkField label="URL pulsante" value={data.button_url} onChange={v => upd('button_url', v)} />
      </div>
    )
    case 'pulsante': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Testo del pulsante" value={data.text} onChange={v => upd('text', v)} />
        <LinkField label="Link (URL)" value={data.url} onChange={v => upd('url', v)} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Stile</label>
            <select value={data.style || 'filled'} onChange={e => upd('style', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="filled">Pieno</option>
              <option value="outline">Bordato</option>
              <option value="alone">Pieno con alone</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Dimensione</label>
            <select value={data.size || 'medium'} onChange={e => upd('size', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="small">Piccolo</option>
              <option value="medium">Medio</option>
              <option value="large">Grande</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Allineamento</label>
            <select value={data.align || 'center'} onChange={e => upd('align', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="left">Sinistra</option>
              <option value="center">Centro</option>
              <option value="right">Destra</option>
            </select>
          </div>
        </div>
      </div>
    )
    case 'video': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="URL video (YouTube o Vimeo)" value={data.url} onChange={v => upd('url', v)} placeholder="https://youtube.com/watch?v=..." />
        <Field label="Titolo (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} placeholder="Es. Guarda il video" />
        <Field label="Testo (opz.)" value={data.testo} onChange={v => upd('testo', v)} placeholder="Una breve descrizione…" multiline rows={3} />
      </div>
    )
    case 'galleria_immagini': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Formato foto</label>
            <select value={data.format || 'classic'} onChange={e => upd('format', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="classic">Classico · orizzontale (1920×1080)</option>
              <option value="square">Quadrato (1080×1080)</option>
              <option value="card">Card · verticale (1080×1920)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Disposizione</label>
            <select value={data.layout || 'grid'} onChange={e => upd('layout', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value="grid">Griglia</option>
              <option value="carousel">Carosello (scorrevole)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Colonne (griglia)</label>
            <select value={data.columns || 3} onChange={e => upd('columns', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              <option value={2}>2 colonne</option>
              <option value={3}>3 colonne</option>
              <option value={4}>4 colonne</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data.images || []).map((it, idx) => (
            <div key={it.id || idx} style={{ background: '#f8f9ff', border: '1px solid #e8ecff', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Immagine {idx + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { const a = [...(data.images || [])]; if (idx > 0) { [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; upd('images', a) } }} style={tinyBtn}>▲</button>
                  <button onClick={() => { const a = [...(data.images || [])]; if (idx < a.length - 1) { [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; upd('images', a) } }} style={tinyBtn}>▼</button>
                  <button onClick={() => upd('images', (data.images || []).filter((_, i) => i !== idx))} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
                </div>
              </div>
              {it.url && <img src={it.url} alt="" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'cover', borderRadius: 6, marginBottom: 8, display: 'block' }} />}
              <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('images', (data.images || []).map((x, i) => i === idx ? { ...x, url } : x))} />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 3 }}>Testo alternativo (alt)</label>
                <input type="text" value={it.alt || ''} onChange={e => upd('images', (data.images || []).map((x, i) => i === idx ? { ...x, alt: e.target.value } : x))} placeholder="Descrizione" style={inputStyle()} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => upd('images', [...(data.images || []), { id: uid(), url: '', alt: '' }])}
            style={{ flex: 1, minWidth: 140, padding: '8px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
            + Aggiungi immagine
          </button>
          <MediaPickerButton entityId={entityId} entityTipo={entityTipo} label="Sfoglia e aggiungi"
            onPick={url => upd('images', [...(data.images || []), { id: uid(), url, alt: '' }])} />
        </div>
      </div>
    )
    case 'immagine': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.image_url && <img src={data.image_url} alt="" style={{ maxHeight: 140, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <UnsplashPicker label="Cerca su Unsplash" defaultQuery={data.alt} onPick={url => upd('image_url', url)} />
          <UploadBtn label="Carica immagine" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('image_url', url)} />
          <MediaPickerButton entityId={entityId} entityTipo={entityTipo} onPick={url => upd('image_url', url)} />
        </div>
        <Field label="URL immagine" value={data.image_url} onChange={v => upd('image_url', v)} placeholder="https://..." />
        <Field label="Testo alternativo (alt — SEO e accessibilità)" value={data.alt} onChange={v => upd('alt', v)} placeholder="Descrizione dell'immagine" />
        <Field label="Didascalia (opz.)" value={data.caption} onChange={v => upd('caption', v)} />
        <LinkField label="Link al click (opz.)" value={data.link_url} onChange={v => upd('link_url', v)} />
        <div>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Larghezza</label>
          <select value={data.width || 'large'} onChange={e => upd('width', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="full">Piena</option>
            <option value="large">Grande</option>
            <option value="medium">Media</option>
            <option value="small">Piccola</option>
          </select>
        </div>
      </div>
    )
    case 'newsletter': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione" value={data.title} onChange={v => upd('title', v)} />
        <Field label="Sottotitolo" value={data.subtitle} onChange={v => upd('subtitle', v)} />
      </div>
    )
    case 'highlights': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'card'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="card">Card</option>
            <option value="plain">Minimal (senza card)</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ icon: 'star', text: '' }}
          fields={[{ key: 'icon', label: 'Icona', type: 'icon' }, { key: 'text', label: 'Testo' }]} />
      </div>
    )
    case 'stats': return (
      <div>
        <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'dark'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="dark">Banda scura</option>
            <option value="plain">Sfondo chiaro</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ value: '', label: '' }}
          fields={[{ key: 'value', label: 'Valore (es. 150+)', placeholder: '150+' }, { key: 'label', label: 'Etichetta' }]} />
      </div>
    )
    case 'paragrafi': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <SelettoreFormato
          valore={data.formato || ''} onChange={v => upd('formato', v)}
          formati={formatiConPredefinito('16 / 9')}
          titolo="Forma delle immagini"
          aiuto="Vale per tutte le schede insieme. «Predefinito» è la forma che hanno sempre avuto."
        />
        {/* ⛔ Qui la foto si poteva solo INCOLLARE come indirizzo, come
            succedeva al Team: per mettere un'immagine bisognava caricarla
            altrove e copiare il link. `ItemListEditor` sapeva già caricare —
            mancava dirglielo e passargli l'entità. */}
        <ItemListEditor items={data.items} onChange={v => upd('items', v)} entityId={entityId} entityTipo={entityTipo}
          newItem={{ icon: 'star', title: '', text: '', image_url: '', image_focal: '' }}
          fields={[
            { key: 'icon', label: 'Icona', type: 'icon' },
            { key: 'title', label: 'Titolo' },
            { key: 'text', label: 'Testo', type: 'textarea', rows: 2 },
            { key: 'image_url', label: 'Immagine (opz.)', type: 'image', focalKey: 'image_focal', anteprima: rapportoOppure(data.formato, '16 / 9') },
          ]} />
      </div>
    )
    case 'team': {
      const forma = data.formato || FORMA_SCHEDA_PREDEFINITA
      // ⚠️ `griglia` è il blocco di sempre: resta il predefinito, così nessun
      // sito già pubblicato cambia aspetto da solo.
      const variante = data.variant === 'ritratti' || data.variant === 'editoriale' ? data.variant : 'griglia'
      const tondaVale = variante === 'griglia'
      return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={variante} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="griglia">Griglia — foto piccole, testo centrato</option>
            <option value="ritratti">Ritratti — foto grandi in colonna, testo a sinistra</option>
            <option value="editoriale">Editoriale — una persona per riga, bio estesa</option>
          </select>
          <div style={{ fontSize: 11.5, color: '#888', marginTop: 5, lineHeight: 1.5 }}>
            {variante === 'griglia' && 'Tante persone in fila, adatta a un gruppo numeroso con poche righe di bio.'}
            {variante === 'ritratti' && 'Foto grandi e nome in evidenza: poche persone, presentate bene.'}
            {variante === 'editoriale' && 'Ritratto grande a lato che si alterna: la scelta giusta quando ogni bio è un paragrafo.'}
          </div>
        </div>
        {/* ⛔ La foto si poteva solo incollare come indirizzo: per mettere la
            faccia di una persona bisognava caricarla altrove e copiare il link.
            `ItemListEditor` sapeva già caricare (`type: 'image'`), mancava
            dirglielo — e passargli l'entità, senza cui il pulsante non sa dove
            mettere il file. */}
        {/* La forma vale per TUTTE le schede insieme: se ognuna tenesse la
            propria basterebbe una foto verticale per sfondare la riga, come
            negli eventi. ⚠️ Senza scelta resta il cerchio, perché i blocchi
            già online sono tondi e non si rifà la faccia di un sito a un
            cliente che non ha chiesto niente; i blocchi nuovi nascono quadrati. */}
        <div style={{ marginBottom: 14 }}>
          <SelettoreFormato
            valore={forma} formati={FORME_SCHEDA}
            onChange={v => upd('formato', v)}
            titolo="Forma delle schede"
            aiuto={tondaVale
              ? 'Come si vedono le foto delle persone sul sito. Il ritaglio si decide poi foto per foto, col punto da tenere visibile.'
              : 'Come si vedono le foto delle persone sul sito. In questa variante il cerchio non si usa: le foto restano verticali.'}
          />
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)} entityId={entityId} entityTipo={entityTipo}
          newItem={{ photo_url: '', photo_focal: '', nome: '', ruolo: '', bio: '' }}
          fields={[
            { key: 'photo_url', label: 'Foto', type: 'image', focalKey: 'photo_focal', anteprima: tondaVale || forma !== 'cerchio' ? formaScheda(forma).rapporto : '4 / 5', anteprimaTonda: tondaVale && forma === 'cerchio' },
            { key: 'nome', label: 'Nome' },
            { key: 'ruolo', label: 'Ruolo' },
            { key: 'bio', label: 'Breve bio', type: 'textarea', rows: 2 },
          ]} />
      </div>
      )
    }
    case 'steps': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ icon: 'check-circle', title: '', text: '' }}
          fields={[
            { key: 'icon', label: 'Icona', type: 'icon' },
            { key: 'title', label: 'Titolo passo' },
            { key: 'text', label: 'Descrizione', type: 'textarea', rows: 2 },
          ]} />
      </div>
    )
    // ⚠️ Qui NON c'è un campo dove scrivere il voto, ed è deliberato: se ci
    // fosse, tornerebbe il problema da cui siamo partiti — un «4,8 su Google»
    // digitato a mano è vero il giorno che lo scrivi e falso il mese dopo. Il
    // numero arriva da Google e si aggiorna da solo; qui si sceglie soltanto
    // come presentarlo.
    case 'punteggio': return (
      <div>
        <div style={{ fontSize: 12.5, color: '#666', background: '#f9f9fb', borderRadius: 8, padding: '10px 12px', marginBottom: 12, lineHeight: 1.6 }}>
          Il voto viene preso da Google e si aggiorna da solo ogni giorno.
          Se non hai ancora collegato la scheda, fallo in <strong>Recensioni</strong>:
          finché non è collegata, questo blocco non compare sul sito.
        </div>
        <Field label="Titolo sezione (opzionale)" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <Field label="Sottotitolo (opzionale)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} style={{ marginBottom: 12 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
          <input type="checkbox" checked={data.mostra_data !== false} onChange={e => upd('mostra_data', e.target.checked)} />
          Mostra quando è stato letto
        </label>
        <div style={{ fontSize: 11.5, color: '#999', marginTop: 6, lineHeight: 1.6 }}>
          Consigliato: la data è ciò che distingue un dato vero da un numero scritto una volta e dimenticato.
        </div>
      </div>
    )
    case 'testimonianze': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Variante</label>
          <select value={data.variant || 'grid'} onChange={e => upd('variant', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value="grid">Griglia di card</option>
            <option value="quote">Citazione grande</option>
            <option value="carousel">Carosello (scorrevole)</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ author: '', location: '', rating: 5, text: '', source: '' }}
          fields={[
            { key: 'author', label: 'Autore' },
            { key: 'location', label: 'Luogo (opz.)' },
            { key: 'rating', label: 'Stelle (1-5)', type: 'number' },
            { key: 'text', label: 'Testo', type: 'textarea', rows: 3 },
            { key: 'source', label: 'Fonte (mostra il logo)', type: 'select', options: [
              { value: '', label: 'Nessuna' },
              { value: 'google', label: 'Google' },
              { value: 'tripadvisor', label: 'TripAdvisor' },
            ] },
          ]} />
      </div>
    )
    case 'listino': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ name: '', description: '', price: '' }}
          fields={[
            { key: 'name', label: 'Voce' },
            { key: 'price', label: 'Prezzo (come vuoi scriverlo: 25 €, da 30 €, su richiesta)' },
            { key: 'description', label: 'Descrizione (opz.)', type: 'textarea', rows: 2 },
          ]} />
        <Field label="Nota sotto il listino (opz.)" value={data.nota} onChange={v => upd('nota', v)} placeholder="es. Prezzi IVA inclusa" style={{ margin: '12px 0' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!data.due_colonne} onChange={e => upd('due_colonne', e.target.checked)} /> Su due colonne (da computer)
        </label>
      </div>
    )
    case 'recapiti': {
      const via = Array.isArray(data.nascondi) ? data.nascondi : []
      const dove = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }[entityTipo]
      return (
        <div>
          <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
          <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 12, color: '#555', fontWeight: 500, marginBottom: 6 }}>Cosa mostrare</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
            {RIGHE_RECAPITI.map(r => (
              <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={!via.includes(r.key)} onChange={e => upd('nascondi', e.target.checked ? via.filter(k => k !== r.key) : [...via, r.key])} /> {r.label}
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={data.mostra_mappa !== false} onChange={e => upd('mostra_mappa', e.target.checked)} /> La mappa accanto
            </label>
          </div>
          <div data-recapiti-nota style={{ fontSize: 12.5, color: '#555', lineHeight: 1.55, padding: 12, background: '#f8f9ff', borderRadius: 8, border: '1px solid #e8ecff' }}>
            Indirizzo, telefono, email e orari non si scrivono qui: il blocco li prende dalle <strong>Informazioni</strong>, così cambiandoli lì cambiano ovunque. Una riga compare solo se il dato c'è.
            {dove && entityId && <> <a href={'/admin/' + dove + '/' + entityId + '/info'} target="_blank" rel="noopener" style={{ color: '#5b6af8', fontWeight: 600, whiteSpace: 'nowrap' }}>Apri le Informazioni ↗</a></>}
          </div>
        </div>
      )
    }
    case 'faq': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ question: '', answer: '' }}
          fields={[
            { key: 'question', label: 'Domanda' },
            { key: 'answer', label: 'Risposta', type: 'textarea', rows: 3 },
          ]} />
      </div>
    )
    case 'promozioni': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Quante mostrarne per volta (desktop) — su mobile diventa uno slider con frecce</label>
          <select value={data.per_view || 3} onChange={e => upd('per_view', Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
            <option value={2}>2 per riga</option>
            <option value={3}>3 per riga</option>
            <option value={4}>4 per riga</option>
          </select>
        </div>
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ badge: '', title: '', text: '', cta_label: '', cta_url: '', expires_at: '' }}
          fields={[
            { key: 'badge', label: 'Badge (es. -20%)', placeholder: '-20%' },
            { key: 'title', label: 'Titolo offerta' },
            { key: 'text', label: 'Descrizione', type: 'textarea', rows: 2 },
            { key: 'cta_label', label: 'Testo pulsante' },
            { key: 'cta_url', label: 'URL pulsante', type: 'link' },
            { key: 'expires_at', label: 'Scadenza (YYYY-MM-DD)', placeholder: '2026-12-31' },
          ]} />
      </div>
    )
    case 'pacchetti': return (
      <div>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} style={{ marginBottom: 12 }} />
        <Field label="Sottotitolo (opz.)" value={data.sottotitolo} onChange={v => upd('sottotitolo', v)} style={{ marginBottom: 12 }} />
        <ItemListEditor items={data.items} onChange={v => upd('items', v)}
          newItem={{ badge: '', name: '', tagline: '', price: '', price_label: 'a persona', cta_label: 'Scegli', cta_url: '' }}
          fields={[
            { key: 'badge', label: 'Badge', placeholder: 'Più scelto' },
            { key: 'name', label: 'Nome pacchetto' },
            { key: 'tagline', label: 'Tagline' },
            { key: 'price', label: 'Prezzo', placeholder: '€ 99' },
            { key: 'price_label', label: 'Etichetta prezzo', placeholder: 'a persona' },
            { key: 'cta_label', label: 'Testo pulsante' },
            { key: 'cta_url', label: 'URL pulsante', type: 'link' },
          ]} />
      </div>
    )
    case 'form_builder': return (
      <FormBuilderBlockEditor data={data} onChange={upd} entityId={entityId} entityTipo={entityTipo} />
    )
    // ⚠️ Questi due blocchi non avevano **nessuna** configurazione: si
    // trascinavano nella pagina e non chiedevano niente. E se non c'era niente
    // da mostrare sparivano in silenzio — sembrava che non funzionassero.
    case 'offerte': return (
      <OfferteBlockEditor data={data} onChange={upd} entityId={entityId} entityTipo={entityTipo} />
    )
    case 'shop': return (
      <ShopBlockEditor data={data} onChange={upd} entityId={entityId} entityTipo={entityTipo} />
    )
    case 'booking': return (
      <BookingBlockEditor data={data} onChange={upd} entityId={entityId} entityTipo={entityTipo} />
    )
    case 'vetrina': return (
      <VetrinaBlockEditor data={data} onChange={upd} entityId={entityId} entityTipo={entityTipo} />
    )
    case 'clienti': return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Titolo sezione" value={data.titolo} onChange={v => upd('titolo', v)} placeholder="I nostri clienti" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data.items || []).map((it, idx) => (
            <div key={it.id || idx} style={{ background: '#f8f9ff', border: '1px solid #e8ecff', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Logo {idx + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { const a=[...(data.items||[])]; if(idx>0){[a[idx-1],a[idx]]=[a[idx],a[idx-1]]; upd('items',a)} }} style={tinyBtn}>▲</button>
                  <button onClick={() => { const a=[...(data.items||[])]; if(idx<a.length-1){[a[idx],a[idx+1]]=[a[idx+1],a[idx]]; upd('items',a)} }} style={tinyBtn}>▼</button>
                  <button onClick={() => upd('items', (data.items||[]).filter((_,i) => i!==idx))} style={{ ...tinyBtn, color: '#c00', background: '#fce8e8' }}>✕</button>
                </div>
              </div>
              {it.logo_url && <img src={it.logo_url} alt="" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, marginBottom: 8, display: 'block' }} />}
              <UploadBtn label="Carica logo" entityId={entityId} entityTipo={entityTipo} onUrl={url => upd('items', (data.items||[]).map((x,i) => i===idx ? {...x, logo_url: url} : x))} />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 3 }}>URL link (opz.)</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                  <input type="text" value={it.link_url||''} onChange={e => upd('items', (data.items||[]).map((x,i) => i===idx ? {...x, link_url: e.target.value} : x))} placeholder="https://..." style={inputStyle()} />
                  <LinkPicker links={links} onPick={url => upd('items', (data.items||[]).map((x,i) => i===idx ? {...x, link_url: url} : x))} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => upd('items', [...(data.items||[]), { id: uid(), logo_url: '', link_url: '' }])}
          style={{ width: '100%', padding: '8px', background: '#f0f4ff', border: '1px dashed #c8d0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334' }}>
          + Aggiungi logo
        </button>
      </div>
    )
    default:
      return <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Editor non disponibile per questo blocco.</p>
  }
}

// ── BlockStylePanel — stile per-blocco (Fase 0: sfondo + spaziatura) ─────────
function BlockStylePanel({ block, onChange, entityId, entityTipo }) {
  // Una sezione condivisa non ha uno stile suo: ce l'hanno i blocchi che contiene.
  if (block.type === TIPO_SEZIONE) return null
  // Un popup non è una sezione della pagina: sfondo, spaziatura e allineamento non lo toccano.
  if (block.type === 'popup') return null
  const st = block.style || {}
  const set = (key, val) => onChange({ ...st, [key]: val })
  const showBg = blockSupportsBg(block.type)
  const showText = blockHasText(block.type)
  const sel = { width: '100%', border: '1px solid #e0e0e8', borderRadius: 7, padding: '8px 10px', fontSize: 13, background: '#fff', fontFamily: 'inherit' }
  const lbl = { display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }
  return (
    <div style={{ borderTop: '1px solid #ececf2', marginTop: 18, paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Stile sezione</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {showBg && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Sfondo</label>
            <select value={st.bg || 'default'} onChange={e => set('bg', e.target.value)} style={sel}>
              {BLOCK_BG_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        {showBg && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Alone luminoso</label>
            <select value={st.glow || 'none'} onChange={e => set('glow', e.target.value)} style={sel}>
              {BLOCK_GLOW_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={lbl}>Etichetta sopra il titolo</label>
          <input value={st.etichetta || ''} onChange={e => set('etichetta', e.target.value)} maxLength={60}
            placeholder="es. Chi siamo" style={{ ...sel, padding: '7px 9px' }} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={lbl}>Spaziatura verticale</label>
          <select value={st.paddingY || 'default'} onChange={e => set('paddingY', e.target.value)} style={sel}>
            {BLOCK_PADY_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={lbl}>Allineamento</label>
          <select value={st.align || 'default'} onChange={e => set('align', e.target.value)} style={sel}>
            <option value="default">Predefinito</option>
            <option value="left">Sinistra</option>
            <option value="center">Centro</option>
            <option value="right">Destra</option>
          </select>
        </div>
        {showText && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Dimensione testo</label>
            <select value={st.textSize || 'normal'} onChange={e => set('textSize', e.target.value)} style={sel}>
              {BLOCK_TEXT_SIZE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        {showText && (
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={lbl}>Colore testo</label>
            <select value={st.textColor || 'default'} onChange={e => set('textColor', e.target.value)} style={sel}>
              {BLOCK_TEXT_COLOR_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={lbl}>Colore icone</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={(typeof st.iconColor === 'string' && st.iconColor.startsWith('#')) ? 'custom' : (st.iconColor || 'default')}
              onChange={e => set('iconColor', e.target.value === 'custom' ? '#1a1a2e' : e.target.value)} style={{ ...sel, flex: 1 }}>
              {BLOCK_ICON_COLOR_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {typeof st.iconColor === 'string' && st.iconColor.startsWith('#') && (
              <input type="color" value={st.iconColor} onChange={e => set('iconColor', e.target.value)}
                style={{ width: 34, height: 34, border: '1px solid #ddd', borderRadius: 7, padding: 2, cursor: 'pointer', flexShrink: 0 }} />
            )}
          </div>
        </div>
      </div>
      {/* Àncora del blocco — per i link interni (#ancora) che scrollano a questa sezione */}
      <div style={{ marginTop: 14, borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
        <label style={lbl}>Àncora (link interno alla sezione)</label>
        <input type="text" value={st.anchor || ''}
          onChange={e => set('anchor', e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
          placeholder="es. prenota" style={sel} />
        <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>
          {st.anchor
            ? `Richiamabile con il link  #${st.anchor.replace(/^-+|-+$/g, '')}  (es. un bottone che salta qui).`
            : 'Dai un nome a questa sezione per poterci puntare da un bottone/menu (jump nella pagina).'}
        </p>
      </div>
      {showBg && st.bg === 'image' && (
        <div style={{ marginTop: 12, background: '#fafafd', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <label style={lbl}>Immagine di sfondo</label>
          {st.bg_image && <FocalPointPicker src={st.bg_image} value={st.bg_focal} onChange={v => set('bg_focal', v)} />}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
            <UnsplashPicker label="Cerca su Unsplash" onPick={url => set('bg_image', url)} />
            <UploadBtn label="Carica" entityId={entityId} entityTipo={entityTipo} onUrl={url => set('bg_image', url)} />
          </div>
          <input type="text" value={st.bg_image || ''} onChange={e => set('bg_image', e.target.value)} placeholder="https://..." style={{ ...sel, marginBottom: 8 }} />
          <label style={lbl}>Velo scuro ({Math.round((st.bg_overlay ?? 0.5) * 100)}%)</label>
          <input type="range" min="0" max="0.85" step="0.05" value={st.bg_overlay ?? 0.5} onChange={e => set('bg_overlay', parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!st.hide_mobile} onChange={e => set('hide_mobile', e.target.checked)} /> Nascondi su mobile
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={!!st.hide_desktop} onChange={e => set('hide_desktop', e.target.checked)} /> Nascondi su desktop
        </label>
      </div>
    </div>
  )
}

// ── FormBuilderBlockEditor — carica lista form e mostra picker ───────────────
function FormBuilderBlockEditor({ data, onChange, entityId, entityTipo }) {
  const [forms, setForms] = useState([])
  // Con l'entità: i moduli dell'azienda di QUESTO sito, anche per il super_admin.
  useEffect(() => {
    if (!entityId) return
    apiFetch(`/api/form-builder?entity_tipo=${entityTipo}&entity_id=${entityId}`).then(f => setForms(Array.isArray(f) ? f : [])).catch(() => {})
  }, [entityId, entityTipo])

  const selectedForm = forms.find(f => f.token === data.form_token)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Seleziona form</label>
        <select
          value={data.form_token || ''}
          onChange={e => {
            const picked = forms.find(f => f.token === e.target.value)
            onChange('form_token', e.target.value)
            if (picked && !data.titolo_sezione) onChange('titolo_sezione', picked.nome)
          }}
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
        >
          <option value="">— Scegli un form —</option>
          {forms.map(f => (
            <option key={f.id} value={f.token}>{f.nome}{!f.attivo ? ' (disattivo)' : ''}</option>
          ))}
        </select>
        {forms.length === 0 && (
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            Nessun form trovato. <a href="/admin/form-builder" target="_blank" style={{ color: '#2b6cb0' }}>Crea il primo form →</a>
          </p>
        )}
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Titolo sezione (opzionale)</label>
        <input
          value={data.titolo_sezione || ''}
          onChange={e => onChange('titolo_sezione', e.target.value)}
          placeholder="es. Contattaci"
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
      {selectedForm && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#276749' }}>
          ✓ Form selezionato: <strong>{selectedForm.nome}</strong> ({selectedForm.attivo ? 'attivo' : 'disattivo'})
        </div>
      )}
    </div>
  )
}

// ── VetrinaBlockEditor — sceglie quale vetrina mostrare e come ────────────────
function VetrinaBlockEditor({ data, onChange, entityId, entityTipo }) {
  const [vetrine, setVetrine] = useState([])
  useEffect(() => {
    if (!entityId) return
    apiFetch(`/api/vetrine?entity_tipo=${entityTipo}&entity_id=${entityId}`).then(v => setVetrine(Array.isArray(v) ? v : [])).catch(() => {})
  }, [entityId, entityTipo])

  const selected = vetrine.find(v => v.id === data.vetrina_id)
  const stati = selected ? (getVetrinaPreset(selected.preset).stati || []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Vetrina da mostrare</label>
        <select value={data.vetrina_id || ''} onChange={e => { onChange('vetrina_id', e.target.value); onChange('filtro', '') }}
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
          <option value="">— Scegli una vetrina —</option>
          {vetrine.map(v => <option key={v.id} value={v.id}>{v.titolo}{v.status !== 'pubblicata' ? ' (bozza)' : ''}</option>)}
        </select>
        {vetrine.length === 0 && (
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Nessuna vetrina. Creala nella tab <strong>Vetrine</strong> dell'entità.</p>
        )}
      </div>
      {stati.length > 0 && (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Mostra solo</label>
          <select value={data.filtro || ''} onChange={e => onChange('filtro', e.target.value)}
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
            <option value="">Tutti gli elementi</option>
            {stati.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Es. una pagina "Auto nuove" e una "Auto usate" dalla stessa vetrina.</p>
        </div>
      )}
      <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => onChange('titolo', v)} />
      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Aspetto delle schede</label>
        <select value={data.variant === 'evidenza' ? 'evidenza' : 'schede'} onChange={e => onChange('variant', e.target.value)}
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
          <option value="schede">Scheda semplice</option>
          <option value="evidenza">Numeri in evidenza</option>
        </select>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          «Numeri in evidenza» mette in risalto l'avanzamento e le cifre che contano ({(selected ? (getVetrinaPreset(selected.preset).evidenza?.metriche || []) : []).length > 0
            ? (getVetrinaPreset(selected.preset).evidenza.metriche || []).map(k => (getVetrinaPreset(selected.preset).campiPubblici || []).find(c => c.key === k)?.breve || k).join(', ')
            : 'i primi valori numerici'}).
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Colonne</label>
          <select value={data.colonne || 3} onChange={e => onChange('colonne', Number(e.target.value))}
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
            <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-end', paddingBottom: 8 }}>
          <input type="checkbox" checked={data.mostra_filtri !== false} onChange={e => onChange('mostra_filtri', e.target.checked)} />
          Mostra filtri per stato
        </label>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// ── Sezione condivisa ────────────────────────────────────────────────────────
// La scheda di un blocco `sezione`: quale sezione mostra, cosa c'è dentro, e
// l'avviso che conta — quello che si cambia qui cambia in ogni pagina che la usa.
// Il contenuto modificato resta sul blocco (`_blocchi`, `_nome`) finché non si
// salva: così annulla/ripeti e l'anteprima lo vedono come ogni altra modifica.
function SezioneCondivisa({ block, entityId, entityTipo }) {
  const sz = useContext(SezioniContext)
  const [aperto, setAperto] = useState(null)
  const [elenco, setElenco] = useState(false)
  if (!sz) return null
  const id = block.data?.sezione_id || ''
  const nota = sz.sezioni.find(s => s.id === id) || null
  const dentro = sz.blocchiDi(block)
  const usi = nota?.usata_in || []
  const altre = usi.filter(u => u.id !== sz.paginaId)
  const cambia = nb => sz.cambia(block.id, { _blocchi: nb })
  const sposta = (i, passo) => { const j = i + passo; if (j < 0 || j >= dentro.length) return; const nb = [...dentro]; [nb[i], nb[j]] = [nb[j], nb[i]]; cambia(nb) }
  const sotto = sz.bloccoSotto(block.id)
  const piccolo = { background: '#f0f0f4', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#444', lineHeight: 0 }
  const secondario = { background: '#fff', border: '1.5px solid #d8d8e4', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#1a1a2e', textAlign: 'left' }
  const nota2 = { fontSize: 12, color: '#777', lineHeight: 1.5, margin: '4px 0 0' }

  if (!sz.pronte) return <p style={{ fontSize: 13, color: '#888' }}>Carico le sezioni condivise…</p>

  return (
    <div data-sezione-condivisa style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sz.sezioni.length === 0 ? (
        <div style={{ padding: '12px 14px', background: '#f8f9ff', border: '1px solid #e8ecff', borderRadius: 8, fontSize: 13, color: '#444', lineHeight: 1.55 }}>
          <strong>Non c'è ancora nessuna sezione condivisa.</strong><br />
          Per crearne una apri un blocco che vuoi ripetere su più pagine e premi <strong>«Rendi condivisa»</strong>: poi la ritrovi qui, da mettere dove vuoi.
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Quale sezione mostrare qui</label>
          <select data-sezione-scelta value={nota ? id : ''} onChange={e => sz.scegli(block.id, e.target.value)}
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 10px', fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
            <option value="">— scegli una sezione —</option>
            {sz.sezioni.map(s => <option key={s.id} value={s.id}>{s.nome || 'Senza nome'}</option>)}
          </select>
        </div>
      )}

      {nota && (
        <>
          <div data-sezione-avviso style={{ padding: '11px 13px', background: '#fff8e1', border: '1px solid #f0d98a', borderRadius: 8, fontSize: 13, color: '#6b5200', lineHeight: 1.55 }}>
            <strong>Quello che cambi qui cambia in tutte le pagine che usano questa sezione.</strong><br />
            {altre.length
              ? <>Oltre a questa: <strong>{altre.map(u => u.titolo).join(', ')}</strong>.</>
              : 'Per ora la usa solo questa pagina.'}
          </div>

          <Field label="Nome (lo vedi solo tu)" value={sz.nomeDi(block)} onChange={v => sz.cambia(block.id, { _nome: v.slice(0, 120) })} />

          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 500 }}>Cosa c'è dentro</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dentro.map((x, i) => (
                <div key={x.id} data-sezione-blocco={x.type} style={{ background: '#fff', border: '1px solid #e4e4ec', borderRadius: 10, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                    <BlockTypeIcon type={x.type} size={15} />
                    <span onClick={() => setAperto(aperto === x.id ? null : x.id)} style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer' }}>{blockLabel(x.type)}</span>
                    <button type="button" title="Sposta su" disabled={i === 0} onClick={() => sposta(i, -1)} style={{ ...piccolo, opacity: i === 0 ? 0.35 : 1 }}><ChevronUp size={14} strokeWidth={1.5} /></button>
                    <button type="button" title="Sposta giù" disabled={i === dentro.length - 1} onClick={() => sposta(i, 1)} style={{ ...piccolo, opacity: i === dentro.length - 1 ? 0.35 : 1 }}><ChevronDown size={14} strokeWidth={1.5} /></button>
                    {dentro.length > 1 && (
                      <button type="button" title="Togli dalla sezione (sparisce da tutte le pagine)" onClick={() => { if (confirm('Togliere questo blocco dalla sezione? Sparisce da tutte le pagine che la usano.')) cambia(dentro.filter(y => y.id !== x.id)) }} style={{ ...piccolo, color: '#c0392b' }}><Trash2 size={14} strokeWidth={1.5} /></button>
                    )}
                    <button type="button" onClick={() => setAperto(aperto === x.id ? null : x.id)} style={{ ...piccolo, fontSize: 12, lineHeight: 1, fontWeight: 600 }}>{aperto === x.id ? 'Chiudi' : 'Modifica'}</button>
                  </div>
                  {aperto === x.id && (
                    <div style={{ borderTop: '1px solid #f0f0f0', padding: '14px 12px', background: '#fafafa' }}>
                      <BlockEditor block={x} onChange={data => cambia(dentro.map(y => y.id === x.id ? { ...y, data } : y))} entityId={entityId} entityTipo={entityTipo} />
                      <BlockStylePanel block={x} entityId={entityId} entityTipo={entityTipo} onChange={style => cambia(dentro.map(y => y.id === x.id ? { ...y, style } : y))} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {sotto && dentro.length < MAX_BLOCCHI_SEZIONE && (
            <div>
              <button type="button" data-sezione-porta-dentro onClick={() => sz.portaDentro(block.id)} style={secondario}>Porta dentro anche «{blockLabel(sotto.type)}», il blocco qui sotto</button>
              <p style={nota2}>Così i due blocchi viaggiano insieme su ogni pagina.</p>
            </div>
          )}

          <div>
            <button type="button" data-sezione-stacca onClick={() => sz.stacca(block.id)} style={secondario}>Stacca da questa pagina</button>
            <p style={nota2}>Qui resta una copia normale, che puoi cambiare senza toccare le altre pagine. La sezione condivisa continua a esistere.</p>
          </div>
        </>
      )}

      {sz.sezioni.length > 0 && (
        <div style={{ borderTop: '1px solid #ececf2', paddingTop: 12 }}>
          <button type="button" onClick={() => setElenco(a => !a)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: '#5b6af8', fontWeight: 600 }}>
            {elenco ? '▾' : '▸'} Tutte le sezioni condivise di questo sito ({sz.sezioni.length})
          </button>
          {elenco && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {sz.sezioni.map(s => {
                const quante = (s.usata_in || []).length
                const inUso = quante > 0 || sz.usataQui(s.id)
                return (
                  <div key={s.id} data-sezione-riga style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fff', border: '1px solid #e4e4ec', borderRadius: 8, minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{s.nome || 'Senza nome'}</div>
                      <div style={{ fontSize: 11.5, color: '#888' }}>{quante === 0 ? (sz.usataQui(s.id) ? 'usata in questa pagina (da salvare)' : 'non usata in nessuna pagina') : quante === 1 ? `usata in una pagina: ${s.usata_in[0].titolo}` : `usata in ${quante} pagine`}</div>
                    </div>
                    <button type="button" disabled={inUso} title={inUso ? 'Si elimina solo una sezione che nessuna pagina usa: prima staccala' : 'Elimina la sezione'} onClick={() => sz.elimina(s.id)}
                      style={{ ...piccolo, color: inUso ? '#bbb' : '#c0392b', cursor: inUso ? 'default' : 'pointer' }}><Trash2 size={14} strokeWidth={1.5} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, multiline, rows = 3, placeholder, style: extraStyle }) {
  const campo = useRef(null)
  const [comeFare, setComeFare] = useState(false)
  // Nei titoli una parola si può mettere in evidenza: sul sito prende il colore
  // d'accento. È il segno `<mark>` che i titoli accettano da sempre, ma andava
  // scritto a mano: qui si seleziona la parola e si preme.
  const evidenziabile = !multiline && /^titolo/i.test(label || '')
  const testo = typeof value === 'string' ? value : ''
  const giaEvidenziato = /<mark>/i.test(testo)
  function evidenzia() {
    if (giaEvidenziato) { onChange(testo.replace(/<\/?mark>/gi, '')); setComeFare(false); return }
    const el = campo.current
    const a = el?.selectionStart ?? 0, b = el?.selectionEnd ?? 0
    if (!el || b <= a || !testo.slice(a, b).trim()) { setComeFare(true); return }
    onChange(testo.slice(0, a) + '<mark>' + testo.slice(a, b) + '</mark>' + testo.slice(b)); setComeFare(false)
  }
  return (
    <div style={extraStyle}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{label}</label>
          {evidenziabile && testo && (
            <button type="button" data-evidenzia onMouseDown={e => e.preventDefault()} onClick={evidenzia}
              title="Sul sito la parola prende il colore d'accento"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: '#5b6af8', whiteSpace: 'nowrap' }}>
              {giaEvidenziato ? 'Togli l\'evidenza' : 'Evidenzia una parola'}
            </button>
          )}
        </div>
      )}
      {multiline
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={inputStyle()} />
        : <input ref={campo} type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle()} />
      }
      {comeFare && <p data-evidenzia-come style={{ margin: '4px 0 0', fontSize: 11.5, color: '#b45309' }}>Seleziona qui sopra la parola (o le parole) da evidenziare, poi premi di nuovo.</p>}
      {giaEvidenziato && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#999' }}>La parola fra i due segni <code>&lt;mark&gt;</code> sul sito ha il colore d'accento.</p>}
    </div>
  )
}

// ── Tabella ──────────────────────────────────────────────────────────────────
// Una griglia di caselle: la prima riga sono i nomi delle colonne, la prima
// casella di ogni riga è la sua etichetta. Righe e colonne hanno sempre lo
// stesso numero di caselle: lo tiene in ordine `forma`.
const TABELLA_COLONNE = { min: 2, max: 6 }
const TABELLA_RIGHE_MAX = 60
function TabellaEditor({ data, onChange }) {
  const n = Math.min(TABELLA_COLONNE.max, Math.max(TABELLA_COLONNE.min, Array.isArray(data.intestazioni) ? data.intestazioni.length : 0))
  const lungo = (celle, quante) => Array.from({ length: quante }, (_, j) => typeof celle?.[j] === 'string' ? celle[j] : '')
  const teste = lungo(data.intestazioni, n)
  const righe = (Array.isArray(data.items) ? data.items : []).map(r => ({ id: r?.id || uid(), celle: lungo(r?.celle, n) }))
  const evid = Number.isInteger(data.evidenzia) && data.evidenzia >= 1 && data.evidenzia < n ? data.evidenzia : 0
  const salva = cambi => onChange({ ...data, intestazioni: teste, items: righe, evidenzia: evid, ...cambi })

  const scriviTesta = (j, v) => salva({ intestazioni: teste.map((x, k) => k === j ? v : x) })
  const scriviCella = (i, j, v) => salva({ items: righe.map((r, k) => k === i ? { ...r, celle: r.celle.map((x, m) => m === j ? v : x) } : r) })
  const piuColonna = () => salva({ intestazioni: [...teste, ''], items: righe.map(r => ({ ...r, celle: [...r.celle, ''] })) })
  const menoColonna = j => salva({
    intestazioni: teste.filter((_, k) => k !== j), items: righe.map(r => ({ ...r, celle: r.celle.filter((_, k) => k !== j) })),
    evidenzia: evid === j ? 0 : evid > j ? evid - 1 : evid,
  })
  const piuRiga = () => salva({ items: [...righe, { id: uid(), celle: lungo([], n) }] })
  const menoRiga = i => salva({ items: righe.filter((_, k) => k !== i) })
  const sposta = (i, passo) => {
    const j = i + passo; if (j < 0 || j >= righe.length) return
    const nuove = [...righe]; [nuove[i], nuove[j]] = [nuove[j], nuove[i]]; salva({ items: nuove })
  }

  const casella = { width: '100%', minWidth: 0, padding: '7px 8px', border: '1px solid #e0e0e8', borderRadius: 6, fontSize: 12.5, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafafa' }
  const griglia = { display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(92px, 1fr)) 62px`, gap: 5, alignItems: 'center' }
  return (
    <div data-tabella-editor style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="Titolo sezione (opz.)" value={data.titolo} onChange={v => salva({ titolo: v })} />
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: n * 97 + 62 }}>
          <div style={griglia}>
            {teste.map((x, j) => (
              <div key={j} style={{ position: 'relative' }}>
                <input data-tabella-testa={j} type="text" value={x} onChange={e => scriviTesta(j, e.target.value)} placeholder={j ? `Colonna ${j + 1}` : '(vuota)'} style={{ ...casella, fontWeight: 700, background: evid && evid === j ? '#eef0ff' : '#f0f0f4', paddingRight: n > TABELLA_COLONNE.min ? 22 : 8 }} />
                {n > TABELLA_COLONNE.min && <button type="button" title="Togli questa colonna" aria-label={`Togli la colonna ${j + 1}`} onClick={() => menoColonna(j)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 20, border: 'none', background: 'none', cursor: 'pointer', color: '#999', fontSize: 12, padding: 0 }}>✕</button>}
              </div>
            ))}
            <span />
          </div>
          {righe.map((r, i) => (
            <div key={r.id} data-tabella-riga style={griglia}>
              {r.celle.map((x, j) => (
                <input key={j} type="text" value={x} onChange={e => scriviCella(i, j, e.target.value)} placeholder={j ? '' : `Riga ${i + 1}`} style={{ ...casella, fontWeight: j ? 400 : 600 }} />
              ))}
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" title="Sposta su" onClick={() => sposta(i, -1)} disabled={i === 0} style={tinyBtn}>↑</button>
                <button type="button" title="Sposta giù" onClick={() => sposta(i, 1)} disabled={i === righe.length - 1} style={tinyBtn}>↓</button>
                <button type="button" title="Togli questa riga" aria-label={`Togli la riga ${i + 1}`} onClick={() => menoRiga(i)} style={{ ...tinyBtn, color: '#c0392b' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" data-tabella-riga-piu onClick={piuRiga} disabled={righe.length >= TABELLA_RIGHE_MAX} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8', background: '#fafafa', cursor: 'pointer', color: '#555' }}>+ Riga</button>
        <button type="button" data-tabella-colonna-piu onClick={piuColonna} disabled={n >= TABELLA_COLONNE.max} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8', background: '#fafafa', cursor: n >= TABELLA_COLONNE.max ? 'not-allowed' : 'pointer', color: '#555' }}>+ Colonna{n >= TABELLA_COLONNE.max ? ` (massimo ${TABELLA_COLONNE.max})` : ''}</button>
      </div>
      <div>
        <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4, fontWeight: 500 }}>Colonna in risalto</label>
        <select value={evid} onChange={e => salva({ evidenzia: Number(e.target.value) })} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
          <option value={0}>Nessuna</option>
          {teste.slice(1).map((x, k) => <option key={k + 1} value={k + 1}>{x.trim() || `Colonna ${k + 2}`}</option>)}
        </select>
      </div>
      <Field label="Nota sotto la tabella (opz.)" value={data.nota} onChange={v => salva({ nota: v })} />
      <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Scrivi ✓ oppure ✗ da soli in una casella per avere il segno di spunta o la croce. Una riga tutta vuota non compare. Su telefono una tabella larga scorre di lato.</p>
    </div>
  )
}

function UploadBtn({ label, entityId, entityTipo, onUrl }) {
  const inputRef = useRef()
  const [upl, setUpl] = useState(false)
  async function handle(e) {
    const file = e.target.files?.[0]; if (!file) return
    setUpl(true)
    try { onUrl(await caricaImmagine(file, entityTipo, entityId)) } catch {} finally { setUpl(false) }
  }
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle} />
      <button type="button" onClick={() => inputRef.current.click()} disabled={upl}
        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8', background: '#fafafa', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ImageIcon size={13} strokeWidth={1.5} />
        {upl ? 'Caricamento...' : label}
      </button>
    </>
  )
}

function inputStyle() {
  return { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e8', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', background: '#fafafa' }
}
const tinyBtn = { background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 11, color: '#555' }

// Drop indicator
function DropLine() {
  return <div style={{ height: 3, background: '#5b6af8', borderRadius: 2, margin: '3px 0', boxShadow: '0 0 8px rgba(91,106,248,0.5)' }} />
}

// ── Block Picker Modal ────────────────────────────────────────────────────────
function BlockPicker({ onPick, onClose, entityTipo }) {
  const [search, setSearch] = useState('')
  // Il blocco "Menù ristorante" ha senso solo per i ristoranti (pesca entity.menu):
  // nascosto per struttura/attività per non offrire un blocco che resterebbe vuoto.
  const available = BLOCK_TYPES.filter(b => b.type !== 'menu' || entityTipo === 'ristorante')
  const filtered = search
    ? available.filter(b => b.label.toLowerCase().includes(search.toLowerCase()) || b.desc?.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Aggiungi blocco</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1, padding: '2px 6px' }}>✕</button>
          </div>
          <input autoFocus placeholder="Cerca blocco…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 14px', border: '1.5px solid #e0e0e8', borderRadius: 9, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '12px 12px' }}>
          {(filtered ? [{ key: 'results', label: `${filtered.length} risultati` }] : BLOCK_GROUPS).map(group => {
            const blocks = filtered || available.filter(b => b.group === group.key)
            if (!blocks.length) return null
            const color = GROUP_COLORS[group.key] || '#666'
            return (
              <div key={group.key} style={{ marginBottom: 16 }}>
                {!filtered && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>
                    {group.label}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {blocks.map(b => {
                    const Icon = BLOCK_ICON_MAP[b.type] || FileText
                    const bColor = blockColor(b.type)
                    return (
                      <button key={b.type} onClick={() => { onPick(b.type); onClose() }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fff', textAlign: 'left', width: '100%' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f5ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${bColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} strokeWidth={1.5} color={bColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{b.label}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1, lineHeight: 1.3 }}>{b.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
// «Riscrivi i testi con l'AI», in cima alla scheda di una sezione: compare solo
// se la sezione ha testi che l'AI può riscrivere. Cambia le parole e basta:
// foto, link, prezzi e numeri restano quelli che sono.
const MODI_RISCRITTURA = ['Più corto', 'Più caldo', 'Più formale', 'Più semplice', 'Correggi gli errori']
function RiscriviConAI({ block, aperto, stato, onApri, onChiedi }) {
  const [come, setCome] = useState('')
  if (!testiDaRiscrivere(block.type, block.data)) return null
  const lavora = !!stato?.lavora
  const chiedi = testo => { const t = String(testo || '').trim(); if (t.length >= 3 && !lavora) onChiedi(t.slice(0, 300)) }
  if (!aperto) return (
    <button data-riscrivi-apri onClick={() => onApri(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', boxSizing: 'border-box', background: '#f3f4ff', border: '1px solid #dfe2ff', borderRadius: 8, padding: '9px 12px', marginBottom: 14, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#3d4bd6' }}>
      <Sparkles size={15} strokeWidth={1.5} color="#5b6af8" /> Riscrivi i testi con l'AI
    </button>
  )
  return (
    <div data-riscrivi style={{ background: '#f3f4ff', border: '1px solid #dfe2ff', borderRadius: 8, padding: '11px 12px 12px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#3d4bd6' }}>
        <Sparkles size={15} strokeWidth={1.5} color="#5b6af8" /> <span style={{ flex: 1 }}>Riscrivi i testi con l'AI</span>
        <button onClick={() => onApri(false)} title="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b76', fontSize: 14, padding: 2, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ fontSize: 12, color: '#55556a', lineHeight: 1.45, margin: '6px 0 9px' }}>Cambia solo le parole di questa sezione: foto, link, prezzi e numeri restano come sono.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {MODI_RISCRITTURA.map(m => (
          <button key={m} data-riscrivi-modo disabled={lavora} onClick={() => chiedi(m)}
            style={{ background: '#fff', border: '1px solid #cfd3ff', borderRadius: 20, padding: '5px 11px', cursor: lavora ? 'default' : 'pointer', fontSize: 12.5, color: lavora ? '#aaa' : '#1a1a2e' }}>{m}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input data-riscrivi-come value={come} onChange={e => setCome(e.target.value)} maxLength={300} disabled={lavora}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); chiedi(come) } }}
          placeholder="Oppure dimmi come: «parla di più dei bambini»"
          style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1.5px solid #cfd3ff', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', background: '#fff' }} />
        <button data-riscrivi-vai disabled={lavora || come.trim().length < 3} onClick={() => chiedi(come)}
          style={{ background: lavora || come.trim().length < 3 ? '#c9cdf5' : '#5b6af8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 13px', cursor: lavora || come.trim().length < 3 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Riscrivi</button>
      </div>
      {lavora && <div data-riscrivi-lavora style={{ fontSize: 12.5, color: '#3d4bd6', marginTop: 8 }}>Sto riscrivendo…</div>}
      {stato?.errore && <div data-riscrivi-errore style={{ fontSize: 12.5, color: '#b3261e', marginTop: 8, lineHeight: 1.45 }}>{stato.errore}</div>}
      {stato?.fatto && <div data-riscrivi-fatto style={{ fontSize: 12.5, color: '#1a6b34', marginTop: 8, lineHeight: 1.45 }}>{stato.fatto} Se non ti piace, annulla con ↶ (Ctrl+Z).</div>}
    </div>
  )
}

export default function PaginaEditorPage() {
  const { pageId } = useParams()
  const router = useRouter()

  const [page,       setPage]       = useState(null)
  const [blocks,     setBlocks]     = useState([])
  const [past,       setPast]       = useState([])   // undo stack
  const [future,     setFuture]     = useState([])   // redo stack
  const [hasClip,    setHasClip]    = useState(false) // blocco copiato in localStorage
  const [expandedId, setExpandedId] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showPatterns, setShowPatterns] = useState(false)
  const [showSeo,    setShowSeo]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [dirty,      setDirty]      = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [origSlug,   setOrigSlug]   = useState(null)
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(null)
  const [entitySlug, setEntitySlug] = useState(null)
  // Colori e caratteri del sito: la galleria delle sezioni pronte li usa per le anteprime.
  const [temaSito, setTemaSito] = useState(null)
  // «Stile» nell'editor visuale: logo, colori e caratteri del sito, accanto alla pagina.
  const [stileAperto, setStileAperto] = useState(false)
  const [sitePages,  setSitePages]  = useState([])   // pagine sorelle → link interni
  const [copied,     setCopied]     = useState(false)

  // Drag & drop
  const [dragBlockId, setDragBlockId] = useState(null)
  const [dragOverPos, setDragOverPos] = useState(null) // { blockId, position: 'before'|'after' }
  const [showPreview, setShowPreview]   = useState(false)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [previewNonce, setPreviewNonce]  = useState(0)
  const [previewToken, setPreviewToken]  = useState(null)

  // Editor visuale: la pagina vera a tutto schermo, con i blocchi che ci si
  // trascinano dentro. È un altro modo di lavorare sugli STESSI blocchi: stato,
  // annulla/ripeti e salvataggio sono quelli dell'elenco.
  const [visuale,     setVisuale]     = useState(false)
  // Da telefono lo stesso editor visuale, alleggerito: la pagina a tutto
  // schermo, un tocco sceglie la sezione e la sua scheda sale dal basso.
  // Niente trascinamento e niente scrittura sulla pagina.
  const [perTelefono, setPerTelefono] = useState(false)
  const [foglioAlto,  setFoglioAlto]  = useState(false)
  const [cercaBlocco, setCercaBlocco] = useState('')
  const [salvatiVuoti, setSalvatiVuoti] = useState(false)   // sul sito la pagina non ha ancora blocchi
  const [spazio,      setSpazio]      = useState({ w: 1000, h: 700 })
  const centro = useRef(null)
  const largoPagina = previewDevice === 'tablet' ? LARGO_TABLET : LARGO_COMPUTER
  const scala = previewDevice === 'mobile' ? 1 : Math.min(1, Math.max(0.3, (spazio.w - 28) / largoPagina))
  const [inserisciPrima, setInserisciPrima] = useState(undefined)   // undefined = nessun punto scelto · null = in fondo · id = davanti a quel blocco
  const [colonna,     setColonna]     = useState('blocchi')           // blocchi · struttura
  const [schedaTab,   setSchedaTab]   = useState('contenuto')         // contenuto · stile
  const [avviso,      setAvviso]      = useState(null)                // { testo, annulla? }
  const [navSopra,    setNavSopra]    = useState(null)                // { id, dopo } mentre si riordina dalla struttura
  const [ai,          setAi]          = useState(null)                // «Chiedi all'AI»: null · { lavora: true } · { errore }
  // Le sezioni condivise del sito (vedi più sotto «Sezioni condivise»).
  // «Riscrivi i testi con l'AI»: di quale sezione è aperto il riquadro, e a che punto è la richiesta.
  const [riscriviPer, setRiscriviPer] = useState(null)
  const [riscrive,    setRiscrive]    = useState(null)                // null · { id, lavora } · { id, errore } · { id, fatto }
  const [interprete,  setInterprete]  = useState(null)                // «Dimmi cosa cambiare»: null · { lavora } · { errore }
  const [sezioni, setSezioni] = useState([])
  const [sezioniPronte, setSezioniPronte] = useState(false)
  const blocchiDi = b => Array.isArray(b?._blocchi) ? b._blocchi : (sezioni.find(s => s.id === b?.data?.sezione_id)?.blocks || [])
  const nomeDi = b => typeof b?._nome === 'string' ? b._nome : (sezioni.find(s => s.id === b?.data?.sezione_id)?.nome || '')
  const sceltaFoto = useRef(null)
  const fotoAttesa = useRef(null)
  const tAvviso = useRef(null)
  function avvisa(testo, annulla = false) {
    clearTimeout(tAvviso.current)
    setAvviso({ testo, annulla })
    tAvviso.current = setTimeout(() => setAvviso(null), 7000)
  }
  useEffect(() => {
    const el = centro.current
    if (!visuale || !el) return
    const misura = () => setSpazio({ w: el.clientWidth, h: el.clientHeight })
    misura()
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => ro.disconnect()
  }, [visuale, loading])

  useEffect(() => {
    apiFetch(`/api/pagine/${pageId}`).then(data => {
      setPage(data)
      setBlocks(Array.isArray(data.blocks) ? data.blocks : [])
      setSalvatiVuoti(!(Array.isArray(data.blocks) && data.blocks.length))
      setOrigSlug(data.slug)
      setLoading(false)
    }).catch(err => {
      setLoadError(err.message || 'Errore caricamento pagina')
      setLoading(false)
    })
  }, [pageId])

  useEffect(() => {
    if (!page?.entity_id) return
    const ep = page.entity_tipo === 'struttura' ? `/api/properties/${page.entity_id}`
      : page.entity_tipo === 'ristorante' ? `/api/ristoranti/${page.entity_id}`
      : `/api/attivita/${page.entity_id}`
    apiFetch(ep).then(d => { if (d?.slug) setEntitySlug(d.slug); if (d?.theme && typeof d.theme === 'object') setTemaSito(d.theme) })
    apiFetch(`/api/pagine?entity_tipo=${page.entity_tipo}&entity_id=${page.entity_id}`)
      .then(d => Array.isArray(d) && setSitePages(d)).catch(() => {})
    // Permesso di vedere le proprie bozze: l'anteprima si apre in iframe o in
    // scheda nuova, dove il token di sessione non arriverebbe.
    apiFetch(`/api/pagine/preview-token?tipo=${page.entity_tipo}&entityId=${page.entity_id}`)
      .then(d => d?.token && setPreviewToken(d.token)).catch(() => {})
  }, [page?.entity_id])

  const internalLinks = useMemo(
    () => {
      const base = buildInternalLinks({ tipo: page?.entity_tipo, slug: entitySlug, pages: sitePages })
      // Àncore dei blocchi di QUESTA pagina → link interni #ancora (scroll alla sezione).
      // Stessa sanitizzazione del render (applyBlockStyle) così #id combacia.
      const seen = new Set()
      const anchors = []
      for (const b of (page?.blocks || [])) {
        const a = (b.style?.anchor || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
        if (a && !seen.has(a)) { seen.add(a); anchors.push({ icon: '⚓', label: `Sezione: ${a}`, url: `#${a}` }) }
      }
      return [...base, ...anchors]
    },
    [page?.entity_tipo, entitySlug, sitePages, page?.blocks]
  )

  function previewUrl() {
    if (!entitySlug || !page) return null
    const base = page.entity_tipo === 'struttura' ? `/s/${entitySlug}` : page.entity_tipo === 'ristorante' ? `/r/${entitySlug}` : `/a/${entitySlug}`
    if (page.slug === '__home__') return base
    return `${base}/p/${page.slug}`
  }

  async function openPreview() {
    if (dirty) await save()
    const url = previewUrl()
    if (!url) return
    const giaPubblica = page.slug === '__home__' && page.status === 'pubblicata'
    const t = giaPubblica ? null : await tokenAnteprima()
    window.open(url + (t ? `?preview=${t}` : ''), '_blank')
  }

  // Il permesso di anteprima scade: se ne chiede uno fresco al momento di aprirla.
  async function tokenAnteprima() {
    if (!page?.entity_id) return null
    try {
      const d = await apiFetch(`/api/pagine/preview-token?tipo=${page.entity_tipo}&entityId=${page.entity_id}`)
      if (d?.token) { setPreviewToken(d.token); return d.token }
    } catch {}
    return previewToken
  }

  // I blocchi come sono adesso vanno al riquadro dell'anteprima, che li
  // disegna senza aspettare «Salva». Solo alla nostra stessa origine.
  const riquadro = useRef(null)
  const mandaAnteprima = useCallback(() => {
    const percorso = previewUrl(); const finestra = riquadro.current?.contentWindow
    if (!percorso || !finestra) return
    // Di una sezione condivisa la pagina salva solo il riferimento: al riquadro va anche quello che contiene.
    const daDisegnare = blocks.map(b => b.type === TIPO_SEZIONE ? { ...b, _blocchi: blocchiDi(b), _nome: nomeDi(b) } : visuale && testiDaRiscrivere(b.type, b.data) ? { ...b, _riscrivi: true } : b)
    try { finestra.postMessage({ tipo: 'oltrenova:anteprima-blocchi', percorso, blocks: daDisegnare, ...(visuale ? { visuale: true, selezionato: expandedId, scala: perTelefono ? 1 : scala, punto: inserisciPrima === undefined ? null : { prima: inserisciPrima }, ai, ...(perTelefono ? { telefono: true } : {}) } : {}) }, window.location.origin) } catch {}
  }, [blocks, sezioni, entitySlug, page?.slug, page?.entity_tipo, visuale, perTelefono, expandedId, scala, inserisciPrima, ai])
  useEffect(() => {
    if (!visuale && !(showPreview && dirty)) return
    const t = setTimeout(mandaAnteprima, visuale ? 40 : 250)
    return () => clearTimeout(t)
  }, [blocks, showPreview, dirty, visuale, mandaAnteprima])
  // Un errore dell'AI vale per il punto in cui è stata chiesta: scelto un altro punto, non c'è più.
  useEffect(() => { setAi(a => a?.lavora ? a : null) }, [inserisciPrima])
  // La pagina nel riquadro avvisa quando ha finito di caricarsi: da lì in poi ascolta.
  useEffect(() => {
    const pronta = e => { if (e.origin === window.location.origin && e.data?.tipo === 'oltrenova:anteprima-pronta' && (dirty || visuale)) mandaAnteprima() }
    window.addEventListener('message', pronta)
    return () => window.removeEventListener('message', pronta)
  }, [dirty, visuale, mandaAnteprima])

  // Quello che la persona fa DENTRO la pagina dell'editor visuale arriva qui
  // come messaggio. Si ascolta solo il nostro riquadro, e ogni valore si
  // ricontrolla: un id deve essere di un blocco di questa pagina, un tipo deve
  // stare nel catalogo.
  // Per chi finisce un lavoro dopo un'attesa (una foto che si carica): i
  // blocchi come sono in quel momento, non com'erano quando è partito.
  const blocchiVivi = useRef(blocks); blocchiVivi.current = blocks
  const patchVivo = useRef(null); patchVivo.current = patchBlocks
  const dalRiquadro = useRef(null)
  dalRiquadro.current = m => {
    if (!visuale || !m || typeof m !== 'object') return
    const esiste = id => typeof id === 'string' && blocks.some(b => b.id === id)
    if (m.tipo === 'oltrenova:blocco-scelto') { setExpandedId(esiste(m.id) ? m.id : null); setInserisciPrima(undefined) }
    else if (m.tipo === 'oltrenova:tasto') comando(m.quale)
    else if (m.tipo === 'oltrenova:punto-chiuso') setInserisciPrima(undefined)
    else if (m.tipo === 'oltrenova:chiedi-ai') {
      // La pagina manda solo le parole della richiesta: DOVE va la sezione lo sa il pannello.
      const richiesta = typeof m.richiesta === 'string' ? m.richiesta.trim().slice(0, 800) : ''
      if (richiesta.length >= 3 && (inserisciPrima !== undefined || !blocks.length)) chiediAI(richiesta, inserisciPrima ?? null)
    }
    else if (m.tipo === 'oltrenova:aggiungi-qui') {
      // Il «+» fra due sezioni: a sinistra si sceglie cosa mettere in quel punto.
      setInserisciPrima(esiste(m.prima) ? m.prima : null); setExpandedId(null); setColonna('blocchi'); setCercaBlocco('')
    } else if (m.tipo === 'oltrenova:elemento-azione' && esiste(m.id)) {
      // Un elemento di una lista copiato, tolto o spostato dalla pagina.
      const dati = azioneSuElemento(blocks.find(b => b.id === m.id).data, m.lista, m.indice, m.azione, uid)
      if (dati) { if (expandedId !== m.id) setExpandedId(m.id); updateBlock(m.id, dati); if (m.azione === 'elimina') avvisa('Elemento tolto.', true) }
    } else if (m.tipo === 'oltrenova:cambia-foto' && esiste(m.id)) {
      // La pagina dice solo QUALE foto: deve essere un campo immagine che c'è
      // già. La foto nuova la sceglie e la carica il pannello.
      if (!postoPerFoto(blocks.find(b => b.id === m.id).data, m.percorso)) return
      fotoAttesa.current = { id: m.id, percorso: m.percorso }
      sceltaFoto.current?.click()
    }
    else if (m.tipo === 'oltrenova:blocco-rilasciato') {
      const prima = esiste(m.prima) ? m.prima : null
      const [cosa, quale] = String(m.cosa || '').split(':')
      if (cosa === 'nuovo' && tipoAmmesso(quale)) addBlock(quale, prima)
      else if (cosa === 'sposta' && esiste(quale)) moveBlock(quale, prima)
    } else if (m.tipo === 'oltrenova:campo-scritto' && esiste(m.id)) {
      // Un testo scritto direttamente sulla pagina. `scriviCampo` accetta solo
      // un testo al posto di un testo, in un campo fatto di parole.
      const dati = scriviCampo(blocks.find(b => b.id === m.id).data, m.percorso, m.valore)
      if (dati) { if (expandedId !== m.id) setExpandedId(m.id); updateBlock(m.id, dati) }
    } else if (m.tipo === 'oltrenova:paragrafo-scritto' && esiste(m.id)) {
      // Un paragrafo di un testo formattato scritto sulla pagina: `scriviParagrafo`
      // lo ricostruisce pezzo per pezzo e tiene solo grassetto, corsivo, link validi e a-capo.
      const dati = scriviParagrafo(blocks.find(b => b.id === m.id).data, m.percorso, m.contenuto)
      if (dati) { if (expandedId !== m.id) setExpandedId(m.id); updateBlock(m.id, dati) }
    } else if (m.tipo === 'oltrenova:fuori-pagina' && (m.cosa === 'intestazione' || m.cosa === 'piede')) {
      // Intestazione e piede valgono per tutto il sito: si dice dove si cambiano, con la porta per andarci.
      const dove = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }[page.entity_tipo]
      clearTimeout(tAvviso.current)
      setAvviso({ testo: m.cosa === 'intestazione' ? "L'intestazione è la stessa su tutte le pagine: si cambia in «Sito web → Menu, intestazione e piede»." : 'Il piede è lo stesso su tutte le pagine: si cambia in «Sito web → Menu, intestazione e piede».', apri: dove ? `/admin/${dove}/${page.entity_id}/sito?tab=layout` : null })
      tAvviso.current = setTimeout(() => setAvviso(null), 12000)
    } else if (m.tipo === 'oltrenova:blocco-azione' && esiste(m.id)) {
      if (m.azione === 'su') spostaDi(m.id, -1)
      else if (m.azione === 'giu') spostaDi(m.id, 1)
      else if (m.azione === 'duplica') duplicateBlock(m.id)
      else if (m.azione === 'elimina') deleteBlock(m.id)
      else if (m.azione === 'copia') { copyBlock(m.id); avvisa('Sezione copiata: si incolla qui o in un\'altra pagina.') }
      else if (m.azione === 'incolla') pasteBlock(m.id)
      else if (m.azione === 'condividi') rendiCondivisa(m.id)
      else if (m.azione === 'stacca') staccaSezione(m.id)
      else if (m.azione === 'riscrivi') { setExpandedId(m.id); setInserisciPrima(undefined); setSchedaTab('contenuto'); setRiscriviPer(m.id) }
    }
  }
  // «Chiedi all'AI»: la route restituisce uno o più blocchi già ripuliti; qui si
  // ricontrolla il tipo e si mettono nel punto scelto, come una modifica
  // qualunque — si annulla, e sul sito va solo con «Salva».
  async function chiediAI(richiesta, prima) {
    if (ai?.lavora) return
    setAi({ lavora: true })
    try {
      const adesso = blocchiVivi.current
      const i0 = typeof prima === 'string' ? adesso.findIndex(x => x.id === prima) : -1
      const r = await apiFetch(`/api/pagine/${pageId}/ai-blocco`, { method: 'POST', body: JSON.stringify({
        richiesta, sopra: (i0 < 0 ? adesso[adesso.length - 1] : adesso[i0 - 1])?.type || '', sotto: (i0 < 0 ? null : adesso[i0])?.type || '',
      }) })
      const nuovi = (Array.isArray(r?.blocks) ? r.blocks : [])
        .filter(b => b && tipoAmmesso(b.type) && b.type !== TIPO_SEZIONE && b.data && typeof b.data === 'object' && !Array.isArray(b.data)).slice(0, 3)
        .map(b => ({ id: uid(), type: b.type, data: { ...BLOCK_DEFAULTS[b.type], ...b.data }, ...(b.style && typeof b.style.bg === 'string' ? { style: { bg: b.style.bg } } : {}) }))
      if (!nuovi.length) throw new Error('Non sono riuscito a preparare la sezione. Riprova, magari con altre parole.')
      const attuali = blocchiVivi.current
      const i = typeof prima === 'string' ? attuali.findIndex(x => x.id === prima) : -1
      const lista = [...attuali]; lista.splice(i < 0 ? lista.length : i, 0, ...nuovi)
      patchVivo.current(lista)
      setAi(null); setExpandedId(nuovi[0].id); setInserisciPrima(undefined); setSchedaTab('contenuto')
      const note = (Array.isArray(r.note) ? r.note : []).filter(n => typeof n === 'string').slice(0, 3)
      clearTimeout(tAvviso.current)
      setAvviso({ testo: `Ho aggiunto ${nuovi.map(b => `«${blockLabel(b.type)}»`).join(' e ')}. ${note.length ? note.join(' ') : 'Rileggi i testi prima di salvare.'}`, annulla: true })
      tAvviso.current = setTimeout(() => setAvviso(null), note.length ? 20000 : 9000)
    } catch (e) {
      setAi({ errore: e?.message || 'Non sono riuscito a preparare la sezione. Riprova fra poco.' })
    }
  }
  // «Riscrivi i testi con l'AI»: all'AI vanno solo i testi della sezione, e
  // tornano solo testi. Si mettono sulla sezione com'è ADESSO (nel frattempo
  // può essere cambiata), in una modifica sola: un «Annulla» li toglie.
  async function riscriviAI(id, istruzione) {
    if (riscrive?.lavora) return
    const b = blocchiVivi.current.find(x => x.id === id)
    const testi = b && testiDaRiscrivere(b.type, b.data)
    if (!testi) return
    setRiscrive({ id, lavora: true })
    try {
      const r = await apiFetch(`/api/pagine/${pageId}/ai-riscrivi`, { method: 'POST', body: JSON.stringify({ istruzione, type: b.type, data: { ...testi.campi, items: testi.items } }) })
      const ora = blocchiVivi.current.find(x => x.id === id)
      const esito = ora && ora.type === b.type ? conTestiRiscritti(ora.type, ora.data, r?.testi) : null
      if (!esito?.cambiati) throw new Error('Non sono riuscito a riscrivere. Riprova, magari con altre parole.')
      patchVivo.current(blocchiVivi.current.map(x => x.id === id ? { ...x, data: esito.data } : x))
      const note = [...(Array.isArray(r.note) ? r.note : []), ...esito.note].filter((n, i, t) => typeof n === 'string' && t.indexOf(n) === i).slice(0, 3)
      const fatto = `Ho riscritto ${esito.cambiati === 1 ? 'un testo' : `${esito.cambiati} testi`}. ${note.length ? note.join(' ') : 'Rileggili prima di salvare.'}`
      setRiscrive({ id, fatto })
      if (visuale) { clearTimeout(tAvviso.current); setAvviso({ testo: fatto, annulla: true }); tAvviso.current = setTimeout(() => setAvviso(null), note.length ? 20000 : 9000) }
    } catch (e) {
      setRiscrive({ id, errore: e?.message || 'Non sono riuscito a riscrivere. Riprova fra poco.' })
    }
  }
  // «Dimmi cosa cambiare»: la frase va alla route con la pagina com'è ADESSO
  // (anche non salvata); tornano mosse di un catalogo chiuso, che si applicano
  // ai blocchi di quel momento in una modifica sola. Riscrivere e aggiungere
  // chiedono di nuovo l'AI: partono dopo, ognuna col suo «Annulla».
  async function interpreta(frase) {
    if (interprete?.lavora) return false
    setInterprete({ lavora: true })
    try {
      const perAI = blocchiVivi.current.map(b => b.type === TIPO_SEZIONE
        ? { id: b.id, type: b.type, etichetta: 'Sezione condivisa', nome: nomeDi(b) }
        : { id: b.id, type: b.type, etichetta: blockLabel(b.type), data: b.data, ...(b.style?.bg ? { style: { bg: b.style.bg } } : {}) })
      const r = await apiFetch(`/api/pagine/${pageId}/ai-comando`, { method: 'POST', body: JSON.stringify({ frase, blocchi: perAI }) })
      const esito = applicaMosse(blocchiVivi.current, r?.mosse, { nuovoId: uid, etichetta: blockLabel })
      if (esito.cambiato) patchVivo.current(esito.blocchi)
      if (esito.apri) { setExpandedId(esito.apri); setSchedaTab('contenuto'); setInserisciPrima(undefined) }
      setInterprete(null)
      const fatto = esito.fatte.length ? `Fatto: ${esito.fatte.join(', ')}.` : ''
      const testo = [fatto || (typeof r?.risposta === 'string' ? r.risposta : ''),
        esito.saltate ? 'Una parte non l’ho fatta: controlla la pagina e, se manca qualcosa, chiedimela di nuovo.' : '',
        ...(Array.isArray(r?.note) ? r.note.filter(n => typeof n === 'string').slice(0, 2) : [])].filter(Boolean).join(' ')
      if (testo) { clearTimeout(tAvviso.current); setAvviso({ testo, annulla: esito.cambiato }); tAvviso.current = setTimeout(() => setAvviso(null), 12000) }
      for (const m of esito.dopo) {
        if (m.fai === 'riscrivi') await riscriviAI(m.id, m.istruzione)
        else if (m.fai === 'aggiungi') await chiediAI(m.richiesta, m.prima)
      }
      return esito.cambiato || esito.dopo.length > 0 || !!esito.apri
    } catch (e) {
      setInterprete({ errore: e?.message || 'Non sono riuscito a capire. Riprova fra poco.' })
      return false
    }
  }
  // I comandi da tastiera dell'editor visuale: arrivano dal pannello o, come
  // messaggio, dalla pagina nel riquadro. Agiscono sulla sezione scelta.
  function comando(quale) {
    if (!visuale) return
    if (quale === 'salva') { if (dirty && !saving) save() }
    else if (quale === 'annulla') undo()
    else if (quale === 'ripeti') redo()
    else if (quale === 'deseleziona') { setExpandedId(null); setInserisciPrima(undefined) }
    else if (quale === 'incolla') { if (hasClip) pasteBlock(expandedId) }
    else if (!expandedId || !blocks.some(b => b.id === expandedId)) return
    else if (quale === 'duplica') duplicateBlock(expandedId)
    else if (quale === 'elimina') deleteBlock(expandedId)
    else if (quale === 'copia') { copyBlock(expandedId); avvisa('Sezione copiata: si incolla qui o in un\'altra pagina.') }
  }
  // La foto scelta dopo «Cambia foto» sulla pagina.
  async function fotoScelta(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    const dove = fotoAttesa.current; fotoAttesa.current = null
    if (!file || !dove) return
    avvisa('Carico la foto…')
    try {
      const indirizzo = await caricaImmagine(file, page.entity_tipo, page.entity_id)
      const fotoNuova = attuali => {
        const b = attuali.find(x => x.id === dove.id); if (!b) return null
        const dati = scriviImmagine(b.data, dove.percorso, indirizzo, uid)
        return dati ? attuali.map(x => x.id === dove.id ? { ...x, data: dati } : x) : null
      }
      const nb = fotoNuova(blocchiVivi.current)
      if (nb) { patchVivo.current(nb); avvisa('Foto caricata.', true) } else avvisa('La foto non è più lì: riprova dalla scheda.')
    } catch (err) { avvisa(err?.message || 'Caricamento non riuscito: riprova.') }
  }
  useEffect(() => {
    const ascolta = e => {
      if (e.origin !== window.location.origin || !riquadro.current || e.source !== riquadro.current.contentWindow) return
      dalRiquadro.current?.(e.data)
    }
    window.addEventListener('message', ascolta)
    return () => window.removeEventListener('message', ascolta)
  }, [])


  // ── Sezioni condivise ──────────────────────────────────────────────────────
  // Un blocco `sezione` nella pagina è solo un riferimento. Quello che contiene
  // arriva da `sezioni` (com'è salvato) oppure, se lo si è toccato in questa
  // sessione, da `_blocchi` / `_nome` sul blocco stesso: si salva con «Salva».
  function caricaSezioni() {
    if (!page?.entity_id) return Promise.resolve()
    return apiFetch(`/api/sezioni?entity_tipo=${page.entity_tipo}&entity_id=${page.entity_id}`)
      .then(d => { if (Array.isArray(d)) setSezioni(d) }).catch(() => {}).finally(() => setSezioniPronte(true))
  }
  useEffect(() => { caricaSezioni() }, [page?.entity_id])
  // Una copia di un blocco con identificativi nuovi (anche per i suoi elementi).
  function copiaBlocco(src) {
    const data = JSON.parse(JSON.stringify(src.data || {}))
    if (Array.isArray(data.items))  data.items  = data.items.map(it => ({ ...it, id: uid() }))
    if (Array.isArray(data.slides)) data.slides = data.slides.map(s => ({ ...s, id: uid() }))
    return { id: uid(), type: src.type, data, ...(src.style ? { style: JSON.parse(JSON.stringify(src.style)) } : {}) }
  }
  function cambiaSezione(idBlocco, modifica) {
    const sid = blocks.find(b => b.id === idBlocco)?.data?.sezione_id
    if (!sid) return
    // La stessa sezione può stare due volte nella pagina: cambiano insieme.
    patchBlocks(blocks.map(b => b.type === TIPO_SEZIONE && b.data?.sezione_id === sid ? { ...b, ...modifica } : b))
  }
  function scegliSezione(idBlocco, sid) {
    const valida = sezioni.some(s => s.id === sid) ? sid : ''
    patchBlocks(blocks.map(b => b.id === idBlocco ? { id: b.id, type: TIPO_SEZIONE, data: { sezione_id: valida } } : b))
  }
  function staccaSezione(idBlocco) {
    const i = blocks.findIndex(b => b.id === idBlocco)
    if (i < 0 || blocks[i].type !== TIPO_SEZIONE) return
    const copie = blocchiDi(blocks[i]).filter(x => x.type !== TIPO_SEZIONE).map(copiaBlocco)
    if (!copie.length) return
    const nb = [...blocks]; nb.splice(i, 1, ...copie)
    patchBlocks(nb); setExpandedId(copie[0].id)
    avvisa('Staccata: qui ora c\'è una copia normale. Le altre pagine non cambiano.', true)
  }
  async function rendiCondivisa(idBlocco) {
    const b = blocks.find(x => x.id === idBlocco)
    if (!b || b.type === TIPO_SEZIONE) return
    const nome = window.prompt('Che nome dai a questa sezione condivisa?\n(Lo vedi solo tu: serve a ritrovarla quando la metti su un\'altra pagina.)', blockLabel(b.type))
    if (nome === null) return
    try {
      const nuova = await apiFetch('/api/sezioni', { method: 'POST', body: JSON.stringify({ entity_tipo: page.entity_tipo, entity_id: page.entity_id, nome, blocks: [{ id: uid(), type: b.type, data: b.data || {}, ...(b.style ? { style: b.style } : {}) }] }) })
      if (!nuova?.id) throw new Error('Non è stato possibile creare la sezione')
      setSezioni(s => [...s, nuova])
      const attuali = blocchiVivi.current
      // Identificativo nuovo: il blocco cambia tipo, e la sua scheda deve rinascere.
      const idNuovo = uid()
      patchVivo.current(attuali.map(x => x.id === idBlocco ? { id: idNuovo, type: TIPO_SEZIONE, data: { sezione_id: nuova.id } } : x))
      setExpandedId(idNuovo); setSchedaTab('contenuto')
      if (visuale) avvisa('Ora è una sezione condivisa: aggiungila alle altre pagine dal blocco «Sezione condivisa». Ricordati di salvare.')
    } catch (err) { alert(err?.message || 'Non è stato possibile creare la sezione condivisa. Riprova.') }
  }
  function portaDentro(idBlocco) {
    const i = blocks.findIndex(b => b.id === idBlocco)
    const sotto = blocks[i + 1]
    if (i < 0 || !sotto || sotto.type === TIPO_SEZIONE) return
    const sid = blocks[i].data?.sezione_id
    const dentro = [...blocchiDi(blocks[i]), { id: uid(), type: sotto.type, data: sotto.data || {}, ...(sotto.style ? { style: sotto.style } : {}) }]
    patchBlocks(blocks.filter(b => b.id !== sotto.id).map(b => b.type === TIPO_SEZIONE && b.data?.sezione_id === sid ? { ...b, _blocchi: dentro } : b))
  }
  async function eliminaSezione(sid) {
    if (blocks.some(b => idSezione(b) === sid)) return
    if (!confirm('Eliminare questa sezione condivisa? Non è usata in nessuna pagina.')) return
    try { await apiFetch(`/api/sezioni/${sid}`, { method: 'DELETE' }); setSezioni(s => s.filter(x => x.id !== sid)) }
    catch (err) { alert(err?.message || 'Eliminazione non riuscita.'); caricaSezioni() }
  }
  const perLeSezioni = {
    sezioni, pronte: sezioniPronte, paginaId: pageId, blocchiDi, nomeDi,
    cambia: cambiaSezione, scegli: scegliSezione, stacca: staccaSezione, portaDentro, elimina: eliminaSezione,
    usataQui: sid => blocks.some(b => idSezione(b) === sid),
    bloccoSotto: idBlocco => { const s = blocks[blocks.findIndex(b => b.id === idBlocco) + 1]; return s && s.type !== TIPO_SEZIONE ? s : null },
  }
  // Le sezioni toccate in questa sessione: si salvano prima della pagina.
  async function salvaSezioni() {
    const daSalvare = {}
    for (const b of blocks) {
      const sid = idSezione(b); const nota = sid && sezioni.find(s => s.id === sid)
      if (!nota) continue
      const corpo = {}
      if (Array.isArray(b._blocchi) && JSON.stringify(b._blocchi) !== JSON.stringify(nota.blocks)) corpo.blocks = b._blocchi
      if (typeof b._nome === 'string' && b._nome.trim() && b._nome.trim() !== nota.nome) corpo.nome = b._nome.trim()
      if (Object.keys(corpo).length) daSalvare[sid] = corpo
    }
    for (const [sid, corpo] of Object.entries(daSalvare)) {
      const salvata = await apiFetch(`/api/sezioni/${sid}`, { method: 'PATCH', body: JSON.stringify(corpo) })
      if (salvata?.id) setSezioni(s => s.map(x => x.id === sid ? { ...x, ...salvata } : x))
    }
  }

  function copyLink() {
    const url = previewUrl(); if (!url) return
    navigator.clipboard.writeText(window.location.origin + url)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  // Chiudere la scheda o ricaricare con modifiche non salvate: il browser chiede conferma.
  useEffect(() => {
    if (!dirty) return
    const chiede = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', chiede)
    return () => window.removeEventListener('beforeunload', chiede)
  }, [dirty])
  function esci() { if (!dirty || window.confirm('Ci sono modifiche non salvate: uscendo si perdono. Uscire lo stesso?')) router.back() }

  function aggiornaStile() {
    setPreviewNonce(n => n + 1)
    const nome = page.entity_tipo === 'struttura' ? 'properties' : page.entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    apiFetch(`/api/${nome}/${page.entity_id}`).then(d => { if (d?.theme && typeof d.theme === 'object') setTemaSito(d.theme) }).catch(() => {})
  }
  function patchPage(key, val) { setPage(p => ({ ...p, [key]: val })); setDirty(true) }
  function patchBlocks(nb) { nb = allineaSezioni(nb); setPast(p => [...p.slice(-49), blocks]); setFuture([]); setBlocks(nb); setDirty(true) }
  function undo() { if (!past.length) return; setAvviso(null); setFuture(f => [blocks, ...f]); setBlocks(past[past.length - 1]); setPast(p => p.slice(0, -1)); setDirty(true) }
  function redo() { if (!future.length) return; setAvviso(null); setPast(p => [...p, blocks]); setBlocks(future[0]); setFuture(f => f.slice(1)); setDirty(true) }

  // Copia/incolla blocco tra pagine (via localStorage, stesso browser).
  const CLIP_KEY = 'lbr_block_clip'
  useEffect(() => { try { setHasClip(!!localStorage.getItem(CLIP_KEY)) } catch {} }, [])
  function copyBlock(id) {
    const b = blocks.find(x => x.id === id); if (!b) return
    try { localStorage.setItem(CLIP_KEY, JSON.stringify({ type: b.type, data: b.data, style: b.style })); setHasClip(true) } catch {}
  }
  // `dopo` = id del blocco sotto cui incollare (o il punto scelto col «+»); senza, in fondo.
  function pasteBlock(dopo = null) {
    let raw; try { raw = localStorage.getItem(CLIP_KEY) } catch {}
    if (!raw) return
    try {
      const b = JSON.parse(raw)
      if (!tipoAmmesso(b.type)) return
      const data = JSON.parse(JSON.stringify(b.data || {}))
      if (Array.isArray(data.items))  data.items  = data.items.map(it => ({ ...it, id: uid() }))
      if (Array.isArray(data.slides)) data.slides = data.slides.map(s => ({ ...s, id: uid() }))
      const nb = { id: uid(), type: b.type, data, ...(b.style ? { style: b.style } : {}) }
      const lista = [...blocks]
      let i = lista.length
      if (typeof dopo === 'string') { const j = blocks.findIndex(x => x.id === dopo); if (j >= 0) i = j + 1 }
      else if (typeof inserisciPrima === 'string') { const j = blocks.findIndex(x => x.id === inserisciPrima); if (j >= 0) i = j }
      lista.splice(i, 0, nb)
      patchBlocks(lista); setExpandedId(nb.id); setInserisciPrima(undefined)
    } catch {}
  }

  // Undo/redo da tastiera (fuori dai campi di testo, dove vince l'undo nativo).
  // Nell'editor visuale valgono anche salva, duplica, copia, incolla, elimina.
  useEffect(() => {
    const onKey = e => {
      const ctrl = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase()
      const t = e.target
      if (visuale && ctrl && k === 's') { e.preventDefault(); comando('salva'); return }
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (visuale && !ctrl) {
        if (k === 'escape') comando('deseleziona')
        else if (k === 'delete') { e.preventDefault(); comando('elimina') }
        return
      }
      if (!ctrl) return
      if (visuale && k === 'd') { e.preventDefault(); comando('duplica') }
      else if (visuale && k === 'c' && !String(window.getSelection() || '')) comando('copia')
      else if (visuale && k === 'v') comando('incolla')
      else if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Il blocco «Menù ristorante» ha senso solo per i ristoranti (vedi BlockPicker).
  function tipoAmmesso(type) {
    return typeof type === 'string' && BLOCK_TYPES.some(b => b.type === type) && (type !== 'menu' || page?.entity_tipo === 'ristorante')
  }
  // `prima` = id del blocco davanti a cui metterlo; senza, va in fondo.
  function addBlock(type, prima = null) {
    // Nell'editor visuale un blocco nasce già scritto: sulla pagina si vede
    // subito com'è fatto. Dall'elenco nasce vuoto, com'è sempre stato.
    const b = { id: uid(), type, data: visuale ? datiDiNascita(type, BLOCK_DEFAULTS[type], uid) : { ...BLOCK_DEFAULTS[type] } }
    const i = prima ? blocks.findIndex(x => x.id === prima) : -1
    const nb = [...blocks]; nb.splice(i < 0 ? nb.length : i, 0, b)
    patchBlocks(nb)
    setExpandedId(b.id); setInserisciPrima(undefined); setSchedaTab('contenuto')
  }
  function moveBlock(id, prima = null) {
    if (id === prima) return
    const mosso = blocks.find(b => b.id === id); if (!mosso) return
    const nb = blocks.filter(b => b.id !== id)
    const i = prima ? nb.findIndex(x => x.id === prima) : -1
    nb.splice(i < 0 ? nb.length : i, 0, mosso)
    if (nb.every((b, k) => b.id === blocks[k].id)) return
    patchBlocks(nb)
  }
  function spostaDi(id, passo) {
    const i = blocks.findIndex(b => b.id === id), j = i + passo
    if (i < 0 || j < 0 || j >= blocks.length) return
    const nb = [...blocks]; [nb[i], nb[j]] = [nb[j], nb[i]]
    patchBlocks(nb)
  }
  // Una pagina che sul sito non ha ancora blocchi può non avere, nel riquadro,
  // il disegnatore su cui farli cadere (la home mostra la versione di prima):
  // in quel caso il primo blocco si salva prima di entrare.
  async function apriVisuale(daTelefono = false) {
    if (salvatiVuoti && page.slug === '__home__') {
      if (!blocks.length) { alert(`Aggiungi il primo blocco con «Aggiungi blocco», poi apri ${daTelefono ? '«Modifica sulla pagina»' : 'l\'editor visuale'}.`); return }
      await save()
    }
    setShowPreview(false); setExpandedId(null); setCercaBlocco(''); setStileAperto(false); setFoglioAlto(false)
    setPerTelefono(daTelefono); setVisuale(true)
  }
  function chiudiVisuale() {
    setVisuale(false); setPerTelefono(false); setStileAperto(false); setInserisciPrima(undefined); setAvviso(null)
    if (previewDevice === 'tablet') setPreviewDevice('desktop')
  }
  function addPattern(key) {
    const p = BLOCK_PATTERNS.find(x => x.key === key)
    if (!p) return
    // Una sezione pronta porta anche il suo stile; i valori che non dichiara sono quelli di base del blocco.
    const nb = blocchiDiSezione(p, uid).map(b => ({ ...b, data: { ...(BLOCK_DEFAULTS[b.type] || {}), ...b.data } }))
    // Dal «+» dell'editor visuale la sezione pronta va nel punto scelto.
    const i = typeof inserisciPrima === 'string' ? blocks.findIndex(x => x.id === inserisciPrima) : -1
    const lista = [...blocks]; lista.splice(i < 0 ? lista.length : i, 0, ...nb)
    patchBlocks(lista); setInserisciPrima(undefined)
  }
  function updateBlock(id, data) { patchBlocks(blocks.map(b => b.id === id ? { ...b, data } : b)) }
  function updateBlockStyle(id, style) { patchBlocks(blocks.map(b => b.id === id ? { ...b, style } : b)) }
  function deleteBlock(id) {
    // Nell'editor visuale non si chiede conferma: si vede cosa sparisce, e
    // un avviso con «Annulla» resta lì qualche secondo.
    if (!visuale && !confirm('Eliminare questo blocco?')) return
    const tolto = blocks.find(b => b.id === id)
    patchBlocks(blocks.filter(b => b.id !== id))
    if (expandedId === id) setExpandedId(null)
    if (visuale && tolto) avvisa(`Sezione «${blockLabel(tolto.type)}» eliminata.`, true)
  }
  function duplicateBlock(id) {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < 0) return
    const src = blocks[idx]
    const data = JSON.parse(JSON.stringify(src.data || {}))
    if (Array.isArray(data.items))  data.items  = data.items.map(it => ({ ...it, id: uid() }))
    if (Array.isArray(data.slides)) data.slides = data.slides.map(s => ({ ...s, id: uid() }))
    const copy = { id: uid(), type: src.type, data, ...(src.style ? { style: { ...src.style } } : {}) }
    const nb = [...blocks]; nb.splice(idx + 1, 0, copy)
    patchBlocks(nb); setExpandedId(copy.id)
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  function onBlockDragStart(e, blockId) {
    setDragBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    // Use a transparent ghost instead of the default drag image
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:0;left:0'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onBlockDragOver(e, blockId) {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    setDragOverPos(p => (p?.blockId === blockId && p?.position === position) ? p : { blockId, position })
  }

  function onBlockDrop(e, targetId) {
    e.preventDefault()
    if (!dragBlockId || dragBlockId === targetId || !dragOverPos) { resetBlockDrag(); return }
    const arr = [...blocks]
    const fromIdx = arr.findIndex(b => b.id === dragBlockId)
    if (fromIdx === -1) { resetBlockDrag(); return }
    const [moved] = arr.splice(fromIdx, 1)
    const toIdx = arr.findIndex(b => b.id === targetId)
    if (toIdx === -1) { resetBlockDrag(); return }
    arr.splice(dragOverPos.position === 'before' ? toIdx : toIdx + 1, 0, moved)
    patchBlocks(arr)
    resetBlockDrag()
  }

  function resetBlockDrag() { setDragBlockId(null); setDragOverPos(null) }

  // `sopra` = campi della pagina da cambiare insieme al salvataggio (pubblicare,
  // riportare in bozza): un pulsante «Pubblica» che poi chiede un altro clic
  // su «Salva» non ha pubblicato niente.
  async function save(sopra = {}) {
    setSaving(true); setSaveError(null)
    try {
      await salvaSezioni()
      await apiFetch(`/api/pagine/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titolo: page.titolo, slug: page.slug, status: page.status,
          nel_menu: page.nel_menu, seo_title: page.seo_title,
          seo_description: page.seo_description, og_image_url: page.og_image_url,
          hide_header: !!page.hide_header, hide_footer: !!page.hide_footer,
          blocks: soloRiferimenti(blocks), ...sopra,
        }),
      })
      if (Object.keys(sopra).length) setPage(p => ({ ...p, ...sopra }))
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
      setSalvatiVuoti(!blocks.length)
      caricaSezioni()   // in quali pagine è usata ogni sezione, com'è adesso
      // L'editor visuale ha già a schermo quello che si è appena salvato:
      // ricaricarlo farebbe solo perdere il punto in cui si stava lavorando.
      if (!visuale) setPreviewNonce(n => n + 1)   // ricarica l'anteprima in-editor
    } catch (err) {
      setSaveError(err?.message || 'Salvataggio fallito — riprova')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ padding: 40, color: '#888' }}>Caricamento...</p>
  if (loadError) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#c00', marginBottom: 12 }}>Errore: {loadError}</p>
      <button onClick={() => router.back()} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>← Indietro</button>
    </div>
  )

  const entityTipo  = page.entity_tipo
  const entityId    = page.entity_id
  const slugChanged = slugManual && page.slug !== origSlug
  const seoScore    = [page.seo_title, page.seo_description].filter(Boolean).length
  const pUrl        = previewUrl()

  return (
   <LinkContext.Provider value={internalLinks}>
   <SezioniContext.Provider value={perLeSezioni}>
    <div style={{ maxWidth: 780 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={esci} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Indietro
        </button>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a2e' }}>
          {page.titolo || 'Pagina senza titolo'}
        </h1>
        {dirty && <span style={{ fontSize: 11, color: '#856404', background: '#fff3cd', padding: '3px 10px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>Non salvato</span>}
        {saved && <span style={{ fontSize: 11, color: '#155724', background: '#d4edda', padding: '3px 10px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>Salvato ✓</span>}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={undo} disabled={!past.length} title="Annulla (Ctrl+Z)"
            style={{ background: '#f0f0f4', border: 'none', borderRadius: '8px 0 0 8px', padding: '8px 12px', cursor: past.length ? 'pointer' : 'default', fontSize: 15, color: past.length ? '#1a1a2e' : '#bbb' }}>↶</button>
          <button onClick={redo} disabled={!future.length} title="Ripeti (Ctrl+Y)"
            style={{ background: '#f0f0f4', border: 'none', borderRadius: '0 8px 8px 0', padding: '8px 12px', cursor: future.length ? 'pointer' : 'default', fontSize: 15, color: future.length ? '#1a1a2e' : '#bbb' }}>↷</button>
        </div>
        {pUrl && (
          <button onClick={() => apriVisuale()} className="pe-apri-visuale" title="La pagina vera a tutto schermo: trascini i blocchi dentro e clicchi le sezioni per modificarle"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#5b6af8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <Layers size={14} strokeWidth={1.5} color="#fff" /> Editor visuale
          </button>
        )}
        {pUrl && (
          <button onClick={() => apriVisuale(true)} className="pe-apri-telefono" data-apri-telefono title="La pagina com'è sul sito: tocchi una sezione e la modifichi"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#5b6af8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <Smartphone size={14} strokeWidth={1.5} color="#fff" /> Modifica sulla pagina
          </button>
        )}
        {pUrl && (
          <button onClick={() => setShowPreview(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: showPreview ? '#1a1a2e' : '#f0f4ff', color: showPreview ? '#fff' : '#1a1a2e', border: '1.5px solid #c8d4f4', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            👁 Anteprima
          </button>
        )}
        {pUrl && (
          <button onClick={openPreview}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f4ff', color: '#1a1a2e', border: '1.5px solid #c8d4f4', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            {dirty ? '💾 Salva e apri' : '↗ Apri'}
          </button>
        )}
        <button onClick={() => save()} disabled={saving || !dirty}
          style={{ background: dirty ? '#1a1a2e' : '#e0e0e0', color: dirty ? '#fff' : '#999', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: dirty ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
          {saving ? 'Salvando...' : 'Salva'}
        </button>
      </div>

      {/* L'editor visuale chiede spazio: sotto i mille pixel resta l'elenco. */}
      {/* Sotto i mille pixel c'è la versione da telefono, sopra quella da computer: mai tutte e due. */}
      <style>{`@media (max-width: 999px) { .pe-apri-visuale { display: none !important; } }
        @media (min-width: 1000px) { .pe-apri-telefono { display: none !important; } }`}</style>

      {/* ── Da telefono: la pagina in alto, la scheda della sezione toccata che sale dal basso ── */}
      {visuale && perTelefono && pUrl && (() => {
        const scelto = blocks.find(b => b.id === expandedId) || null
        const iScelto = scelto ? blocks.indexOf(scelto) : -1
        const disponibili = BLOCK_TYPES.filter(b => tipoAmmesso(b.type))
        const cerca = cercaBlocco.trim().toLowerCase()
        const trovati = cerca ? disponibili.filter(b => b.label.toLowerCase().includes(cerca) || b.desc?.toLowerCase().includes(cerca)) : disponibili
        const src = `${pUrl}?preview=${previewToken || ''}&visuale=1&_n=${previewNonce}`
        const tondo = { background: '#f0f0f4', border: 'none', borderRadius: 9, minWidth: 38, height: 38, padding: '0 9px', cursor: 'pointer', color: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }
        const linguetta = a => ({ flex: 1, padding: '11px 8px', background: 'none', borderStyle: 'solid', borderWidth: '0 0 2px', borderColor: a ? '#5b6af8' : 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: a ? '#1a1a2e' : '#888' })
        const aggiungi = inserisciPrima !== undefined
        const foglio = scelto || aggiungi || stileAperto
        const testaFoglio = (titolo, chiudi, altro = null) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 8px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <button onClick={chiudi} aria-label="Chiudi" style={{ ...tondo, background: 'none', fontSize: 18, color: '#888' }}>✕</button>
            <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titolo}</div>
            {altro}
          </div>
        )
        return (
          <div data-editor-telefono style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#e9e9ee', display: 'flex', flexDirection: 'column', height: '100dvh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: '#fff', borderBottom: '1px solid #e2e2ea', flexShrink: 0 }}>
              <button onClick={chiudiVisuale} aria-label="Torna all'elenco dei blocchi" title="Torna all'elenco dei blocchi" style={{ ...tondo, background: 'none', fontSize: 18 }}>←</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.titolo || 'Pagina senza titolo'}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: saveError ? '#c00' : dirty ? '#856404' : '#1a7f37', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {saveError ? `⚠ ${saveError}` : dirty ? 'Non salvato' : saved ? 'Salvato ✓' : page.status !== 'pubblicata' ? 'Bozza: non è sul sito' : 'Tutto salvato'}
                </div>
              </div>
              <button onClick={undo} disabled={!past.length} aria-label="Annulla" style={{ ...tondo, color: past.length ? '#1a1a2e' : '#bbb' }}>↶</button>
              <button onClick={redo} disabled={!future.length} aria-label="Ripeti" style={{ ...tondo, color: future.length ? '#1a1a2e' : '#bbb' }}>↷</button>
              <button onClick={() => save()} disabled={saving || !dirty} data-salva style={{ ...tondo, background: dirty ? '#1a1a2e' : '#e0e0e0', color: dirty ? '#fff' : '#999', fontWeight: 700, fontSize: 13.5, padding: '0 12px' }}>{saving ? '…' : 'Salva'}</button>
              {page.status !== 'pubblicata' && <button onClick={() => save({ status: 'pubblicata' })} disabled={saving} data-pubblica title="Salva e mette la pagina online" style={{ ...tondo, background: '#1a7f37', color: '#fff', fontWeight: 700, fontSize: 13.5, padding: '0 11px' }}>Pubblica</button>}
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#fff' }}>
              <iframe ref={riquadro} key={previewNonce} src={src} title="Modifica sulla pagina" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
              {avviso && (
                <div data-avviso style={{ position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, lineHeight: 1.45, background: '#1a1a2e', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{avviso.testo}</span>
                  {avviso.annulla && past.length > 0 && <button onClick={() => { undo(); setAvviso(null) }} style={{ background: 'none', border: 'none', color: '#aab4ff', fontWeight: 700, cursor: 'pointer', fontSize: 13.5, padding: 0 }}>Annulla</button>}
                  {!avviso.annulla && <button onClick={() => setAvviso(null)} aria-label="Chiudi" style={{ background: 'none', border: 'none', color: '#aab4ff', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>}
                </div>
              )}
            </div>

            {foglio ? (
              <div data-foglio style={{ height: foglioAlto ? '82dvh' : '56dvh', flexShrink: 0, background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -8px 30px rgba(0,0,0,0.16)', display: 'flex', flexDirection: 'column', minHeight: 0, transition: 'height .2s' }}>
                <button onClick={() => setFoglioAlto(a => !a)} aria-label={foglioAlto ? 'Abbassa la scheda' : 'Alza la scheda'} data-maniglia
                  style={{ background: 'none', border: 'none', padding: '8px 0 4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ width: 44, height: 5, borderRadius: 3, background: '#d5d5de' }} />
                </button>
                {scelto ? (<>
                  {testaFoglio(blockLabel(scelto.type), () => setExpandedId(null), <>
                    <button onClick={() => spostaDi(scelto.id, -1)} disabled={iScelto === 0} aria-label="Sposta su" style={{ ...tondo, color: iScelto === 0 ? '#ccc' : '#1a1a2e' }}><ChevronUp size={17} strokeWidth={1.5} /></button>
                    <button onClick={() => spostaDi(scelto.id, 1)} disabled={iScelto === blocks.length - 1} aria-label="Sposta giù" style={{ ...tondo, color: iScelto === blocks.length - 1 ? '#ccc' : '#1a1a2e' }}><ChevronDown size={17} strokeWidth={1.5} /></button>
                    <button onClick={() => duplicateBlock(scelto.id)} aria-label="Duplica" style={tondo}><Copy size={15} strokeWidth={1.5} /></button>
                    <button onClick={() => deleteBlock(scelto.id)} aria-label="Elimina" data-elimina style={{ ...tondo, color: '#c0392b' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                  </>)}
                  {scelto.type !== TIPO_SEZIONE && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                      <button onClick={() => setSchedaTab('contenuto')} style={linguetta(schedaTab === 'contenuto')}>Contenuto</button>
                      <button onClick={() => setSchedaTab('stile')} style={linguetta(schedaTab === 'stile')}>Stile</button>
                    </div>
                  )}
                  <div key={scelto.id + schedaTab} data-scheda-blocco style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 40px', background: '#fafafa' }}>
                    {schedaTab === 'contenuto' || scelto.type === TIPO_SEZIONE
                      ? <><RiscriviConAI block={scelto} aperto={riscriviPer === scelto.id} stato={riscrive?.id === scelto.id ? riscrive : null} onApri={si => setRiscriviPer(si ? scelto.id : null)} onChiedi={come => riscriviAI(scelto.id, come)} /><BlockEditor block={scelto} onChange={data => updateBlock(scelto.id, data)} entityId={entityId} entityTipo={entityTipo} /></>
                      : <BlockStylePanel block={scelto} entityId={entityId} entityTipo={entityTipo} onChange={style => updateBlockStyle(scelto.id, style)} />}
                  </div>
                </>) : aggiungi ? (<>
                  {testaFoglio(typeof inserisciPrima === 'string' ? 'Aggiungi nel punto segnato' : 'Aggiungi in fondo alla pagina', () => setInserisciPrima(undefined))}
                  <div data-catalogo style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 40px' }}>
                    <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 10 }}>Tocca un blocco e compare nel punto segnato sulla pagina, già scritto. Oppure chiedilo all'AI da lì.</div>
                    <button onClick={() => setShowPatterns(true)} data-sezioni-pronte style={{ width: '100%', padding: 12, marginBottom: 8, background: '#5b6af8', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Scegli una sezione pronta</button>
                    {hasClip && <button onClick={() => pasteBlock()} style={{ width: '100%', padding: 11, marginBottom: 8, background: '#fff', border: '1.5px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#5b6af8' }}>Incolla il blocco copiato</button>}
                    <input placeholder="Cerca blocco…" value={cercaBlocco} onChange={e => setCercaBlocco(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', margin: '4px 0 10px', border: '1.5px solid #e0e0e8', borderRadius: 9, fontSize: 16, boxSizing: 'border-box', outline: 'none' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                      {trovati.map(b => {
                        const Icon = BLOCK_ICON_MAP[b.type] || FileText
                        const bColor = blockColor(b.type)
                        return (
                          <button key={b.type} data-tessera={b.type} onClick={() => addBlock(b.type, typeof inserisciPrima === 'string' ? inserisciPrima : null)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 9, border: '1px solid #ececf2', background: '#fff', cursor: 'pointer', minWidth: 0, textAlign: 'left' }}>
                            <span style={{ width: 30, height: 30, borderRadius: 7, background: `${bColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={15} strokeWidth={1.5} color={bColor} />
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.25, minWidth: 0, overflowWrap: 'anywhere' }}>{b.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {!trovati.length && <div style={{ fontSize: 13, color: '#999', padding: 12 }}>Nessun blocco con questo nome.</div>}
                  </div>
                </>) : (<>
                  {testaFoglio('Marchio e stile', () => setStileAperto(false))}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 40px' }}>
                    {/* Il tema si salva a ogni scelta, come da computer: la pagina sopra si ricarica con la faccia nuova. */}
                    <MarchioEStile compatto tipo={page.entity_tipo} id={page.entity_id} onCambiato={aggiornaStile} />
                  </div>
                </>)}
              </div>
            ) : (
              <div data-barra-telefono style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #e2e2ea', padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>{blocks.length ? 'Tocca una sezione della pagina per modificarla, oppure dimmi cosa cambiare.' : 'La pagina è vuota: aggiungi la prima sezione.'}</div>
                {blocks.length > 0 && <DimmiCosaCambiare compatto onInvia={interpreta} lavora={!!interprete?.lavora} errore={interprete?.errore} />}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setExpandedId(null); setCercaBlocco(''); setInserisciPrima(null) }} data-aggiungi-sezione
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, background: '#5b6af8', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    <Plus size={16} strokeWidth={2} color="#fff" /> Aggiungi una sezione
                  </button>
                  <button onClick={() => setStileAperto(true)} data-apri-stile title="Logo, colori e caratteri di tutto il sito"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px', background: '#f0f0f4', color: '#1a1a2e', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    <Sparkles size={15} strokeWidth={1.5} /> Stile
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Editor visuale: la pagina vera al centro, i blocchi a sinistra ── */}
      {visuale && !perTelefono && pUrl && (() => {
        const scelto = blocks.find(b => b.id === expandedId) || null
        const disponibili = BLOCK_TYPES.filter(b => tipoAmmesso(b.type))
        const cerca = cercaBlocco.trim().toLowerCase()
        const trovati = cerca ? disponibili.filter(b => b.label.toLowerCase().includes(cerca) || b.desc?.toLowerCase().includes(cerca)) : null
        const src = `${pUrl}?preview=${previewToken || ''}&visuale=1&_n=${previewNonce}`
        const devBtn = a => ({ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: a ? '#1a1a2e' : '#eee', color: a ? '#fff' : '#555' })
        const azBtn = { background: '#f0f0f4', border: 'none', borderRadius: 7, padding: '7px 9px', cursor: 'pointer', color: '#444', lineHeight: 0 }
        const altezza = Math.max(300, spazio.h - 28)
        const linguetta = a => ({ flex: 1, padding: '11px 8px', background: 'none', borderStyle: 'solid', borderWidth: '0 0 2px', borderColor: a ? '#5b6af8' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: a ? '#1a1a2e' : '#888' })
        // Una riga della struttura: funzione chiamata, non componente (un
        // componente definito qui si rimonterebbe a ogni disegno e romperebbe il trascinamento).
        const rigaStruttura = b => {
          const testo = campiDiTesto(b.data)[0]?.valore || ''
          const qui = navSopra?.id === b.id
          return (
            <div key={b.id} data-riga-struttura={b.id}
              onDragOver={e => { if (![...e.dataTransfer.types].includes(TIPO_TRASCINATO)) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const dopo = e.clientY > r.top + r.height / 2; setNavSopra(p => p?.id === b.id && p.dopo === dopo ? p : { id: b.id, dopo }) }}
              onDrop={e => {
                e.preventDefault(); setNavSopra(null)
                const [cosa, quale] = String(e.dataTransfer.getData(TIPO_TRASCINATO) || '').split(':')
                const r = e.currentTarget.getBoundingClientRect(); const dopo = e.clientY > r.top + r.height / 2
                const prima = dopo ? (blocks[blocks.findIndex(x => x.id === b.id) + 1]?.id || null) : b.id
                if (cosa === 'sposta' && blocks.some(x => x.id === quale)) moveBlock(quale, prima)
                else if (cosa === 'nuovo' && tipoAmmesso(quale)) addBlock(quale, prima)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', marginBottom: 4, borderRadius: 9, border: '1px solid #ececf2', background: '#fff', boxShadow: qui ? (navSopra.dopo ? '0 3px 0 #5b6af8' : '0 -3px 0 #5b6af8') : 'none' }}>
              <span draggable title="Trascina per spostare" onDragStart={e => { e.dataTransfer.setData(TIPO_TRASCINATO, 'sposta:' + b.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setNavSopra(null)}
                style={{ cursor: 'grab', color: '#bbb', lineHeight: 0, flexShrink: 0 }}><GripVertical size={15} strokeWidth={1.5} /></span>
              <div onClick={() => { setExpandedId(b.id); setSchedaTab('contenuto') }} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: `${blockColor(b.type)}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BlockTypeIcon type={b.type} size={14} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a2e' }}>{blockLabel(b.type)}</div>
                  {testo && <div style={{ fontSize: 11.5, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{testo}</div>}
                </div>
              </div>
              {(b.style?.hide_mobile || b.style?.hide_desktop) && <span title={b.style.hide_mobile && b.style.hide_desktop ? 'Nascosta ovunque' : b.style.hide_mobile ? 'Nascosta su telefono' : 'Nascosta su computer'} style={{ fontSize: 10.5, color: '#856404', background: '#fff3cd', borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>nascosta</span>}
            </div>
          )
        }
        return (
          <div data-editor-visuale style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#e9e9ee', display: 'flex', flexDirection: 'column' }}>
            {stileAperto && page?.entity_id && (
              <aside data-pannello-stile style={{ position: 'absolute', top: 56, right: 0, bottom: 0, width: 400, maxWidth: '92vw', zIndex: 60, background: '#fff', borderLeft: '1px solid #e4e4ec', boxShadow: '-12px 0 40px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #ececf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 15, color: '#1a1a2e' }}>Marchio e stile</strong>
                  <button onClick={() => setStileAperto(false)} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
                  {/* Il tema si salva da solo: a ogni scelta la pagina accanto si ricarica con la faccia nuova,
                      e le modifiche ai blocchi non ancora salvate le vengono rimandate come sempre. */}
                  <MarchioEStile compatto tipo={page.entity_tipo} id={page.entity_id} onCambiato={aggiornaStile} />
                </div>
              </aside>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#fff', borderBottom: '1px solid #e2e2ea', flexShrink: 0 }}>
              <button onClick={chiudiVisuale} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#666', padding: '6px 4px', flexShrink: 0 }}>← Torna all'elenco dei blocchi</button>
              <strong style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.titolo || 'Pagina senza titolo'}</strong>
              {page.status !== 'pubblicata' && <span style={{ fontSize: 11, color: '#6b5200', background: '#fff8e1', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Bozza</span>}
              {dirty && <span style={{ fontSize: 11, color: '#856404', background: '#fff3cd', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Non salvato</span>}
              {saved && !dirty && <span style={{ fontSize: 11, color: '#155724', background: '#d4edda', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Salvato ✓</span>}
              {saveError && <span style={{ fontSize: 11, color: '#c00', background: '#fce8e8', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>⚠ {saveError}</span>}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={undo} disabled={!past.length} title="Annulla (Ctrl+Z)" style={{ background: '#f0f0f4', border: 'none', borderRadius: '8px 0 0 8px', padding: '7px 11px', cursor: past.length ? 'pointer' : 'default', fontSize: 15, color: past.length ? '#1a1a2e' : '#bbb' }}>↶</button>
                <button onClick={redo} disabled={!future.length} title="Ripeti (Ctrl+Y)" style={{ background: '#f0f0f4', border: 'none', borderRadius: '0 8px 8px 0', padding: '7px 11px', cursor: future.length ? 'pointer' : 'default', fontSize: 15, color: future.length ? '#1a1a2e' : '#bbb' }}>↷</button>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setPreviewDevice('desktop')} style={devBtn(previewDevice === 'desktop')}>Computer</button>
                <button onClick={() => setPreviewDevice('tablet')} style={devBtn(previewDevice === 'tablet')}>Tablet</button>
                <button onClick={() => setPreviewDevice('mobile')} style={devBtn(previewDevice === 'mobile')}>Telefono</button>
              </div>
              <button data-apri-stile onClick={() => setStileAperto(v => !v)} title="Logo, colori e caratteri di tutto il sito" style={{ ...devBtn(stileAperto), display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}><Sparkles size={14} strokeWidth={1.5} /> Stile</button>
              <button onClick={openPreview} title="Apre la pagina in una scheda nuova, com'è sul sito" style={{ background: '#f0f0f4', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#1a1a2e', flexShrink: 0 }}>{dirty ? 'Salva e apri ↗' : 'Apri ↗'}</button>
              <button onClick={() => save()} disabled={saving || !dirty} title="Salva (Ctrl+S)"
                style={{ background: dirty ? '#1a1a2e' : '#e0e0e0', color: dirty ? '#fff' : '#999', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: dirty ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {saving ? 'Salvando...' : 'Salva'}
              </button>
              {page.status !== 'pubblicata' && (
                <button onClick={() => save({ status: 'pubblicata' })} disabled={saving} title="Salva e mette la pagina online"
                  style={{ background: '#1a7f37', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>Pubblica</button>
              )}
            </div>
            <input ref={sceltaFoto} type="file" accept="image/*" data-scelta-foto style={{ display: 'none' }} onChange={fotoScelta} />
            {avviso && (
              <div data-avviso style={{ position: 'absolute', left: '50%', bottom: blocks.length ? 84 : 22, transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 14, maxWidth: 'min(760px, calc(100% - 40px))', lineHeight: 1.45, background: '#1a1a2e', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 13.5, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                {avviso.testo}
                {avviso.apri && <a href={avviso.apri} target="_blank" rel="noopener" style={{ pointerEvents: 'auto', color: '#aab4ff', fontWeight: 700, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>Apri in un'altra scheda ↗</a>}
                {avviso.annulla && past.length > 0 && <button onClick={() => { undo(); setAvviso(null) }} style={{ pointerEvents: 'auto', background: 'none', border: 'none', color: '#aab4ff', fontWeight: 700, cursor: 'pointer', fontSize: 13.5, padding: 0 }}>Annulla</button>}
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              {/* Colonna: i blocchi da trascinare, oppure la scheda della sezione scelta */}
              <div style={{ width: 400, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e2ea', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {scelto ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                      <button onClick={() => setExpandedId(null)} title="Torna ai blocchi" style={{ ...azBtn, fontSize: 13, lineHeight: 1 }}>← Blocchi</button>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${blockColor(scelto.type)}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BlockTypeIcon type={scelto.type} size={15} />
                      </div>
                      <strong style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blockLabel(scelto.type)}</strong>
                      {scelto.type !== TIPO_SEZIONE && <button data-rendi-condivisa onClick={() => rendiCondivisa(scelto.id)} title="Rendi condivisa: la stessa sezione su più pagine, da cambiare in un posto solo" style={azBtn}><Share2 size={14} strokeWidth={1.5} /></button>}
                      <button onClick={() => copyBlock(scelto.id)} title="Copia blocco (incollabile su altre pagine)" style={azBtn}><Clipboard size={14} strokeWidth={1.5} /></button>
                      <button onClick={() => duplicateBlock(scelto.id)} title="Duplica blocco" style={azBtn}><Copy size={14} strokeWidth={1.5} /></button>
                      <button onClick={() => deleteBlock(scelto.id)} title="Elimina blocco" style={{ ...azBtn, color: '#c0392b' }}><Trash2 size={14} strokeWidth={1.5} /></button>
                    </div>
                    {scelto.type !== TIPO_SEZIONE && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                      <button onClick={() => setSchedaTab('contenuto')} style={linguetta(schedaTab === 'contenuto')}>Contenuto</button>
                      <button onClick={() => setSchedaTab('stile')} style={linguetta(schedaTab === 'stile')}>Stile</button>
                    </div>
                    )}
                    <div key={scelto.id + schedaTab} data-scheda-blocco style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px', background: '#fafafa' }}>
                      {schedaTab === 'contenuto' || scelto.type === TIPO_SEZIONE
                        ? <><RiscriviConAI block={scelto} aperto={riscriviPer === scelto.id} stato={riscrive?.id === scelto.id ? riscrive : null} onApri={si => setRiscriviPer(si ? scelto.id : null)} onChiedi={come => riscriviAI(scelto.id, come)} /><BlockEditor block={scelto} onChange={data => updateBlock(scelto.id, data)} entityId={entityId} entityTipo={entityTipo} /></>
                        : <BlockStylePanel block={scelto} entityId={entityId} entityTipo={entityTipo} onChange={style => updateBlockStyle(scelto.id, style)} />}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                      <button onClick={() => setColonna('blocchi')} style={linguetta(colonna === 'blocchi')}>Blocchi</button>
                      <button onClick={() => { setColonna('struttura'); setInserisciPrima(undefined) }} style={linguetta(colonna === 'struttura')}>Struttura della pagina</button>
                    </div>
                    {colonna === 'struttura' ? (
                      <div data-struttura style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 30px' }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setNavSopra(null) }}>
                        <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.5, marginBottom: 10 }}>Le sezioni della pagina, dall'alto in basso. Un clic ne apre una; dalla maniglia si trascinano per cambiarne l'ordine.</div>
                        {!blocks.length && <div style={{ fontSize: 13, color: '#999', padding: 12 }}>La pagina non ha ancora sezioni.</div>}
                        {blocks.map(b => rigaStruttura(b))}
                      </div>
                    ) : (<>
                    <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                      {inserisciPrima !== undefined ? (
                        <div data-inserisci-qui style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#fff', background: '#5b6af8', borderRadius: 8, padding: '9px 12px', marginBottom: 10, lineHeight: 1.4 }}>
                          <span style={{ flex: 1 }}><strong>Scegli cosa mettere {typeof inserisciPrima === 'string' ? `sopra «${blockLabel(blocks.find(b => b.id === inserisciPrima)?.type)}»` : 'in fondo alla pagina'}</strong>: un clic sul blocco e compare lì. Oppure trascinalo nel riquadro sulla pagina, o chiedilo all'AI da lì.</span>
                          <button onClick={() => setInserisciPrima(undefined)} title="Lascia stare" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 15, padding: 2, lineHeight: 1 }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.5, marginBottom: 10 }}>
                          <strong style={{ color: '#1a1a2e' }}>Trascina un blocco nella pagina</strong>, o premi il <strong style={{ color: '#5b6af8' }}>+</strong> fra due sezioni: compare già scritto. <strong style={{ color: '#1a1a2e' }}>Testi e foto si cambiano cliccandoli</strong> sulla pagina; passando su una scheda o una domanda compaiono i comandi per copiarla, toglierla, spostarla. Col tasto destro, il menu della sezione.
                        </div>
                      )}
                      <input placeholder="Cerca blocco…" value={cercaBlocco} onChange={e => setCercaBlocco(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e0e0e8', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 30px' }}>
                      {(trovati ? [{ key: 'results', label: `${trovati.length} risultati` }] : BLOCK_GROUPS).map(group => {
                        const lista = trovati || disponibili.filter(b => b.group === group.key)
                        if (!lista.length) return null
                        return (
                          <div key={group.key} style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 2 }}>{group.label}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                              {lista.map(b => {
                                const Icon = BLOCK_ICON_MAP[b.type] || FileText
                                const bColor = blockColor(b.type)
                                return (
                                  <div key={b.type} data-tessera={b.type} draggable title={(b.desc ? b.desc + ' — ' : '') + 'trascinalo nella pagina, o clicca per metterlo in fondo'}
                                    onDragStart={e => { e.dataTransfer.setData(TIPO_TRASCINATO, 'nuovo:' + b.type); e.dataTransfer.effectAllowed = 'copy' }}
                                    onClick={() => addBlock(b.type, typeof inserisciPrima === 'string' ? inserisciPrima : null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 9, border: '1px solid #ececf2', background: '#fff', cursor: 'grab', userSelect: 'none', minWidth: 0 }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b6af8' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#ececf2' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${bColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Icon size={15} strokeWidth={1.5} color={bColor} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.25, minWidth: 0, overflowWrap: 'anywhere' }}>{b.label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        <button onClick={() => setShowPatterns(true)} style={{ padding: 10, background: '#fff', border: '1.5px dashed #c8d0e8', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#5b6af8' }}>Inserisci una sezione pronta</button>
                        {hasClip && <button onClick={() => pasteBlock()} style={{ padding: 10, background: '#fff', border: '1.5px dashed #c8d0e8', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#5b6af8' }}>Incolla il blocco copiato</button>}
                      </div>
                    </div>
                    </>)}
                  </>
                )}
              </div>

              {/* La pagina */}
              <div ref={centro} style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 14, overflow: 'hidden', position: 'relative' }}>
                {blocks.length > 0 && (
                  <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', width: 'min(620px, calc(100% - 40px))', zIndex: 4 }}>
                    <DimmiCosaCambiare onInvia={interpreta} lavora={!!interprete?.lavora} errore={interprete?.errore} />
                  </div>
                )}
                {previewDevice !== 'mobile' ? (
                  <div style={{ width: Math.round(largoPagina * scala), height: altezza, overflow: 'hidden', background: '#fff', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', flexShrink: 0 }}>
                    <iframe ref={riquadro} key={previewNonce} src={src} title="Editor visuale"
                      style={{ width: largoPagina, height: Math.round(altezza / scala), border: 0, transform: `scale(${scala})`, transformOrigin: 'top left' }} />
                  </div>
                ) : (
                  <div style={{ width: 390, height: Math.min(altezza, 820), border: '8px solid #1a1a2e', borderRadius: 30, overflow: 'hidden', background: '#fff', flexShrink: 0 }}>
                    <iframe ref={riquadro} key={previewNonce} src={src} title="Editor visuale" style={{ width: '100%', height: '100%', border: 0 }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Anteprima live in-editor (drawer) ── */}
      {showPreview && !visuale && pUrl && (() => {
        const src = `${pUrl}?preview=${previewToken || ''}&_n=${previewNonce}`
        const devBtn = a => ({ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: a ? '#1a1a2e' : '#eee', color: a ? '#fff' : '#555' })
        const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888', padding: '4px 6px' }
        return (
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, maxWidth: '46vw', background: '#e9e9ee', borderLeft: '1px solid #d5d5dd', zIndex: 60, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #eee' }}>
              <strong style={{ fontSize: 13, flex: 1, color: '#1a1a2e' }}>Anteprima</strong>
              <button onClick={() => setPreviewDevice('desktop')} style={devBtn(previewDevice === 'desktop')}>Desktop</button>
              <button onClick={() => setPreviewDevice('mobile')} style={devBtn(previewDevice === 'mobile')}>Mobile</button>
              <button onClick={() => setPreviewNonce(n => n + 1)} title="Aggiorna" style={iconBtn}>↻</button>
              <button onClick={() => setShowPreview(false)} title="Chiudi" style={iconBtn}>✕</button>
            </div>
            {dirty && <div style={{ fontSize: 11, color: '#856404', background: '#fff3cd', padding: '6px 12px', textAlign: 'center' }}>Stai vedendo le modifiche ai blocchi non ancora salvate: sul sito arrivano con «Salva».</div>}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: previewDevice === 'mobile' ? 14 : 0 }}>
              {previewDevice === 'desktop' ? (
                <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                  <iframe ref={riquadro} key={previewNonce} src={src} title="Anteprima desktop"
                    style={{ width: 1350, height: '250%', border: 0, transform: 'scale(0.4)', transformOrigin: 'top left' }} />
                </div>
              ) : (
                <div style={{ width: 390, height: '100%', border: '8px solid #1a1a2e', borderRadius: 30, overflow: 'hidden', background: '#fff' }}>
                  <iframe ref={riquadro} key={previewNonce} src={src} title="Anteprima mobile" style={{ width: '100%', height: '100%', border: 0 }} />
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {saveError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fce8e8', color: '#c00', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          ⚠ {saveError}
        </div>
      )}

      {/* ── Metadata ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #e8e8ee', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>Titolo *</label>
            <input value={page.titolo || ''} onChange={e => {
              const t = e.target.value
              patchPage('titolo', t)
              // La home ha slug fisso __home__: modificare il titolo NON deve toccarlo.
              if (!slugManual && page.slug !== '__home__') patchPage('slug', slugify(t))
            }} style={inputStyle()} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>
              Slug URL {page.slug === '__home__'
                ? <span style={{ color: '#888', fontWeight: 400 }}>· la home ha uno slug fisso, non modificabile</span>
                : slugChanged && <span style={{ color: '#856404', fontWeight: 400 }}>⚠ cambiando lo slug si rompono i link esistenti</span>}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={page.slug === '__home__' ? 'home (fisso)' : (page.slug || '')} disabled={page.slug === '__home__'}
                onChange={e => { if (page.slug === '__home__') return; setSlugManual(true); patchPage('slug', slugify(e.target.value)) }}
                style={{ ...inputStyle(), fontFamily: 'monospace', flex: 1, ...(page.slug === '__home__' ? { background: '#f4f4f6', color: '#999', cursor: 'not-allowed' } : {}) }} />
              {pUrl && (
                <button onClick={copyLink} style={{ flexShrink: 0, padding: '9px 10px', border: '1px solid #e0e0e8', borderRadius: 7, background: copied ? '#d4edda' : '#fafafa', cursor: 'pointer', fontSize: 12, color: copied ? '#155724' : '#666' }}>
                  {copied ? '✓' : '📋'}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Lo stato dice cosa comporta, e si cambia con un gesto solo. */}
        {page.status === 'pubblicata' ? (
          <div data-stato-pagina="pubblicata" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#eaf7ee', border: '1px solid #c6e9cf', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <span style={{ flex: '1 1 240px', fontSize: 13, color: '#155724' }}><strong>✓ Pubblicata</strong> — è online{page.nel_menu && page.slug !== '__home__' ? ' e compare nel menu del sito' : ''}.{dirty ? ' Le modifiche di adesso arrivano sul sito con «Salva».' : ''}</span>
            <button type="button" disabled={saving} onClick={() => { if (window.confirm('La pagina sparirà dal sito' + (page.nel_menu ? ' e dal menu' : '') + ' finché non la pubblichi di nuovo. Continuare?')) save({ status: 'bozza' }) }}
              style={{ background: 'none', border: 'none', color: '#555', textDecoration: 'underline', cursor: 'pointer', fontSize: 12.5, padding: 0, flexShrink: 0 }}>Riporta in bozza</button>
          </div>
        ) : (
          <div data-stato-pagina="bozza" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff8e1', border: '1px solid #f3e2a6', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <span style={{ flex: '1 1 240px', fontSize: 13, color: '#6b5200', lineHeight: 1.5 }}><strong>Bozza</strong> — sul sito non si vede{page.nel_menu ? ', e nel menu non compare finché non la pubblichi' : ''}. La vedi solo tu, dall'anteprima.</span>
            <button type="button" disabled={saving} onClick={() => save({ status: 'pubblicata' })}
              style={{ background: '#1a7f37', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>{saving ? 'Pubblico…' : 'Pubblica'}</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={!!page.nel_menu} onChange={e => patchPage('nel_menu', e.target.checked)} />
            Mostra nel menu di navigazione
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }} title="Utile per le landing page (senza distrazioni)">
            <input type="checkbox" checked={!!page.hide_header} onChange={e => patchPage('hide_header', e.target.checked)} />
            Nascondi header
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }} title="Utile per le landing page (senza distrazioni)">
            <input type="checkbox" checked={!!page.hide_footer} onChange={e => patchPage('hide_footer', e.target.checked)} />
            Nascondi footer
          </label>
        </div>
      </div>

      {/* ── Blocks ── */}
      <div style={{ marginBottom: 12 }}>
        {blocks.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: '#fafafa', borderRadius: 12, border: '2px dashed #e0e0e8', marginBottom: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Plus size={22} strokeWidth={1.5} color="#888" />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#888', marginBottom: 6 }}>Nessun blocco</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Usa il pulsante qui sotto per aggiungere il primo blocco</div>
          </div>
        )}

        {blocks.map((block) => {
          // Sotto l'editor visuale l'elenco non apre la scheda: è già aperta lì, e due
          // editor dello stesso blocco accesi insieme sono solo un doppione che lavora.
          const isOpen     = !visuale && expandedId === block.id
          const isDragging = dragBlockId === block.id
          const isBefore   = dragOverPos?.blockId === block.id && dragOverPos.position === 'before'
          const isAfter    = dragOverPos?.blockId === block.id && dragOverPos.position === 'after'
          const bColor     = blockColor(block.type)

          return (
            <div key={block.id} style={{ marginBottom: 6 }}>
              {isBefore && <DropLine />}
              <div
                onDragOver={e => onBlockDragOver(e, block.id)}
                onDrop={e => onBlockDrop(e, block.id)}
                onDragEnter={e => e.preventDefault()}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: (isBefore || isAfter) ? '1.5px solid #5b6af8' : '1px solid #e8e8ee',
                  boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  opacity: isDragging ? 0.3 : 1,
                  transition: 'opacity 0.12s, border-color 0.1s',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', minHeight: 50 }}>

                  {/* ── DRAG HANDLE (unico elemento draggable) ── */}
                  <div
                    draggable={true}
                    onDragStart={e => { e.stopPropagation(); onBlockDragStart(e, block.id) }}
                    onDragEnd={resetBlockDrag}
                    style={{ padding: '14px 6px 14px 12px', cursor: 'grab', userSelect: 'none', flexShrink: 0, color: '#ccc', lineHeight: 0 }}
                    title="Trascina per riordinare"
                  >
                    <GripVertical size={16} strokeWidth={1.5} />
                  </div>

                  {/* Block type icon */}
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: `${bColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10 }}>
                    <BlockTypeIcon type={block.type} size={15} />
                  </div>

                  {/* Label (clickable to expand) */}
                  <span
                    style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#1a1a2e', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpandedId(isOpen ? null : block.id)}
                  >
                    {blockLabel(block.type)}{block.type === TIPO_SEZIONE && nomeDi(block) ? <span style={{ fontWeight: 400, color: '#777' }}> · {nomeDi(block)}</span> : null}
                  </span>

                  {/* Rendi condivisa: la stessa sezione su più pagine */}
                  {block.type !== TIPO_SEZIONE && (
                    <button
                      data-rendi-condivisa
                      onClick={() => rendiCondivisa(block.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#5b6af8' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                      title="Rendi condivisa: la stessa sezione su più pagine, da cambiare in un posto solo"
                    >
                      <Share2 size={14} strokeWidth={1.5} />
                    </button>
                  )}

                  {/* Copia (per incollare su altre pagine) */}
                  <button
                    onClick={() => copyBlock(block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#5b6af8' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                    title="Copia blocco (incollabile su altre pagine)"
                  >
                    <Clipboard size={14} strokeWidth={1.5} />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => duplicateBlock(block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#5b6af8' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                    title="Duplica blocco"
                  >
                    <Copy size={14} strokeWidth={1.5} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteBlock(block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', color: '#ddd', lineHeight: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e03030' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#ddd' }}
                    title="Elimina blocco"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedId(isOpen ? null : block.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', color: '#bbb', lineHeight: 0, flexShrink: 0 }}
                  >
                    {isOpen ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
                  </button>
                </div>

                {/* Expanded editor */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '18px 20px', background: '#fafafa' }}>
                    <RiscriviConAI block={block} aperto={riscriviPer === block.id} stato={riscrive?.id === block.id ? riscrive : null} onApri={si => setRiscriviPer(si ? block.id : null)} onChiedi={come => riscriviAI(block.id, come)} />
                    <BlockEditor block={block} onChange={data => updateBlock(block.id, data)} entityId={entityId} entityTipo={entityTipo} />
                    <BlockStylePanel block={block} entityId={entityId} entityTipo={entityTipo} onChange={style => updateBlockStyle(block.id, style)} />
                  </div>
                )}
              </div>
              {isAfter && <DropLine />}
            </div>
          )
        })}
      </div>

      {/* ── Add block / pattern buttons ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setShowPicker(true)}
          style={{ flex: 1, minWidth: 200, padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={16} strokeWidth={2} />
          Aggiungi blocco
        </button>
        <button onClick={() => setShowPatterns(true)}
          style={{ flex: 1, minWidth: 200, padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Layers size={16} strokeWidth={2} />
          Inserisci sezione pronta
        </button>
        {hasClip && (
          <button onClick={pasteBlock}
            style={{ flex: 1, minWidth: 200, padding: 14, background: '#fff', border: '2px dashed #c8d0e8', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Clipboard size={16} strokeWidth={2} />
            Incolla blocco copiato
          </button>
        )}
      </div>

      {/* ── SEO panel ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8ee', overflow: 'hidden' }}>
        <button onClick={() => setShowSeo(s => !s)}
          style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Impostazioni SEO</span>
            {page.slug !== '__home__' && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: ['#fce8e8','#fff3cd','#d4edda'][seoScore],
                color: ['#c00','#856404','#155724'][seoScore],
              }}>
                {['✗ Non configurato','⚠ Incompleto','✓ Completo'][seoScore]}
              </span>
            )}
          </span>
          {showSeo ? <ChevronUp size={15} strokeWidth={2} color="#aaa" /> : <ChevronDown size={15} strokeWidth={2} color="#aaa" />}
        </button>
        {showSeo && (
          page.slug === '__home__' ? (
            <div style={{ borderTop: '1px solid #f0f0f0', padding: 20, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              La SEO della home (titolo, descrizione, immagine social) si imposta in
              <strong> Sito → SEO &amp; Impostazioni</strong>, così non ci sono doppioni.
              Qui costruisci solo i contenuti a blocchi.
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #f0f0f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Titolo SEO (<title>)" value={page.seo_title} onChange={v => patchPage('seo_title', v)} placeholder={page.titolo} />
              <div>
                <Field label="Meta description (max 160 caratteri)" value={page.seo_description} onChange={v => patchPage('seo_description', v)} multiline rows={2} />
                {page.seo_description && (
                  <div style={{ fontSize: 11, marginTop: 4, color: page.seo_description.length > 160 ? '#c00' : '#999' }}>
                    {page.seo_description.length}/160 caratteri
                  </div>
                )}
              </div>
              <Field label="Immagine Open Graph (URL)" value={page.og_image_url} onChange={v => patchPage('og_image_url', v)} placeholder="https://..." />
              {page.og_image_url && <img src={page.og_image_url} alt="" style={{ maxHeight: 100, borderRadius: 8, objectFit: 'cover' }} />}
            </div>
          )
        )}
      </div>

      {showPicker && <BlockPicker onPick={addBlock} onClose={() => setShowPicker(false)} entityTipo={page?.entity_tipo} />}

      {showPatterns && <GalleriaSezioni tema={temaSito} onScegli={key => { addPattern(key); setShowPatterns(false) }} onChiudi={() => setShowPatterns(false)} />}
    </div>
   </SezioniContext.Provider>
   </LinkContext.Provider>
  )
}

// Il blocco «Offerte»: quali mostrare.
//
// Senza filtro le mostra tutte; con una categoria si possono mettere due
// blocchi diversi sulla stessa pagina — «I nostri corsi» e «Le escursioni» —
// pescando dalla stessa lista.
// Stesso modello di `OfferteBlockEditor`: prima di pubblicare si sa già cosa
// comparirà, e se il blocco resterà invisibile.
function ShopBlockEditor({ data, onChange, entityId, entityTipo }) {
  const [prodotti, setProdotti] = useState([])
  const [incassa, setIncassa] = useState(null)   // null = non ancora saputo
  const [caricato, setCaricato] = useState(false)
  useEffect(() => {
    if (!entityId) return
    const ep = entityTipo === 'struttura' ? `/api/properties/${entityId}`
      : entityTipo === 'ristorante' ? `/api/ristoranti/${entityId}` : `/api/attivita/${entityId}`
    // Lo shop è dell'azienda, non dell'entità: si risale all'azienda e si
    // chiede lo stesso elenco che vedrà il sito, catalogo in vendita compreso.
    apiFetch(ep).then(async ent => {
      if (!ent?.azienda_id) return
      const [lista, stato] = await Promise.all([
        apiFetch(`/api/shop/public/${ent.azienda_id}/prodotti`).catch(() => []),
        apiFetch(`/api/stripe/connect?azienda_id=${ent.azienda_id}`).catch(() => null),
      ])
      setProdotti(Array.isArray(lista) ? lista : [])
      setIncassa(stato ? stato.incassa === true : null)
    }).catch(() => {}).finally(() => setCaricato(true))
  }, [entityId, entityTipo])

  const categorie = [...new Set(prodotti.map(p => (p.categoria || '').trim()).filter(Boolean))]
  const mostrati = data.categoria
    ? prodotti.filter(p => (p.categoria || '').trim().toLowerCase() === data.categoria.toLowerCase())
    : prodotti

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="Titolo sezione" value={data.titolo_sezione || ''} onChange={v => onChange('titolo_sezione', v)}
        placeholder="Il nostro shop" />

      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Quali mostrare</label>
        <select value={data.categoria || ''} onChange={e => onChange('categoria', e.target.value)}
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
          <option value="">Tutti i prodotti in vendita</option>
          {categorie.map(c => <option key={c} value={c}>Solo «{c}»</option>)}
        </select>
      </div>

      <SelettoreFormato
        valore={data.formato || ''} onChange={v => onChange('formato', v)}
        // «Predefinito» è la scheda alta come quelle delle Offerte.
        formati={formatiConPredefinito('3 / 2')}
        titolo="Forma delle foto"
        aiuto="Vale per tutte le schede insieme. Quale parte di ogni foto si vede lo scegli nel prodotto."
      />

      {/* ⚠️ Un blocco che non ha niente da mostrare sparisce dal sito senza dire
          niente: qui si dice prima, mentre si può ancora rimediare. */}
      {caricato && (
        mostrati.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a15c00', background: '#fff8e6', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
            {prodotti.length === 0
              ? <>Non hai prodotti in vendita: questo blocco resterà invisibile. Aggiungili in <strong>Shop</strong>.</>
              : <>Nessun prodotto in questa categoria: il blocco resterà invisibile.</>}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: '#137a4a', background: '#e6f7ee', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
            {mostrati.length === 1 ? 'Comparirà 1 prodotto' : `Compariranno ${mostrati.length} prodotti`}: {mostrati.slice(0, 3).map(p => p.nome).join(', ')}{mostrati.length > 3 ? '…' : ''}
          </p>
        )
      )}
      {/* Senza pagamenti collegati l'ordine arriva lo stesso, ma senza soldi:
          il titolare deve saperlo prima, non dal primo cliente. */}
      {caricato && incassa === false && mostrati.length > 0 && (
        <p style={{ fontSize: 12, color: '#a15c00', background: '#fff8e6', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
          I pagamenti online non sono ancora attivi: gli ordini arriveranno <strong>senza pagamento</strong>, da gestire a mano. Si attivano in <strong>Account → Pagamenti</strong>.
        </p>
      )}
    </div>
  )
}

function OfferteBlockEditor({ data, onChange, entityId, entityTipo }) {
  const [offerte, setOfferte] = useState([])
  const [caricato, setCaricato] = useState(false)
  useEffect(() => {
    if (!entityId) return
    apiFetch(`/api/offerte?entity_id=${entityId}`)
      .then(o => setOfferte(Array.isArray(o) ? o : []))
      .catch(() => {})
      .finally(() => setCaricato(true))
  }, [entityId])

  const pubblicate = offerte.filter(o => o.attiva && o.pubblicata)
  const categorie = [...new Set(pubblicate.map(o => (o.categoria || '').trim()).filter(Boolean))]
  const mostrate = data.categoria
    ? pubblicate.filter(o => (o.categoria || '').trim().toLowerCase() === data.categoria.toLowerCase())
    : pubblicate

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="Titolo sezione" value={data.titolo_sezione || ''} onChange={v => onChange('titolo_sezione', v)}
        placeholder="Le nostre proposte" />

      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Quali mostrare</label>
        <select value={data.categoria || ''} onChange={e => onChange('categoria', e.target.value)}
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
          <option value="">Tutte le offerte pubblicate</option>
          {categorie.map(c => <option key={c} value={c}>Solo «{c}»</option>)}
        </select>
      </div>

      {/* ⚠️ Un blocco che non ha niente da mostrare **sparisce dal sito senza
          dire niente**: qui si dice prima, mentre si può ancora rimediare. */}
      {caricato && (
        mostrate.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a15c00', background: '#fff8e6', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
            {pubblicate.length === 0
              ? <>Non hai offerte pubblicate: questo blocco resterà invisibile. Creale in <strong>Offerte</strong> e ricordati di pubblicarle.</>
              : <>Nessuna offerta in questa categoria: il blocco resterà invisibile.</>}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: '#137a4a', background: '#e6f7ee', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
            {mostrate.length === 1 ? 'Comparirà 1 offerta' : `Compariranno ${mostrate.length} offerte`}: {mostrate.slice(0, 3).map(o => o.titolo).join(', ')}{mostrate.length > 3 ? '…' : ''}
          </p>
        )
      )}
    </div>
  )
}

// Il blocco «Widget prenotazione»: cosa si può prenotare da qui.
//
// Prima non chiedeva niente e mostrava tutte le risorse dell'entità. Se non ce
// n'erano — il caso di ogni cliente nuovo — spariva senza un avviso.
function BookingBlockEditor({ data, onChange, entityId, entityTipo }) {
  const [risorse, setRisorse] = useState([])
  const [caricato, setCaricato] = useState(false)
  useEffect(() => {
    if (!entityId) return
    apiFetch(`/api/booking/risorse?entity_tipo=${entityTipo}&entity_id=${entityId}`)
      .then(r => setRisorse(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setCaricato(true))
  }, [entityId, entityTipo])

  const visibili = risorse.filter(r => r.attiva && r.visibile_minisito)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="Titolo sezione" value={data.titolo_sezione || ''} onChange={v => onChange('titolo_sezione', v)}
        placeholder="Prenota" />

      {caricato && (
        visibili.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a15c00', background: '#fff8e6', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
            Non hai risorse prenotabili visibili sul sito: questo blocco resterà invisibile.
            Creale in <strong>Booking → Risorse</strong> e accendi «Visibile nel sito pubblico».
          </p>
        ) : (
          <p style={{ fontSize: 12, color: '#137a4a', background: '#e6f7ee', padding: '8px 10px', borderRadius: 8, margin: 0 }}>
            Si potranno prenotare: {visibili.map(r => r.nome).join(', ')}
          </p>
        )
      )}
    </div>
  )
}
