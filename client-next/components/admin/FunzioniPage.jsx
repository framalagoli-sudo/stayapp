'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { FUNZIONI, funzioneAttiva, moduliDi, ETICHETTA_OSPITE, MAX_ETICHETTA } from '@/lib/funzioni'
import { t as tr } from '@/lib/i18n'

// Dove il cliente sceglie cosa gli serve.
//
// Prima le funzioni erano decise dal tipo di attività: un hotel non poteva avere
// un menù, un ristorante non poteva elencare i servizi. Ora il tipo decide solo
// cosa si trova acceso il primo giorno; da qui in poi decide il cliente.

const ROTTA = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }
const API = { struttura: '/api/properties', ristorante: '/api/ristoranti', attivita: '/api/attivita' }

// ⚠️ Definito **fuori** da `FunzioniPage`: un componente dichiarato dentro un
// altro cambia identità a ogni render e React lo smonta e rimonta — l'input
// perderebbe il fuoco a ogni lettera battuta.
//
// Testo: si scrive in locale e si propaga all'uscita dal campo, come ovunque
// nel pannello. Salvare a ogni tasto vorrebbe dire una chiamata per lettera.
function NomeSezione({ chiave, titolo, valore, predefinito, inCorso, onSalva }) {
  const [nome, setNome] = useState(valore)
  useEffect(() => { setNome(valore) }, [valore])
  return (
    <div style={{ marginTop: 10 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
        Come si chiama nell’app dei tuoi clienti
      </label>
      <input value={nome} maxLength={MAX_ETICHETTA} disabled={inCorso}
        aria-label={`Nome della sezione ${titolo} nell'app`}
        onChange={e => setNome(e.target.value)}
        onBlur={() => { if ((nome || '').trim() !== (valore || '').trim()) onSalva(chiave, nome) }}
        placeholder={predefinito}
        style={{ width: '100%', maxWidth: 260, padding: '8px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
        Lascia vuoto per «{predefinito}».
      </div>
    </div>
  )
}

export default function FunzioniPage({ entityType }) {
  const { id } = useParams()
  const [ent, setEnt] = useState(null)
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(null)

  useEffect(() => {
    if (!id) return
    apiFetch(`${API[entityType]}/${id}`).then(setEnt).catch(() => setErrore('Impossibile caricare i dati'))
  }, [id, entityType])

  const campoModuli = entityType === 'attivita' ? 'pwa' : 'modules'

  async function salvaModuli(moduli, chiave) {
    setInCorso(chiave)
    try {
      const aggiornato = await apiFetch(`${API[entityType]}/${id}`, {
        method: 'PATCH', body: JSON.stringify({ [campoModuli]: moduli }),
      })
      setEnt(aggiornato)
    } catch {
      setErrore('Non è stato possibile salvare')
    } finally { setInCorso(null) }
  }

  function commuta(chiave, acceso) {
    // Si scrive sempre il valore esplicito: finché la chiave manca vale il
    // preset del tipo, e un cliente che spegne qualcosa deve vederlo restare spento.
    return salvaModuli({ ...(ent.moduli || ent.modules || ent.pwa || {}), [chiave]: acceso }, chiave)
  }

  // Come il cliente vuole chiamare questa sezione nell'app dei suoi clienti.
  // Campo vuoto = torna il nome predefinito, non un'etichetta vuota.
  function rinomina(chiave, nome) {
    const base = ent.moduli || ent.modules || ent.pwa || {}
    const etichette = { ...(base.etichette || {}) }
    const pulito = (nome || '').trim().slice(0, MAX_ETICHETTA)
    if (pulito) etichette[chiave] = pulito
    else delete etichette[chiave]
    return salvaModuli({ ...base, etichette }, chiave)
  }

  if (errore) return <div style={{ padding: 32, color: '#c0392b' }}>{errore}</div>
  if (!ent) return <div style={{ padding: 32, color: '#888' }}>Caricamento…</div>

  const attiva = c => funzioneAttiva({ ...ent, moduli: ent.moduli || ent.modules || ent.pwa }, c)
  const etichette = moduliDi(ent)?.etichette || {}

  return (
    <div style={{ padding: 32, maxWidth: 780 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px' }}>Funzioni</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
        Accendi quello che ti serve per <strong>{ent.name}</strong>. Non c’è nessun vincolo legato al tipo di
        attività: se hai un menù puoi averlo anche se non sei un ristorante, se offri servizi puoi elencarli
        comunque. Quello che accendi compare nel menu qui a sinistra e sul tuo sito.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
        {FUNZIONI.map(f => {
          const acceso = attiva(f.chiave)
          const bloccato = !!f.sempre
          return (
            <div key={f.chiave}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: '#fff', border: `1px solid ${acceso && !bloccato ? '#b8e6e6' : '#eee'}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 3 }}>
                  {f.titolo}
                  {bloccato && <span style={{ fontSize: 12, fontWeight: 500, color: '#aaa', marginLeft: 8 }}>sempre attiva</span>}
                </div>
                <div style={{ fontSize: 13.5, color: '#777', lineHeight: 1.55, overflowWrap: 'anywhere' }}>{f.descrizione}</div>

                {/* Il nome della scheda nell'app lo sceglie il cliente: «Proposte»
                    o «Escursioni» erano parole nostre, e chi fa questo mestiere lo
                    sa chiamare meglio di noi. Solo per le sezioni che l'ospite vede. */}
                {acceso && ETICHETTA_OSPITE[f.chiave] && (
                  <NomeSezione chiave={f.chiave} titolo={f.titolo} valore={etichette[f.chiave] || ''}
                    predefinito={tr(ETICHETTA_OSPITE[f.chiave], 'it')}
                    inCorso={inCorso === f.chiave} onSalva={rinomina} />
                )}
              </div>

              {bloccato ? (
                <Check size={20} strokeWidth={1.5} color="#2e7d32" style={{ marginTop: 4, flexShrink: 0 }} />
              ) : (
                <button onClick={() => commuta(f.chiave, !acceso)} disabled={inCorso === f.chiave}
                  aria-label={`${acceso ? 'Spegni' : 'Accendi'} ${f.titolo}`}
                  style={{ position: 'relative', width: 46, height: 26, borderRadius: 999, border: 'none', flexShrink: 0, marginTop: 2,
                    background: acceso ? '#00b5b5' : '#ddd', cursor: inCorso === f.chiave ? 'wait' : 'pointer', transition: 'background .15s' }}>
                  <span style={{ position: 'absolute', top: 3, left: acceso ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 13, color: '#999', marginTop: 22, lineHeight: 1.6 }}>
        Spegnere una funzione non cancella niente: i contenuti restano dove sono e tornano visibili
        se la riaccendi.
      </p>
    </div>
  )
}
