'use client'
// «Prezzi e regole» di una risorsa a giornate: il calendario dei prezzi.
//
// Come nei gestionali alberghieri ogni giorno ha il suo prezzo e le sue regole
// (migration 144). Le «stagioni» qui sono un modo di scrivere: si sceglie un
// periodo, i giorni della settimana, e cosa vale lì. Un giorno senza
// indicazioni vale il prezzo base e le regole della risorsa.
//
// ⚠️ Il conto che si vede in «Prova un noleggio» lo chiede alla route del sito
// (`/api/booking/public/disponibilita`): è lo stesso che pagherà chi prenota,
// offerte comprese. Un'anteprima calcolata qui sarebbe una seconda copia del
// conto, e diverge proprio quella che si guarda di rado.

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../../../lib/api'
import { contaGiorni, nomeUnita, limiteInUnita, limiteInNotti } from '../../../lib/booking-giornaliero'

const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
// Lunedì per primo, come si legge un calendario in Europa; i valori sono quelli
// di getDay() (0 = domenica), gli stessi salvati nel database.
const SETTIMANA = [
  { val: 1, label: 'Lun' }, { val: 2, label: 'Mar' }, { val: 3, label: 'Mer' }, { val: 4, label: 'Gio' },
  { val: 5, label: 'Ven' }, { val: 6, label: 'Sab' }, { val: 0, label: 'Dom' },
]

const due = n => String(n).padStart(2, '0')
const iso = (a, m, g) => `${a}-${due(m)}-${due(g)}`
const giorniNelMese = (a, m) => new Date(a, m, 0).getDate()
const dataBreve = g => { const [, m, d] = g.split('-'); return `${Number(d)}/${Number(m)}` }
const euro = n => `€${Number(n).toLocaleString('it-IT', { maximumFractionDigits: 2 })}`

// Una scelta a tre: non toccare, sì, no.
const TRE = [{ v: '', l: 'Non cambiare' }, { v: 'si', l: 'Sì' }, { v: 'no', l: 'No' }]

