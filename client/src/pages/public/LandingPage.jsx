import { useState, useEffect } from 'react'
import {
  MessageCircle, Mail, Smartphone, LayoutDashboard, QrCode,
  Star, Shield, Palette, Calendar, UtensilsCrossed, Menu, X,
  CheckCircle, ArrowRight
} from 'lucide-react'

const PRIMARY    = '#1E6E7E'  // verde petrolio
const ACCENT     = '#C9922A'  // ocra
const LIGHT_P    = '#E8F4F7'
const LIGHT_A    = '#FDF6E9'
const BG         = '#F9F7F2'
const TEXT       = '#1A2B2F'
const TEXT_LIGHT = '#4A6570'

// TODO: sostituire con il numero WhatsApp reale (solo cifre, con prefisso internazionale)
const WA_NUMBER = '393000000000'
const EMAIL     = 'fra.malagoli@gmail.com'
const WA_DEMO   = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20saperne%20di%20pi%C3%B9%20su%20StayApp.`
const WA_PRICE  = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20un%20preventivo%20per%20StayApp.`

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-hero-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .lp-steps-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 40px; }
  .lp-cards-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; }
  .lp-feat-grid   { display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; }
  .lp-nav-links   { display: flex; gap: 32px; align-items: center; }
  .lp-phone       { display: flex; justify-content: center; }
  .lp-footer-row  { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
  .lp-cta-row     { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .lp-hero-btns   { display: flex; gap: 16px; flex-wrap: wrap; }
  .lp-mobile-menu { display: none; }

  @media (max-width: 900px) {
    .lp-hero-grid  { grid-template-columns: 1fr; gap: 48px; }
    .lp-steps-grid { grid-template-columns: 1fr; gap: 32px; }
    .lp-cards-grid { grid-template-columns: 1fr; gap: 24px; }
    .lp-feat-grid  { grid-template-columns: repeat(2,1fr); gap: 16px; }
    .lp-phone      { display: none; }
    .lp-nav-links  { display: none; }
    .lp-mobile-menu { display: flex; }
    .lp-footer-row { flex-direction: column; text-align: center; gap: 16px; }
    .lp-footer-links { flex-direction: column; gap: 12px; align-items: center; }
  }
  @media (max-width: 480px) {
    .lp-feat-grid  { grid-template-columns: 1fr; }
    .lp-hero-btns  { flex-direction: column; }
    .lp-cta-row    { flex-direction: column; align-items: center; }
  }
`

const FEATURES = [
  { icon: <Smartphone size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'PWA installabile', text: "Gli ospiti aggiungono l'app alla home senza passare dagli store. Funziona offline." },
  { icon: <QrCode size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'QR code personalizzato', text: 'Un codice da stampare o esporre. Basta inquadrarlo per accedere a tutto.' },
  { icon: <LayoutDashboard size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Pannello admin', text: 'Gestisci contenuti, richieste e impostazioni da qualsiasi dispositivo, ovunque.' },
  { icon: <Star size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Minisito marketing', text: 'Landing page professionale con SEO, galleria, testimonianze e form contatti.' },
  { icon: <UtensilsCrossed size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Menu digitale', text: 'Categorie, piatti, prezzi e foto. Aggiornabile in tempo reale senza ristampare.' },
  { icon: <Shield size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'GDPR incluso', text: 'Privacy e cookie policy auto-generate. Consensi obbligatori nei form.' },
  { icon: <Palette size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Tema personalizzato', text: 'Colori, font e stile adattati al tuo brand. Nessuna competenza tecnica richiesta.' },
  { icon: <Calendar size={24} strokeWidth={1.5} color={PRIMARY} />, title: 'Eventi e attività', text: 'Calendari, escursioni, prenotazioni: tutto gestito dalla stessa piattaforma.' },
]

const TARGETS = [
  {
    emoji: '🏨',
    subtitle: 'Strutture ricettive',
    title: 'Hotel e B&B',
    items: ['PWA ospite con QR code', 'Richieste camera in tempo reale', 'Servizi, attività ed escursioni', 'Minisito marketing con booking'],
  },
  {
    emoji: '🍽️',
    subtitle: 'Ristorazione',
    title: 'Ristoranti e Bar',
    items: ['Menu digitale aggiornabile', 'Galleria piatti e ambiente', 'Orari, info e contatti', 'Minisito con form prenotazione'],
  },
  {
    emoji: '🏄',
    subtitle: 'Sport, benessere, servizi',
    title: 'Attività e Professionisti',
    items: ['Landing page professionale', 'Sezione team e specializzazioni', 'Servizi e corsi dettagliati', 'Form contatti GDPR-compliant'],
  },
]

const STEPS = [
  { icon: <QrCode size={28} strokeWidth={1.5} color={PRIMARY} />, title: 'Ricevi il QR code', text: 'Ti consegniamo un QR personalizzato da stampare o esporre nella struttura. Nessuna configurazione tecnica da parte tua.' },
  { icon: <Smartphone size={28} strokeWidth={1.5} color={PRIMARY} />, title: "L'ospite accede", text: "Scansiona il QR e apre la PWA istantaneamente, senza scaricare nulla. Menu, servizi e richieste: tutto a portata di schermo." },
  { icon: <LayoutDashboard size={28} strokeWidth={1.5} color={PRIMARY} />, title: 'Tu gestisci tutto', text: 'Dal pannello admin aggiorni contenuti, rispondi alle richieste e personalizzi colori e testi in pochi clic.' },
]

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)

  useEffect(() => {
    document.title = 'StayApp — La piattaforma digitale per l\'ospitalità'
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navBg = scrolled || mobileOpen
    ? 'rgba(249,247,242,0.97)'
    : 'transparent'

  return (
    <>
      <style>{css}</style>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: navBg,
        backdropFilter: (scrolled || mobileOpen) ? 'blur(16px)' : 'none',
        borderBottom: (scrolled || mobileOpen) ? `1px solid ${PRIMARY}18` : 'none',
        transition: 'all 0.25s ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Logo />
          <div className="lp-nav-links">
            {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([href, label]) => (
              <a key={href} href={href} style={{ color: TEXT_LIGHT, textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>{label}</a>
            ))}
            <CTABtn href={WA_DEMO} bg={ACCENT}>Richiedi una demo</CTABtn>
          </div>
          <button
            className="lp-mobile-menu"
            onClick={() => setMobileOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: TEXT }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{ background: BG, padding: '16px 24px 24px', borderTop: `1px solid ${PRIMARY}15`, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} style={{ color: TEXT, textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>{label}</a>
            ))}
            <CTABtn href={WA_DEMO} bg={ACCENT}>Richiedi una demo</CTABtn>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '120px 24px 80px',
        background: `linear-gradient(140deg, ${BG} 0%, ${LIGHT_P} 100%)`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <div className="lp-hero-grid">
            {/* Testo */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: LIGHT_A, color: ACCENT,
                padding: '6px 16px', borderRadius: 100,
                fontSize: 13, fontWeight: 600, marginBottom: 28,
                border: `1px solid ${ACCENT}40`,
              }}>
                ✦ &nbsp;PWA + Minisito marketing · tutto in uno
              </div>
              <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', color: TEXT, marginBottom: 24 }}>
                Il tuo hotel, ristorante<br />o attività{' '}
                <span style={{ color: PRIMARY }}>online in 24 ore</span>
              </h1>
              <p style={{ fontSize: 18, color: TEXT_LIGHT, lineHeight: 1.75, marginBottom: 40, maxWidth: 480 }}>
                Un QR code. Gli ospiti accedono a una PWA con menu digitale, servizi e richieste. Tu gestisci tutto da un pannello semplice.
              </p>
              <div className="lp-hero-btns">
                <CTABtn href={WA_DEMO} bg="#25D366" icon={<MessageCircle size={20} strokeWidth={1.5} />} shadow="rgba(37,211,102,0.35)">
                  Scrivici su WhatsApp
                </CTABtn>
                <CTABtn href={`mailto:${EMAIL}?subject=Richiesta informazioni StayApp`} bg="#fff" color={PRIMARY} border={PRIMARY} icon={<Mail size={20} strokeWidth={1.5} />}>
                  Invia una mail
                </CTABtn>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="lp-phone">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section id="come-funziona" style={{ padding: '100px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <SectionHeader label="Semplicità" title="Come funziona" sub="Tre passi e sei operativo." />
          <div className="lp-steps-grid">
            {STEPS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 16px' }}>
                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 20px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {step.icon}
                  </div>
                  <span style={{
                    position: 'absolute', top: -8, right: -8,
                    background: ACCENT, color: '#fff',
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>{i + 1}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ color: TEXT_LIGHT, lineHeight: 1.7, fontSize: 15 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PER CHI È */}
      <section id="perchi" style={{ padding: '100px 24px', background: BG }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader label="Target" title="Per chi è StayApp" />
          <div className="lp-cards-grid">
            {TARGETS.map((card, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 20, padding: '36px 32px',
                border: `1px solid ${PRIMARY}15`,
                boxShadow: '0 4px 24px rgba(30,110,126,0.06)',
              }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>{card.emoji}</div>
                <div style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{card.subtitle}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: TEXT }}>{card.title}</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {card.items.map((item, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, color: TEXT_LIGHT, fontSize: 15 }}>
                      <CheckCircle size={16} color={PRIMARY} strokeWidth={2} style={{ flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNZIONALITÀ */}
      <section id="funzionalita" style={{ padding: '100px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader label="Features" title="Tutto quello che ti serve" sub="Nessun abbonamento a tool multipli. Una piattaforma, tutto incluso." />
          <div className="lp-feat-grid">
            {FEATURES.map((feat, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 16, background: BG, border: `1px solid ${PRIMARY}12` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {feat.icon}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: TEXT }}>{feat.title}</h4>
                <p style={{ color: TEXT_LIGHT, fontSize: 13, lineHeight: 1.65 }}>{feat.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING / CTA */}
      <section id="contatti" style={{ padding: '100px 24px', background: `linear-gradient(135deg, ${PRIMARY} 0%, #0D4A56 100%)` }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: ACCENT, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', marginBottom: 20, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Ogni progetto è diverso.<br />Parliamone.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 18, lineHeight: 1.75, marginBottom: 48 }}>
            Nessun pacchetto fisso: costruiamo insieme la soluzione giusta per la tua struttura, con un prezzo su misura.
          </p>
          <div className="lp-cta-row">
            <CTABtn href={WA_PRICE} bg="#25D366" icon={<MessageCircle size={20} strokeWidth={1.5} />} shadow="rgba(37,211,102,0.4)">
              Richiedi un preventivo
            </CTABtn>
            <CTABtn href={`mailto:${EMAIL}?subject=Preventivo StayApp`} bg="rgba(255,255,255,0.12)" color="#fff" border="rgba(255,255,255,0.4)" icon={<Mail size={20} strokeWidth={1.5} />}>
              Scrivi una mail
            </CTABtn>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: TEXT, color: 'rgba(255,255,255,0.5)', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="lp-footer-row">
            <div>
              <Logo light />
              <div style={{ fontSize: 13, marginTop: 6 }}>La piattaforma digitale per l'ospitalità italiana</div>
            </div>
            <div className="lp-footer-links" style={{ display: 'flex', gap: 28, fontSize: 14 }}>
              <a href="#funzionalita" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Funzionalità</a>
              <a href="#perchi"       style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Per chi è</a>
              <a href={`mailto:${EMAIL}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{EMAIL}</a>
            </div>
            <div style={{ fontSize: 13 }}>© 2025 StayApp · P.IVA 00000000000</div>
          </div>
        </div>
      </footer>
    </>
  )
}

/* ─── Componenti interni ─── */

function Logo({ light }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: light ? '#fff' : PRIMARY, letterSpacing: '-0.5px' }}>Stay</span>
      <span style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>App</span>
    </div>
  )
}

function CTABtn({ href, bg, color = '#fff', border, shadow, icon, children }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: bg, color,
        padding: '14px 28px', borderRadius: 10,
        textDecoration: 'none', fontSize: 16, fontWeight: 700,
        border: border ? `2px solid ${border}` : 'none',
        boxShadow: shadow ? `0 4px 24px ${shadow}` : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </a>
  )
}

function SectionHeader({ label, title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 64 }}>
      {label && (
        <div style={{ color: ACCENT, fontWeight: 700, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>
          {label}
        </div>
      )}
      <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.5px', color: TEXT }}>{title}</h2>
      {sub && <p style={{ color: TEXT_LIGHT, fontSize: 17, marginTop: 12 }}>{sub}</p>}
    </div>
  )
}

function PhoneMockup() {
  return (
    <div style={{
      width: 270, height: 540,
      background: '#111820', borderRadius: 40,
      padding: 10,
      boxShadow: `0 40px 80px rgba(30,110,126,0.28), 0 0 0 6px ${PRIMARY}30`,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 32,
        background: `linear-gradient(160deg, ${PRIMARY} 0%, #0D4A56 45%, #111820 100%)`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
      }}>
        {/* Icon */}
        <div style={{ width: 60, height: 60, background: ACCENT, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QrCode size={30} color="#fff" strokeWidth={1.5} />
        </div>
        {/* Welcome */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Hotel Bellavista</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>Benvenuto · Check-in 14:00</div>
        </div>
        {/* Fake cards */}
        {['🛎  Servizi', '🍽  Menù', '📋  Richieste', 'ℹ  Info'].map((label, i) => (
          <div key={i} style={{
            width: '100%', background: 'rgba(255,255,255,0.09)',
            borderRadius: 10, padding: '10px 14px',
            color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {label}
            <ArrowRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
          </div>
        ))}
      </div>
    </div>
  )
}
