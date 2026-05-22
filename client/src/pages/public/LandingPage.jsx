import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, Mail, Smartphone, LayoutDashboard, QrCode,
  Star, Shield, Palette, UtensilsCrossed, Menu, X,
  Bell, ClipboardList, Info, Building2,
  CheckCircle, ChevronRight, Zap, Clock, DollarSign,
  Activity, Briefcase, ShoppingBag, GraduationCap, LogIn,
  RefreshCw, Edit3, Globe, ArrowRight, Quote,
  Sparkles, CalendarCheck, Users, BarChart2, Gift, Bot,
  FileText, Webhook, BookOpen, CreditCard,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ─── Palette ──────────────────────────────────────────────────────────────────
const PRIMARY    = '#0F7B6C'  // petrolio
const ACCENT     = '#38BDF8'  // azzurro
const GOLD       = '#C9A84C'  // oro
const LIGHT_P    = '#E6F4F2'  // sfondo chiaro teal
const BG         = '#FAF7F0'  // beige chiaro
const TEXT       = '#0D2926'
const TEXT_LIGHT = '#4A6B67'
const DARK       = '#0A2621'
const DARK2      = '#123630'

const WA_NUMBER = '393000000000'
const EMAIL     = 'fra.malagoli@gmail.com'
const WA_DEMO   = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20saperne%20di%20pi%C3%B9%20su%20OltreNova.`
const WA_PRICE  = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20un%20preventivo%20per%20OltreNova.`

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .lp { font-family: 'Plus Jakarta Sans', sans-serif; }
  .lp h1, .lp h2, .lp h3, .lp h4 { font-family: 'Space Grotesk', sans-serif; }

  .lp-hero-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
  .lp-two-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .lp-indip-grid   { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
  .lp-six-grid     { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
  .lp-feat-grid    { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
  .lp-ai-grid      { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
  .lp-testi-grid   { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
  .lp-nav-links    { display: flex; gap: 32px; align-items: center; }
  .lp-phone        { display: flex; justify-content: center; align-items: center; }
  .lp-footer-row   { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
  .lp-footer-links { display: flex; gap: 28px; }
  .lp-cta-row      { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .lp-hero-btns    { display: flex; gap: 16px; flex-wrap: wrap; }
  .lp-mobile-btn   { display: none !important; }
  .lp-demo-cta     { display: none !important; }
  .lp-compare-grid  { display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px; align-items: center; margin-bottom: 64px; }
  .lp-compare-arrow { display: flex; flex-direction: column; align-items: center; }
  .lp-phone-mini   { display: none; justify-content: center; margin-top: 40px; }

  .lp-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); }
  .lp-stat-sep   { border-right: 1px solid rgba(255,255,255,0.08); }

  .lp-journey-wrap { position: relative; }
  .lp-journey-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; position: relative; z-index: 1; }
  .lp-journey-line { display: block; position: absolute; top: 33px; left: calc(12.5%); right: calc(12.5%); height: 2px;
    background: linear-gradient(90deg, ${PRIMARY}30, ${ACCENT}60, ${PRIMARY}30); z-index: 0; }
  .lp-journey-mob  { display: none; }

  a.lp-navlink { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 15px; font-weight: 500; transition: color .2s; }
  a.lp-navlink:hover { color: #fff; }

  .lp-featcard { transition: transform .2s, box-shadow .2s; }
  .lp-featcard:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(15,123,108,0.14) !important; }

  .lp-testi-card { transition: transform .25s, box-shadow .25s; }
  .lp-testi-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(15,123,108,0.12) !important; }

  .lp-ai-card { transition: transform .2s, box-shadow .2s; }
  .lp-ai-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(15,123,108,0.20) !important; }

  @media (max-width: 960px) {
    .lp-hero-grid   { grid-template-columns: 1fr; gap: 32px; }
    .lp-two-grid    { grid-template-columns: 1fr; }
    .lp-indip-grid  { grid-template-columns: 1fr; }
    .lp-six-grid    { grid-template-columns: repeat(2,1fr); }
    .lp-feat-grid   { grid-template-columns: repeat(2,1fr); gap: 16px; }
    .lp-ai-grid     { grid-template-columns: 1fr; }
    .lp-testi-grid  { grid-template-columns: 1fr; }
    .lp-phone       { display: none; }
    .lp-phone-mini  { display: flex; }
    .lp-nav-links   { display: none !important; }
    .lp-mobile-btn  { display: flex !important; }
    .lp-demo-cta    { display: inline-flex !important; }
    .lp-footer-row  { flex-direction: column; text-align: center; }
    .lp-footer-links { flex-direction: column; gap: 12px; align-items: center; }
    .lp-compare-grid  { grid-template-columns: 1fr; gap: 16px; }
    .lp-compare-arrow { transform: rotate(90deg); }
    .lp-stats-grid  { grid-template-columns: repeat(2,1fr); }
    .lp-stat-sep    { border-right: none; }
    .lp-journey-grid { display: none; }
    .lp-journey-line { display: none; }
    .lp-journey-mob  { display: flex; }
  }
  @media (max-width: 520px) {
    .lp-feat-grid  { grid-template-columns: 1fr; }
    .lp-six-grid   { grid-template-columns: 1fr; }
    .lp-hero-btns  { flex-direction: column; }
    .lp-cta-row    { flex-direction: column; align-items: stretch; }
    .lp-stats-grid { grid-template-columns: 1fr 1fr; }
  }
`

// ─── Dati ─────────────────────────────────────────────────────────────────────
const STAT_DATA = [
  { end: 24,  suffix: 'h',   label: 'Per essere operativo',   sub: 'Dalla prima demo al QR in mano ai tuoi clienti' },
  { end: 2,   suffix: 'min', label: 'Per ogni aggiornamento', sub: 'Testi, foto, prezzi, menu — direttamente dal telefono' },
  { end: 0,   suffix: '€',   label: 'Per ogni modifica',      sub: 'Dopo il setup, aggiorni tutto da solo per sempre' },
  { end: 100, suffix: '%',   label: 'Controllo autonomo',     sub: 'Nessuna agenzia. Nessun WordPress. Tu al comando.' },
]

const JOURNEY = [
  { Icon: MessageCircle, num: '01', title: 'Ci contatti',     text: 'Richiedi una demo. Ti mostriamo come funziona con un esempio reale della tua attività.' },
  { Icon: Edit3,         num: '02', title: 'Setup in 24 ore', text: 'Carichiamo logo, colori, contenuti. Tu approvi. In meno di 24 ore sei online.' },
  { Icon: QrCode,        num: '03', title: 'QR attivo',       text: "Stampi il codice e lo metti in vista. I clienti scansionano e hanno subito l'app." },
  { Icon: Globe,         num: '04', title: 'Cresci da solo',  text: "Aggiorni in 2 minuti. Il sito porta nuovi clienti. Zero dipendenze." },
]

const TESTIMONIALS = [
  {
    quote: "Prima aspettavo 2 settimane per cambiare una foto sul sito. Adesso lo faccio in 2 minuti dal telefono mentre sono in sala con i clienti.",
    name: 'Marco Ferri',
    role: 'Titolare',
    business: 'Ristorante Al Porto, Rimini',
    initials: 'MF',
    color: PRIMARY,
  },
  {
    quote: "I miei ospiti scansionano il QR in camera e trovano tutto: menu, servizi, escursioni. Le chiamate alla reception per informazioni banali sono praticamente azzerate.",
    name: 'Giulia Marchetti',
    role: 'Proprietaria',
    business: 'B&B Villa Rosa, Amalfi',
    initials: 'GM',
    color: '#2E7D5E',
  },
  {
    quote: "Ho attivato il sito in una settimana. In un mese avevo già 3 nuovi clienti arrivati da Google che non mi conoscevano. Prima non avevo nemmeno una pagina online.",
    name: 'Lorenzo Bianchi',
    role: 'Istruttore',
    business: 'Centro Sportivo Bianchi, Bologna',
    initials: 'LB',
    color: GOLD,
  },
]

const TARGETS = [
  { icon: <Building2 size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Hotel e B&B', sub: 'Ricettività' },
  { icon: <UtensilsCrossed size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Ristoranti e Bar', sub: 'Ristorazione' },
  { icon: <Activity size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Palestre e Sport', sub: 'Sport & benessere' },
  { icon: <Briefcase size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Studi e Professionisti', sub: 'Servizi professionali' },
  { icon: <ShoppingBag size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Negozi e Attività', sub: 'Commercio locale' },
  { icon: <GraduationCap size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Scuole e Corsi', sub: 'Formazione' },
]

const FEATURES = [
  { Icon: Smartphone,      title: 'PWA via QR code',          text: "I tuoi clienti scansionano un QR e hanno l'app sul telefono. Nessun download, nessuna registrazione." },
  { Icon: Globe,           title: 'Sito web & page builder',  text: 'Landing page con SEO, 23 tipi di blocchi drag & drop. Aggiornabile da te in autonomia.' },
  { Icon: CalendarCheck,   title: 'Booking risorse & eventi', text: 'Prenotazioni online per tavoli, camere, slot orari, eventi. Disdetta autonoma via email.' },
  { Icon: Users,           title: 'CRM + pipeline Kanban',    text: 'Gestisci i contatti con pipeline visuale, tag, lead scoring e storico interazioni.' },
  { Icon: Mail,            title: 'Newsletter & automazioni', text: 'Editor drag & drop, segmentazione, invio programmato, A/B test. Sequenze automatiche.' },
  { Icon: Bot,             title: 'Chatbot AI',               text: "Chatbot con albero di conversazione o modalità AI libera, alimentato dal profilo della tua attività." },
  { Icon: Sparkles,        title: 'AI content studio',        text: 'Genera articoli blog, post social e piano editoriale mensile con un click. Foto Unsplash incluse.' },
  { Icon: Gift,            title: 'Shop + Loyalty + Gift',    text: 'E-commerce con punti fedeltà, livelli VIP e gift card digitali. Tutto gestito da te.' },
  { Icon: BarChart2,       title: 'Analytics integrata',      text: 'Visite, richieste, prenotazioni, newsletter: tutti i KPI in una sola dashboard.' },
  { Icon: FileText,        title: 'Preventivi digitali',      text: 'Crea preventivi professionali, condividili via link. Il cliente firma online.' },
  { Icon: Shield,          title: 'GDPR nativo',              text: 'Privacy policy, cookie banner e consensi nei form generati automaticamente.' },
  { Icon: Webhook,         title: 'Integrazioni & webhook',   text: 'Connetti Zapier, Make, n8n o qualsiasi sistema con webhook outbound in tempo reale.' },
]

const AI_FEATURES = [
  {
    Icon: BookOpen,
    color: PRIMARY,
    title: 'Blog AI automatico',
    text: 'Imposta una frequenza (giornaliera, settimanale, mensile) e OltreNova scrive e pubblica articoli ottimizzati SEO in autonomia. Con foto Unsplash incluse.',
    badge: 'Content',
  },
  {
    Icon: Bot,
    color: ACCENT,
    title: 'Chatbot AI conversazionale',
    text: "Attiva la modalità AI sul tuo chatbot: risponde alle domande dei clienti in tempo reale, alimentato dai dati della tua attività. Nessun copione da programmare.",
    badge: 'Customer care',
  },
  {
    Icon: Sparkles,
    color: GOLD,
    title: 'Piano editoriale generato',
    text: "Scegli i canali (Instagram, Facebook, LinkedIn…) e OltreNova genera un mese intero di contenuti social con testi e suggerimenti grafici.",
    badge: 'Social',
  },
]

const PHONE_ITEMS = [
  { Icon: Bell,          label: 'Servizi' },
  { Icon: UtensilsCrossed, label: 'Menù' },
  { Icon: ClipboardList, label: 'Richieste' },
  { Icon: Info,          label: 'Info' },
]

// ─── Hook: fade-in allo scroll ────────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref     = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, vis]
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, vis] = useFadeIn()
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)

  useEffect(() => {
    document.title = "OltreNova — Oltre il solito sito."
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="lp" style={{ background: BG, color: TEXT, minHeight: '100vh' }}>
      <style>{css}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled || mobileOpen ? 'rgba(10,38,33,0.96)' : 'transparent',
        backdropFilter: scrolled || mobileOpen ? 'blur(20px)' : 'none',
        borderBottom: scrolled || mobileOpen ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all .3s ease',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div className="lp-nav-links">
            {[['#come-funziona','Come funziona'],['#funzionalita','Features'],['#ai','AI'],['#perchi','Per chi è']].map(([h, l]) => (
              <a key={h} href={h} className="lp-navlink">{l}</a>
            ))}
            <a href="/admin" className="lp-navlink" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <LogIn size={16} strokeWidth={1.5} /> Accedi
            </a>
            <Btn href="#richiedi-demo" bg={ACCENT} color={DARK}>Richiedi una demo</Btn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="#richiedi-demo" className="lp-demo-cta" style={{
              background: ACCENT, color: DARK, borderRadius: 8,
              padding: '8px 14px', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', fontFamily: "'Space Grotesk', sans-serif",
            }}>Demo</a>
            <button className="lp-mobile-btn" onClick={() => setMobileOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#fff' }}>
              {mobileOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div style={{ background: DARK, padding: '16px 24px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[['#come-funziona','Come funziona'],['#funzionalita','Features'],['#ai','AI'],['#perchi','Per chi è']].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMobileOpen(false)} style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 17, fontWeight: 500 }}>{l}</a>
            ))}
            <a href="/admin" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={18} strokeWidth={1.5} /> Accedi
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 24px 80px',
        background: `linear-gradient(150deg, ${DARK} 0%, #0D3B35 55%, #061814 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* blobs decorativi */}
        <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(circle, ${PRIMARY}28 0%, transparent 68%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-12%', left: '-6%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%', position: 'relative' }}>
          <div className="lp-hero-grid">
            <div>
              {/* pill badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${PRIMARY}25`, color: '#A7D8D3', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 32, border: `1px solid ${PRIMARY}45` }}>
                <Sparkles size={13} strokeWidth={2} />
                App · Sito · CRM · AI — tutto in uno
              </div>

              {/* headline */}
              <h1 style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.06, letterSpacing: '-2px', color: '#fff', marginBottom: 12 }}>
                Oltre il solito sito.
              </h1>
              <h1 style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.06, letterSpacing: '-2px', marginBottom: 28 }}>
                <span style={{ color: ACCENT }}>Molto oltre.</span>
              </h1>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.58)', lineHeight: 1.82, marginBottom: 44, maxWidth: 480 }}>
                OltreNova è la piattaforma all-in-one per la tua attività: app per i clienti, sito web professionale, CRM, prenotazioni, newsletter, chatbot AI e molto altro. Tutto aggiornabile dal telefono in 2 minuti.
              </p>
              <div className="lp-hero-btns">
                <Btn href="#richiedi-demo" bg={ACCENT} color={DARK} shadow={`${ACCENT}55`}>Richiedi una demo gratuita</Btn>
                <Btn href={WA_DEMO} bg="rgba(255,255,255,0.07)" color="#fff" border="1.5px solid rgba(255,255,255,0.15)" icon={<MessageCircle size={18} strokeWidth={1.5} />}>
                  Scrivici su WhatsApp
                </Btn>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 48 }}>
                <div style={{ display: 'flex' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${260+i*20},60%,${45+i*5}%)`, border: '2px solid rgba(255,255,255,0.12)', marginLeft: i > 0 ? -8 : 0 }} />
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                    {[...Array(5)].map((_,i) => <Star key={i} size={12} strokeWidth={0} fill={GOLD} color={GOLD} />)}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Già usato da decine di attività</div>
                </div>
              </div>
            </div>
            <div className="lp-phone"><PhoneMockup /></div>
          </div>
          <div className="lp-phone-mini"><PhoneMockup scale={0.82} /></div>
        </div>
      </section>

      {/* ── STATS ANIMATE ── */}
      <AnimatedStats />

      {/* ── DUE STRUMENTI ── */}
      <section style={{ padding: '104px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <FadeIn><SecHead label="La piattaforma" title="Un ecosistema completo per la tua attività." sub="Non devi scegliere tra un'app e un sito. Con OltreNova hai tutto, gestito dallo stesso posto." /></FadeIn>
          <div className="lp-two-grid">
            <FadeIn delay={0}>
              <div style={{ background: DARK, borderRadius: 24, padding: '44px 40px', display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${PRIMARY}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={26} strokeWidth={1.5} color="#fff" />
                </div>
                <div>
                  <div style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Per i clienti che hai già</div>
                  <h3 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 14, lineHeight: 1.2 }}>L'app interna per la tua attività</h3>
                  <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 15, lineHeight: 1.75 }}>
                    I tuoi clienti scansionano un QR code e hanno in mano tutto: menu digitale, lista servizi, richieste, info, galleria. Nessun download, nessuna registrazione.
                  </p>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['Menu e servizi sempre aggiornati','Chatbot AI sempre disponibile','Prenotazioni e richieste in tempo reale','Personalizzato con i tuoi colori e logo'].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.72)', fontSize: 14 }}>
                      <CheckCircle size={15} strokeWidth={2} color={ACCENT} style={{ flexShrink: 0 }} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <div style={{ background: LIGHT_P, borderRadius: 24, padding: '44px 40px', display: 'flex', flexDirection: 'column', gap: 24, border: `1px solid ${PRIMARY}20`, height: '100%' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 12px ${PRIMARY}20` }}>
                  <Globe size={26} strokeWidth={1.5} color={PRIMARY} />
                </div>
                <div>
                  <div style={{ color: PRIMARY, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Per trovare clienti nuovi</div>
                  <h3 style={{ fontSize: 26, fontWeight: 700, color: TEXT, marginBottom: 14, lineHeight: 1.2 }}>Il sito che aggiorni tu, sempre</h3>
                  <p style={{ color: TEXT_LIGHT, fontSize: 15, lineHeight: 1.75 }}>
                    Una landing page professionale che si trova su Google, racconta la tua storia e cattura nuovi clienti. Page builder drag & drop con 23 tipi di blocchi.
                  </p>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['SEO integrato, trovato su Google','23 tipi di blocchi drag & drop','Blog con generazione AI automatica','Form contatti + GDPR incluso'].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: TEXT_LIGHT, fontSize: 14 }}>
                      <CheckCircle size={15} strokeWidth={2} color={PRIMARY} style={{ flexShrink: 0 }} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── INDIPENDENZA ── */}
      <section style={{ padding: '104px 24px', background: DARK }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <div style={{ color: ACCENT, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>Il vero vantaggio</div>
              <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 20 }}>
                Basta aspettare settimane<br />per un aggiornamento.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, maxWidth: 560, margin: '0 auto', lineHeight: 1.75 }}>
                Con OltreNova sei tu al comando. Aggiorni, pubblichi e comunichi senza intermediari.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="lp-compare-grid">
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Prima</div>
                {[
                  { Icon: Clock,      t: "Chiami l'agenzia e aspetti" },
                  { Icon: DollarSign, t: '150–300€ per ogni modifica' },
                  { Icon: RefreshCw,  t: '2–3 settimane di attesa' },
                  { Icon: X,          t: 'Risultato spesso sbagliato' },
                ].map(({ Icon, t }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.38)', fontSize: 15, marginBottom: 14 }}>
                    <Icon size={16} strokeWidth={1.5} color="rgba(255,255,255,0.18)" style={{ flexShrink: 0 }} /> {t}
                  </div>
                ))}
              </div>
              <div className="lp-compare-arrow">
                <ArrowRight size={28} strokeWidth={1.5} color={ACCENT} />
              </div>
              <div style={{ background: `${PRIMARY}20`, borderRadius: 20, padding: '32px 28px', border: `1px solid ${PRIMARY}40` }}>
                <div style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Con OltreNova</div>
                {[
                  { Icon: Smartphone,  t: "Apri l'app dal telefono" },
                  { Icon: Edit3,       t: 'Modifichi in 2 minuti' },
                  { Icon: Zap,         t: 'Salvi ed è online subito' },
                  { Icon: CheckCircle, t: 'Esattamente come volevi' },
                ].map(({ Icon, t }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.85)', fontSize: 15, marginBottom: 14 }}>
                    <Icon size={16} strokeWidth={1.5} color={ACCENT} style={{ flexShrink: 0 }} /> {t}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <div className="lp-indip-grid">
            {[
              { Icon: DollarSign, title: 'Zero sprechi',    text: 'Niente più bollette salate ad agenzie o consulenti per ogni piccola modifica.' },
              { Icon: Clock,      title: 'Zero attese',     text: 'Premi salva e in pochi secondi la modifica è online. Non devi chiedere permesso a nessuno.' },
              { Icon: Zap,        title: 'Zero dipendenze', text: 'Niente WordPress, niente agenzie. Sei tu il responsabile della tua presenza online.' },
            ].map(({ Icon, title, text }, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', height: '100%' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Icon size={28} strokeWidth={1.5} color={ACCENT} />
                  </div>
                  <h4 style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{title}</h4>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7 }}>{text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" style={{ padding: '104px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn><SecHead label="Semplicità" title="Come funziona" sub="Sei operativo in 24 ore. Poi vai avanti da solo." /></FadeIn>
          <JourneyFlow />
        </div>
      </section>

      {/* ── AI SECTION ── */}
      <section id="ai" style={{ padding: '104px 24px', background: `linear-gradient(135deg, #0A2F28 0%, ${DARK} 100%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${PRIMARY}25`, color: '#A7D8D3', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 20, border: `1px solid ${PRIMARY}45` }}>
                <Sparkles size={13} strokeWidth={2} /> Intelligenza Artificiale
              </div>
              <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 18 }}>
                L'AI che lavora per te.<br />Anche quando sei offline.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, maxWidth: 560, margin: '0 auto', lineHeight: 1.75 }}>
                OltreNova integra Claude AI per generare contenuti, rispondere ai clienti e creare piani editoriali. Non devi fare nulla — l'AI lo fa da sola.
              </p>
            </div>
          </FadeIn>
          <div className="lp-ai-grid">
            {AI_FEATURES.map(({ Icon, color, title, text, badge }, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="lp-ai-card" style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: '36px 32px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', flexDirection: 'column', gap: 20, height: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={26} strokeWidth={1.5} color={color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color, background: `${color}20`, padding: '4px 10px', borderRadius: 20 }}>{badge}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{title}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.75 }}>{text}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PER CHI È ── */}
      <section id="perchi" style={{ padding: '104px 24px', background: BG }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <FadeIn><SecHead label="Per chi è" title="Per qualsiasi attività con clienti" sub="Se hai clienti da gestire e nuovi da trovare, OltreNova è per te." /></FadeIn>
          <div className="lp-six-grid">
            {TARGETS.map((t, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', border: `1px solid ${PRIMARY}12`, display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: PRIMARY, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{t.sub}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{t.title}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIANZE ── */}
      <Testimonials />

      {/* ── FUNZIONALITÀ ── */}
      <section id="funzionalita" style={{ padding: '104px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <FadeIn><SecHead label="Features" title="Tutto quello che ti serve. In un posto solo." sub="Nessun abbonamento extra, nessuna integrazione, nessun tecnico." /></FadeIn>
          <div className="lp-feat-grid">
            {FEATURES.map(({ Icon, title, text }, i) => (
              <FadeIn key={i} delay={i * 45}>
                <div className="lp-featcard" style={{ padding: 24, borderRadius: 16, background: BG, border: `1px solid ${PRIMARY}10`, height: '100%' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={21} strokeWidth={1.5} color={PRIMARY} />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: TEXT }}>{title}</h4>
                  <p style={{ color: TEXT_LIGHT, fontSize: 13, lineHeight: 1.65 }}>{text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM DEMO ── */}
      <DemoForm />

      {/* ── ACCEDI ── */}
      <section style={{ padding: '64px 24px', background: LIGHT_P, borderTop: `1px solid ${PRIMARY}18`, borderBottom: `1px solid ${PRIMARY}18` }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Hai già un account OltreNova?</h3>
          <p style={{ color: TEXT_LIGHT, fontSize: 16, marginBottom: 28 }}>Accedi direttamente al tuo pannello di gestione.</p>
          <Btn href="/admin" bg={PRIMARY} icon={<LogIn size={18} strokeWidth={1.5} />}>Vai al pannello</Btn>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section id="contatti" style={{ padding: '104px 24px', background: `linear-gradient(140deg, ${PRIMARY} 0%, ${DARK} 100%)` }}>
        <div style={{ maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: `${ACCENT}cc`, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>Inizia oggi</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', marginBottom: 20, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            Ogni attività è diversa.<br />Parliamone.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 18, lineHeight: 1.8, marginBottom: 52 }}>
            Nessun pacchetto standard: costruiamo insieme la soluzione giusta per la tua attività, con un prezzo su misura.
          </p>
          <div className="lp-cta-row">
            <Btn href={WA_PRICE} bg="#25D366" icon={<MessageCircle size={19} strokeWidth={1.5} />} shadow="rgba(37,211,102,0.38)">Richiedi un preventivo</Btn>
            <Btn href={`mailto:${EMAIL}?subject=Preventivo OltreNova`} bg="rgba(255,255,255,0.08)" color="#fff" border="2px solid rgba(255,255,255,0.25)" icon={<Mail size={19} strokeWidth={1.5} />}>Scrivi una mail</Btn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: DARK, color: 'rgba(255,255,255,0.38)', padding: '52px 24px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div className="lp-footer-row">
            <div>
              <Logo />
              <div style={{ fontSize: 13, marginTop: 8 }}>Oltre il solito sito.</div>
            </div>
            <div className="lp-footer-links">
              {[['#come-funziona','Come funziona'],['#funzionalita','Features'],['#ai','AI'],['#perchi','Per chi è']].map(([h, l]) => (
                <a key={h} href={h} style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none', fontSize: 14 }}>{l}</a>
              ))}
              <a href={`mailto:${EMAIL}`} style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none', fontSize: 14 }}>{EMAIL}</a>
            </div>
            <div style={{ fontSize: 13 }}>© {new Date().getFullYear()} OltreNova</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── STATS animate ────────────────────────────────────────────────────────────
function AnimatedStats() {
  const ref = useRef(null)
  const [go, setGo]     = useState(false)
  const [vals, setVals] = useState(STAT_DATA.map(() => 0))

  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); obs.disconnect() } }, { threshold: 0.35 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!go) return
    STAT_DATA.forEach(({ end }, i) => {
      if (end === 0) return
      const dur = 1400, t0 = Date.now()
      const tick = () => {
        const p = Math.min((Date.now() - t0) / dur, 1)
        const e = 1 - Math.pow(1 - p, 3)
        setVals(v => { const n = [...v]; n[i] = Math.round(end * e); return n })
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }, [go])

  return (
    <section ref={ref} style={{ background: '#061814', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="lp-stats-grid">
          {STAT_DATA.map(({ suffix, label, sub }, i) => (
            <div key={i} className={i < 3 ? 'lp-stat-sep' : ''} style={{ padding: '52px 32px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 58, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px', color: '#fff', marginBottom: 10 }}>
                {vals[i]}<span style={{ fontSize: 32, letterSpacing: '-1px', color: ACCENT }}>{suffix}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Journey Flow ─────────────────────────────────────────────────────────────
function JourneyFlow() {
  return (
    <>
      <div className="lp-journey-wrap">
        <div className="lp-journey-line" />
        <div className="lp-journey-grid">
          {JOURNEY.map(({ Icon, num, title, text }, i) => (
            <FadeIn key={i} delay={i * 110} style={{ height: '100%' }}>
              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <div style={{ position: 'relative', margin: '0 auto 28px', width: 68, height: 68 }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: '50%',
                    background: i === 0 ? PRIMARY : '#fff',
                    border: `3px solid ${i === 0 ? PRIMARY : LIGHT_P}`,
                    boxShadow: `0 0 0 6px ${i === 0 ? `${PRIMARY}22` : `${PRIMARY}12`}, 0 8px 28px ${i === 0 ? `${PRIMARY}44` : `${PRIMARY}18`}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={26} strokeWidth={1.5} color={i === 0 ? '#fff' : PRIMARY} />
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: i === 0 ? '#fff' : ACCENT, color: i === 0 ? PRIMARY : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>{i + 1}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, letterSpacing: 1.5, marginBottom: 8 }}>{num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.7 }}>{text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
      <div className="lp-journey-mob" style={{ flexDirection: 'column', gap: 0 }}>
        {JOURNEY.map(({ Icon, num, title, text }, i) => (
          <FadeIn key={i} delay={i * 80}>
            <div style={{ display: 'flex', gap: 20, paddingBottom: i < JOURNEY.length - 1 ? 32 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: i === 0 ? PRIMARY : '#fff',
                  border: `2px solid ${i === 0 ? PRIMARY : LIGHT_P}`,
                  boxShadow: `0 4px 16px ${i === 0 ? `${PRIMARY}44` : `${PRIMARY}18`}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={22} strokeWidth={1.5} color={i === 0 ? '#fff' : PRIMARY} />
                </div>
                {i < JOURNEY.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 24, background: `linear-gradient(${PRIMARY}60, ${PRIMARY}20)`, marginTop: 8 }} />
                )}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, letterSpacing: 1.5, marginBottom: 6 }}>{num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.7 }}>{text}</p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </>
  )
}

// ─── Testimonianze ────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <section style={{ padding: '104px 24px', background: BG }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <FadeIn>
          <SecHead label="Chi lo usa" title="Lo dicono i nostri clienti" sub="Attività reali, risultati concreti. Senza tecnicismi, senza intermediari." />
        </FadeIn>
        <div className="lp-testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div className="lp-testi-card" style={{
                background: '#fff', borderRadius: 20, padding: '36px 32px',
                border: `1px solid ${PRIMARY}08`,
                boxShadow: `0 4px 24px rgba(15,123,108,0.08)`,
                display: 'flex', flexDirection: 'column', gap: 24, height: '100%',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[...Array(5)].map((_,s) => <Star key={s} size={16} strokeWidth={0} fill={ACCENT} color={ACCENT} />)}
                  </div>
                  <Quote size={32} strokeWidth={1} color={`${PRIMARY}15`} />
                </div>
                <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.8, flex: 1, fontStyle: 'italic' }}>"{t.quote}"</p>
                <div style={{ height: 1, background: `${PRIMARY}08` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: t.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0,
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: TEXT_LIGHT }}>{t.role} · {t.business}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Sub-componenti ───────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Oltre</span>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: ACCENT, letterSpacing: '-0.5px' }}>Nova</span>
    </div>
  )
}

function Btn({ href, bg, color = '#fff', border, shadow, icon, children }) {
  return (
    <a href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: bg, color, padding: '13px 26px', borderRadius: 10,
        textDecoration: 'none', fontSize: 15, fontWeight: 600,
        border: border || 'none',
        boxShadow: shadow ? `0 4px 24px ${shadow}` : 'none',
        whiteSpace: 'nowrap',
      }}>
      {icon}{children}
    </a>
  )
}

function SecHead({ label, title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 64 }}>
      {label && <div style={{ color: PRIMARY, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>{label}</div>}
      <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.5px', color: TEXT }}>{title}</h2>
      {sub && <p style={{ color: TEXT_LIGHT, fontSize: 17, marginTop: 14 }}>{sub}</p>}
    </div>
  )
}

const TIPI = ['', 'Hotel e B&B', 'Ristorante / Bar', 'Palestra / Sport', 'Studio professionale', 'Negozio / Attività commerciale', 'Scuola / Corsi', 'Altro']

function DemoForm() {
  const [form, setForm]       = useState({ nome: '', email: '', telefono: '', tipo_attivita: '', messaggio: '' })
  const [privacy, setPrivacy] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [errore, setErrore]   = useState(null)

  function patch(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault(); if (!privacy) return
    setSending(true); setErrore(null)
    try {
      const res = await fetch(`${API_BASE}/api/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Errore')
      setSent(true)
    } catch (err) { setErrore(err.message) }
    finally { setSending(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', background: '#fff', color: TEXT }
  const lbl = { fontSize: 13, fontWeight: 600, color: TEXT_LIGHT, marginBottom: 6, display: 'block' }

  return (
    <section id="richiedi-demo" style={{ padding: '104px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <FadeIn><SecHead label="Inizia adesso" title="Richiedi una demo gratuita" sub="Ti rispondo entro 24 ore. Nessun impegno, nessuna carta di credito." /></FadeIn>
        <FadeIn delay={80}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '48px 32px', background: BG, borderRadius: 20, border: `1.5px solid ${PRIMARY}25` }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: PRIMARY, marginBottom: 10 }}>Richiesta inviata!</h3>
              <p style={{ color: TEXT_LIGHT, fontSize: 16, lineHeight: 1.7 }}>Grazie {form.nome.split(' ')[0]}! Ti contatto entro 24 ore all'indirizzo <strong>{form.email}</strong>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: BG, borderRadius: 20, padding: '40px 36px', border: `1px solid ${PRIMARY}12`, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><label style={lbl}>Nome e cognome *</label><input style={inp} value={form.nome} onChange={patch('nome')} required placeholder="Mario Rossi" /></div>
                <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.email} onChange={patch('email')} required placeholder="mario@esempio.it" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><label style={lbl}>Telefono</label><input style={inp} value={form.telefono} onChange={patch('telefono')} placeholder="+39 333 000 0000" /></div>
                <div><label style={lbl}>Tipo di attività</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.tipo_attivita} onChange={patch('tipo_attivita')}>
                    {TIPI.map(t => <option key={t} value={t}>{t || '— Seleziona —'}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={lbl}>Messaggio (opzionale)</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 100 }} value={form.messaggio} onChange={patch('messaggio')} placeholder="Raccontami brevemente la tua attività e cosa ti serve…" />
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: PRIMARY, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.6 }}>Ho letto e accetto il trattamento dei dati personali per ricevere una risposta alla mia richiesta.</span>
              </label>
              {errore && <div style={{ background: '#fff5f5', color: '#c62828', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{errore}</div>}
              <button type="submit" disabled={!privacy || sending} style={{ background: privacy ? PRIMARY : '#ccc', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: privacy ? 'pointer' : 'not-allowed', fontFamily: "'Space Grotesk', sans-serif" }}>
                {sending ? 'Invio in corso…' : 'Invia la richiesta'}
              </button>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  )
}

function PhoneMockup({ scale = 1 }) {
  const w = Math.round(264 * scale), h = Math.round(532 * scale)
  return (
    <div style={{ width: w, height: h, background: '#061814', borderRadius: 42 * scale, padding: 9 * scale, boxShadow: `0 48px 96px rgba(15,123,108,0.30), 0 0 0 1px rgba(255,255,255,0.05)` }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 34 * scale, background: `linear-gradient(165deg, ${PRIMARY} 0%, #1B5E53 40%, #061814 100%)`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 28 * scale, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4 }}>
          <div style={{ width: 72 * scale, height: 18 * scale, background: '#061814', borderRadius: 10 }} />
        </div>
        <div style={{ padding: `${16 * scale}px ${20 * scale}px ${12 * scale}px`, display: 'flex', alignItems: 'center', gap: 10 * scale }}>
          <div style={{ width: 34 * scale, height: 34 * scale, borderRadius: 10 * scale, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={18 * scale} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 * scale }}>La Tua Attività</div>
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11 * scale }}>Benvenuto · Aggiornato oggi</div>
          </div>
        </div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}00)`, margin: `0 ${20 * scale}px ${16 * scale}px`, borderRadius: 2 }} />
        <div style={{ padding: `0 ${16 * scale}px`, display: 'flex', flexDirection: 'column', gap: 8 * scale, flex: 1 }}>
          {PHONE_ITEMS.map(({ Icon, label }, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12 * scale, padding: `${11 * scale}px ${14 * scale}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 * scale }}>
                <div style={{ width: 28 * scale, height: 28 * scale, borderRadius: 8 * scale, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14 * scale} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 * scale, fontWeight: 500 }}>{label}</span>
              </div>
              <ChevronRight size={14 * scale} strokeWidth={1.5} color="rgba(255,255,255,0.22)" />
            </div>
          ))}
        </div>
        <div style={{ padding: `${12 * scale}px ${16 * scale}px ${16 * scale}px`, display: 'flex', justifyContent: 'space-around', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12 * scale }}>
          {[Bell, Smartphone, Info].map((Icon, i) => (
            <div key={i} style={{ color: i === 0 ? ACCENT : 'rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Icon size={18 * scale} strokeWidth={1.5} />
              {i === 0 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
