'use client'
import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAzienda } from '@/context/AziendaContext'
import { useAuth } from '@/context/AuthContext'


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
// ⚠️ L'avviso di ritorno sta QUI dentro, non in fondo alla pagina.
//
// Messo solo nel ramo finale non compariva a chi torna da Stripe mentre il
// conto non risulta ancora collegato — e quello e' il caso peggiore: uno ha
// appena consegnato i dati della sua azienda, torna, e legge «Collega il tuo
// conto» come se non avesse fatto niente.
function Pagina({ children, ritorno, stato }) {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <CreditCard size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Pagamenti</h1>
      </div>
      <AvvisoRitorno tipo={ritorno} stato={stato} />
      {children}
    </div>
  )
}

// Cosa si legge tornando da Stripe.
//
// ⛔ Prima non si leggeva niente: il percorso rimandava su un'altra pagina, che
// di Stripe non sapeva nulla. Uno finiva di consegnare i dati della propria
// azienda e un documento d'identità, tornava, e non gli diceva nessuno se
// fosse andata bene. Con un cliente davanti è il momento peggiore per lasciare
// una persona a indovinare.
//
// ⚠️ Definito **fuori** dal componente, come `Pagina`: dentro cambierebbe
// identità a ogni render.
function AvvisoRitorno({ tipo, stato }) {
  if (!tipo) return null
  const riprova = tipo === 'riprova'
  const finito = stato?.incassa
  // ⚠️ Se Stripe ci rimanda qui ma da noi il conto non risulta, dire «hai
  // finito» sarebbe una contraddizione con quello che si legge dieci righe
  // sotto — «Collega il tuo conto». Meglio dire che c'è qualcosa che non torna
  // e cosa fare, che far dubitare la persona di aver capito male.
  const nonRisulta = stato && !stato.collegato
  const testoAvviso = riprova
    ? 'Il collegamento con Stripe era scaduto — succede, dura pochi minuti. Riprendi da qui: non hai perso niente di quello che avevi già inserito.'
    : nonRisulta
      ? 'Stripe ti ha rimandato qui, ma il collegamento non ci risulta ancora registrato. Riprova con il pulsante qui sotto: i dati che hai già inserito su Stripe restano, non li devi riscrivere.'
      : finito
        ? 'Fatto: il conto è collegato e da adesso puoi incassare.'
        : 'Hai finito la tua parte su Stripe. Qui sotto trovi come sta andando.'
  const colore = (riprova || nonRisulta) ? { c: '#8a5a12', b: '#fffbeb', bo: '#fde68a' }
    : finito ? { c: '#276749', b: '#f0fff4', bo: '#c6f6d5' }
    : { c: '#2b6cb0', b: '#f0f4ff', bo: '#c3dafe' }
  return (
    <div style={{ background: colore.b, border: `1px solid ${colore.bo}`, borderRadius: 10, padding: '13px 16px', marginBottom: 18, color: colore.c, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
      {testoAvviso}
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
  // ⚠️ La risposta grezza di Stripe la vede solo chi amministra la piattaforma.
  // Serve a rimettere a posto le cose quando il pannello dice che manca
  // qualcosa e l'iscrizione non lo chiede — e senza, il 03/09 saremmo rimasti
  // ciechi. Ma un cliente che apre un blocco di JSON pensa che sia rotto: non
  // e' un'informazione per lui.
  const { profile } = useAuth()
  const superAdmin = profile?.role === 'super_admin'
  const aziendaId = activeAziendaId || azienda?.id || null
  const [stato, setStato] = useState(null)
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)
  // ⛔ Chi torna da Stripe atterrava su una pagina che non commentava niente:
  // aveva appena inserito i dati della sua azienda e un documento, e non gli
  // diceva nessuno se fosse andata bene. Il parametro nell'indirizzo c'era già
  // — non lo leggeva nessuno.
  const [ritorno, setRitorno] = useState(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search).get('stripe')
    if (p === 'fatto' || p === 'riprova') setRitorno(p)
  }, [])

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

  if (caricaAzienda) return <Pagina ritorno={ritorno} stato={stato}><p style={{ color: '#888' }}>Caricamento…</p></Pagina>

  // ⚠️ Un super_admin amministra più aziende: finché non ne sceglie una, non
  // c'è un conto di cui parlare. Meglio dirgli cosa fare che mostrargli
  // «Nessuna azienda», che sembra un guasto e non spiega niente.
  if (!aziendaId) return (
    <Pagina ritorno={ritorno} stato={stato}><div style={riquadro}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Scegli prima un’azienda</div>
      <p style={{ ...testo, marginBottom: 0 }}>
        Il conto per gli incassi è di una singola azienda. Selezionala dal menu in alto e
        questa pagina ti mostrerà il suo stato.
      </p>
    </div></Pagina>
  )

  if (errore) return <Pagina ritorno={ritorno} stato={stato}><div style={{ color: '#c53030' }}>{errore}</div></Pagina>
  if (!stato) return <Pagina ritorno={ritorno} stato={stato}><p style={{ color: '#888' }}>Caricamento…</p></Pagina>

  if (stato.non_configurato) return (
    <Pagina ritorno={ritorno} stato={stato}><div style={riquadro}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Pagamenti non ancora disponibili</div>
      <p style={testo}>I pagamenti online non sono ancora attivi su questa installazione. Ci stiamo lavorando.</p>
    </div></Pagina>
  )

  if (!stato.collegato) return (
    <Pagina ritorno={ritorno} stato={stato}><div style={riquadro}>
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
    <Pagina ritorno={ritorno} stato={stato}>
      <div style={riquadro}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* ⚠️ «Da completare» detto a chi ha già completato è la frase che ha
            mandato il cliente in tondo: gli diceva che toccava ancora a lui,
            mentre toccava a Stripe. Tre etichette, una per situazione. */}
        <span style={badge(
          stato.incassa ? { color: '#276749', bg: '#f0fff4' }
          : stato.da_completare ? { color: '#b7791f', bg: '#fffbeb' }
          : { color: '#2b6cb0', bg: '#f0f4ff' }
        )}>
          {stato.incassa ? 'Attivo' : stato.da_completare ? 'Da completare' : 'In verifica'}
        </span>
        <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{stato.nome || 'Conto collegato'}</span>
      </div>

      {/* ⛔ Tre situazioni, non due.
          Prima «non incassa ancora» diceva sempre «Stripe ha bisogno di altri
          dati, riprendi» — anche quando il cliente aveva finito e Stripe stava
          soltanto controllando. Lo si rimandava su Stripe, Stripe rispondeva
          «hai già finito», e si tornava al punto di partenza: un giro senza
          uscita, visto dal vivo il 03/09 con un cliente davanti. */}
      {stato.incassa && (
        <p style={testo}>Puoi ricevere pagamenti. Gli incassi arrivano sul tuo conto Stripe.</p>
      )}

      {stato.da_completare && (
        <>
          <p style={testo}>
            Stripe ha ancora bisogno di alcuni dati prima di farti incassare. Riprendi da dove eri:
            bastano pochi minuti.
          </p>
          {stato.mancanti?.length > 0 && (
            <ul style={{ margin: '0 0 14px', paddingLeft: 20 }}>
              {stato.mancanti.map((m, i) => (
                <li key={i} style={{ ...testo, margin: '0 0 6px' }}>{m}</li>
              ))}
            </ul>
          )}
          {/* ⚠️ Quando il problema è un nome o un indirizzo che non torna, il
              pulsante «Completa su Stripe» non basta: quel campo si corregge
              dal pannello Stripe, e l'iscrizione non lo richiede più. Senza
              questa riga si rifà l'onboarding all'infinito — è successo. */}
          {stato.mancanti?.some(m => /non corrisponde/.test(m)) && (
            <p style={{ ...testo, marginBottom: 14 }}>
              Un dato che «non corrisponde» si corregge dal pannello Stripe, non rifacendo l’iscrizione:{' '}
              <a href="https://dashboard.stripe.com/settings/account" target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a2e', fontWeight: 600 }}>
                apri i dati dell’attività su Stripe →
              </a>
            </p>
          )}
          <button onClick={collega} disabled={inCorso} style={{ ...bottonePrimario(inCorso), marginTop: 6 }}>
            {inCorso ? 'Apro Stripe…' : 'Completa su Stripe'}
          </button>
        </>
      )}

      {stato.in_verifica && (
        <>
          <p style={testo}>
            <strong>Hai finito la tua parte.</strong> Ora è Stripe a controllare i dati e i documenti:
            di solito ci vogliono pochi minuti, a volte un giorno lavorativo. Non devi fare altro —
            quando avranno finito, questa pagina dirà «Attivo».
          </p>
          <p style={{ ...testo, marginBottom: 0 }}>
            Se vuoi seguire il controllo passo passo, lo vedi dal tuo pannello Stripe qui sotto.
          </p>
        </>
      )}

      <p style={{ fontSize: 12.5, color: '#999', marginTop: 16, lineHeight: 1.6 }}>
        Rimborsi, contestazioni e report li gestisci dal tuo pannello Stripe, dove trovi anche la loro
        assistenza. <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a2e' }}>Vai a Stripe →</a>
      </p>

      {/* ⚠️ La risposta di Stripe così com'è, richiudibile.
          Serve quando il pannello dice che manca qualcosa e sull'onboarding non
          risulta niente da fare: è successo il 03/09, e senza questo blocco
          l'unico modo di capirlo era indovinare. Non è un'informazione per il
          cliente — è per chi deve rimettere le cose a posto. */}
      {superAdmin && !stato.incassa && stato.requisiti_grezzi && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12.5, color: '#888' }}>
            Cosa risponde Stripe, parola per parola (solo per te)
          </summary>
          <pre style={{
            marginTop: 10, padding: 12, background: '#f7f7f9', border: '1px solid #eee',
            borderRadius: 8, fontSize: 11.5, lineHeight: 1.5, color: '#444',
            overflowX: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          }}>{JSON.stringify(stato.requisiti_grezzi, null, 2)}</pre>
        </details>
      )}
      </div>
    </Pagina>
  )
}


const riquadro = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 24, maxWidth: 560 }
const testo = { fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 12px' }
const bottonePrimario = (spento) => ({
  padding: '11px 22px', background: spento ? '#888' : '#1a1a2e', color: '#fff',
  border: 'none', borderRadius: 8, cursor: spento ? 'wait' : 'pointer', fontWeight: 600, fontSize: 14.5,
})
const badge = (v) => ({ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: v.bg, color: v.color, whiteSpace: 'nowrap' })
