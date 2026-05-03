import { useState, useEffect } from 'react'
import {
  MessageCircle, Mail, Smartphone, LayoutDashboard, QrCode,
  Star, Shield, Palette, Calendar, UtensilsCrossed, Menu, X,
  ArrowRight, Bell, ClipboardList, Info, Building2, Waves,
  CheckCircle, ChevronRight
} from 'lucide-react'

// ─── Palette ──────────────────────────────────────────────────────────────────
const PRIMARY    = '#1A6490'  // verde-blu (teal che vira al blu)
const ACCENT     = '#B5481C'  // ruggine
const LIGHT_P    = '#E0EFF7'  // sfondo chiaro primary
const LIGHT_A    = '#F9EDEA'  // sfondo chiaro accent
const BG         = '#F8F6F3'  // off-white caldo
const TEXT       = '#17252D'  // quasi nero blu-scuro
const TEXT_LIGHT = '#496070'  // grigio-blu

const WA_NUMBER = '393000000000' // TODO: sostituire con numero reale (es. '393471234567')
const EMAIL     = 'fra.malagoli@gmail.com'
const WA_DEMO   = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20saperne%20di%20pi%C3%B9%20su%20StayApp.`
const WA_PRICE  = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20un%20preventivo%20per%20StayApp.`

// ─── CSS globale + font ───────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-root { font-family: 'DM Sans', sans-serif; }
  .lp-root h1, .lp-root h2, .lp-root h3, .lp-root h4,
  .lp-root .lp-display { font-family: 'Space Grotesk', sans-serif; }

  .lp-hero-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
  .lp-steps-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 48px; }
  .lp-cards-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
  .lp-feat-grid   { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
  .lp-nav-links   { display: flex; gap: 36px; align-items: center; }
  .lp-phone       { display: flex; justify-content: center; align-items: center; }
  .lp-footer-row  { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
  .lp-footer-links { display: flex; gap: 28px; font-size: 14px; }
  .lp-cta-row     { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .lp-hero-btns   { display: flex; gap: 16px; flex-wrap: wrap; }
  .lp-mobile-btn  { display: none; }

  .lp-nav-link {
    color: ${TEXT_LIGHT}; text-decoration: none; font-size: 15px; font-weight: 500;
    transition: color 0.2s;
  }
  .lp-nav-link:hover { color: ${PRIMARY}; }

  .lp-feat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(26,100,144,0.10) !important; }
  .lp-feat-card { transition: transform 0.2s, box-shadow 0.2s; }

  @media (max-width: 960px) {
    .lp-hero-grid  { grid-template-columns: 1fr; gap: 48px; }
    .lp-steps-grid { grid-template-columns: 1fr; gap: 32px; }
    .lp-cards-grid { grid-template-columns: 1fr; gap: 20px; }
    .lp-feat-grid  { grid-template-columns: repeat(2,1fr); gap: 16px; }
    .lp-phone      { display: none; }
    .lp-nav-links  { display: none; }
    .lp-mobile-btn { display: flex; }
    .lp-footer-row { flex-direction: column; text-align: center; }
    .lp-footer-links { flex-direction: column; gap: 12px; align-items: center; }
  }
  @media (max-width: 480px) {
    .lp-feat-grid  { grid-template-columns: 1fr; }
    .lp-hero-btns  { flex-direction: column; }
    .lp-cta-row    { flex-direction: column; align-items: stretch; }
  }
`

// ─── Dati sezioni ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: <QrCode size={26} strokeWidth={1.5} color={PRIMARY} />,
    title: 'Ricevi il QR code',
    text: 'Ti consegniamo un QR personalizzato da stampare o esporre nella struttura. Nessuna configurazione tecnica da parte tua.',
  },
  {
    icon: <Smartphone size={26} strokeWidth={1.5} color={PRIMARY} />,
    title: "L'ospite accede",
    text: "Scansiona il QR e apre la PWA istantaneamente, senza scaricare nulla. Menu, servizi e richieste: tutto a portata di schermo.",
  },
  {
    icon: <LayoutDashboard size={26} strokeWidth={1.5} color={PRIMARY} />,
    title: 'Tu gestisci tutto',
    text: 'Dal pannello admin aggiorni contenuti, rispondi alle richieste e personalizzi colori e testi in pochi clic.',
  },
]

const TARGETS = [
  {
    icon: <Building2 size={28} strokeWidth={1.5} color={PRIMARY} />,
    subtitle: 'Strutture ricettive',
    title: 'Hotel e B&B',
    items: ['PWA ospite con QR code', 'Richieste camera in tempo reale', 'Servizi, attività ed escursioni', 'Minisito marketing con booking'],
  },
  {
    icon: <UtensilsCrossed size={28} strokeWidth={1.5} color={PRIMARY} />,
    subtitle: 'Ristorazione',
    title: 'Ristoranti e Bar',
    items: ['Menu digitale sempre aggiornato', 'Galleria piatti e ambiente', 'Orari, info e contatti', 'Minisito con form prenotazione'],
  },
  {
    icon: <Waves size={28} strokeWidth={1.5} color={PRIMARY} />,
    subtitle: 'Sport, benessere, servizi',
    title: 'Attività e Professionisti',
    items: ['Landing page professionale', 'Sezione team e specializzazioni', 'Servizi e corsi nel dettaglio', 'Form contatti GDPR-compliant'],
  },
]

const FEATURES = [
  { icon: <Smartphone    size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'PWA installabile',      text: "Gli ospiti aggiungono l'app alla home senza passare dagli store. Funziona anche offline." },
  { icon: <QrCode        size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'QR code personalizzato', text: 'Un codice da stampare o esporre. Basta inquadrarlo per accedere a tutto.' },
  { icon: <LayoutDashboard size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'Pannello admin',      text: 'Gestisci contenuti, richieste e impostazioni da qualsiasi dispositivo, ovunque.' },
  { icon: <Star          size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'Minisito marketing',    text: 'Landing page professionale con SEO, galleria, testimonianze e form contatti.' },
  { icon: <UtensilsCrossed size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'Menu digitale',      text: 'Categorie, piatti, prezzi e foto. Aggiornabile in tempo reale senza ristampare.' },
  { icon: <Shield        size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'GDPR incluso',          text: 'Privacy e cookie policy auto-generate. Consensi obbligatori nei form.' },
  { icon: <Palette       size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'Tema personalizzato',   text: 'Colori, font e stile adattati al tuo brand. Nessuna competenza tecnica richiesta.' },
  { icon: <Calendar      size={22} strokeWidth={1.5} color={PRIMARY} />, title: 'Eventi e attività',     text: 'Calendari, escursioni, prenotazioni: tutto gestito dalla stessa piattaforma.' },
]

const PHONE_ITEMS = [
  { icon: <Bell          size={15} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Servizi' },
  { icon: <UtensilsCrossed size={15} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Menù' },
  { icon: <ClipboardList size={15} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Richieste' },
  { icon: <Info          size={15} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Info' },
]

// ─── Componente principale ────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)

  useEffect(() => {
    document.title = "StayApp — La piattaforma digitale per l'ospitalità"
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navActive = scrolled || mobileOpen

  return (
    <div className="lp-root" style={{ background: BG, color: TEXT, minHeight: '100vh' }}>
      <style>{css}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: navActive ? 'rgba(248,246,243,0.96)' : 'transparent',
        backdropFilter: navActive ? 'blur(20px)' : 'none',
        borderBottom: navActive ? `1px solid ${PRIMARY}18` : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 28px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div className="lp-nav-links">
            {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([href, label]) => (
              <a key={href} href={href} className="lp-nav-link">{label}</a>
            ))}
            <Btn href={WA_DEMO} bg={ACCENT}>Richiedi una demo</Btn>
          </div>
          <button
            className="lp-mobile-btn"
            onClick={() => setMobileOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: TEXT, display: 'none' }}
          >
            {mobileOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
        {mobileOpen && (
          <div style={{ background: BG, padding: '16px 28px 28px', borderTop: `1px solid ${PRIMARY}15`, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} style={{ color: TEXT, textDecoration: 'none', fontSize: 17, fontWeight: 500 }}>{label}</a>
            ))}
            <Btn href={WA_DEMO} bg={ACCENT}>Richiedi una demo</Btn>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 28px 80px',
        background: `linear-gradient(145deg, ${BG} 30%, ${LIGHT_P} 100%)`,
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
          <div className="lp-hero-grid">
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: LIGHT_A, color: ACCENT,
                padding: '6px 16px', borderRadius: 100,
                fontSize: 13, fontWeight: 600, marginBottom: 32,
                border: `1px solid ${ACCENT}35`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
                PWA + Minisito marketing · tutto in uno
              </div>
              <h1 className="lp-display" style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-1.5px', color: TEXT, marginBottom: 24 }}>
                Il tuo hotel, ristorante<br />o attività{' '}
                <span style={{ color: PRIMARY }}>online in 24 ore</span>
              </h1>
              <p style={{ fontSize: 18, color: TEXT_LIGHT, lineHeight: 1.75, marginBottom: 44, maxWidth: 460 }}>
                Un QR code. Gli ospiti accedono a una PWA con menu digitale, servizi e richieste. Tu gestisci tutto da un pannello semplice.
              </p>
              <div className="lp-hero-btns">
                <Btn href={WA_DEMO} bg="#25D366" icon={<MessageCircle size={19} strokeWidth={1.5} />} shadow="rgba(37,211,102,0.32)">
                  Scrivici su WhatsApp
                </Btn>
                <Btn href={`mailto:${EMAIL}?subject=Richiesta informazioni StayApp`} bg="transparent" color={PRIMARY} border={`2px solid ${PRIMARY}`} icon={<Mail size={19} strokeWidth={1.5} />}>
                  Invia una mail
                </Btn>
              </div>
            </div>
            <div className="lp-phone">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" style={{ padding: '104px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <SecHead label="Semplicità" title="Come funziona" sub="Tre passi e sei operativo." />
          <div className="lp-steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  <div style={{ width: 68, height: 68, borderRadius: 22, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon}
                  </div>
                  <div style={{
                    position: 'absolute', top: -10, right: -10,
                    width: 26, height: 26, borderRadius: '50%',
                    background: ACCENT, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{i + 1}</div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: TEXT }}>{s.title}</h3>
                <p style={{ color: TEXT_LIGHT, lineHeight: 1.7, fontSize: 15 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PER CHI È ── */}
      <section id="perchi" style={{ padding: '104px 28px', background: BG }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <SecHead label="Per chi è" title="Scelto da chi vive l'ospitalità" />
          <div className="lp-cards-grid">
            {TARGETS.map((card, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 20, padding: '36px 30px',
                border: `1px solid ${PRIMARY}14`,
                boxShadow: '0 2px 20px rgba(26,100,144,0.05)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  {card.icon}
                </div>
                <div style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{card.subtitle}</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 22, color: TEXT }}>{card.title}</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {card.items.map((item, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, color: TEXT_LIGHT, fontSize: 15 }}>
                      <CheckCircle size={15} strokeWidth={2} color={PRIMARY} style={{ flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNZIONALITÀ ── */}
      <section id="funzionalita" style={{ padding: '104px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <SecHead label="Features" title="Tutto quello che ti serve" sub="Nessun abbonamento a tool multipli. Una piattaforma, tutto incluso." />
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feat-card" style={{
                padding: 24, borderRadius: 16,
                background: BG, border: `1px solid ${PRIMARY}12`,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 13,
                  background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: TEXT }}>{f.title}</h4>
                <p style={{ color: TEXT_LIGHT, fontSize: 13, lineHeight: 1.65 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING / CTA ── */}
      <section id="contatti" style={{ padding: '104px 28px', background: `linear-gradient(140deg, ${PRIMARY} 0%, #0F3F5C 100%)` }}>
        <div style={{ maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: `${ACCENT}cc`, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', marginBottom: 20, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            Ogni progetto è diverso.<br />Parliamone.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 18, lineHeight: 1.8, marginBottom: 52 }}>
            Nessun pacchetto fisso: costruiamo insieme la soluzione giusta per la tua struttura, con un prezzo su misura.
          </p>
          <div className="lp-cta-row">
            <Btn href={WA_PRICE} bg="#25D366" icon={<MessageCircle size={19} strokeWidth={1.5} />} shadow="rgba(37,211,102,0.38)">
              Richiedi un preventivo
            </Btn>
            <Btn href={`mailto:${EMAIL}?subject=Preventivo StayApp`} bg="rgba(255,255,255,0.1)" color="#fff" border="2px solid rgba(255,255,255,0.35)" icon={<Mail size={19} strokeWidth={1.5} />}>
              Scrivi una mail
            </Btn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: TEXT, color: 'rgba(255,255,255,0.45)', padding: '52px 28px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div className="lp-footer-row">
            <div>
              <Logo light />
              <div style={{ fontSize: 13, marginTop: 8 }}>La piattaforma digitale per l'ospitalità italiana</div>
            </div>
            <div className="lp-footer-links">
              <a href="#funzionalita" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Funzionalità</a>
              <a href="#perchi"       style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Per chi è</a>
              <a href={`mailto:${EMAIL}`} style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{EMAIL}</a>
            </div>
            <div style={{ fontSize: 13 }}>© 2025 StayApp · P.IVA 00000000000</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-componenti ───────────────────────────────────────────────────────────

function Logo({ light }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, fontWeight: 700, color: light ? '#fff' : PRIMARY, letterSpacing: '-0.5px' }}>Stay</span>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, fontWeight: 700, color: ACCENT }}>App</span>
    </div>
  )
}

