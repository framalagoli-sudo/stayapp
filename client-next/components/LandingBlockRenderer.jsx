'use client'
import { useState, useEffect, useRef, cloneElement } from 'react'
import { MapPin, Phone, Mail, Star, Heart, Award, Wifi, Car, Waves, Sparkles, Utensils, Activity, Umbrella, Music, Wine, Coffee, Bell, Bus, Clock, Mountain, Wind, ChevronDown, ChevronLeft, ChevronRight, Calendar, Users, Check, CheckCircle, Gift, Home, Zap, Shield, Leaf, Sun, Briefcase, Wrench, Euro, Handshake, Smile, Target, TrendingUp, Globe, Camera, BookOpen, Layers, Tag } from 'lucide-react'
import { guestFetch } from '@/lib/api'
import BookingWidget from './BookingWidget'
import MenuTab from '@/components/MenuTab'
import Turnstile from '@/components/Turnstile'
import { applyBlockStyle, blockInverted, textSizeScale, textColorFor, gridTemplate, readableOn } from '@/lib/blockTypes'
import { RichText, richIsEmpty } from '@/lib/richText'
import { t as tr } from '@/lib/i18n'
import { getPreset } from '@/lib/vetrinePresets'

// Formatta un numero (separatore migliaia). I campi currency mostrano il simbolo €.
function fmtVetrina(value, type) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  const s = n.toLocaleString('it-IT')
  if (type === 'currency') return `€ ${s}`
  if (type === 'percent') return `${s}%`
  return s
}

// Griglia pubblica di una vetrina: carica gli elementi pubblicati (client-side,
// come i blocchi eventi/news), con filtro per stato e link al dettaglio.
function VetrinaGrid({ block, linkBase, primary, sec, heading }) {
  const d = block.data || {}
  const [data, setData] = useState(null)
  const [stato, setStato] = useState('')
  useEffect(() => {
    if (!d.vetrina_id) return
    guestFetch(`/api/guest/vetrina/${d.vetrina_id}`).then(r => setData(r && !r.error ? r : { elementi: [] })).catch(() => setData({ elementi: [] }))
  }, [d.vetrina_id])

  if (!d.vetrina_id) return null
  const preset = getPreset(data?.preset)
  const valoreField = (preset.campiPubblici || []).find(f => f.key === preset.valorePrimario)
  const cols = Math.min(Math.max(Number(d.colonne) || 3, 1), 4)
  const fetched = data?.elementi || []
  const pool = d.filtro ? fetched.filter(e => e.stato_pubblico === d.filtro) : fetched   // pre-filtro a livello di blocco (es. pagina "Auto nuove")
  const stati = (preset.stati || []).filter(s => pool.some(e => e.stato_pubblico === s.value))
  const elementi = stato ? pool.filter(e => e.stato_pubblico === stato) : pool
  if (data && pool.length === 0) return null

  return (
    <section style={{ padding: '64px 0' }}>
      <div className="lbr-section">
        {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 700, textAlign: 'center', marginBottom: 28, color: '#1a1a2e' }}>{d.titolo}</h2>}
        {d.mostra_filtri !== false && !d.filtro && stati.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
            <button onClick={() => setStato('')} style={filtroBtn(stato === '', primary)}>Tutti</button>
            {stati.map(s => <button key={s.value} onClick={() => setStato(s.value)} style={filtroBtn(stato === s.value, primary)}>{s.label}</button>)}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${cols >= 4 ? 220 : cols === 3 ? 280 : 340}px, 1fr))`, gap: 24 }}>
          {elementi.map(el => {
            const statoLbl = (preset.stati || []).find(s => s.value === el.stato_pubblico)?.label
            const raccolto = Number(el.dati?.raccolto_perc)
            const roi = el.dati?.roi_atteso
            return (
              <a key={el.id} href={`${linkBase}/v/${el.slug}`} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', borderTop: `4px solid ${primary}` }}>
                {el.copertina_url && <img src={el.copertina_url} alt={el.titolo} loading="lazy" style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {statoLbl && <span style={{ alignSelf: 'flex-start', background: `${sec}18`, color: sec, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{statoLbl}</span>}
                  <h3 style={{ fontFamily: heading, fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#1a1a2e' }}>{el.titolo}</h3>
                  {el.dati?.zona && <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{el.dati.zona}</div>}
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline' }}>
                    {el.valore_primario != null && (
                      <div>
                        <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>{valoreField?.label || 'Da'}</div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: '#1a1a2e' }}>{fmtVetrina(el.valore_primario, valoreField?.type || 'currency')}</div>
                      </div>
                    )}
                    {roi != null && roi !== '' && (
                      <div>
                        <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>ROI</div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: primary }}>{fmtVetrina(roi, 'percent')}</div>
                      </div>
                    )}
                  </div>
                  {!Number.isNaN(raccolto) && el.dati?.raccolto_perc !== undefined && el.dati?.raccolto_perc !== '' && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ height: 7, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(Math.max(raccolto, 0), 100)}%`, background: primary }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Raccolto {Math.min(Math.max(raccolto, 0), 100)}%</div>
                    </div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
function filtroBtn(active, primary) {
  return { padding: '7px 16px', borderRadius: 50, border: `1.5px solid ${active ? primary : '#ddd'}`, background: active ? primary : '#fff', color: active ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
}

// Dettaglio pubblico di un elemento di vetrina (renderizzato dentro una pagina
// sintetica via GuestSubPage). Mostra galleria, campi pubblici, stato, CTA lead.
function VetrinaDettaglio({ block, linkBase, primary, sec, heading, entity, entityType, privacyUrl }) {
  const [showForm, setShowForm] = useState(false)
  const d = block.data || {}
  const preset = getPreset(d.preset)
  const cta = preset.cta || {}
  const waNumber = (entity?.whatsapp || entity?.minisito?.social?.whatsapp || '').replace(/\D/g, '')
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Ciao, sono interessato a ${d.titolo || ''} che ho visto sul sito.`)}` : null
  const dati = d.dati || {}
  const immagini = Array.isArray(d.immagini) ? d.immagini : []
  const statoLbl = (preset.stati || []).find(s => s.value === d.stato_pubblico)?.label
  const raccolto = Number(dati.raccolto_perc)
  const campi = (preset.campiPubblici || []).filter(f => f.key !== 'descrizione' && f.key !== 'stato' && dati[f.key] !== undefined && dati[f.key] !== '')
  return (
    <section style={{ padding: '48px 0 72px' }}>
      <div className="lbr-section" style={{ maxWidth: 900, margin: '0 auto' }}>
        {statoLbl && <span style={{ display: 'inline-block', background: `${sec}18`, color: sec, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{statoLbl}</span>}
        <h1 style={{ fontFamily: heading, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: '0 0 24px', color: '#1a1a2e' }}>{d.titolo}</h1>

        {(d.copertina_url || immagini.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 32 }}>
            {[d.copertina_url, ...immagini].filter(Boolean).map((url, i) => (
              <img key={i} src={url} alt={d.titolo} loading={i === 0 ? 'eager' : 'lazy'} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12, gridColumn: i === 0 ? 'span 2' : 'auto' }} />
            ))}
          </div>
        )}

        {campi.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 18, padding: '24px', background: '#f8f9fb', borderRadius: 16, marginBottom: 28 }}>
            {campi.map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>{fmtVetrina(dati[f.key], f.type)}</div>
              </div>
            ))}
          </div>
        )}

        {!Number.isNaN(raccolto) && dati.raccolto_perc !== undefined && dati.raccolto_perc !== '' && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(Math.max(raccolto, 0), 100)}%`, background: primary }} />
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 6, fontWeight: 600 }}>Raccolto {Math.min(Math.max(raccolto, 0), 100)}%</div>
          </div>
        )}

        {dati.descrizione && <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', whiteSpace: 'pre-line', marginBottom: 32 }}>{dati.descrizione}</p>}

        {/* CTA lead → CRM (contatti) via /api/guest/contact, + WhatsApp diretto */}
        <div id="partecipa" style={{ padding: '32px', background: '#1a1a2e', borderRadius: 16 }}>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: heading, textAlign: 'center' }}>Ti interessa?</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>{cta.desc || 'Lascia i tuoi dati: ti ricontattiamo al più presto.'}</div>
          {showForm
            ? <VetrinaLeadForm entity={entity} entityType={entityType} projectTitle={d.titolo} primary={primary} privacyUrl={privacyUrl} successText={cta.success} />
            : <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setShowForm(true)} style={{ padding: '14px 34px', background: primary, color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>{cta.text || 'Richiedi informazioni'}</button>
                {waHref && <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#25D366', color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>💬 WhatsApp</a>}
              </div>}
        </div>
      </div>
    </section>
  )
}

const HIGHLIGHT_LUCIDE = {
  star: Star, heart: Heart, award: Award, wifi: Wifi, parking: Car,
  pool: Waves, spa: Sparkles, restaurant: Utensils, gym: Activity,
  beach: Umbrella, mountain: Mountain, breakfast: Coffee, bar: Wine,
  shuttle: Bus, reception: Bell, ac: Wind, location: MapPin, time: Clock, music: Music,
  // chiavi usate da template/sezioni pronte (prima cadevano sul fallback Star)
  'check-circle': CheckCircle, check: Check, clock: Clock, phone: Phone,
  calendar: Calendar, coffee: Coffee, users: Users, gift: Gift,
  // set completo icone ammesse dall'AI builder (niente più fallback a stella)
  home: Home, mail: Mail, zap: Zap, shield: Shield, 'map-pin': MapPin, utensils: Utensils,
  sparkles: Sparkles, leaf: Leaf, sun: Sun, briefcase: Briefcase, wrench: Wrench, euro: Euro,
  handshake: Handshake, smile: Smile, target: Target, 'trending-up': TrendingUp, globe: Globe,
  camera: Camera, activity: Activity, book: BookOpen, layers: Layers, tag: Tag,
}
function highlightIcon(key) { return HIGHLIGHT_LUCIDE[key] || Star }

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', twitter: 'X', x: 'X', whatsapp: 'WhatsApp', tripadvisor: 'TripAdvisor', tiktok: 'TikTok' }

const SERVICE_ICONS = {
  pool: Waves, spa: Sparkles, restaurant: Utensils, gym: Activity,
  parking: Car, wifi: Wifi, beach: Umbrella, bar: Wine,
  breakfast: Coffee, reception: Bell, shuttle: Bus, ac: Wind,
  location: MapPin, time: Clock, music: Music, award: Award,
}
function serviceIcon(key) { return SERVICE_ICONS[key] || Star }

function getEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`
  return null
}

