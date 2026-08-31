'use client'
import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAzienda } from '@/context/AziendaContext'


// ⚠️ Sta qui, e non dentro Shop.
//
// I pagamenti servono al negozio **e** alle prenotazioni **e** agli eventi: il
// conto e' dell'azienda, non del negozio. Chi vuole incassare un acconto su una
// prenotazione non va a cercarlo dentro il negozio — magari il negozio non lo
// usa nemmeno. Spostata prima che andasse in produzione, quando non costava
// niente a nessuno.
// Il collegamento con Stripe.
//
// ⚠️ Lo stato si chiede **all'API a ogni apertura**, non a una copia nel nostro
// database: i requisiti di Stripe cambiano da soli quando cambiano le regole dei
// circuiti, e una copia direbbe «tutto a posto» mentre l'account è bloccato. Il
// cliente lo scoprirebbe dal primo pagamento rifiutato.
//
// L'intestazione, uguale in ogni stato: senza, la pagina si apriva dritta su un
// riquadro e non diceva nemmeno dove sei.
//
// ⚠️ Definita **fuori** dal componente. Dentro, cambierebbe identità a ogni
// render e React smonterebbe e rimonterebbe tutto quello che contiene — la
// stessa regola che vale per gli editor con i campi di testo.
function Pagina({ children }) {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <CreditCard size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Pagamenti</h1>
      </div>
      {children}
    </div>
  )
}

export default function PagamentiPage() {
  // ⚠️ Per un super_admin l'azienda NON si deduce dal profilo: ne amministra
  // molte, e va detto di quale si sta parlando. Senza, la route rispondeva
  // «Nessuna azienda» e la pagina non mostrava niente — trovato da Francesco,
  // che e' super_admin, mentre le prove le avevo fatte con un utente normale.
  // Di nuovo: provato il pezzo, non il percorso suo.
  const { azienda, activeAziendaId, loading: caricaAzienda } = useAzienda()
  const aziendaId = activeAziendaId || azienda?.id || null
  const [stato, setStato] = useState(null)
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => {
    if (caricaAzienda) return
    const q = aziendaId ? `?azienda_id=${encodeURIComponent(aziendaId)}` : ''
    apiFetch(`/api/stripe/connect${q}`).then(setStato).catch(e => setErrore(e.message))
  }, [aziendaId, caricaAzienda])

  async function collega() {
    setInCorso(true); setErrore('')
    try {
      const { url } = await apiFetch('/api/stripe/connect', { method: 'POST', body: JSON.stringify({ azienda_id: aziendaId }) })
      // Stessa scheda: si torna qui quando ha finito, e il ritorno porta un
      // parametro che ci dice com'è andata.
      if (url) window.location.href = url
      else throw new Error('Stripe non ha restituito un collegamento')
    } catch (e) { setErrore(e.message); setInCorso(false) }
  }

  if (caricaAzienda) return <Pagina><p style={{ color: '#888' }}>Caricamento…</p></Pagina>

  // ⚠️ Un super_admin amministra più aziende: finché non ne sceglie una, non
  // c'è un conto di cui parlare. Meglio dirgli cosa fare che mostrargli
  // «Nessuna azienda», che sembra un guasto e non spiega niente.
  if (!aziendaId) return (
    <Pagina><div style={riquadro}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Scegli prima un’azienda</div>
      <p style={{ ...testo, marginBottom: 0 }}>
        Il conto per gli incassi è di una singola azienda. Selezionala dal menu in alto e
        questa pagina ti mostrerà il suo stato.
      </p>
    </div></Pagina>
  )

  if (errore) return <Pagina><div style={{ color: '#c53030' }}>{errore}</div></Pagina>
  if (!stato) return <Pagina><p style={{ color: '#888' }}>Caricamento…</p></Pagina>

  if (stato.non_configurato) return (
    <Pagina><div style={riquadro}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Pagamenti non ancora disponibili</div>
      <p style={testo}>I pagamenti online non sono ancora attivi su questa installazione. Ci stiamo lavorando.</p>
    </div></Pagina>
  )

  if (!stato.collegato) return (
    <Pagina><div style={riquadro}>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Incassa i tuoi ordini</div>
      <p style={testo}>
        Per vendere online colleghi un conto Stripe: <strong>gli incassi arrivano direttamente a te</strong>,
        sul tuo conto corrente. OltreNova non trattiene nulla e non tocca i tuoi soldi.
      </p>
      <p style={{ ...testo, marginBottom: 18 }}>
        Ti servono i dati della tua attività, un documento del titolare e l’IBAN dove vuoi ricevere gli
        incassi. Li inserisci su Stripe, non qui.
      </p>
      <button onClick={collega} disabled={inCorso} style={bottonePrimario(inCorso)}>
        {inCorso ? 'Apro Stripe…' : 'Collega il tuo conto'}
      </button>
    </div></Pagina>
  )

  return (
    <Pagina><div style={riquadro}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={badge(stato.incassa ? { label: '', color: '#276749', bg: '#f0fff4' } : { label: '', color: '#b7791f', bg: '#fffbeb' })}>
          {stato.incassa ? 'Attivo' : 'Da completare'}
        </span>
        <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{stato.nome || 'Conto collegato'}</span>
      </div>

      {stato.incassa ? (
        <p style={testo}>Puoi ricevere pagamenti. Gli incassi arrivano sul tuo conto Stripe.</p>
      ) : (
        <p style={testo}>
          Il collegamento c’è, ma Stripe ha ancora bisogno di alcuni dati prima di farti incassare.
          Riprendi da dove eri: bastano pochi minuti.
        </p>
      )}

      {stato.da_completare && (
        <button onClick={collega} disabled={inCorso} style={{ ...bottonePrimario(inCorso), marginTop: 6 }}>
          {inCorso ? 'Apro Stripe…' : 'Completa su Stripe'}
        </button>
      )}

      <p style={{ fontSize: 12.5, color: '#999', marginTop: 16, lineHeight: 1.6 }}>
        Rimborsi, contestazioni e report li gestisci dal tuo pannello Stripe, dove trovi anche la loro
        assistenza. <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a2e' }}>Vai a Stripe →</a>
      </p>
    </div></Pagina>
  )
}


const riquadro = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 24, maxWidth: 560 }
const testo = { fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 12px' }
const bottonePrimario = (spento) => ({
  padding: '11px 22px', background: spento ? '#888' : '#1a1a2e', color: '#fff',
  border: 'none', borderRadius: 8, cursor: spento ? 'wait' : 'pointer', fontWeight: 600, fontSize: 14.5,
})
const badge = (v) => ({ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: v.bg, color: v.color, whiteSpace: 'nowrap' })