export default function CalendarioPrezzi({ risorsa, onBack }) {
  const oggi = new Date()
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth() + 1)
  const [giorni, setGiorni] = useState({})
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState('')
  const [avviso, setAvviso] = useState('')

  const [sel, setSel] = useState({ dal: '', al: '' })
  const [settimana, setSettimana] = useState([])
  const [valori, setValori] = useState({ prezzo: '', minimo: '', arrivo: '', partenza: '', vendibile: '' })
  const [salvo, setSalvo] = useState(false)

  const [prova, setProva] = useState({ dal: '', al: '' })
  const [esitoProva, setEsitoProva] = useState(null)

  const aGiorni = contaGiorni(risorsa)
  const parole = aGiorni
    ? { inizio: 'ritiro', fine: 'riconsegna', noInizio: 'Niente ritiro', noFine: 'Niente riconsegna' }
    : { inizio: 'arrivo', fine: 'partenza', noInizio: 'Niente arrivi', noFine: 'Niente partenze' }
  const base = Number(risorsa?.prezzo) || 0

  const carica = useCallback(async () => {
    setCaricamento(true); setErrore('')
    try {
      const r = await apiFetch(`/api/booking/risorse/${risorsa.id}/tariffe?dal=${iso(anno, mese, 1)}&al=${iso(anno, mese, giorniNelMese(anno, mese))}`)
      setGiorni(Object.fromEntries((r.giorni || []).map(g => [g.data, g])))
    } catch (e) { setErrore(e.message) }
    finally { setCaricamento(false) }
  }, [risorsa.id, anno, mese])

  useEffect(() => { carica() }, [carica])

  function cambiaMese(delta) {
    let m = mese + delta, a = anno
    if (m < 1) { m = 12; a-- }
    if (m > 12) { m = 1; a++ }
    setMese(m); setAnno(a)
  }

  // Un clic sceglie l'inizio, il secondo la fine; un terzo ricomincia.
  function clicGiorno(g) {
    setAvviso('')
    if (!sel.dal || sel.al) return setSel({ dal: g, al: '' })
    if (g < sel.dal) return setSel({ dal: g, al: sel.dal })
    setSel({ dal: sel.dal, al: g })
  }

  const periodo = { dal: sel.dal, al: sel.al || sel.dal }

  function corpoValori() {
    const v = {}
    if (valori.prezzo !== '') v.prezzo = valori.prezzo === 'base' ? null : Number(valori.prezzo)
    if (valori.minimo !== '') v.minimo_notti = valori.minimo === 'base' ? null : limiteInNotti(Number(valori.minimo), risorsa)
    if (valori.arrivo) v.chiuso_arrivo = valori.arrivo === 'si'
    if (valori.partenza) v.chiuso_partenza = valori.partenza === 'si'
    if (valori.vendibile) v.non_vendibile = valori.vendibile === 'si'
    return v
  }

  async function applica(azione) {
    if (!periodo.dal) return setErrore('Scegli i giorni sul calendario, o scrivi le date.')
    const corpo = { azione, dal: periodo.dal, al: periodo.al, giorni: settimana.length ? settimana : undefined }
    if (azione === 'imposta') {
      corpo.valori = corpoValori()
      if (!Object.keys(corpo.valori).length) return setErrore('Non hai indicato niente da cambiare.')
      if (corpo.valori.prezzo != null && !(corpo.valori.prezzo >= 0)) return setErrore('Il prezzo non è valido.')
    } else if (!confirm(`Dal ${dataBreve(periodo.dal)} al ${dataBreve(periodo.al)} i giorni tornano al prezzo base e alle regole della risorsa. Procedo?`)) return
    setSalvo(true); setErrore('')
    try {
      const r = await apiFetch(`/api/booking/risorse/${risorsa.id}/tariffe`, { method: 'POST', body: JSON.stringify(corpo) })
      setValori({ prezzo: '', minimo: '', arrivo: '', partenza: '', vendibile: '' })
      // Prima si ricarica il calendario, poi si dice «Fatto»: al contrario, per
      // un istante «Fatto» stava sopra il calendario ancora vecchio.
      await carica()
      const quanti = r.giorni === 1 ? '1 giorno' : `${r.giorni} giorni`
      setAvviso(azione === 'azzera'
        ? `Fatto: ${quanti} ${r.giorni === 1 ? 'tornato' : 'tornati'} al prezzo base.`
        : `Fatto: ${r.giorni === 1 ? 'aggiornato' : 'aggiornati'} ${quanti}.`)
    } catch (e) { setErrore(e.message) }
    finally { setSalvo(false) }
  }

  async function copiaAnno() {
    if (!confirm(`Copio i prezzi e le regole del ${anno} sul ${anno + 1}, giorno della settimana su giorno della settimana (un sabato resta un sabato).\n\nSe nel ${anno + 1} hai già scritto qualcosa sugli stessi giorni, viene sostituito. Le feste che cambiano data (Pasqua, i ponti) vanno ricontrollate.\n\nProcedo?`)) return
    setSalvo(true); setErrore('')
    try {
      const r = await apiFetch(`/api/booking/risorse/${risorsa.id}/tariffe`, {
        method: 'POST', body: JSON.stringify({ azione: 'copia', dal: iso(anno, 1, 1), al: iso(anno, 12, 31) }),
      })
      setAvviso(`Copiati ${r.inseriti + r.aggiornati} giorni sul ${anno + 1} (dal ${dataBreve(r.dal)}). Ricontrolla Pasqua e i ponti.`)
    } catch (e) { setErrore(e.message) }
    finally { setSalvo(false) }
  }

  async function provaNoleggio() {
    setEsitoProva(null)
    if (!prova.dal || !prova.al) return
    try {
      const r = await fetch(`/api/booking/public/disponibilita/${risorsa.id}?data=${prova.dal}&data_fine=${prova.al}`)
      const j = await r.json()
      if (!r.ok) return setEsitoProva({ errore: r.status === 404 ? 'La risorsa è disattivata: riattivala per provare il conto.' : (j.error || 'Non riesco a calcolare.') })
      setEsitoProva(j)
    } catch (e) { setEsitoProva({ errore: e.message }) }
  }

  // ─── La griglia del mese ────────────────────────────────────────────────────
  const primoGiorno = (new Date(anno, mese - 1, 1).getDay() + 6) % 7   // lunedì = 0
  const celle = [...Array(primoGiorno).fill(null),
    ...Array.from({ length: giorniNelMese(anno, mese) }, (_, i) => iso(anno, mese, i + 1))]

  function inSelezione(g) {
    if (!sel.dal) return false
    const fine = sel.al || sel.dal
    if (g < sel.dal || g > fine) return false
    if (!settimana.length) return true
    return settimana.includes(new Date(`${g}T12:00:00`).getDay())
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={ghostBtn}>← Risorse</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: '1 1 240px', overflowWrap: 'anywhere' }}>Prezzi e regole — {risorsa.nome}</h1>
      </div>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px', maxWidth: 720 }}>
        Ogni giorno può avere il suo prezzo e le sue regole: alta stagione, weekend, ponti, minimi di {nomeUnita(risorsa)}.
        I giorni dove non scrivi niente valgono il prezzo base ({euro(base)} a {nomeUnita(risorsa, 1)}) e le regole della scheda della risorsa.
        Le offerte si sommano sopra, come prima.
      </p>

      {errore && <div style={boxErrore}>{errore}</div>}
      {avviso && <div style={boxOk}>{avviso}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Calendario */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={() => cambiaMese(-1)} style={ghostBtn} aria-label="Mese precedente">‹</button>
            <div style={{ fontWeight: 700 }}>{NOMI_MESI[mese - 1]} {anno}</div>
            <button onClick={() => cambiaMese(1)} style={ghostBtn} aria-label="Mese successivo">›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
            {SETTIMANA.map(s => <div key={s.val} style={{ fontSize: 11, color: '#999', textAlign: 'center', fontWeight: 600 }}>{s.label}</div>)}
            {celle.map((g, i) => {
              if (!g) return <div key={`v${i}`} />
              const t = giorni[g]
              const scelto = inSelezione(g)
              const prezzo = t?.prezzo != null ? Number(t.prezzo) : base
              return (
                <button key={g} type="button" onClick={() => clicGiorno(g)}
                  title={dataBreve(g)}
                  style={{
                    minHeight: 58, padding: '4px 2px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    border: scelto ? '2px solid #1a1a2e' : '1px solid #eee',
                    background: t?.non_vendibile ? '#f3f3f3' : scelto ? '#eef0ff' : (t?.prezzo != null ? '#fff8e6' : '#fff'),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 0,
                  }}>
                  <span style={{ fontSize: 11, color: '#888' }}>{Number(g.slice(8))}</span>
                  {t?.non_vendibile
                    ? <span style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>chiuso</span>
                    : <span style={{ fontSize: 12, fontWeight: t?.prezzo != null ? 700 : 400, color: t?.prezzo != null ? '#1a1a2e' : '#aaa' }}>{euro(prezzo)}</span>}
                  {t?.minimo_notti != null && <span style={{ fontSize: 9, color: '#6b46c1' }}>min {limiteInUnita(t.minimo_notti, risorsa)}</span>}
                  {(t?.chiuso_arrivo || t?.chiuso_partenza) && (
                    <span style={{ fontSize: 9, color: '#c05621' }}>
                      {t.chiuso_arrivo ? `no ${parole.inizio}` : ''}{t.chiuso_arrivo && t.chiuso_partenza ? ' · ' : ''}{t.chiuso_partenza ? `no ${parole.fine}` : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {caricamento && <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Caricamento…</div>}
          <div style={{ fontSize: 11, color: '#888', marginTop: 10, lineHeight: 1.5 }}>
            Tocca il primo giorno e poi l'ultimo per scegliere un periodo. In giallo i giorni col prezzo cambiato, in grigio il prezzo base.
          </div>
          <button onClick={copiaAnno} disabled={salvo} style={{ ...ghostBtn, marginTop: 12 }}>Copia il {anno} sul {anno + 1}</button>
        </div>

        {/* Modifica in blocco */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Cambia un periodo</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label style={campo}><span style={etichetta}>Dal</span>
              <input type="date" value={sel.dal} onChange={e => setSel(s => ({ ...s, dal: e.target.value }))} style={input} /></label>
            <label style={campo}><span style={etichetta}>Al (compreso)</span>
              <input type="date" value={sel.al} min={sel.dal} onChange={e => setSel(s => ({ ...s, al: e.target.value }))} style={input} /></label>
          </div>

          <span style={{ ...etichetta, display: 'block', marginTop: 10 }}>Solo questi giorni della settimana</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SETTIMANA.map(s => {
              const on = settimana.includes(s.val)
              return (
                <button key={s.val} type="button" onClick={() => setSettimana(on ? settimana.filter(x => x !== s.val) : [...settimana, s.val])}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', border: on ? 'none' : '1px solid #ddd', background: on ? '#1a1a2e' : '#fff', color: on ? '#fff' : '#666' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
          <div style={nota}>Nessuno scelto = tutti i giorni. Es. solo Sab e Dom per il prezzo del weekend.</div>

          <label style={{ ...campo, marginTop: 12 }}><span style={etichetta}>Prezzo a {nomeUnita(risorsa, 1)}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" min={0} step="0.01" placeholder="lascia vuoto per non cambiarlo"
                value={valori.prezzo === 'base' ? '' : valori.prezzo}
                onChange={e => setValori(v => ({ ...v, prezzo: e.target.value }))} style={input} />
              <button type="button" onClick={() => setValori(v => ({ ...v, prezzo: v.prezzo === 'base' ? '' : 'base' }))}
                style={{ ...ghostBtn, whiteSpace: 'nowrap', background: valori.prezzo === 'base' ? '#1a1a2e' : '#f0f0f0', color: valori.prezzo === 'base' ? '#fff' : '#333' }}>
                Prezzo base
              </button>
            </div>
          </label>

          <label style={{ ...campo, marginTop: 10 }}>
            <span style={etichetta}>Minimo di {nomeUnita(risorsa)} per chi inizia in questi giorni</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" min={aGiorni ? 2 : 1} max={365} placeholder="lascia vuoto per non cambiarlo"
                value={valori.minimo === 'base' ? '' : valori.minimo}
                onChange={e => setValori(v => ({ ...v, minimo: e.target.value }))} style={input} />
              <button type="button" onClick={() => setValori(v => ({ ...v, minimo: v.minimo === 'base' ? '' : 'base' }))}
                style={{ ...ghostBtn, whiteSpace: 'nowrap', background: valori.minimo === 'base' ? '#1a1a2e' : '#f0f0f0', color: valori.minimo === 'base' ? '#fff' : '#333' }}>
                Come la risorsa
              </button>
            </div>
          </label>
          <div style={nota}>Es. 7 a Ferragosto: chi {aGiorni ? 'ritira' : 'arriva'} in quei giorni prenota almeno una settimana.</div>

          {[
            { k: 'arrivo', l: `${parole.noInizio} in questi giorni` },
            { k: 'partenza', l: `${parole.noFine} in questi giorni` },
            { k: 'vendibile', l: 'Non disponibile (chiuso)' },
          ].map(r => (
            <label key={r.k} style={{ ...campo, marginTop: 10 }}><span style={etichetta}>{r.l}</span>
              <select value={valori[r.k]} onChange={e => setValori(v => ({ ...v, [r.k]: e.target.value }))} style={input}>
                {TRE.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </label>
          ))}
          <div style={nota}>
            {aGiorni
              ? <>Per vendere solo il weekend intero: sui sabati «{parole.noFine}», sulle domeniche «{parole.noInizio}». Così sabato e domenica si prendono insieme (ritiro sabato mattina, riconsegna domenica sera).</>
              : <>Per accettare solo arrivi di sabato: su tutti gli altri giorni «{parole.noInizio}».</>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => applica('imposta')} disabled={salvo} style={primaryBtn}>{salvo ? 'Salvo…' : 'Applica al periodo'}</button>
            <button onClick={() => applica('azzera')} disabled={salvo} style={ghostBtn}>Riporta al prezzo base</button>
          </div>
        </div>

        {/* Prova un noleggio */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Prova {aGiorni ? 'un noleggio' : 'un soggiorno'}</div>
          <div style={nota}>Il conto che farà il sito a chi prenota, offerte comprese.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <label style={campo}><span style={etichetta}>{aGiorni ? 'Ritiro' : 'Arrivo'}</span>
              <input type="date" value={prova.dal} onChange={e => setProva(p => ({ ...p, dal: e.target.value }))} style={input} /></label>
            <label style={campo}><span style={etichetta}>{aGiorni ? 'Riconsegna' : 'Partenza'}</span>
              <input type="date" value={prova.al} min={prova.dal} onChange={e => setProva(p => ({ ...p, al: e.target.value }))} style={input} /></label>
          </div>
          <button onClick={provaNoleggio} disabled={!prova.dal || !prova.al} style={{ ...ghostBtn, marginTop: 10 }}>Calcola</button>
          {esitoProva && (
            <div style={{ marginTop: 12, fontSize: 13 }}>
              {esitoProva.errore ? <div style={{ color: '#c0392b' }}>{esitoProva.errore}</div> : (
                <>
                  {!esitoProva.disponibile && <div style={{ color: '#c05621', marginBottom: 6 }}>Il sito non lo accetterebbe: {esitoProva.motivo}</div>}
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {euro(esitoProva.totale)}
                    {esitoProva.offerta && esitoProva.totale_pieno !== esitoProva.totale &&
                      <span style={{ fontSize: 13, fontWeight: 400, color: '#888', marginLeft: 8 }}>listino {euro(esitoProva.totale_pieno)} · {esitoProva.offerta.nome}</span>}
                  </div>
                  <div style={{ color: '#666' }}>{esitoProva.unita} {nomeUnita(risorsa, esitoProva.unita)}</div>
                  {Array.isArray(esitoProva.giorni) && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {esitoProva.giorni.map(g => (
                        <span key={g.data} style={{ fontSize: 11, background: '#f5f5f7', borderRadius: 6, padding: '2px 6px' }}>
                          {dataBreve(g.data)} {euro(g.prezzo)}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const card = { background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minWidth: 0 }
const campo = { display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 140px', minWidth: 0 }
const etichetta = { fontSize: 12, fontWeight: 600, color: '#555' }
const nota = { fontSize: 11, color: '#888', marginTop: 4, lineHeight: 1.5 }
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff' }
const primaryBtn = { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const ghostBtn = { background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }
const boxErrore = { background: '#fdecea', color: '#a12622', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 }
const boxOk = { background: '#e8f5e9', color: '#1b5e20', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 }