const API_BASE_FB = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()

// Hero a tutto schermo con più slide a scorrimento (crossfade), frecce, puntini,
// swipe su mobile e autoplay con pausa al passaggio del mouse. Componente a sé
// (usa hook) renderizzato dal case 'hero_slider'.
function HeroSlider({ block, primary, heading }) {
  const d = block.data || {}
  const slides = (d.slides || []).filter(s => s.image_url || s.title || s.subtitle)
  const n = slides.length
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)

  const heightMap = { full: '100vh', large: '85vh', medium: '65vh' }
  const h = heightMap[d.height || 'full'] || '100vh'
  const align = d.text_align === 'left' ? 'left' : 'center'
  const overlay = d.overlay_opacity ?? 0.45
  const autoplay = d.autoplay !== false && n > 1
  const interval = Math.max(2, d.interval || 6) * 1000

  useEffect(() => {
    if (i >= n && n > 0) setI(0)
  }, [n, i])
  useEffect(() => {
    if (!autoplay || paused || n < 2) return
    const t = setTimeout(() => setI(p => (p + 1) % n), interval)
    return () => clearTimeout(t)
  }, [autoplay, paused, i, n, interval])

  if (n === 0) return null
  const go = idx => setI((idx % n + n) % n)
  const onTouchStart = e => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = e => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1))
    touchX.current = null
  }

  const arrowStyle = side => ({
    position: 'absolute', top: '50%', [side]: 'clamp(8px,2vw,24px)', transform: 'translateY(-50%)',
    zIndex: 4, width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.5)',
    background: 'rgba(0,0,0,0.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', backdropFilter: 'blur(4px)',
  })

  return (
    <section style={{ position: 'relative', height: h, minHeight: 440, overflow: 'hidden', background: '#1a1a2e' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {slides.map((s, idx) => (
        <div key={s.id || idx} aria-hidden={idx !== i}
          style={{ position: 'absolute', inset: 0, opacity: idx === i ? 1 : 0, transition: 'opacity 0.9s ease', pointerEvents: idx === i ? 'auto' : 'none' }}>
          {s.image_url && <img src={s.image_url} alt={s.title || ''} loading={idx === 0 ? 'eager' : 'lazy'}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,${overlay * 0.6}), rgba(0,0,0,${overlay}))` }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center' }}>
            <div style={{ textAlign: align, padding: '90px clamp(24px,6vw,90px)', maxWidth: align === 'left' ? 780 : 920, width: '100%' }}>
              {s.title && <h1 style={{ fontFamily: heading, fontSize: 'clamp(34px,6vw,72px)', fontWeight: 700, color: '#fff', lineHeight: 1.08, margin: 0, textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>{s.title}</h1>}
              {s.subtitle && <p style={{ fontFamily: heading, fontStyle: 'italic', fontSize: 'clamp(18px,2.6vw,28px)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.4, margin: '18px 0 0', maxWidth: align === 'left' ? 620 : 760, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0, textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}>{s.subtitle}</p>}
              {((s.cta1_text && s.cta1_url) || (s.cta2_text && s.cta2_url)) && (
                <div style={{ display: 'flex', gap: 14, marginTop: 34, flexWrap: 'wrap', justifyContent: align === 'left' ? 'flex-start' : 'center' }}>
                  {s.cta1_text && s.cta1_url && (
                    <a href={siteHref(s.cta1_url)} style={{ display: 'inline-block', padding: '15px 34px', background: primary, color: readableOn('#ffffff', primary, '#1a1a2e'), borderRadius: 50, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }}>{s.cta1_text}</a>
                  )}
                  {s.cta2_text && s.cta2_url && (
                    <a href={siteHref(s.cta2_url)} style={{ display: 'inline-block', padding: '15px 34px', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 50, fontWeight: 600, fontSize: 16, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)' }}>{s.cta2_text}</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {n > 1 && (
        <>
          <button aria-label="Precedente" onClick={() => go(i - 1)} style={arrowStyle('left')}><ChevronLeft size={22} strokeWidth={1.5} /></button>
          <button aria-label="Successiva" onClick={() => go(i + 1)} style={arrowStyle('right')}><ChevronRight size={22} strokeWidth={1.5} /></button>
          <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, zIndex: 4, display: 'flex', gap: 9, justifyContent: 'center' }}>
            {slides.map((_, idx) => (
              <button key={idx} aria-label={`Slide ${idx + 1}`} onClick={() => go(idx)}
                style={{ width: idx === i ? 26 : 9, height: 9, borderRadius: 50, border: 'none', cursor: 'pointer', padding: 0, background: idx === i ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'width 0.3s, background 0.3s' }} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// Carosello scorrevole di card (immagine + titolo + testo + pulsante). Più card
// visibili per volta (responsive: 1 su mobile), frecce, puntini, swipe, autoplay.
function Carousel({ block, primary, heading }) {
  const d = block.data || {}
  const items = (d.items || []).filter(it => it.image_url || it.title || it.text)
  const cfgPv = Math.min(Math.max(parseInt(d.per_view) || 3, 1), 4)
  const [pv, setPv] = useState(1)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth
      setPv(w < 640 ? 1 : w < 960 ? Math.min(2, cfgPv) : cfgPv)
    }
    calc(); window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [cfgPv])

  const maxI = Math.max(0, items.length - pv)
  useEffect(() => { if (i > maxI) setI(maxI) }, [maxI, i])
  const autoplay = d.autoplay !== false && items.length > pv
  const interval = Math.max(2, d.interval || 5) * 1000
  useEffect(() => {
    if (!autoplay || paused) return
    const t = setTimeout(() => setI(p => (p >= maxI ? 0 : p + 1)), interval)
    return () => clearTimeout(t)
  }, [autoplay, paused, i, maxI, interval])

  if (!items.length) return null
  const go = idx => setI(Math.max(0, Math.min(idx, maxI)))
  const onTouchStart = e => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = e => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1)); touchX.current = null }
  const showArrows = d.show_arrows !== false && items.length > pv
  const showDots = d.show_dots !== false && maxI > 0
  const arrow = (side, disabled) => ({
    position: 'absolute', top: '50%', [side]: -8, transform: 'translateY(-50%)', zIndex: 3,
    width: 44, height: 44, borderRadius: '50%', border: '1px solid #e5e5ea', background: '#fff', color: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.12)', opacity: disabled ? 0.35 : 1,
  })

  return (
    <section style={{ padding: '72px 0', background: '#fff' }}>
      <div className="lbr-section">
        {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 44 }}>{d.titolo}</h2>}
        <div style={{ position: 'relative' }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', transform: `translateX(-${i * (100 / pv)}%)`, transition: 'transform 0.5s ease' }}>
              {items.map(it => (
                <div key={it.id} style={{ flex: `0 0 ${100 / pv}%`, padding: '0 10px', boxSizing: 'border-box' }}>
                  <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 16, overflow: 'hidden', height: '100%' }}>
                    {it.image_url && <img src={it.image_url} alt={it.title || ''} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />}
                    {(it.title || it.text || (it.button_label && it.button_url)) && (
                      <div style={{ padding: 22 }}>
                        {it.title && <h3 style={{ fontFamily: heading, fontSize: 19, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>{it.title}</h3>}
                        {it.text && <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: 0 }}>{it.text}</p>}
                        {it.button_label && it.button_url && <a href={siteHref(it.button_url)} style={{ display: 'inline-block', marginTop: 14, color: primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>{it.button_label} →</a>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showArrows && (
            <>
              <button onClick={() => go(i - 1)} disabled={i <= 0} aria-label="Precedente" style={arrow('left', i <= 0)}><ChevronLeft size={22} strokeWidth={1.5} /></button>
              <button onClick={() => go(i + 1)} disabled={i >= maxI} aria-label="Successiva" style={arrow('right', i >= maxI)}><ChevronRight size={22} strokeWidth={1.5} /></button>
            </>
          )}
        </div>
        {showDots && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 26 }}>
            {Array.from({ length: maxI + 1 }).map((_, idx) => (
              <button key={idx} onClick={() => go(idx)} aria-label={`Vai a ${idx + 1}`}
                style={{ width: idx === i ? 24 : 8, height: 8, borderRadius: 50, border: 'none', cursor: 'pointer', padding: 0, background: idx === i ? primary : '#d5d5dd', transition: 'width 0.3s, background 0.3s' }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// Numero animato 0→valore quando entra in viewport. SSR-safe: parte dal valore
// reale, anima solo lato client; a fine animazione ripristina la stringa esatta.
function CountUp({ value, style }) {
  const ref = useRef(null)
  const [disp, setDisp] = useState(value)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const m = String(value).trim().match(/^(\D*?)([\d.,]+)(\D*)$/)
    if (!m) { setDisp(value); return }
    const [, prefix, core, suffix] = m
    let target, decimals = 0, decSep = '.', thousands = false
    if (/^\d{1,3}([.,]\d{3})+$/.test(core)) { thousands = true; target = parseInt(core.replace(/[.,]/g, ''), 10) }
    else if (/^\d+[.,]\d+$/.test(core)) { decSep = core.includes(',') ? ',' : '.'; decimals = core.split(/[.,]/)[1].length; target = parseFloat(core.replace(',', '.')) }
    else { target = parseInt(core.replace(/\D/g, ''), 10) }
    if (!isFinite(target)) { setDisp(value); return }
    const fmt = n => {
      const body = decimals ? n.toFixed(decimals).replace('.', decSep) : thousands ? Math.round(n).toLocaleString('it-IT') : String(Math.round(n))
      return prefix + body + suffix
    }
    let raf, io, done = false
    setDisp(fmt(0))
    const run = () => {
      const dur = 1200, t0 = performance.now()
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3)
        if (p < 1) { setDisp(fmt(target * e)); raf = requestAnimationFrame(step) } else setDisp(value)
      }
      raf = requestAnimationFrame(step)
    }
    if (!('IntersectionObserver' in window)) { setDisp(value); return }
    io = new IntersectionObserver(ents => { if (ents[0].isIntersecting && !done) { done = true; run(); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el)
    return () => { if (io) io.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [value])
  return <div ref={ref} style={style}>{disp}</div>
}

// Confronto prima/dopo con maniglia trascinabile (clip-path).
function BeforeAfter({ block, primary }) {
  const d = block.data || {}
  const [pos, setPos] = useState(50)
  const ref = useRef(null)
  if (!d.before_url || !d.after_url) return null
  const move = x => { const r = ref.current?.getBoundingClientRect(); if (r) setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100))) }
  return (
    <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
      <div className="lbr-section">
        <div ref={ref} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: 16, userSelect: 'none', touchAction: 'none', cursor: 'ew-resize' }}
          onMouseDown={e => move(e.clientX)} onMouseMove={e => e.buttons === 1 && move(e.clientX)}
          onTouchStart={e => move(e.touches[0].clientX)} onTouchMove={e => move(e.touches[0].clientX)}>
          <img src={d.after_url} alt={d.after_label || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <img src={d.before_url} alt={d.before_label || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
          {d.before_label && <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>{d.before_label}</span>}
          {d.after_label && <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>{d.after_label}</span>}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2, background: '#fff', transform: 'translateX(-1px)', boxShadow: '0 0 8px rgba(0,0,0,0.4)' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 38, height: 38, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: primary }}>
              <ChevronLeft size={14} strokeWidth={2} style={{ marginRight: -4 }} /><ChevronRight size={14} strokeWidth={2} style={{ marginLeft: -4 }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Conto alla rovescia. Gate su mount per evitare mismatch di idratazione (ora server≠client).
function Countdown({ block, primary, heading }) {
  const d = block.data || {}
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(0)
  useEffect(() => {
    setMounted(true); setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!d.target) return null
  const diff = new Date(d.target).getTime() - now
  const done = mounted && diff <= 0
  const s = Math.max(0, Math.floor(diff / 1000))
  const dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60
  const cell = (n, l) => (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontFamily: heading, fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, color: primary, lineHeight: 1 }}>{mounted ? String(n).padStart(2, '0') : '—'}</div>
      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>{l}</div>
    </div>
  )
  return (
    <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
      <div className="lbr-section" style={{ textAlign: 'center' }}>
        {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, color: '#1a1a2e', marginBottom: d.sottotitolo ? 8 : 32 }}>{d.titolo}</h2>}
        {d.sottotitolo && <p style={{ color: '#888', marginBottom: 32, fontSize: 15 }}>{d.sottotitolo}</p>}
        {done
          ? <p style={{ fontSize: 20, fontWeight: 700, color: primary }}>È arrivato il momento!</p>
          : <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>{cell(dd, 'giorni')}{cell(hh, 'ore')}{cell(mm, 'min')}{cell(ss, 'sec')}</div>}
      </div>
    </section>
  )
}

// Form lead del dettaglio vetrina → CRM contatti via /api/guest/contact
// (stesso percorso dei contatti del sito: upsert in `contatti`, tag 'vetrina',
// notifica al titolare, automazione nuovo_contatto). Il progetto finisce nella nota.
function VetrinaLeadForm({ entity, entityType, projectTitle, primary, privacyUrl, successText }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [state, setState] = useState('idle')
  const [turnstileToken, setTurnstileToken] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!privacy) return
    setState('loading')
    const message = `[Interesse progetto: ${projectTitle || ''}]${messaggio.trim() ? `\n${messaggio.trim()}` : ''}`
    try {
      const r = await guestFetch('/api/guest/contact', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityType, entity_id: entity?.id, source: 'vetrina', source_name: projectTitle, name: nome, email, message, turnstileToken }),
      })
      if (r?.error) throw new Error(r.error)
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') return <p style={{ color: '#7ee787', fontWeight: 600, textAlign: 'center', margin: 0 }}>{successText || 'Richiesta inviata ✓ Ti ricontattiamo a breve.'}</p>

  const inp = { width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460, margin: '0 auto' }}>
      <input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome e cognome" style={inp} />
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inp} />
      <textarea value={messaggio} onChange={e => setMessaggio(e.target.value)} placeholder="Messaggio (opzionale)" rows={2} style={{ ...inp, resize: 'vertical' }} />
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>Acconsento al trattamento dei dati secondo la <a href={privacyUrl} style={{ color: primary }}>privacy policy</a></span>
      </label>
      <Turnstile onToken={setTurnstileToken} />
      <button type="submit" disabled={!privacy || state === 'loading'}
        style={{ padding: '13px', borderRadius: 50, background: privacy ? primary : '#555', color: '#fff', border: 'none', cursor: privacy ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 15 }}>
        {state === 'loading' ? 'Invio...' : 'Invia richiesta'}
      </button>
      {state === 'error' && <p style={{ color: '#ff9b9b', fontSize: 13, textAlign: 'center', margin: 0 }}>Errore nell'invio. Riprova.</p>}
    </form>
  )
}

export default function LandingBlockRenderer({ blocks, entity, entityType, mini, primary, secondary, heading, body, slug, privacyUrl, aziendaId, lang = 'it', base }) {
  const [faqOpen, setFaqOpen] = useState({})
  const [eventi, setEventi] = useState([])
  const [articoli, setArticoli] = useState([])

  const sec = secondary || primary   // colore accento; default = primario
  const sections = mini.sections || {}
  const animRef = useRef(null)

  // Reveal soft allo scroll. SSR-safe: la classe .lbr-anim (che nasconde) la aggiunge
  // il JS → senza JS tutto resta visibile. I blocchi già a schermo si mostrano subito
  // (niente flash); gli altri sfumano quando entrano in viewport.
  useEffect(() => {
    const root = animRef.current
    if (!root) return
    root.classList.add('lbr-anim')
    const els = [...root.querySelectorAll('.lbr-reveal')]
    const vh = window.innerHeight || 800
    els.forEach(e => { if (e.getBoundingClientRect().top < vh * 0.9) e.classList.add('in') })
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })
    els.forEach(e => { if (!e.classList.contains('in')) io.observe(e) })
    return () => io.disconnect()
  }, [blocks])
  // Base dei link interni, lingua/dominio-aware (dal chiamante via entityBasePath).
  // Fallback all'URL canonico se non fornita (es. anteprima template in admin).
  const linkBase = base != null ? base : (entityType === 'struttura' ? `/s/${slug}` : entityType === 'ristorante' ? `/r/${slug}` : `/a/${slug}`)
  const homeUrl = linkBase || '/'
  // Riscrive un URL salvato in un blocco sulla base corrente: solo i link interni
  // all'entità (path assoluto /s|/r|/a/…, anche con prefisso /en) vengono rimappati,
  // così restano coerenti su /en e domini custom. Esterni e altri path invariati.
  function siteHref(u) {
    if (typeof u !== 'string' || !u) return u
    const m = u.match(/^(?:\/en)?\/(?:s|r|a)\/[^/?#]+(.*)$/)
    return m ? (linkBase + m[1]) || '/' : u
  }

  useEffect(() => {
    if (!entity?.id) return
    guestFetch(`/api/guest/eventi?entity_tipo=${entityType}&entity_id=${entity.id}`)
      .then(d => Array.isArray(d) && setEventi(d.slice(0, 6))).catch(() => {})
    guestFetch(`/api/blog/public?azienda_id=${aziendaId}&entity_tipo=${entityType}&entity_id=${entity.id}&limit=6`)
      .then(d => Array.isArray(d) && setArticoli(d)).catch(() => {})
  }, [entity?.id])

  function renderBlock(block, inverted = false) {
    const d = block.data || {}
    // Colori adattivi allo sfondo di sezione (scuro/immagine → testo chiaro).
    const cTitle = inverted ? '#ffffff' : '#1a1a2e'
    const cBody  = inverted ? 'rgba(255,255,255,0.82)' : null   // null = usa il colore nativo del blocco
    switch (block.type) {

      case 'hero': {
        const heightMap = { full: '100vh', large: '85vh', medium: '65vh' }
        const h = heightMap[d.height || 'large'] || '85vh'
        const bgImg = d.bg_image_url || entity.cover_url
        return (
          <section key={block.id} style={{ position: 'relative', minHeight: h, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (bgImg || d.bg_video) ? 'transparent' : `linear-gradient(135deg, #1a1a2e 0%, #0d1a2a 100%)`, overflow: 'hidden' }}>
            {d.bg_video
              ? <video src={d.bg_video} autoPlay muted loop playsInline poster={bgImg || undefined} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              : bgImg && <img src={bgImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${d.overlay_opacity ?? 0.5})` }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '80px 24px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
              {d.title && <h1 style={{ fontFamily: heading, fontSize: 'clamp(36px,6vw,72px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>{d.title}</h1>}
              {d.tagline && <p style={{ fontSize: 'clamp(16px,2.5vw,22px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, maxWidth: 640, margin: '0 auto 40px' }}>{d.tagline}</p>}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                {d.cta1_text && d.cta1_url && (
                  <a href={siteHref(d.cta1_url)} style={{ display: 'inline-block', padding: '16px 36px', background: primary, color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 17, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>{d.cta1_text}</a>
                )}
                {d.cta2_text && d.cta2_url && (
                  <a href={siteHref(d.cta2_url)} style={{ display: 'inline-block', padding: '16px 36px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 50, fontWeight: 600, fontSize: 17, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>{d.cta2_text}</a>
                )}
              </div>
            </div>
          </section>
        )
      }

      case 'hero_slider':
        return <HeroSlider key={block.id} block={block} primary={primary} heading={heading} />

      case 'carosello':
        return <Carousel key={block.id} block={block} primary={primary} heading={heading} />

      case 'annuncio': {
        if (!d.text) return null
        const abg = d.bg === 'dark' ? '#14141f' : d.bg === 'secondary' ? sec : primary
        const atxt = readableOn('#ffffff', abg, '#1a1a2e')
        return (
          <section key={block.id} style={{ background: abg, color: atxt, padding: '11px 20px', textAlign: 'center', fontSize: 14 }}>
            <span>{d.text}</span>
            {d.link_text && d.link_url && <a href={siteHref(d.link_url)} style={{ color: atxt, fontWeight: 700, marginLeft: 10, textDecoration: 'underline' }}>{d.link_text}</a>}
          </section>
        )
      }

      case 'divisore': {
        const sizeMap = { small: 32, medium: 64, large: 120 }
        const dh = sizeMap[d.size] || 64
        if (d.variant === 'line') return (
          <section key={block.id} style={{ padding: `${Math.round(dh / 2)}px 0` }}>
            <div className="lbr-section"><hr style={{ border: 0, borderTop: '1px solid #e5e5ea' }} /></div>
          </section>
        )
        if (d.variant === 'wave' || d.variant === 'diagonal') {
          const fill = d.color === 'dark' ? '#14141f' : d.color === 'primary' ? primary : d.color === 'secondary' ? sec : '#f4f4f7'
          return (
            <div key={block.id} aria-hidden style={{ lineHeight: 0 }}>
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: dh }}>
                {d.variant === 'wave'
                  ? <path d="M0,40 C300,120 900,-20 1200,60 L1200,120 L0,120 Z" fill={fill} />
                  : <path d="M0,120 L1200,0 L1200,120 Z" fill={fill} />}
              </svg>
            </div>
          )
        }
        return <div key={block.id} style={{ height: dh }} />
      }

      case 'accordion': {
        const items = (d.items || []).filter(i => i.title)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section" style={{ maxWidth: 760 }}>
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: cTitle, marginBottom: 40 }}>{d.titolo}</h2>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(it => {
                  const open = faqOpen[block.id + it.id]
                  return (
                    <div key={it.id} style={{ background: '#fafafa', borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                      <button onClick={() => setFaqOpen(p => ({ ...p, [block.id + it.id]: !open }))}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, fontSize: 16, color: '#1a1a2e' }}>{it.title}</span>
                        <ChevronDown size={18} strokeWidth={1.5} color="#888" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                      </button>
                      {open && <div style={{ padding: '0 20px 18px', fontSize: 15, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{it.text}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'social': {
        const items = (d.items || []).filter(i => i.url)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '48px 0', background: '#fff' }}>
            <div className="lbr-section" style={{ textAlign: 'center' }}>
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, color: cTitle, marginBottom: 20 }}>{d.titolo}</h2>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {items.map(it => {
                  const label = SOCIAL_LABELS[(it.network || '').toLowerCase()] || it.network || 'Link'
                  return <a key={it.id} href={siteHref(it.url)} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 20px', borderRadius: 50, border: `1.5px solid ${primary}`, color: primary, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{label}</a>
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'before_after':
        return <BeforeAfter key={block.id} block={block} primary={primary} />

      case 'countdown':
        return <Countdown key={block.id} block={block} primary={primary} heading={heading} />

      case 'embed': {
        if (!d.html) return null
        return (
          <section key={block.id} style={{ padding: '40px 0', background: '#fff' }}>
            <div className="lbr-section">
              <iframe srcDoc={d.html} title="Contenuto incorporato" sandbox="allow-scripts allow-popups allow-forms allow-presentation"
                style={{ width: '100%', height: Number(d.height) || 400, border: 0, borderRadius: 12 }} />
            </div>
          </section>
        )
      }

      case 'colonne': {
        const cols = (d.items || []).filter(c => c.title || c.text)
        if (!cols.length) return null
        const n = Math.min(Math.max(parseInt(d.columns) || 2, 1), 3)
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, textAlign: 'center', color: cTitle, marginBottom: 44 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(n), gap: 32 }}>
                {cols.map(c => (
                  <div key={c.id}>
                    {c.title && <h3 style={{ fontFamily: heading, fontSize: 20, fontWeight: 700, color: cTitle, marginBottom: 10 }}>{c.title}</h3>}
                    {c.text && <p style={{ fontSize: 15, lineHeight: 1.7, color: cBody || '#555', whiteSpace: 'pre-line' }}>{c.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'about':
        if (!d.title && richIsEmpty(d.text)) return null
        return (
          <section key={block.id} style={{ padding: '84px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.title && <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px,4vw,46px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 18 }}>{d.title}</h2>}
              {d.title && <div style={{ width: 54, height: 3, background: sec, borderRadius: 2, marginBottom: 28 }} />}
              <RichText value={d.text} primary={primary} style={{ fontSize: Math.round(18 * textSizeScale(block.style?.textSize)), lineHeight: 1.8, color: cBody || textColorFor(block.style?.textColor, primary) || '#444', maxWidth: 720 }} />
            </div>
          </section>
        )

      case 'foto_testo':
        if (!d.title && richIsEmpty(d.text) && !d.image_url) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="lbr-section">
              <div className={`lbr-ft${d.inverti ? ' inv' : ''}`}>
                {d.image_url && (
                  <div className="lbr-ft-img">
                    <img src={d.image_url} alt={d.title || ''} style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '4/3' }} />
                  </div>
                )}
                <div className="lbr-ft-txt">
                  {d.title && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>{d.title}</h2>}
                  <RichText value={d.text} primary={primary} style={{ fontSize: Math.round(16 * textSizeScale(block.style?.textSize)), lineHeight: 1.75, color: cBody || textColorFor(block.style?.textColor, primary) || '#555', marginBottom: 24 }} />
                  {d.button_label && d.button_url && (
                    <a href={siteHref(d.button_url)} style={{ display: 'inline-block', padding: '12px 28px', background: primary, color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>{d.button_label}</a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )

      case 'highlights': {
        const items = (d.items || []).filter(h => h.text)
        if (!items.length) return null
        const hlPlain = d.variant === 'plain'
        const cardStyle = hlPlain
          ? { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }
          : { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '32px 22px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 16 }
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, textAlign: 'center', marginBottom: 48, color: cTitle }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                {items.map(h => {
                  const Icon = highlightIcon(h.icon)
                  return (
                    <div key={h.id} style={cardStyle}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={26} strokeWidth={1.5} color={primary} />
                      </div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: hlPlain ? cTitle : '#1a1a2e', lineHeight: 1.5 }}>{h.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'stats': {
        const items = (d.items || []).filter(s => s.value && s.label)
        if (!items.length) return null
        const plain = d.variant === 'plain'
        return (
          <section key={block.id} style={{ padding: '64px 0', background: plain ? '#fff' : 'linear-gradient(135deg, #1a1a2e 0%, #0f1a1a 100%)' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 48, color: plain ? '#1a1a2e' : '#fff' }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                {items.map((s, i) => (
                  <div key={s.id} style={{ textAlign: 'center', padding: '8px 24px', borderRight: i < items.length - 1 ? `1px solid ${plain ? '#eee' : 'rgba(255,255,255,0.1)'}` : 'none' }}>
                    <CountUp value={s.value} style={{ fontFamily: heading, fontSize: 'clamp(40px,5vw,64px)', fontWeight: 700, color: plain ? primary : readableOn(primary, '#1a1a2e'), lineHeight: 1, marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: plain ? '#888' : 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'pulsante': {
        if (!d.text || !d.url) return null
        const padMap = { small: '10px 22px', medium: '14px 32px', large: '17px 44px' }
        const fsMap = { small: 14, medium: 16, large: 18 }
        const outline = d.style === 'outline'
        return (
          <section key={block.id} style={{ padding: '40px 0', background: '#fff' }}>
            <div className="lbr-section" style={{ textAlign: d.align || 'center' }}>
              <a href={siteHref(d.url)} style={{ display: 'inline-block', padding: padMap[d.size || 'medium'], borderRadius: 50, fontWeight: 700, fontSize: fsMap[d.size || 'medium'], textDecoration: 'none', background: outline ? 'transparent' : primary, color: outline ? primary : '#fff', border: `2px solid ${primary}` }}>{d.text}</a>
            </div>
          </section>
        )
      }

      case 'cta_banner': {
        if (!d.title) return null
        const split = d.variant === 'split'
        const ctaBtn = d.button_text && d.button_url
          ? <a href={siteHref(d.button_url)} style={{ display: 'inline-block', padding: '15px 36px', background: '#fff', color: primary, borderRadius: 50, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>{d.button_text}</a>
          : null
        return (
          <section key={block.id} style={{ padding: '72px 24px', background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, textAlign: split ? 'left' : 'center' }}>
            <div className="lbr-section" style={split ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' } : undefined}>
              <div style={split ? { flex: 1, minWidth: 260 } : undefined}>
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{d.title}</h2>
                {d.subtitle && <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.88)', maxWidth: 600, margin: split ? 0 : '0 auto', marginBottom: split ? 0 : 32 }}>{d.subtitle}</p>}
                {!split && ctaBtn}
              </div>
              {split && ctaBtn}
            </div>
          </section>
        )
      }

      case 'paragrafi': {
        const items = (d.items || []).filter(i => i.title || i.text)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28 }}>
                {items.map(it => {
                  const Icon = highlightIcon(it.icon)
                  return (
                    <div key={it.id} style={{ background: '#fafafa', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                      {it.image_url && <img src={it.image_url} alt={it.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />}
                      <div style={{ padding: 24 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <Icon size={20} strokeWidth={1.5} color={primary} />
                        </div>
                        {it.title && <h3 style={{ fontFamily: heading, fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{it.title}</h3>}
                        {it.text && <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{it.text}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'team': {
        const items = (d.items || []).filter(i => i.nome)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
                {items.map(m => (
                  <div key={m.id} style={{ textAlign: 'center' }}>
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.nome} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 14, border: `3px solid ${primary}30` }} />
                      : <div style={{ width: 96, height: 96, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 32 }}>👤</div>
                    }
                    <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 16, color: cTitle, marginBottom: 4 }}>{m.nome}</div>
                    {m.ruolo && <div style={{ fontSize: 12, color: primary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{m.ruolo}</div>}
                    {m.bio && <p style={{ fontSize: 13, color: cBody || '#666', lineHeight: 1.6 }}>{m.bio}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'steps': {
        const items = (d.items || []).filter(i => i.title || i.text)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div className="lbr-steps">
                {items.map((step, idx) => {
                  const Icon = highlightIcon(step.icon)
                  return (
                    <div key={step.id} style={{ textAlign: 'center', padding: '0 8px' }}>
                      <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={28} strokeWidth={1.5} color={primary} />
                        </div>
                        <div style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: primary, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                      </div>
                      {step.title && <h3 style={{ fontFamily: heading, fontSize: 17, fontWeight: 700, color: cTitle, marginBottom: 8 }}>{step.title}</h3>}
                      {step.text && <p style={{ fontSize: 14, color: cBody || '#666', lineHeight: 1.6 }}>{step.text}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'video': {
        const embedUrl = getEmbedUrl(d.url)
        if (!embedUrl) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#000' }}>
            <div className="lbr-section">
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
                <iframe src={embedUrl} title="video" frameBorder="0" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              </div>
            </div>
          </section>
        )
      }

      case 'testimonianze': {
        const items = (d.items || []).filter(t => t.text && t.author)
        if (!items.length) return null
        const quote = d.variant === 'quote'
        return (
          <section key={block.id} style={{ padding: '72px 0', background: quote ? '#fff' : '#fafafa' }}>
            <div className="lbr-section" style={quote ? { maxWidth: 780 } : undefined}>
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: cTitle, marginBottom: 48 }}>{d.titolo}</h2>}
              {quote ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
                  {items.map(t => (
                    <div key={t.id} style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: heading, fontSize: 'clamp(20px,3vw,30px)', color: cTitle, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 18 }}>“{t.text}”</p>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 10, justifyContent: 'center' }}>
                        {Array.from({ length: t.stars || 5 }).map((_, i) => <Star key={i} size={16} fill={primary} color={primary} strokeWidth={0} />)}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: cTitle }}>{t.author}</div>
                      {t.role && <div style={{ fontSize: 13, color: cBody || '#888', marginTop: 2 }}>{t.role}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                  {items.map(t => (
                    <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                        {Array.from({ length: t.stars || 5 }).map((_, i) => <Star key={i} size={14} fill={primary} color={primary} strokeWidth={0} />)}
                      </div>
                      <p style={{ fontSize: 15, color: '#444', lineHeight: 1.65, marginBottom: 16, fontStyle: 'italic' }}>"{t.text}"</p>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{t.author}</div>
                      {t.role && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.role}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      }

      case 'faq': {
        const items = (d.items || []).filter(f => f.question && f.answer)
        if (!items.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section" style={{ maxWidth: 720 }}>
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 48 }}>{d.titolo}</h2>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(f => {
                  const open = faqOpen[block.id + f.id]
                  return (
                    <div key={f.id} style={{ background: '#fafafa', borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                      <button onClick={() => setFaqOpen(prev => ({ ...prev, [block.id + f.id]: !open }))}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: '#1a1a2e' }}>{f.question}</span>
                        <ChevronDown size={18} strokeWidth={1.5} color='#888' style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                      </button>
                      {open && <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#555', lineHeight: 1.65 }}>{f.answer}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'newsletter':
        if (sections?.newsletter === false) return null
        return (
          <section key={block.id} style={{ padding: '72px 24px', background: `linear-gradient(135deg, ${primary}15 0%, #fff 100%)`, textAlign: 'center' }}>
            <div className="lbr-section" style={{ maxWidth: 560 }}>
              {d.title && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{d.title}</h2>}
              {d.subtitle && <p style={{ fontSize: 16, color: '#666', marginBottom: 28 }}>{d.subtitle}</p>}
              <NewsletterForm aziendaId={aziendaId} primary={primary} privacyUrl={privacyUrl} lang={lang} />
            </div>
          </section>
        )

      case 'contatti':
        return null

      case 'show_map':
        if (!entity.address) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 400 }}>
                <iframe
                  title="Mappa"
                  width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(entity.address)}&output=embed`}
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )

      case 'galleria_immagini': {
        const imgs = (d.images || []).filter(im => im.url)
        if (!imgs.length) return null
        const cols = d.columns || 3
        return (
          <section key={block.id} style={{ padding: '64px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 40 }}>{d.titolo}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(cols, 320), gap: 10 }}>
                {imgs.map((im, i) => <img key={im.id || i} src={im.url} alt={im.alt || ''} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 }} />)}
              </div>
            </div>
          </section>
        )
      }

      case 'immagine': {
        if (!d.image_url) return null
        const wMap = { full: '100%', large: 860, medium: 600, small: 380 }
        const mw = wMap[d.width || 'large'] || 860
        const img = <img src={d.image_url} alt={d.alt || ''} loading="lazy" style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }} />
        return (
          <section key={block.id} style={{ padding: '48px 0', background: '#fff' }}>
            <div className="lbr-section">
              <figure style={{ margin: 0, maxWidth: mw === '100%' ? '100%' : mw, marginLeft: 'auto', marginRight: 'auto' }}>
                {d.link_url ? <a href={siteHref(d.link_url)} target="_blank" rel="noopener noreferrer">{img}</a> : img}
                {d.caption && <figcaption style={{ fontSize: 13, color: '#888', marginTop: 8, textAlign: 'center' }}>{d.caption}</figcaption>}
              </figure>
            </div>
          </section>
        )
      }

      case 'gallery': {
        const gallery = (entity.gallery || []).slice(0, d.limit || 9)
        if (!gallery.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: d.sottotitolo ? 12 : 40, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo}</h2>}
              {d.sottotitolo && <p style={{ textAlign: 'center', color: '#888', marginBottom: 40, fontSize: 15 }}>{d.sottotitolo}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(d.columns, 320), gap: 8 }}>
                {gallery.map((url, i) => (
                  <img key={i} src={url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'booking':
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="lbr-section">
              <BookingWidget entityId={entity.id} entityTipo={entityType} primary={primary} heading={heading} privacyUrl={privacyUrl} />
            </div>
          </section>
        )

      case 'menu': {
        const menus = entity?.menu
        if (!Array.isArray(menus) || !menus.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              {d.titolo && <h2 style={{ fontFamily: heading, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 40 }}>{d.titolo}</h2>}
              <MenuTab menu={menus} primary={primary} textColor="#1a1a2e" subText="#777" isDark={false} radius={12} headingFamily={heading} cardBg="#fff" surfaceBg="#f7f7f9" borderColor="#efefef" showAllergens lang={lang} />
            </div>
          </section>
        )
      }

      case 'services': {
        const services = (entity.services || []).filter(s => s.name)
        if (!services.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: d.sottotitolo ? 12 : 48, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo || tr('our_services', lang)}</h2>
              {d.sottotitolo && <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{d.sottotitolo}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(d.columns, 160), gap: 20 }}>
                {services.slice(0, d.limit || services.length).map(s => {
                  const Icon = serviceIcon(s.icon)
                  return (
                    <div key={s.id} style={{ background: '#fff', borderRadius: 16, padding: '24px 16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      <Icon size={28} strokeWidth={1.5} color={primary} style={{ marginBottom: 10 }} />
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>{s.name}</div>
                      {s.hours && <div style={{ fontSize: 12, color: '#888' }}>{s.hours}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'activities': {
        const actItems = (entity.activities || [])
          .flatMap(cat => (cat.items || []).filter(i => i.active !== false).map(i => ({ ...i, category: cat.category })))
        if (!actItems.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo || tr('activities_title', lang)}</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{d.sottotitolo || `${actItems.length} ${tr(actItems.length === 1 ? 'activity_available' : 'activities_available', lang)}`}</p>
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(d.columns, 280), gap: 20 }}>
                {actItems.slice(0, d.limit || actItems.length).map(item => (
                  <div key={item.id} style={{ background: '#fafafa', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                    {item.photo_url && <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      {item.category && <div style={{ fontSize: 11, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{item.category}</div>}
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>{item.name}</div>
                      {item.description && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{item.description}</p>}
                      {item.location && <div style={{ fontSize: 12, color: '#888', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} strokeWidth={1.5} color={primary} />{item.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'excursions': {
        const excItems = (entity.excursions || []).filter(e => e.active !== false && e.name)
        if (!excItems.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo || tr('excursions_title', lang)}</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{d.sottotitolo || `${excItems.length} ${tr(excItems.length === 1 ? 'excursion_available' : 'excursions_available', lang)}`}</p>
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(d.columns, 280), gap: 20 }}>
                {excItems.slice(0, d.limit || excItems.length).map(exc => (
                  <div key={exc.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                    {exc.photo_url && <img src={exc.photo_url} alt={exc.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>{exc.name}</div>
                      {exc.description && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: '0 0 10px' }}>{exc.description}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#888' }}>
                        {exc.duration && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} strokeWidth={1.5} color={primary} />{exc.duration}</span>}
                        {exc.price > 0 && <span style={{ fontWeight: 700, color: primary, fontSize: 14 }}>€{exc.price}</span>}
                        {exc.seats && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} strokeWidth={1.5} color={primary} />Max {exc.seats}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'promozioni': {
        const now = new Date()
        const promo = (mini.promozioni?.length ? mini.promozioni : (d.items || [])).filter(p => p.title && (!p.expires_at || new Date(p.expires_at) >= now))
        if (!promo.length) return null
        const ctaHref = mini.booking_url || homeUrl
        const offerteBase = entityType === 'struttura' ? `/s/${slug}/offerte/` : entityType === 'ristorante' ? `/r/${slug}/offerte/` : `/a/${slug}/offerte/`
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>{tr('offers_title', lang)}</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{tr('offers_subtitle', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {promo.map(p => {
                  const promoUrl = siteHref(p.cta_url?.trim() && p.cta_url !== '#' ? p.cta_url.trim() : ctaHref)
                  const isExternal = promoUrl?.startsWith('http') || promoUrl?.startsWith('tel:') || promoUrl?.startsWith('mailto:')
                  const hasDetail = p.description_full || (p.gallery || []).length > 0
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${primary}`, display: 'flex', flexDirection: 'column' }}>
                      {p.cover_url && <img src={p.cover_url} alt={p.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
                          {p.badge && <span style={{ display: 'inline-block', background: `${sec}18`, color: sec, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase' }}>{p.badge}</span>}
                        </div>
                        <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' }}>{p.title}</h3>
                        {p.text && <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, marginBottom: 16, flex: 1 }}>{p.text}</p>}
                        {p.expires_at && <div style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>Valida fino al {new Date(p.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                        <div style={{ marginTop: 'auto' }}>
                          {hasDetail ? (
                            <a href={`${offerteBase}${p.id}`} style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: primary, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                              {p.cta_label || 'Scopri di più'}
                            </a>
                          ) : (p.cta_label && p.cta_url) ? (
                            <a href={promoUrl} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: primary, color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                              {p.cta_label}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'pacchetti': {
        const packs = (mini.pacchetti?.length ? mini.pacchetti : (d.items || [])).filter(p => p.name)
        if (!packs.length) return null
        const pacchettiBase = entityType === 'struttura' ? `/s/${slug}/pacchetti/` : entityType === 'ristorante' ? `/r/${slug}/pacchetti/` : `/a/${slug}/pacchetti/`
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: cTitle }}>{d.titolo || tr('packages_title', lang)}</h2>
              <p style={{ textAlign: 'center', color: cBody || '#888', marginBottom: 48, fontSize: 15 }}>{d.sottotitolo || tr('packages_subtitle', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {packs.map(p => {
                  const hasDetail = p.description_full || (p.gallery || []).length > 0
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                      {p.cover_url && <img src={p.cover_url} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                      <div style={{ padding: '28px 28px 0' }}>
                        {p.badge && <span style={{ display: 'inline-block', background: sec, color: readableOn('#ffffff', sec, '#1a1a2e'), fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>{p.badge}</span>}
                        <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#1a1a2e' }}>{p.name}</h3>
                        {p.tagline && <p style={{ fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 1.5 }}>{p.tagline}</p>}
                        {p.price && (
                          <div style={{ marginBottom: 24, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
                            <span style={{ fontFamily: heading, fontSize: 40, fontWeight: 800, color: primary }}>{p.price}</span>
                            {p.price_label && <span style={{ fontSize: 14, color: '#aaa', marginLeft: 6 }}>/ {p.price_label}</span>}
                          </div>
                        )}
                      </div>
                      {(p.includes || []).filter(Boolean).length > 0 && (
                        <div style={{ padding: '0 28px 24px', flex: 1 }}>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(p.includes || []).filter(Boolean).map((item, i) => (
                              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#444' }}>
                                <span style={{ color: primary, fontWeight: 700, fontSize: 15, lineHeight: 1.3, flexShrink: 0 }}>✓</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                        {hasDetail && (
                          <a href={`${pacchettiBase}${p.id}`} style={{ display: 'block', textAlign: 'center', padding: '12px', background: 'transparent', color: primary, border: `2px solid ${primary}`, borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Scopri di più</a>
                        )}
                        {p.cta_label && p.cta_url && (
                          <a href={siteHref(p.cta_url)} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '13px', background: primary, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>{p.cta_label}</a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'eventi': {
        if (!eventi.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fff' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo || tr('events_title', lang)}</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{d.sottotitolo || `${eventi.length} ${tr(eventi.length === 1 ? 'event_scheduled' : 'events_scheduled', lang)}`}</p>
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(d.columns, 280), gap: 16 }}>
                {eventi.slice(0, d.limit || eventi.length).map(ev => {
                  const dateStr = new Date(ev.date_start).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                  return (
                    <a key={ev.id} href={`/eventi/${ev.id}`} style={{ background: '#fafafa', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #f0f0f0' }}>
                      {ev.cover_url
                        ? <img src={ev.cover_url} alt={ev.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ height: 100, background: `${primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={36} strokeWidth={1.5} color={primary} /></div>
                      }
                      <div style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 8 }}>{ev.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}><Calendar size={12} strokeWidth={1.5} color={primary} />{dateStr}</span>
                          {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}><MapPin size={12} strokeWidth={1.5} color={primary} />{ev.location}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: primary }}>{ev.price > 0 ? `€${ev.price}` : tr('free', lang)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: primary }}>{tr('book_arrow', lang)}</span>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </section>
        )
      }

      case 'news': {
        if (!articoli.length) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#f9f9fb' }}>
            <div className="lbr-section">
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 700, marginBottom: 12, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo || tr('news_title', lang)}</h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 48, fontSize: 15 }}>{d.sottotitolo || tr('news_subtitle', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate(d.columns, 280), gap: 20 }}>
                {articoli.slice(0, d.limit || articoli.length).map(art => (
                  <a key={art.id} href={`/blog/${art.slug}?back=${encodeURIComponent(homeUrl)}`}
                    style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', display: 'block', textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    {art.cover_url && <img src={art.cover_url} alt={art.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '16px 18px' }}>
                      {art.published_at && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{new Date(art.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 8 }}>{art.title}</div>
                      {art.excerpt && <div style={{ fontSize: 13, color: '#777', lineHeight: 1.5 }}>{art.excerpt}</div>}
                      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: primary }}>{tr('read_arrow', lang)}</div>
                    </div>
                  </a>
                ))}
              </div>
              {articoli.length >= 6 && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <a href={`/blog?azienda_id=${entity.azienda_id}`} style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 50, border: `2px solid ${primary}`, color: primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    {tr('view_all_articles', lang)}
                  </a>
                </div>
              )}
            </div>
          </section>
        )
      }

      case 'form_builder':
        if (!d.form_token) return null
        return (
          <section key={block.id} style={{ padding: '72px 0', background: '#fafafa' }}>
            <div className="lbr-section" style={{ maxWidth: 620 }}>
              {d.titolo_sezione && (
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 40 }}>
                  {d.titolo_sezione}
                </h2>
              )}
              <FormBuilderBlock token={d.form_token} primary={primary} lang={lang} />
            </div>
          </section>
        )

      case 'clienti': {
        const items = (d.items || []).filter(it => it.logo_url)
        if (!items.length) return null
        const doubled = [...items, ...items]
        const dur = `${Math.max(15, items.length * 3)}s`
        return (
          <section key={block.id} style={{ padding: '64px 0', background: '#fff', overflow: 'hidden' }}>
            {d.titolo && (
              <div className="lbr-section" style={{ marginBottom: 40 }}>
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, textAlign: 'center', color: '#1a1a2e' }}>{d.titolo}</h2>
              </div>
            )}
            <div style={{ position: 'relative', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
              <div className="lbr-logo-track" style={{ animationDuration: dur }}>
                {doubled.map((it, i) => (
                  <div key={i} className="lbr-logo-item">
                    {it.link_url
                      ? <a href={siteHref(it.link_url)} target="_blank" rel="noopener noreferrer"><img src={it.logo_url} alt="" /></a>
                      : <img src={it.logo_url} alt="" />
                    }
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      }

      case 'vetrina':
        return <VetrinaGrid key={block.id} block={block} linkBase={linkBase} primary={primary} sec={sec} heading={heading} />

      case 'vetrina_dettaglio':
        return <VetrinaDettaglio key={block.id} block={block} linkBase={linkBase} primary={primary} sec={sec} heading={heading} entity={entity} entityType={entityType} privacyUrl={privacyUrl} />

      default:
        return null
    }
  }

  return (
    <>
      <style>{`
        .lbr-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .lbr-al-left,   .lbr-al-left *   { text-align: left   !important; }
        .lbr-al-center, .lbr-al-center * { text-align: center !important; }
        .lbr-al-right,  .lbr-al-right *  { text-align: right  !important; }
        /* gli elementi a larghezza fissa/limitata (barrette, colonne maxWidth) seguono l'allineamento */
        .lbr-al-left   > .lbr-section > * { margin-left: 0    !important; margin-right: auto !important; }
        .lbr-al-center > .lbr-section > * { margin-left: auto !important; margin-right: auto !important; }
        .lbr-al-right  > .lbr-section > * { margin-left: auto !important; margin-right: 0    !important; }
        .lbr-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .lbr-ft { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .lbr-ft-img { order: 0; }
        .lbr-ft-txt { order: 1; }
        .lbr-ft.inv .lbr-ft-img { order: 1; }
        .lbr-ft.inv .lbr-ft-txt { order: 0; }
        .lbr-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 32px; }
        @media (max-width: 768px) {
          .lbr-gallery { grid-template-columns: repeat(2, 1fr); }
          .lbr-section { padding: 0 16px; }
          .lbr-ft { grid-template-columns: 1fr !important; gap: 24px !important; }
          .lbr-ft-img { order: 0 !important; }
          .lbr-ft-txt { order: 1 !important; }
        }
        @keyframes lbr-logo-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lbr-logo-track { display: flex; gap: 48px; width: max-content; animation: lbr-logo-scroll linear infinite; align-items: center; padding: 16px 24px; }
        .lbr-logo-item img { height: 48px; max-width: 140px; object-fit: contain; filter: grayscale(100%) opacity(0.5); transition: filter 0.35s ease; display: block; }
        .lbr-logo-item img:hover { filter: grayscale(0%) opacity(1); }
        .lbr-logo-item a { display: block; }
      `}</style>
      <div ref={animRef}>
        {blocks.map((b, i) => {
          const el = applyBlockStyle(renderBlock(b, blockInverted(b, primary, sec)), b, { primary, secondary: sec })
          return (!el || i === 0) ? el : cloneElement(el, { className: ((el.props.className || '') + ' lbr-reveal').trim() })
        })}
      </div>
    </>
  )
}

function NewsletterForm({ aziendaId, primary, privacyUrl, lang = 'it' }) {
  const [email, setEmail] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [state, setState] = useState('idle')
  const [turnstileToken, setTurnstileToken] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!privacy) return
    setState('loading')
    try {
      await guestFetch('/api/contatti/subscribe', {
        method: 'POST',
        body: JSON.stringify({ azienda_id: aziendaId, email, fonte: 'minisito', turnstileToken }),
      })
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') return <p style={{ color: '#2d7a2d', fontWeight: 600 }}>{tr('newsletter_confirm', lang)}</p>
  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={tr('newsletter_email', lang)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 50, border: '1px solid #ddd', fontSize: 15, outline: 'none' }} />
        <button type="submit" disabled={!privacy || state === 'loading'}
          style={{ padding: '12px 24px', borderRadius: 50, background: privacy ? primary : '#ccc', color: '#fff', border: 'none', cursor: privacy ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 15 }}>
          {state === 'loading' ? '...' : tr('subscribe', lang)}
        </button>
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#666', cursor: 'pointer' }}>
        <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>{tr('consent_privacy', lang)} <a href={privacyUrl} style={{ color: primary }}>{tr('privacy_policy', lang)}</a></span>
      </label>
      <Turnstile onToken={setTurnstileToken} />
    </form>
  )
}

function fbFieldVisible(campo, dati) {
  if (!campo.condizione?.campo_id) return true
  const rawVal = dati[campo.condizione.campo_id]
  const val = typeof rawVal === 'boolean' ? String(rawVal) : String(rawVal ?? '').toLowerCase()
  const target = String(campo.condizione.valore ?? '').toLowerCase()
  switch (campo.condizione.operatore) {
    case 'eq':       return val === target
    case 'neq':      return val !== target
    case 'contains': return val.includes(target)
    default:         return true
  }
}

function FormBuilderBlock({ token, primary, lang = 'it' }) {
  const [form, setForm]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [dati, setDati]               = useState({})
  const [hp, setHp]                   = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    fetch(`${API_BASE_FB}/api/form-builder/public/${token}?lang=${lang}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setForm(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, lang])

  function setField(id, value) { setDati(d => ({ ...d, [id]: value })) }

  const allStepNumbers = form
    ? [...new Set((form.campi || []).map(c => c.step ?? 0))].sort((a, b) => a - b)
    : [0]
  const totalSteps = Math.max(allStepNumbers.length, 1)
  const isMultiStep = !!(form?.multi_step && totalSteps > 1)
  const currentStepNumber = allStepNumbers[currentStep] ?? 0

  const visibleCampi = (form?.campi || []).filter(c => {
    if (isMultiStep && (c.step ?? 0) !== currentStepNumber) return false
    return fbFieldVisible(c, dati)
  })

  function handleNext() {
    const mancanti = visibleCampi.filter(c => {
      if (c.tipo === 'consenso' || c.required) {
        const val = dati[c.id]
        return typeof val === 'boolean' ? !val : !String(val ?? '').trim()
      }
      return false
    })
    if (mancanti.length) { setError(`${tr('required_prefix', lang)} ${mancanti.map(c => c.label).join(', ')}`); return }
    setError('')
    setCurrentStep(s => s + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (isMultiStep && currentStep < totalSteps - 1) { handleNext(); return }

    const datiPuliti = {}
    for (const c of (form?.campi || [])) {
      if (fbFieldVisible(c, dati)) datiPuliti[c.id] = dati[c.id]
    }
    const mancanti = (form?.campi || []).filter(c => {
      if (!fbFieldVisible(c, dati)) return false
      if (c.tipo === 'consenso' || c.required) {
        const val = datiPuliti[c.id]
        return typeof val === 'boolean' ? !val : !String(val ?? '').trim()
      }
      return false
    })
    if (mancanti.length) { setError(`${tr('required_prefix', lang)} ${mancanti.map(c => c.label).join(', ')}`); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE_FB}/api/form-builder/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datiPuliti, _hp: hp }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || tr('send_error', lang))
      if (body.redirect_url) window.location.href = body.redirect_url
      else setSuccess(true)
    } catch (e) { setError(e.message) }
    setSubmitting(false)
  }

  const inp = { padding: '11px 14px', border: '1px solid #ddd', borderRadius: 10, fontSize: 15, outline: 'none', width: '100%', display: 'block', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (loading) return <p style={{ color: '#888', textAlign: 'center' }}>{tr('loading_form', lang)}</p>
  if (error && !form) return <p style={{ color: '#c53030', textAlign: 'center' }}>{error}</p>
  if (success) return <p style={{ color: '#2d7a2d', fontWeight: 600, textAlign: 'center', padding: '32px 0' }}>{tr('form_sent', lang)}</p>

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Honeypot anti-bot */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} name="_hp" />
      </div>

      {isMultiStep && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#888' }}>{tr('form_step', lang)} {currentStep + 1}/{totalSteps}</span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <div style={{ height: 4, background: '#eee', borderRadius: 2 }}>
            <div style={{ height: '100%', background: primary || '#1a1a2e', borderRadius: 2, width: `${((currentStep + 1) / totalSteps) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {form?.descrizione && <p style={{ fontSize: 14, color: '#666', margin: '0 0 8px' }}>{form.descrizione}</p>}
      {visibleCampi.map(c => (
        <div key={c.id}>
          {c.tipo === 'consenso' ? (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444' }}>
              <input type="checkbox" checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)} required style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
              <span>
                {c.privacy_url ? (
                  <a href={c.privacy_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2b6cb0' }}>
                    {c.label || 'Accetto il trattamento dei dati personali'}
                  </a>
                ) : (
                  c.label || 'Accetto il trattamento dei dati personali'
                )}
                <span style={{ color: '#c53030' }}> *</span>
              </span>
            </label>
          ) : c.tipo === 'consenso_marketing' ? (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444' }}>
              <input type="checkbox" checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
              <span>
                {c.privacy_url ? (
                  <a href={c.privacy_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2b6cb0' }}>
                    {c.label || 'Acconsento a ricevere comunicazioni commerciali'}
                  </a>
                ) : (
                  c.label || 'Acconsento a ricevere comunicazioni commerciali'
                )}
              </span>
            </label>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 }}>
                {c.label}{c.required && <span style={{ color: '#c53030' }}> *</span>}
              </label>
              {c.tipo === 'textarea' ? (
                <textarea value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} placeholder={c.placeholder} rows={4} style={{ ...inp, resize: 'vertical' }} />
              ) : c.tipo === 'select' ? (
                <select value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} style={inp}>
                  <option value="">{tr('select_ph', lang)}</option>
                  {(c.opzioni || []).map((op, i) => <option key={i} value={op}>{op}</option>)}
                </select>
              ) : c.tipo === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#555' }}>
                  <input type="checkbox" checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)} style={{ width: 16, height: 16 }} />
                  {c.placeholder || tr('yes', lang)}
                </label>
              ) : (
                <input type={c.tipo} value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} placeholder={c.placeholder} style={inp} />
              )}
            </>
          )}
        </div>
      ))}
      {error && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        {isMultiStep && currentStep > 0 && (
          <button type="button" onClick={() => { setError(''); setCurrentStep(s => s - 1) }}
            style={{ flex: 1, padding: '13px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            ← {tr('back', lang)}
          </button>
        )}
        {isMultiStep && currentStep < totalSteps - 1 ? (
          <button type="button" onClick={handleNext}
            style={{ flex: 1, padding: '13px', background: primary || '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            {tr('next', lang)} →
          </button>
        ) : (
          <button type="submit" disabled={submitting}
            style={{ flex: 1, padding: '13px', background: primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? tr('sending', lang) : tr('send', lang)}
          </button>
        )}
      </div>
    </form>
  )
}
