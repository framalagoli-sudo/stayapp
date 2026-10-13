'use client'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { CampoImmagine } from '@/components/admin/CampoImmagine'
import FontPairPicker from '@/components/admin/FontPairPicker'
import { HEADING_FONTS, BODY_FONTS, getHeadingFamily, getBodyFamily, stileTitoli, FONTS_URL } from '@/lib/fonts'
import { BG_COLORS, TEXT_COLORS, BORDER_STYLES, getBorderRadius } from '@/lib/themeOptions'
import { readableOn } from '@/lib/blockTypes'

// «Marchio e stile»: tutto quello che dà una faccia al sito, in un posto solo e
// uguale per i tre tipi di entità — logo, foto di copertina, colori, caratteri,
// bordi. Prima era sparso fra «Dati dell'attività», «Galleria» e «Aspetto», e
// «Aspetto» era scritta in tre copie.
//
// Si apre da due punti: dalla voce di menu (con l'anteprima accanto) e
// dall'editor visuale delle pagine (`compatto`: l'anteprima è la pagina vera).
// Ogni scelta si salva da sola, come è sempre stato per il tema: `onCambiato`
// avvisa chi lo ospita che il sito ha una faccia nuova.

const API = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
const CARICA = {
  struttura:  id => ({ logo: `/api/upload/logo?property_id=${id}`, copertina: `/api/upload/cover?property_id=${id}` }),
  ristorante: id => ({ logo: `/api/upload/restaurant-logo?ristorante_id=${id}`, copertina: `/api/upload/restaurant-cover?ristorante_id=${id}` }),
  attivita:   id => ({ logo: `/api/upload/attivita-logo?attivita_id=${id}`, copertina: `/api/upload/attivita-cover?attivita_id=${id}` }),
}
// Il tema di chi non ha ancora scelto niente: quello che ogni tipo ha sempre avuto.
const DI_BASE = {
  struttura:  { primaryColor: '#00b5b5', fontHeading: 'playfair', fontBody: 'inter' },
  ristorante: { primaryColor: '#e63946', fontHeading: 'playfair', fontBody: 'inter' },
  attivita:   { primaryColor: '#6b46c1', fontHeading: 'montserrat', fontBody: 'inter' },
}
const COMUNE = { secondaryColor: '', bgColor: '#ffffff', textColor: '#1a1a2e', headerStyle: 'solid', borderStyle: 'mixed' }
const MISURE_LOGO = [['small', 'Piccolo'], ['medium', 'Medio'], ['large', 'Grande']]
const esadecimale = v => /^#[0-9a-fA-F]{6}$/.test(v || '')

