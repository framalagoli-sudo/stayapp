import { useState, useEffect } from 'react'
import {
  MessageCircle, Mail, Smartphone, LayoutDashboard, QrCode,
  Star, Shield, Palette, Calendar, UtensilsCrossed, Menu, X,
  ArrowRight, Bell, ClipboardList, Info, Building2, Waves,
  CheckCircle, ChevronRight, Zap, Clock, DollarSign,
  Activity, Briefcase, ShoppingBag, GraduationCap, LogIn,
  RefreshCw, Edit3, Globe
} from 'lucide-react'

// ─── Palette ──────────────────────────────────────────────────────────────────
const PRIMARY    = '#1A6490'  // verde-blu
const ACCENT     = '#C4952A'  // oro beige (più caldo, meno rosso)
const LIGHT_P    = '#E0EFF7'
const LIGHT_A    = '#F8F2E3'
const BG         = '#F8F6F3'
const TEXT       = '#17252D'
const TEXT_LIGHT = '#496070'
const DARK       = '#0F2330'  // per sezioni scure

const WA_NUMBER = '393000000000' // TODO: sostituire (es. '393471234567')
const EMAIL     = 'fra.malagoli@gmail.com'
const WA_DEMO   = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20saperne%20di%20pi%C3%B9%20su%20StayApp.`
const WA_PRICE  = `https://wa.me/${WA_NUMBER}?text=Ciao!%20Vorrei%20un%20preventivo%20per%20StayApp.`

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .lp { font-family: 'DM Sans', sans-serif; }
  .lp h1, .lp h2, .lp h3, .lp h4 { font-family: 'Space Grotesk', sans-serif; }

  .lp-hero-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
  .lp-two-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .lp-indip-grid   { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
  .lp-six-grid     { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
  .lp-feat-grid    { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
  .lp-steps-grid   { display: grid; grid-template-columns: repeat(3,1fr); gap: 48px; }
  .lp-nav-links    { display: flex; gap: 32px; align-items: center; }
  .lp-phone        { display: flex; justify-content: center; align-items: center; }
  .lp-footer-row   { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
  .lp-footer-links { display: flex; gap: 28px; }
  .lp-cta-row      { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .lp-hero-btns    { display: flex; gap: 16px; flex-wrap: wrap; }
  .lp-mobile-btn   { display: none !important; }

  a.lp-navlink { color: ${TEXT_LIGHT}; text-decoration: none; font-size: 15px; font-weight: 500; transition: color .2s; }
  a.lp-navlink:hover { color: ${PRIMARY}; }

  .lp-featcard { transition: transform .2s, box-shadow .2s; }
  .lp-featcard:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(26,100,144,0.12) !important; }

  @media (max-width: 960px) {
    .lp-hero-grid  { grid-template-columns: 1fr; gap: 48px; }
    .lp-two-grid   { grid-template-columns: 1fr; }
    .lp-indip-grid { grid-template-columns: 1fr; }
    .lp-six-grid   { grid-template-columns: repeat(2,1fr); }
    .lp-feat-grid  { grid-template-columns: repeat(2,1fr); gap: 16px; }
    .lp-steps-grid { grid-template-columns: 1fr; gap: 32px; }
    .lp-phone      { display: none; }
    .lp-nav-links  { display: none !important; }
    .lp-mobile-btn { display: flex !important; }
    .lp-footer-row { flex-direction: column; text-align: center; }
    .lp-footer-links { flex-direction: column; gap: 12px; align-items: center; }
  }
  @media (max-width: 520px) {
    .lp-feat-grid { grid-template-columns: 1fr; }
    .lp-six-grid  { grid-template-columns: 1fr; }
    .lp-hero-btns { flex-direction: column; }
    .lp-cta-row   { flex-direction: column; align-items: stretch; }
  }
`

// ─── Dati ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: <Zap size={26} strokeWidth={1.5} color={PRIMARY} />, title: 'Attivi in 24 ore', text: "Ti consegniamo la piattaforma già configurata con i tuoi dati, il tuo logo e i tuoi colori. Zero installazioni." },
  { icon: <Edit3 size={26} strokeWidth={1.5} color={PRIMARY} />, title: 'Aggiorni da solo', text: "Cambi testo, foto, prezzi o menu dal tuo telefono in 2 minuti. Premi salva e in pochi secondi è online." },
  { icon: <Globe size={26} strokeWidth={1.5} color={PRIMARY} />, title: 'Cresci in autonomia', text: "I clienti trovano il tuo sito, scansionano il QR e usano l'app. Tu gestisci tutto senza dipendere da nessuno." },
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
  { icon: <Smartphone size={21} strokeWidth={1.5} color={PRIMARY} />,    title: "App per i tuoi clienti",    text: "Un QR code. I tuoi clienti aprono l'app direttamente dal telefono, senza download e senza registrazioni." },
  { icon: <Globe size={21} strokeWidth={1.5} color={PRIMARY} />,          title: 'Sito web professionale',    text: 'Landing page con SEO, galleria, testimonianze e form contatti. Trovato su Google, aggiornato da te.' },
  { icon: <Edit3 size={21} strokeWidth={1.5} color={PRIMARY} />,          title: 'Aggiorna dal telefono',     text: 'Testi, foto, prezzi, menu: tutto modificabile dal tuo smartphone in pochi tap. Niente PC richiesto.' },
  { icon: <LayoutDashboard size={21} strokeWidth={1.5} color={PRIMARY} />, title: 'Pannello semplice',        text: 'Un pannello pensato per chi non è un tecnico. Se sai usare WhatsApp, sai usare StayApp.' },
  { icon: <UtensilsCrossed size={21} strokeWidth={1.5} color={PRIMARY} />, title: 'Menu e servizi digitali', text: 'Categorie, voci, prezzi e foto sempre aggiornati. Basta ristampare o aspettare l\'agenzia.' },
  { icon: <Shield size={21} strokeWidth={1.5} color={PRIMARY} />,          title: 'GDPR incluso',             text: 'Privacy policy e cookie policy auto-generate. Consensi nei form. Niente consulente legale.' },
  { icon: <Palette size={21} strokeWidth={1.5} color={PRIMARY} />,         title: 'Tema personalizzato',      text: 'Colori, font e stile adattati al tuo brand. Fai da solo o ci pensiamo noi in fase di setup.' },
  { icon: <Star size={21} strokeWidth={1.5} color={PRIMARY} />,            title: 'Galleria, eventi, news',   text: 'Tutto quello che serve per raccontare la tua attività e tenerla viva online, aggiornato in tempo reale.' },
]

const PHONE_ITEMS = [
  { icon: <Bell size={14} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Servizi' },
  { icon: <UtensilsCrossed size={14} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Menù' },
  { icon: <ClipboardList size={14} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Richieste' },
  { icon: <Info size={14} strokeWidth={1.5} color="rgba(255,255,255,0.8)" />, label: 'Info' },
]

// ─── Componente principale ────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)

  useEffect(() => {
    document.title = "StayApp — L'app e il sito per la tua attività"
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navActive = scrolled || mobileOpen

  return (
    <div className="lp" style={{ background: BG, color: TEXT, minHeight: '100vh' }}>
      <style>{css}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: navActive ? 'rgba(248,246,243,0.96)' : 'transparent',
        backdropFilter: navActive ? 'blur(20px)' : 'none',
        borderBottom: navActive ? `1px solid ${PRIMARY}18` : 'none',
        transition: 'all .3s ease',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 28px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div className="lp-nav-links">
            {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([h, l]) => (
              <a key={h} href={h} className="lp-navlink">{l}</a>
            ))}
            <a href="/admin" className="lp-navlink" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: PRIMARY }}>
              <LogIn size={16} strokeWidth={1.5} /> Accedi
            </a>
            <Btn href={WA_DEMO} bg={ACCENT}>Richiedi una demo</Btn>
          </div>
          {/* hamburger */}
          <button className="lp-mobile-btn" onClick={() => setMobileOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: TEXT }}>
            {mobileOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
        {mobileOpen && (
          <div style={{ background: BG, padding: '16px 28px 28px', borderTop: `1px solid ${PRIMARY}15`, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMobileOpen(false)} style={{ color: TEXT, textDecoration: 'none', fontSize: 17, fontWeight: 500 }}>{l}</a>
            ))}
            <a href="/admin" style={{ color: PRIMARY, textDecoration: 'none', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={18} strokeWidth={1.5} /> Accedi
            </a>
            <Btn href={WA_DEMO} bg={ACCENT}>Richiedi una demo</Btn>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 28px 80px',
        background: `linear-gradient(150deg, ${BG} 35%, ${LIGHT_P} 100%)`,
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
          <div className="lp-hero-grid">
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: LIGHT_A, color: ACCENT,
                padding: '6px 16px', borderRadius: 100,
                fontSize: 13, fontWeight: 600, marginBottom: 32,
                border: `1px solid ${ACCENT}40`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
                Hai sempre sognato un'app per la tua attività?
              </div>
              <h1 style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1.5px', color: TEXT, marginBottom: 24 }}>
                Un'app per i clienti che hai.<br />
                <span style={{ color: PRIMARY }}>Un sito per trovarne di nuovi.</span>
              </h1>
              <p style={{ fontSize: 18, color: TEXT_LIGHT, lineHeight: 1.8, marginBottom: 44, maxWidth: 480 }}>
                Aggiorna testi, foto e menù dal tuo telefono in 2 minuti.
                Senza agenzie, senza WordPress, senza aspettare settimane per ogni modifica.
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
            <div className="lp-phone"><PhoneMockup /></div>
          </div>
        </div>
      </section>

      {/* ── DUE STRUMENTI ── */}
      <section style={{ padding: '104px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <SecHead label="La piattaforma" title="Due strumenti. Un'unica piattaforma." sub="Non devi scegliere tra un'app e un sito. Con StayApp li hai entrambi, e li gestisci dallo stesso posto." />
          <div className="lp-two-grid">
            {/* Card sinistra — app interna */}
            <div style={{
              background: DARK, borderRadius: 24, padding: '44px 40px',
              display: 'flex', flexDirection: 'column', gap: 24,
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${PRIMARY}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={26} strokeWidth={1.5} color="#fff" />
              </div>
              <div>
                <div style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Per i clienti che hai già</div>
                <h3 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 14, lineHeight: 1.2 }}>L'app interna per la tua attività</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.75 }}>
                  I tuoi clienti scansionano un QR code e hanno in mano tutto: menu digitale, lista servizi, richieste, info, galleria. Nessun download, nessuna registrazione.
                </p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Menu e servizi sempre aggiornati', 'Richieste in tempo reale dal cliente', 'Galleria foto e info sulla tua attività', 'Personalizzato con i tuoi colori e logo'].map((t, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                    <CheckCircle size={15} strokeWidth={2} color={ACCENT} style={{ flexShrink: 0 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Card destra — sito web */}
            <div style={{
              background: LIGHT_P, borderRadius: 24, padding: '44px 40px',
              display: 'flex', flexDirection: 'column', gap: 24,
              border: `1px solid ${PRIMARY}20`,
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 12px ${PRIMARY}20` }}>
                <Globe size={26} strokeWidth={1.5} color={PRIMARY} />
              </div>
              <div>
                <div style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Per trovare clienti nuovi</div>
                <h3 style={{ fontSize: 26, fontWeight: 700, color: TEXT, marginBottom: 14, lineHeight: 1.2 }}>Il sito web che aggiorni tu</h3>
                <p style={{ color: TEXT_LIGHT, fontSize: 15, lineHeight: 1.75 }}>
                  Una landing page professionale che si trova su Google, racconta la tua storia e cattura nuovi clienti. La aggiorni tu in autonomia, dal telefono, quando vuoi.
                </p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Sito ottimizzato per i motori di ricerca', 'Galleria, testimonianze e promozioni', 'Form di contatto con GDPR incluso', 'Aggiornabile in autonomia dal telefono'].map((t, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: TEXT_LIGHT, fontSize: 14 }}>
                    <CheckCircle size={15} strokeWidth={2} color={PRIMARY} style={{ flexShrink: 0 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDIPENDENZA ── */}
      <section style={{ padding: '104px 28px', background: DARK }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ color: ACCENT, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>Il vero vantaggio</div>
            <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 20 }}>
              Basta aspettare settimane<br />per un aggiornamento.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, maxWidth: 560, margin: '0 auto', lineHeight: 1.75 }}>
              Quanto hai speso l'anno scorso per far aggiornare il tuo sito? E quanto hai aspettato? Con StayApp sei tu al comando.
            </p>
          </div>

          {/* Prima / Dopo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center', marginBottom: 64 }}>
            {/* Prima */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Prima</div>
              {[
                { icon: <Clock size={16} strokeWidth={1.5} />, t: 'Chiami l\'agenzia e aspetti' },
                { icon: <DollarSign size={16} strokeWidth={1.5} />, t: '150–300€ per ogni modifica' },
                { icon: <RefreshCw size={16} strokeWidth={1.5} />, t: '2–3 settimane di attesa' },
                { icon: <X size={16} strokeWidth={1.5} />, t: 'Risultato spesso sbagliato' },
              ].map(({ icon, t }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.45)', fontSize: 15, marginBottom: 14 }}>
                  <div style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{icon}</div> {t}
                </div>
              ))}
            </div>

            {/* Freccia centrale */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ArrowRight size={28} strokeWidth={1.5} color={ACCENT} />
            </div>

            {/* Dopo */}
            <div style={{ background: `${PRIMARY}25`, borderRadius: 20, padding: '32px 28px', border: `1px solid ${PRIMARY}40` }}>
              <div style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Con StayApp</div>
              {[
                { icon: <Smartphone size={16} strokeWidth={1.5} />, t: 'Apri l\'app dal telefono' },
                { icon: <Edit3 size={16} strokeWidth={1.5} />, t: 'Modifichi in 2 minuti' },
                { icon: <Zap size={16} strokeWidth={1.5} />, t: 'Salvi ed è online subito' },
                { icon: <CheckCircle size={16} strokeWidth={1.5} />, t: 'Esattamente come volevi' },
              ].map(({ icon, t }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.85)', fontSize: 15, marginBottom: 14 }}>
                  <div style={{ color: ACCENT, flexShrink: 0 }}>{icon}</div> {t}
                </div>
              ))}
            </div>
          </div>

          {/* 3 pilastri */}
          <div className="lp-indip-grid">
            {[
              { icon: <DollarSign size={28} strokeWidth={1.5} color={ACCENT} />, title: 'Zero sprechi', text: 'Niente più bollette salate ad agenzie o consulenti per ogni piccola modifica. Paghi una volta, gestisci per sempre.' },
              { icon: <Clock size={28} strokeWidth={1.5} color={ACCENT} />, title: 'Zero attese', text: 'Premi salva e in pochi secondi la modifica è online. Non devi chiedere permesso a nessuno.' },
              { icon: <Zap size={28} strokeWidth={1.5} color={ACCENT} />, title: 'Zero dipendenze', text: 'Niente WordPress, niente agenzie di comunicazione, niente consulenti. Sei tu il responsabile della tua presenza online.' },
            ].map((p, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  {p.icon}
                </div>
                <h4 style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{p.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" style={{ padding: '104px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <SecHead label="Semplicità" title="Come funziona" sub="Sei operativo in 24 ore. Poi vai avanti da solo." />
          <div className="lp-steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 68, height: 68, margin: '0 auto 24px' }}>
                  <div style={{ width: 68, height: 68, borderRadius: 22, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon}
                  </div>
                  <div style={{
                    position: 'absolute', top: -10, right: -10,
                    width: 26, height: 26, borderRadius: '50%',
                    background: ACCENT, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                  }}>{i + 1}</div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: TEXT }}>{s.title}</h3>
                <p style={{ color: TEXT_LIGHT, lineHeight: 1.75, fontSize: 15 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PER CHI È ── */}
      <section id="perchi" style={{ padding: '104px 28px', background: BG }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <SecHead label="Per chi è" title="Per qualsiasi attività con clienti" sub="Se hai clienti da gestire e nuovi da trovare, StayApp è per te." />
          <div className="lp-six-grid">
            {TARGETS.map((t, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                border: `1px solid ${PRIMARY}12`,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {t.icon}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{t.sub}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNZIONALITÀ ── */}
      <section id="funzionalita" style={{ padding: '104px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <SecHead label="Features" title="Tutto quello che ti serve" sub="Un solo strumento. Nessun abbonamento extra, nessuna integrazione." />
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-featcard" style={{ padding: 24, borderRadius: 16, background: BG, border: `1px solid ${PRIMARY}12` }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: LIGHT_P, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: TEXT }}>{f.title}</h4>
                <p style={{ color: TEXT_LIGHT, fontSize: 13, lineHeight: 1.65 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCEDI (banner per clienti esistenti) ── */}
      <section style={{ padding: '64px 28px', background: LIGHT_P, borderTop: `1px solid ${PRIMARY}20`, borderBottom: `1px solid ${PRIMARY}20` }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Hai già un account StayApp?</h3>
          <p style={{ color: TEXT_LIGHT, fontSize: 16, marginBottom: 28 }}>Accedi direttamente al tuo pannello di gestione.</p>
          <Btn href="/admin" bg={PRIMARY} icon={<LogIn size={18} strokeWidth={1.5} />}>
            Vai al pannello
          </Btn>
        </div>
      </section>

      {/* ── PRICING / CTA ── */}
      <section id="contatti" style={{ padding: '104px 28px', background: `linear-gradient(140deg, ${PRIMARY} 0%, ${DARK} 100%)` }}>
        <div style={{ maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: `${ACCENT}cc`, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', marginBottom: 20, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            Ogni attività è diversa.<br />Parliamone.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 18, lineHeight: 1.8, marginBottom: 52 }}>
            Nessun pacchetto standard: costruiamo insieme la soluzione giusta per la tua attività, con un prezzo su misura.
          </p>
          <div className="lp-cta-row">
            <Btn href={WA_PRICE} bg="#25D366" icon={<MessageCircle size={19} strokeWidth={1.5} />} shadow="rgba(37,211,102,0.38)">
              Richiedi un preventivo
            </Btn>
            <Btn href={`mailto:${EMAIL}?subject=Preventivo StayApp`} bg="rgba(255,255,255,0.08)" color="#fff" border="2px solid rgba(255,255,255,0.3)" icon={<Mail size={19} strokeWidth={1.5} />}>
              Scrivi una mail
            </Btn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: TEXT, color: 'rgba(255,255,255,0.42)', padding: '52px 28px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div className="lp-footer-row">
            <div>
              <Logo light />
              <div style={{ fontSize: 13, marginTop: 8 }}>L'app e il sito per la tua attività</div>
            </div>
            <div className="lp-footer-links">
              {[['#come-funziona','Come funziona'],['#funzionalita','Funzionalità'],['#perchi','Per chi è']].map(([h, l]) => (
                <a key={h} href={h} style={{ color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontSize: 14 }}>{l}</a>
              ))}
              <a href={`mailto:${EMAIL}`} style={{ color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontSize: 14 }}>{EMAIL}</a>
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
      {label && <div style={{ color: ACCENT, fontWeight: 700, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>{label}</div>}
      <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.5px', color: TEXT }}>{title}</h2>
      {sub && <p style={{ color: TEXT_LIGHT, fontSize: 17, marginTop: 14 }}>{sub}</p>}
    </div>
  )
}

function PhoneMockup() {
  return (
    <div style={{ width: 264, height: 532, background: '#111820', borderRadius: 42, padding: 9, boxShadow: `0 48px 96px rgba(26,100,144,0.28), 0 0 0 1px rgba(255,255,255,0.05)` }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 34, background: `linear-gradient(165deg, ${PRIMARY} 0%, #0C4060 40%, #0A2535 100%)`, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 4 }}>
          <div style={{ width: 72, height: 18, background: '#111820', borderRadius: 10 }} />
        </div>
        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={18} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>La Tua Attività</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Benvenuto · Aggiornato oggi</div>
          </div>
        </div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}00)`, margin: '0 20px 16px', borderRadius: 2 }} />
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {PHONE_ITEMS.map(({ icon, label }, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 500 }}>{label}</span>
              </div>
              <ChevronRight size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px 16px', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 12 }}>
          {[<Bell size={18} strokeWidth={1.5} />, <Smartphone size={18} strokeWidth={1.5} />, <Info size={18} strokeWidth={1.5} />].map((ic, i) => (
            <div key={i} style={{ color: i === 0 ? ACCENT : 'rgba(255,255,255,0.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {ic}
              {i === 0 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
