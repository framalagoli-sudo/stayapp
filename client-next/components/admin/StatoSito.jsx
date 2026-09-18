'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { CheckCircle2, AlertCircle, Circle, ExternalLink, RefreshCw } from 'lucide-react'
import VisibilitaMotori from '@/components/admin/VisibilitaMotori'

// «Stato del sito»: in una schermata, cosa è online e cosa manca.
//
// Nasce da una domanda di Francesco (18/09/2026): un cliente non sa dire se il
// suo sito è pubblicato, a quale indirizzo risponde, se si trova su Google. Le
// informazioni c'erano tutte, sparse in cinque pagine diverse del pannello.
//
// ⚠️ Non promette Google. Dice cosa dipende da noi — pubblicato, visibile,
// indirizzo, contenuti — e per il resto dice la verità: i tempi li decide il
// motore di ricerca. L'interruttore della visibilità è quello di sempre,
// richiamato qui dentro: due posti per accendere la stessa cosa sarebbero due
// porte per la stessa stanza.

const ENDPOINT = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }

function Riga({ stato, titolo, dettaglio, azione }) {
  const Icona = stato === 'ok' ? CheckCircle2 : stato === 'attenzione' ? AlertCircle : Circle
  const colore = stato === 'ok' ? '#2e7d32' : stato === 'attenzione' ? '#c77700' : '#aaa'
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 0', borderTop: '1px solid #f1f1f4' }}>
      <Icona size={18} strokeWidth={1.5} color={colore} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{titolo}</div>
        {dettaglio && <div style={{ fontSize: 13, color: '#777', marginTop: 2, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{dettaglio}</div>}
      </div>
      {azione}
    </div>
  )
}

export default function StatoSito({ entityData, entityTipo, entityId, onCambiata, onVaiA }) {
  const [s, setS] = useState(null)
  const [errore, setErrore] = useState(null)
  const [caricando, setCaricando] = useState(true)

  async function carica() {
    setCaricando(true); setErrore(null)
    try {
      setS(await apiFetch(`/api/entita/${entityId}/stato-sito?tipo=${entityTipo}`))
    } catch (e) { setErrore(e?.message || 'Non riesco a leggere lo stato del sito') }
    finally { setCaricando(false) }
  }
  useEffect(() => { if (entityId) carica() }, [entityId, entityTipo])
  // Il pannello si riallinea quando cambia qualcosa che mostra (pubblicazione,
  // visibilità): senza, resterebbe a dire la cosa di un minuto fa.
  useEffect(() => { if (entityId && s) carica() }, [entityData?.indicizzabile, entityData?.minisito?.active])

  const link = azione => azione ? (
    <button onClick={azione.onClick} style={{
      border: 'none', background: '#f0f4ff', color: '#1a1a2e', fontSize: 12, fontWeight: 600,
      padding: '6px 12px', borderRadius: 7, cursor: 'pointer', flexShrink: 0,
    }}>{azione.testo}</button>
  ) : null

  return (
    <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 12, padding: '18px 20px', marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Stato del sito
        </div>
        <button onClick={carica} title="Ricontrolla" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* L'interruttore di sempre: qui dentro, non in una copia. */}
      <VisibilitaMotori
        entityData={entityData}
        entityTipo={entityTipo}
        entityId={entityId}
        onCambiata={ind => { onCambiata?.(ind); carica() }}
      />

      {caricando && !s && <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Controllo…</p>}
      {errore && <p style={{ fontSize: 13, color: '#c00', margin: 0 }}>{errore}</p>}

      {s && (
        <div>
          <Riga
            stato={s.pubblicato ? 'ok' : 'attenzione'}
            titolo={s.pubblicato ? 'Sito pubblicato' : 'Sito non ancora pubblicato'}
            dettaglio={s.pubblicato
              ? 'Chi apre l’indirizzo vede il sito.'
              : 'Finché è spento, l’indirizzo mostra l’app del QR invece del sito.'}
          />

          <Riga
            stato={s.indirizzo ? 'ok' : 'attenzione'}
            titolo={s.indirizzo ? `Indirizzo: ${s.indirizzo}` : 'Nessun indirizzo attivo'}
            dettaglio={s.dominioProprio
              ? 'È il tuo dominio: è lì che portiamo chi arriva, e il QR code punta lì.'
              : s.indirizzo
                ? 'È l’indirizzo che diamo noi. Puoi collegare un dominio tuo quando vuoi.'
                : 'Serve un indirizzo perché il sito sia raggiungibile.'}
            azione={link(onVaiA && { testo: 'Domini', onClick: () => onVaiA('domini') })}
          />

          <Riga
            stato={s.blocchiHome > 0 ? 'ok' : 'attenzione'}
            titolo={s.blocchiHome > 0 ? `Home con ${s.blocchiHome} sezioni` : 'La home è ancora vuota'}
            dettaglio={s.blocchiHome > 0
              ? 'È la pagina che i motori di ricerca leggono per prima.'
              : 'Senza contenuti, un motore di ricerca non ha niente da mostrare.'}
          />

          <Riga
            stato={s.titoloSeo && s.descrizioneSeo ? 'ok' : 'attenzione'}
            titolo={s.titoloSeo && s.descrizioneSeo
              ? 'Titolo e descrizione scritti'
              : !s.titoloSeo && !s.descrizioneSeo
                ? 'Titolo e descrizione non scritti'
                : s.titoloSeo ? 'Manca la descrizione' : 'Manca il titolo'}
            dettaglio={s.titoloSeo && s.descrizioneSeo
              ? s.titoloSeo
              : 'Sono le due righe che si leggono nei risultati di ricerca. Se non li scrivi li ricaviamo dal contenuto, ma scritti da te funzionano meglio.'}
            azione={link(onVaiA && { testo: 'Scrivili', onClick: () => onVaiA('seo') })}
          />

          <Riga
            stato={s.immagineSocial ? 'ok' : 'attenzione'}
            titolo={s.immagineSocial ? 'Immagine per le condivisioni' : 'Nessuna immagine per le condivisioni'}
            dettaglio={s.immagineSocial
              ? 'Chi condivide il link su WhatsApp o Facebook vede un’anteprima.'
              : 'Senza, il link condiviso esce con un rettangolo grigio.'}
          />

          <Riga
            stato={(s.pagine + s.articoli + s.eventiInProgramma) > 0 ? 'ok' : 'neutro'}
            titolo={[
              `${s.pagine} ${s.pagine === 1 ? 'pagina' : 'pagine'}`,
              `${s.articoli} ${s.articoli === 1 ? 'articolo' : 'articoli'}`,
              `${s.eventiInProgramma} ${s.eventiInProgramma === 1 ? 'evento in programma' : 'eventi in programma'}`,
            ].join(' · ')}
            dettaglio="Ogni pagina, articolo ed evento è dichiarato nella mappa che diamo ai motori di ricerca."
          />

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f1f4', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {s.indirizzo && (
              <a href={`https://${s.indirizzo}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', textDecoration: 'none' }}>
                Apri il sito <ExternalLink size={13} strokeWidth={1.5} />
              </a>
            )}
            <span style={{ fontSize: 12, color: '#999' }}>
              Quando comparirà nei risultati lo decide Google: di solito qualche giorno, a volte qualche settimana.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