function Btn({ href, bg, color = '#fff', border, shadow, icon, children }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: bg, color,
        padding: '13px 26px', borderRadius: 10,
        textDecoration: 'none', fontSize: 15, fontWeight: 600,
        border: border || 'none',
        boxShadow: shadow ? `0 4px 24px ${shadow}` : 'none',
        whiteSpace: 'nowrap', cursor: 'pointer',
      }}
    >
      {icon}{children}
    </a>
  )
}

function SecHead({ label, title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 64 }}>
      {label && (
        <div style={{ color: ACCENT, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>
          {label}
        </div>
      )}
      <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.5px', color: TEXT }}>{title}</h2>
      {sub && <p style={{ color: TEXT_LIGHT, fontSize: 17, marginTop: 14 }}>{sub}</p>}
    </div>
  )
}

function PhoneMockup() {
  return (
    <div style={{
      width: 264, height: 532,
      background: '#111820', borderRadius: 42,
      padding: 9,
      boxShadow: `0 48px 96px rgba(26,100,144,0.30), 0 0 0 1px rgba(255,255,255,0.06)`,
    }}>
      {/* Schermo */}
      <div style={{
        width: '100%', height: '100%', borderRadius: 34,
        background: `linear-gradient(165deg, ${PRIMARY} 0%, #0C4060 40%, #0A2535 100%)`,
        overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Notch */}
        <div style={{ height: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4 }}>
          <div style={{ width: 72, height: 18, background: '#111820', borderRadius: 10 }} />
        </div>

        {/* Header app */}
        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={18} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>Hotel Bellavista</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Benvenuto · Check-in 14:00</div>
          </div>
        </div>

        {/* Cover bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}00)`, margin: '0 20px', borderRadius: 2, marginBottom: 16 }} />

        {/* Menu items */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {PHONE_ITEMS.map(({ icon, label }, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '11px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 500 }}>{label}</span>
              </div>
              <ChevronRight size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{
          padding: '12px 16px 16px',
          display: 'flex', justifyContent: 'space-around',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          marginTop: 12,
        }}>
          {[<Bell size={18} strokeWidth={1.5} />, <Smartphone size={18} strokeWidth={1.5} />, <Info size={18} strokeWidth={1.5} />].map((ic, i) => (
            <div key={i} style={{ color: i === 0 ? ACCENT : 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {ic}
              {i === 0 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
