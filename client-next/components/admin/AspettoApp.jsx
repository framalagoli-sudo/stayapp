'use client'
import { useEffect, useRef, useState } from 'react'
import { Utensils, Home, Compass, Info, Wheat, Milk } from 'lucide-react'
import {
  SFONDI_APP, SCHEDE_APP, ANGOLI_APP, INTESTAZIONI_APP, ALLERGENI_APP, STILI_APP,
  paletteApp, sfondoApp, aspettoApp, coloriAllergene,
} from '@/lib/palette-app'
import { HEADING_FONTS, BODY_FONTS, HEADING_FAMILIES, BODY_FAMILIES, caricaFont } from '@/lib/fonts'

const RAGGI = { rounded: 16, mixed: 8, square: 0 }

// L'aspetto dell'app del QR, uguale per i tre tipi di entità. Si salva nel
// tema (`appSfondo` + `app`) ma lo legge solo l'app: il sito non cambia.
// Ogni scelta passa comunque da paletteApp, che non lascia passare un colore
// illeggibile: qui si dice al cliente quando è successo e cosa si usa al posto.
export default function AspettoApp({ theme = {}, onSave }) {
  const [tema, setTema] = useState(theme)
  const [stato, setStato] = useState('')
  const timer = useRef(null)

  const pal = paletteApp(tema)
  const asp = aspettoApp(tema)
  const app = (tema.app && typeof tema.app === 'object') ? tema.app : {}

  useEffect(() => { caricaFont(pal.fontHeading); caricaFont(pal.fontBody) }, [pal.fontHeading, pal.fontBody])
  useEffect(() => () => clearTimeout(timer.current), [])

  // I colori si trascinano: si salva quando il cliente si ferma.
  function aggiorna(nuovo) {
    setTema(nuovo)
    setStato('salvo')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try { await onSave(nuovo); setStato('salvato') }
      catch (e) { setStato(e?.message || 'Salvataggio non riuscito') }
    }, 600)
  }
  const cambia = (chiave, valore) => {
    const nuovoApp = { ...app, [chiave]: valore, stile: 'su-misura' }
    if (valore == null || valore === '') delete nuovoApp[chiave]
    aggiorna({ ...tema, app: nuovoApp })
  }
  function scegliStile(s) {
    // Uno stile pronto cambia forma e fondo; i colori scelti dal cliente e lo
    // stile degli allergeni restano suoi. «Come il sito» invece azzera tutto:
    // chi lo preme si aspetta l'app identica al sito.
    const tieni = {}
    if (s.key !== 'sito') for (const k of ['accento', 'icone', 'testo', 'allergeni']) if (app[k]) tieni[k] = app[k]
    aggiorna({ ...tema, appSfondo: s.sfondo, app: { ...s.app, ...tieni, stile: s.key } })
  }

  const stileAttivo = STILI_APP.some(s => s.key === app.stile) ? app.stile
    : (!app.stile && sfondoApp(tema) === 'sito' ? 'sito' : null)

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Aspetto dell'app</div>
        <span style={{ fontSize: 12, color: stato === 'salvato' ? '#38a169' : stato === 'salvo' ? '#888' : '#c53030' }}>
          {stato === 'salvato' ? '✓ Salvato' : stato === 'salvo' ? 'Salvataggio…' : stato}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, margin: '3px 0 16px' }}>
        Vale solo per l'app che si apre dal QR code: il sito resta com'è. Se un colore non si leggesse, l'app ne usa uno leggibile e te lo diciamo qui.
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <Etichetta>Stili pronti</Etichetta>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 18 }}>
            {STILI_APP.map(s => {
              const p = paletteApp({ ...tema, appSfondo: s.sfondo, app: { ...s.app } })
              const attivo = stileAttivo === s.key
              return (
                <button key={s.key} type="button" onClick={() => scegliStile(s)} aria-pressed={attivo}
                  style={{ padding: 8, borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: '#fff',
                    border: `2px solid ${attivo ? '#1a1a2e' : '#e5e5e5'}` }}>
                  <div style={{ background: p.bgColor, borderRadius: 6, padding: 6, marginBottom: 6, border: '1px solid #e5e5e5' }}>
                    <div style={{ background: p.cardBg, borderRadius: RAGGI[p.borderStyle] ?? 8, padding: '5px 7px', border: `1px solid ${p.borderColor}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: p.textColor, fontFamily: HEADING_FAMILIES[p.fontHeading] }}>Aa</div>
                      <div style={{ width: 26, height: 5, borderRadius: 3, background: p.primary, marginTop: 3 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: attivo ? 700 : 600, color: '#1a1a2e' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{s.desc}</div>
                </button>
              )
            })}
          </div>

          <details open={stileAttivo === null}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>Personalizza</summary>

            <Etichetta>Sfondo</Etichetta>
            <Scelte catalogo={SFONDI_APP} valore={sfondoApp(tema)}
              onScegli={k => aggiorna({ ...tema, appSfondo: k, app: { ...app, stile: 'su-misura', ...(k === 'personale' && !asp.sfondo ? { sfondo: '#f6efe4' } : {}) } })} />
            {sfondoApp(tema) === 'personale' && (
              <Colore etichetta="Colore dello sfondo" valore={asp.sfondo} onCambia={v => cambia('sfondo', v)} />
            )}

            <Colore etichetta="Colore principale (prezzi, pulsanti)" valore={asp.accento} ripiego={pal.brand}
              onCambia={v => cambia('accento', v)} sostituito={pal.sostituiti.accento} />
            <Colore etichetta="Colore delle icone" valore={asp.icone} ripiego={pal.iconColor}
              onCambia={v => cambia('icone', v)} sostituito={pal.sostituiti.icone} />
            <Colore etichetta="Colore dei testi" valore={asp.testo} ripiego={pal.textColor}
              onCambia={v => cambia('testo', v)} sostituito={pal.sostituiti.testo} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, margin: '6px 0 14px' }}>
              <label style={lbl}>Carattere dei titoli
                <select value={asp.fontTitoli || ''} onChange={e => cambia('fontTitoli', e.target.value || null)} style={sel}>
                  <option value="">Come il sito</option>
                  {HEADING_FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </label>
              <label style={lbl}>Carattere dei testi
                <select value={asp.fontTesto || ''} onChange={e => cambia('fontTesto', e.target.value || null)} style={sel}>
                  <option value="">Come il sito</option>
                  {BODY_FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </label>
            </div>

            <Etichetta>Schede</Etichetta>
            <Scelte catalogo={SCHEDE_APP} valore={asp.schede || 'ombra'} onScegli={k => cambia('schede', k)} />
            <Etichetta>Angoli</Etichetta>
            <Scelte catalogo={ANGOLI_APP} valore={pal.borderStyle || 'mixed'} onScegli={k => cambia('angoli', k)} />
            <Etichetta>Intestazione</Etichetta>
            <Scelte catalogo={INTESTAZIONI_APP} valore={asp.intestazione} onScegli={k => cambia('intestazione', k)} />
            <Etichetta>Allergeni</Etichetta>
            <Scelte catalogo={ALLERGENI_APP} valore={asp.allergeni} onScegli={k => cambia('allergeni', k)} />
            <div style={{ fontSize: 11, color: '#888', marginTop: -6 }}>Gli allergeni sono un obbligo di legge: si sceglie fra stili sempre leggibili.</div>
          </details>
        </div>

        <Anteprima pal={pal} />
      </div>
    </div>
  )
}

// Un telefono in miniatura con i colori veri: il cliente vede cosa sceglie.
function Anteprima({ pal }) {
  const r = RAGGI[pal.borderStyle] ?? 8
  const titoli = HEADING_FAMILIES[pal.fontHeading] || HEADING_FAMILIES.playfair
  const testi = BODY_FAMILIES[pal.fontBody] || BODY_FAMILIES.inter
  const scheda = {
    background: pal.cardBg, borderRadius: r, padding: '10px 12px',
    boxShadow: pal.variabili['--ombra-scheda'] ?? (pal.isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.06)'),
    border: pal.variabili['--bordo-scheda'] ?? `1px solid ${pal.borderColor}`,
  }
  const sfumata = pal.intestazione === 'sfumato'
  return (
    <div style={{ flex: '0 0 220px', width: 220, borderRadius: 26, overflow: 'hidden', border: '6px solid #1a1a2e', background: pal.bgColor, fontFamily: testi, color: pal.textColor }}>
      <div style={{ background: sfumata ? `linear-gradient(135deg, ${pal.brand} 0%, ${pal.brand}cc 100%)` : pal.brand, padding: '18px 12px 14px', textAlign: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: titoli }}>Il tuo locale</div>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: titoli }}>Menu</div>
        <div style={scheda}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Tagliatelle al ragù</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: pal.primary }}>€12</span>
          </div>
          <div style={{ fontSize: 10, color: pal.subText, margin: '3px 0 6px', lineHeight: 1.4 }}>Pasta fresca all'uovo, ragù cotto sei ore</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['Glutine', Wheat], ['Latte', Milk]].map(([n, I]) => {
              const c = coloriAllergene(pal.stileAllergeni, pal.isDark)
              return <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, ...c }}><I size={9} strokeWidth={1.5} color={c.color} />{n}</span>
            })}
          </div>
        </div>
        <div style={{ ...scheda, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Utensils size={18} strokeWidth={1.5} color={pal.iconColor} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Prenota un tavolo</span>
        </div>
        <div style={{ background: pal.primary, color: pal.onPrimary, borderRadius: 50, padding: '7px 0', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>Prenota ora</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0 10px', background: pal.navBg, borderTop: `1px solid ${pal.borderColor}` }}>
        {[Home, Compass, Info].map((I, i) => <I key={i} size={16} strokeWidth={1.5} color={pal.iconColor} style={{ opacity: i === 0 ? 1 : 0.4 }} />)}
      </div>
    </div>
  )
}

function Scelte({ catalogo, valore, onScegli }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
      {catalogo.map(c => (
        <button key={c.key} type="button" onClick={() => onScegli(c.key)} aria-pressed={valore === c.key}
          style={{ padding: '6px 12px', borderRadius: 18, fontSize: 12, cursor: 'pointer',
            border: `1.5px solid ${valore === c.key ? '#1a1a2e' : '#ddd'}`,
            background: valore === c.key ? '#1a1a2e' : '#fff', color: valore === c.key ? '#fff' : '#444' }}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

function Colore({ etichetta, valore, ripiego, onCambia, sostituito }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="color" value={valore || ripiego || '#000000'} onChange={e => onCambia(e.target.value)}
          aria-label={etichetta} style={{ width: 34, height: 28, border: '1px solid #ddd', borderRadius: 6, padding: 1, cursor: 'pointer', background: '#fff' }} />
        <span style={{ fontSize: 13, color: '#1a1a2e', flex: 1 }}>{etichetta}</span>
        {valore
          ? <button type="button" onClick={() => onCambia(null)} style={{ fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Come il sito</button>
          : <span style={{ fontSize: 12, color: '#999' }}>come il sito</span>}
      </div>
      {sostituito && (
        <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', marginTop: 6 }}>
          Questo colore non si leggerebbe sullo sfondo dell'app: al suo posto usiamo
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: sostituito, verticalAlign: 'middle', margin: '0 4px', border: '1px solid #ddd' }} />
          {sostituito}.
        </div>
      )}
    </div>
  )
}

function Etichetta({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{children}</div>
}

const box = { background: '#fff', borderRadius: 12, padding: '20px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#666' }
const sel = { padding: '7px 8px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#1a1a2e' }