export default function MarchioEStile({ tipo, id, compatto = false, onCambiato }) {
  const [entita, setEntita] = useState(null)
  const [tema, setTema] = useState(null)
  const [stato, setStato] = useState('carico')
  const [altre, setAltre] = useState([])
  const [aMano, setAMano] = useState(false)
  const timer = useRef(null)
  const base = `/api/${API[tipo]}/${id}`

  useEffect(() => {
    if (!API[tipo] || !id) { setStato('Attività non trovata.'); return }
    apiFetch(base).then(d => {
      setEntita(d); setTema({ ...COMUNE, ...DI_BASE[tipo], ...(d.theme || {}) }); setStato('')
    }).catch(e => setStato(e?.message || 'Attività non trovata.'))
    // Le altre attività della stessa azienda, per copiarne lo stile.
    Promise.all(Object.entries(API).map(([t, nome]) => apiFetch(`/api/${nome}`).then(l => (Array.isArray(l) ? l : []).map(x => ({ ...x, _tipo: t })), () => [])))
      .then(liste => setAltre(liste.flat().filter(x => x.id !== id && x.theme && typeof x.theme === 'object')))
  }, [tipo, id])
  useEffect(() => {
    if (document.getElementById('ms-caratteri')) return
    const l = document.createElement('link'); l.id = 'ms-caratteri'; l.rel = 'stylesheet'; l.href = FONTS_URL
    document.head.appendChild(l)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  async function salva(cambi) {
    setStato('salvo')
    try {
      const d = await apiFetch(base, { method: 'PATCH', body: JSON.stringify(cambi) })
      setEntita(e => ({ ...e, ...d })); setStato('salvato'); onCambiato?.()
    } catch (e) { setStato(e?.message || 'Salvataggio non riuscito') }
  }
  // I colori si trascinano: il tema si salva quando ci si ferma.
  function cambiaTema(cambi, subito = false) {
    const nuovo = { ...tema, ...cambi }
    setTema(nuovo); setStato('salvo')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => salva({ theme: nuovo }), subito ? 0 : 500)
  }

  if (!entita || !tema) return <p style={{ padding: compatto ? 16 : 32, color: stato === 'carico' ? '#888' : '#c53030', fontSize: 14 }}>{stato === 'carico' ? 'Caricamento…' : stato}</p>

  const carica = CARICA[tipo](id)
  const mini = entita.minisito || {}
  const principale = esadecimale(tema.primaryColor) ? tema.primaryColor : DI_BASE[tipo].primaryColor
  const accento = esadecimale(tema.secondaryColor) ? tema.secondaryColor : principale
  const scelto = on => ({ border: `2px solid ${on ? principale : '#e8e8e8'}`, background: on ? `${principale}12` : '#fafafa' })
  const colore = (chiave, valore, nota) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <input type="color" data-ms-colore={chiave} value={valore} onChange={e => cambiaTema({ [chiave]: e.target.value })}
        style={{ width: 48, height: 48, border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', padding: 3, background: 'none' }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{valore.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{nota}</div>
      </div>
    </div>
  )

  const pannello = (
    <div data-marchio-stile>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: compatto ? 14 : 4 }}>
        {compatto
          ? <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.5 }}>Vale per <strong>tutto il sito</strong>, non solo per questa pagina, e si salva subito.</div>
          : <h2 style={{ margin: 0, fontSize: 22 }}>Marchio e stile</h2>}
        <span data-ms-stato style={{ fontSize: 12, flexShrink: 0, color: stato === 'salvato' ? '#38a169' : stato === 'salvo' ? '#888' : '#c53030' }}>
          {stato === 'salvato' ? '✓ Salvato' : stato === 'salvo' ? 'Salvataggio…' : stato}
        </span>
      </div>
      {!compatto && <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>Il logo, i colori e i caratteri del tuo sito. Ogni scelta si salva da sola e vale per tutte le pagine.</p>}

      <Gruppo titolo="Logo" compatto={compatto}>
        <div style={{ display: 'grid', gridTemplateColumns: compatto ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <CampoImmagine etichetta="Logo" valore={entita.logo_url} onChange={url => salva({ logo_url: url || null })}
            endpoint={carica.logo} adatta="contieni" sfondo="#f5f5f5" altezza={88} />
          <CampoImmagine etichetta="Logo per i fondi scuri" aiuto="La versione chiara del logo: si usa dove il fondo è scuro (intestazione, piede). Senza, si usa il logo normale."
            valore={entita.logo_dark_url} onChange={url => salva({ logo_dark_url: url || null })}
            endpoint={`${carica.logo}&field=logo_dark_url`} adatta="contieni" sfondo="#1a1a2e" altezza={88} />
        </div>
        <div data-ms-icona style={{ marginTop: 18, maxWidth: compatto ? undefined : 260 }}>
          <CampoImmagine etichetta="Icona del sito" valore={mini.icona_url} onChange={url => salva({ minisito: { ...mini, icona_url: url || '' } })}
            endpoint={`/api/upload/minisito-image?entity_type=${tipo}&entity_id=${id}&uso=icona`} adatta="contieni" sfondo="#f5f5f5" altezza={88}
            aiuto="Quella piccola nella linguetta del browser e fra i preferiti. Meglio quadrata e semplice: il simbolo del logo, senza scritte. Senza, lì si vede l'icona di OltreNova." />
        </div>
        <Voce etichetta="Quanto è grande nell'intestazione del sito">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MISURE_LOGO.map(([v, nome]) => {
              const on = (mini.logo_size || 'medium') === v
              return <button key={v} type="button" data-ms-logo={v} onClick={() => salva({ minisito: { ...mini, logo_size: v } })}
                style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${on ? '#1a1a2e' : '#ddd'}`, background: on ? '#1a1a2e' : '#fff', color: on ? '#fff' : '#555', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{nome}</button>
            })}
          </div>
        </Voce>
      </Gruppo>

      <Gruppo titolo="Foto di copertina" compatto={compatto}>
        <CampoImmagine valore={entita.cover_url} onChange={url => salva({ cover_url: url || null })}
          endpoint={carica.copertina} unsplash unsplashQuery={entita.name || ''} anteprima="2 / 1"
          aiuto="È l'immagine che esce quando il sito viene condiviso (WhatsApp, Facebook), lo sfondo di una copertina che non ha una foto sua, e la striscia in cima all'app del QR."
          focale={entita.cover_focal} onFocale={v => salva({ cover_focal: v })} />
      </Gruppo>

      <Gruppo titolo="Colori" compatto={compatto}>
        <div style={{ display: 'grid', gridTemplateColumns: compatto ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
          <Voce etichetta="Colore principale">{colore('primaryColor', principale, 'Pulsanti, link, accenti')}</Voce>
          <Voce etichetta="Colore d'accento">{colore('secondaryColor', accento, 'Sfumature e dettagli')}</Voce>
        </div>
        <Voce etichetta="Fondo delle pagine">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {BG_COLORS.map(({ value, label }) => (
              <button key={value} type="button" title={label} aria-label={label} data-ms-fondo={value} onClick={() => cambiaTema({ bgColor: value }, true)}
                style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', background: value, border: tema.bgColor === value ? `3px solid ${principale}` : '2px solid #ddd' }} />
            ))}
          </div>
        </Voce>
        <Voce etichetta="Colore del testo">
          <div style={{ display: 'flex', gap: 8 }}>
            {TEXT_COLORS.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => cambiaTema({ textColor: value }, true)}
                style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: value, color: value === '#ffffff' ? '#333' : '#fff', border: tema.textColor === value ? `2px solid ${principale}` : '2px solid #ddd' }}>{label}</button>
            ))}
          </div>
        </Voce>
        <Voce etichetta="Colore delle icone">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {[['Come il principale', ''], ["Come l'accento", accento], ['Bianco', '#ffffff'], ['Scuro', '#1a1a2e']].map(([nome, v]) => {
              const on = (tema.iconColor || '').toLowerCase() === v.toLowerCase()
              return (
                <button key={nome} type="button" onClick={() => cambiaTema({ iconColor: v }, true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 500, ...scelto(on) }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: v || principale, border: '1px solid rgba(0,0,0,0.15)' }} />{nome}
                </button>
              )
            })}
            <input type="color" aria-label="Un altro colore per le icone" value={esadecimale(tema.iconColor) ? tema.iconColor : principale} onChange={e => cambiaTema({ iconColor: e.target.value })}
              style={{ width: 36, height: 36, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'none' }} />
          </div>
        </Voce>
      </Gruppo>

      <Gruppo titolo="Caratteri" compatto={compatto}>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#777', lineHeight: 1.5 }}>Ogni stile è un'accoppiata già studiata: un carattere per i titoli, uno per il testo, e il modo giusto di comporli.</p>
        <FontPairPicker theme={tema} updateTheme={c => cambiaTema(c, true)} nome={entita.name} stretto={compatto} />
        <button type="button" onClick={() => setAMano(v => !v)} style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#5b6af8', fontSize: 12.5, fontWeight: 600 }}>
          {aMano ? 'Nascondi la scelta a mano' : 'Scegli i due caratteri a mano'}
        </button>
        {aMano && (
          <div style={{ marginTop: 14 }}>
            {[['Titoli', HEADING_FONTS, 'fontHeading'], ['Testo', BODY_FONTS, 'fontBody']].map(([nome, elenco, chiave]) => (
              <Voce key={chiave} etichetta={nome}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {elenco.map(c => (
                    <button key={c.key} type="button" onClick={() => cambiaTema({ [chiave]: c.key }, true)}
                      style={{ padding: '9px 11px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', minWidth: 0, ...scelto(tema[chiave] === c.key) }}>
                      <div style={{ fontFamily: c.family, fontSize: 15, fontWeight: c.titoli?.peso || 600, color: '#222', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{c.label}</div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
              </Voce>
            ))}
          </div>
        )}
      </Gruppo>

      <Gruppo titolo="Angoli" compatto={compatto}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {BORDER_STYLES.map(({ key, label, radius }) => (
            <button key={key} type="button" onClick={() => cambiaTema({ borderStyle: key }, true)}
              style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, ...scelto(tema.borderStyle === key) }}>
              <span style={{ width: 26, height: 20, border: '2px solid #555', borderRadius: radius / 2 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{label}</span>
            </button>
          ))}
        </div>
      </Gruppo>

      {altre.length > 0 && (
        <Gruppo titolo="Copia lo stile da un'altra attività" compatto={compatto} ultimo>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {altre.map(e => (
              <button key={e.id} type="button" onClick={() => { if (window.confirm(`Colori e caratteri di «${e.name}» prendono il posto di quelli di adesso. Continuare?`)) cambiaTema({ ...e.theme }, true) }}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #93c5fd', background: '#fff', color: '#1d4ed8', whiteSpace: 'nowrap' }}>{e.name}</button>
            ))}
          </div>
        </Gruppo>
      )}
    </div>
  )
  if (compatto) return pannello

  // L'anteprima: una pagina in piccolo, coi colori, i caratteri e il logo scelti.
  const raggio = getBorderRadius(tema.borderStyle)
  const titoli = stileTitoli(tema.fontHeading)
  const scuro = tema.bgColor === '#1a1a2e'
  const testo = scuro ? '#f2f3f7' : tema.textColor === '#ffffff' ? '#1a1a2e' : tema.textColor
  const logo = entita.logo_dark_url || entita.logo_url
  return (
    <div style={{ maxWidth: 1080, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: 32, alignItems: 'start' }} className="ms-griglia">
      <style>{`@media (max-width: 980px) { .ms-griglia { grid-template-columns: minmax(0, 1fr) !important; } .ms-anteprima { position: static !important; } }`}</style>
      <div style={{ minWidth: 0 }}>{pannello}</div>
      <div className="ms-anteprima" style={{ position: 'sticky', top: 24, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10 }}>Come si presenta</div>
        <div data-ms-anteprima style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', border: '1px solid #e6e6ee', fontFamily: getBodyFamily(tema.fontBody) }}>
          <div style={{ background: '#14141f', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            {logo
              ? <img src={logo} alt="" style={{ maxHeight: { small: 18, medium: 24, large: 32 }[mini.logo_size] || 24, maxWidth: 120, objectFit: 'contain' }} />
              : <span style={{ fontFamily: getHeadingFamily(tema.fontHeading), fontWeight: titoli?.peso || 700, color: '#fff', fontSize: 14, overflowWrap: 'anywhere' }}>{entita.name}</span>}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>Chi siamo · Contatti</span>
          </div>
          <div style={{ background: tema.bgColor, padding: '26px 20px 28px', color: testo }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: principale, marginBottom: 10 }}>Benvenuto</div>
            <div data-ms-titolo style={{ fontFamily: getHeadingFamily(tema.fontHeading), fontSize: 30, lineHeight: 1.05, fontWeight: titoli?.peso || 700, letterSpacing: titoli?.spazio, textTransform: titoli?.maiuscolo ? 'uppercase' : undefined, fontSynthesisWeight: 'none', overflowWrap: 'anywhere' }}>{entita.name}</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '12px 0 18px', opacity: 0.82 }}>Un testo di esempio, per vedere come si legge un paragrafo con questo carattere.</p>
            <span style={{ display: 'inline-block', padding: '9px 20px', borderRadius: raggio * 2.5, background: principale, color: readableOn('#ffffff', principale, '#1a1a2e'), fontSize: 12.5, fontWeight: 700 }}>Prenota</span>
            <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', background: accento, marginLeft: 12, verticalAlign: 'middle' }} />
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: '#999', lineHeight: 1.5, margin: '12px 2px 0' }}>Intestazione, menu e piede del sito si sistemano in «Sito web». L'app del QR ha il suo aspetto in «App del QR».</p>
      </div>
    </div>
  )
}

function Gruppo({ titolo, compatto, ultimo, children }) {
  return (
    <section style={compatto
      ? { padding: '16px 0', borderTop: '1px solid #ececf2' }
      : { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: ultimo ? 0 : 16 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: compatto ? 13 : 15, fontWeight: 700, color: '#1a1a2e' }}>{titolo}</h3>
      {children}
    </section>
  )
}
function Voce({ etichetta, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#555', marginBottom: 8 }}>{etichetta}</div>
      {children}
    </div>
  )
}
