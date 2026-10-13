'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import LandingBlockRenderer from '@/components/LandingBlockRenderer'
import { BLOCK_PATTERNS, CATEGORIE_SEZIONI, blocchiDiSezione } from '@/lib/blockPatterns'
import { getHeadingFamily, getBodyFamily, FONTS_URL } from '@/lib/fonts'
import { eScuro, variabiliSuperficie } from '@/lib/superficie'

// La galleria delle sezioni pronte: ognuna si vede com'è davvero, disegnata
// dagli stessi blocchi del sito e nei colori e caratteri di QUESTO sito. Un
// clic la inserisce. Qui dentro non si naviga e non si scrive: l'anteprima è
// coperta da un velo che raccoglie il clic.

// La larghezza a cui si disegna l'anteprima prima di rimpicciolirla: quella di
// una pagina da computer, così le colonne restano colonne.
const LARGO = 1200
const ALTO_MASSIMO = 440

// I recapiti finti servono solo a far comparire «Dove siamo» nell'anteprima:
// sul sito il blocco legge quelli veri dalle Informazioni.
const ENTITA_ANTEPRIMA = { name: 'La tua attività', slug: 'anteprima', phone: '000 000 0000', email: 'info@esempio.it', schedule: 'Lun–Ven 9:00–18:00', theme: {} }

// Un pulsante senza destinazione sul sito non compare; nell'anteprima sì, o la
// sezione sembrerebbe monca. Vale solo qui: nella pagina arriva senza destinazione.
const PULSANTI = [['cta1_text', 'cta1_url'], ['button_text', 'button_url'], ['button_label', 'button_url']]
function conIPulsanti(blocco) {
  const data = { ...blocco.data }
  for (const [testo, dove] of PULSANTI) if (data[testo] && data[dove] === '') data[dove] = '#'
  return { ...blocco, data }
}

function Anteprima({ blocchi, tema }) {
  const fuori = useRef(null), dentro = useRef(null)
  const [misure, setMisure] = useState({ scala: 0.25, alto: 120 })
  useEffect(() => {
    const misura = () => {
      if (!fuori.current || !dentro.current) return
      const scala = fuori.current.clientWidth / LARGO
      setMisure({ scala, alto: Math.min(ALTO_MASSIMO, Math.max(60, dentro.current.offsetHeight * scala)) })
    }
    misura()
    const ro = new ResizeObserver(misura)
    ro.observe(fuori.current); ro.observe(dentro.current)
    return () => ro.disconnect()
  }, [])
  const primario = /^#[0-9a-fA-F]{6}$/.test(tema?.primaryColor || '') ? tema.primaryColor : '#1a1a2e'
  const fondo = /^#[0-9a-fA-F]{6}$/.test(tema?.bgColor || '') ? tema.bgColor : '#ffffff'
  const heading = getHeadingFamily(tema?.fontHeading), body = getBodyFamily(tema?.fontBody)
  return (
    <div ref={fuori} style={{ position: 'relative', height: misure.alto, overflow: 'hidden', background: fondo }}>
      <div ref={dentro} className="gs-anteprima" inert
        style={{ width: LARGO, transform: `scale(${misure.scala})`, transformOrigin: 'top left', fontFamily: body, color: tema?.textColor || '#1a1a2e', background: fondo, ...variabiliSuperficie(eScuro(fondo)), '--accento': tema?.secondaryColor || primario }}>
        <LandingBlockRenderer blocks={blocchi} entity={ENTITA_ANTEPRIMA} entityType="attivita" mini={{}} primary={primario} secondary={tema?.secondaryColor}
          heading={heading} body={body} slug="anteprima" privacyUrl="#" aziendaId={null} lang="it" base="#" />
      </div>
    </div>
  )
}

export default function GalleriaSezioni({ tema, onScegli, onChiudi }) {
  const [categoria, setCategoria] = useState(CATEGORIE_SEZIONI[0].key)
  // Gli id servono solo a disegnare: quelli veri li dà l'editor quando la sezione entra nella pagina.
  const sezioni = useMemo(() => {
    let n = 0
    return BLOCK_PATTERNS.map(p => ({ ...p, anteprima: blocchiDiSezione(p, () => `gs-${n++}`).map(conIPulsanti) }))
  }, [])
  useEffect(() => {
    if (!document.getElementById('gs-caratteri')) {
      const l = document.createElement('link'); l.id = 'gs-caratteri'; l.rel = 'stylesheet'; l.href = FONTS_URL
      document.head.appendChild(l)
    }
    const tasti = e => { if (e.key === 'Escape') { e.stopPropagation(); onChiudi() } }
    window.addEventListener('keydown', tasti, true)
    return () => window.removeEventListener('keydown', tasti, true)
  }, [onChiudi])

  const visibili = sezioni.filter(s => s.categoria === categoria)
  return (
    <div data-galleria-sezioni role="dialog" aria-modal="true" aria-label="Sezioni pronte"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onChiudi() }}>
      {/* Dentro un'anteprima niente si anima e niente compare «dopo»: si vede subito tutta. */}
      <style>{`.gs-anteprima .lbr-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
        .gs-scheda:hover, .gs-scheda:focus-visible { border-color: #5b6af8 !important; box-shadow: 0 6px 24px rgba(91,106,248,0.22) !important; outline: none; }`}</style>
      <div style={{ background: '#f5f5f8', borderRadius: 16, width: '100%', maxWidth: 1120, height: 'min(88vh, 860px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #ececf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>Sezioni pronte</div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>Le vedi nei colori del tuo sito. Scegline una: arriva nella pagina già composta, e ci scrivi i tuoi testi.</div>
          </div>
          <button onClick={onChiudi} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 6, display: 'flex' }}><X size={20} strokeWidth={1.5} /></button>
        </div>
        <div style={{ padding: '10px 20px', background: '#fff', borderBottom: '1px solid #ececf2', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {CATEGORIE_SEZIONI.map(c => (
            <button key={c.key} data-gs-categoria={c.key} onClick={() => setCategoria(c.key)}
              style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: categoria === c.key ? '#1a1a2e' : '#f0f0f4', color: categoria === c.key ? '#fff' : '#555' }}>
              {c.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{sezioni.filter(s => s.categoria === c.key).length}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 460px), 1fr))', gap: 18, alignItems: 'start' }}>
            {visibili.map(s => (
              <div key={s.key} role="button" tabIndex={0} className="gs-scheda" data-gs-sezione={s.key} onClick={() => onScegli(s.key)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onScegli(s.key) } }}
                style={{ display: 'block', padding: 0, textAlign: 'left', background: '#fff', border: '1.5px solid #e4e4ec', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', fontFamily: 'inherit', minWidth: 0 }}>
                <div style={{ position: 'relative', borderBottom: '1px solid #ececf2' }}>
                  <Anteprima blocchi={s.anteprima} tema={tema} />
                  {/* Il velo: un clic qui sceglie la sezione, non preme un pulsante dell'anteprima. */}
                  <div style={{ position: 'absolute', inset: 0 }} />
                </div>
                <div style={{ padding: '11px 14px 13px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1a2e' }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#777', marginTop: 2, lineHeight: 1.45 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
