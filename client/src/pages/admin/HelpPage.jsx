import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { Search, ChevronDown, LifeBuoy, Rocket, CalendarCheck, Users, Globe, Mail, Shield, Send, CheckCircle } from 'lucide-react'

const CATEGORIES = [
  { key: 'primi_passi',   label: 'Primi passi',           icon: Rocket,        color: '#1a1a2e' },
  { key: 'booking',       label: 'Prenotazioni & Booking', icon: CalendarCheck, color: '#2563eb' },
  { key: 'collaboratori', label: 'Collaboratori',          icon: Users,         color: '#7c3aed' },
  { key: 'sito_app',      label: 'Sito & App',             icon: Globe,         color: '#059669' },
  { key: 'marketing',     label: 'Newsletter & Marketing', icon: Mail,          color: '#db2777' },
  { key: 'account',       label: 'Account & Sicurezza',    icon: Shield,        color: '#d97706' },
]

const FAQS = [
  // ── Primi passi ──
  { cat: 'primi_passi', q: 'Come creo la mia prima struttura o attività?', a: 'Dal menu laterale clicca sull\'entità attiva (struttura, ristorante o attività) e vai su "Informazioni". Inserisci nome, indirizzo, email e orari. Carica logo e foto di copertina dalla stessa pagina. La struttura diventa visibile agli ospiti solo quando è impostata su "Attiva".' },
  { cat: 'primi_passi', q: 'Come ottengo il QR code da stampare o condividere?', a: 'Vai su Account → QR Code nel menu laterale. Puoi scaricare il QR code in PNG ad alta risoluzione. Inquadrarlo porta direttamente alla PWA della tua struttura. Stampalo e posizionalo in reception, sui tavoli o in camera.' },
  { cat: 'primi_passi', q: 'Come installo la PWA sul telefono degli ospiti?', a: 'Quando un ospite apre il link (o scansiona il QR), il browser mostra automaticamente un banner "Aggiungi alla schermata Home". Su iOS Safari tocca l\'icona Condividi → "Aggiungi a Home". Su Android Chrome compare direttamente il banner. L\'app funziona anche offline dopo l\'installazione.' },
  { cat: 'primi_passi', q: 'Come carico il logo e la foto di copertina?', a: 'Vai su Sito & App → Informazioni. Clicca su "Carica logo" o "Carica copertina" e seleziona il file dal tuo dispositivo. I formati supportati sono JPG, PNG e WebP. La copertina ideale è 1200×630px. Le immagini vengono ottimizzate automaticamente.' },
  { cat: 'primi_passi', q: 'Posso avere più strutture o attività nello stesso account?', a: 'Sì. Dal menu laterale trovi il selettore entità in alto (se ne hai più di una). Puoi aggiungere strutture, ristoranti e attività dalla sezione Piattaforma (super admin) o contattando il supporto. Ogni entità ha la propria PWA, minisito e configurazione indipendente.' },

  // ── Booking ──
  { cat: 'booking', q: 'Come creo una risorsa prenotabile?', a: 'Vai su Booking → Risorse e clicca "+ Nuova risorsa". Scegli la modalità: "Slot" (es. campo da tennis, sala trattamenti — slot orari con durata fissa) oppure "Coperti" (es. ristorante — posti disponibili per servizio). Imposta nome, quantità disponibile, durata slot o servizi, orari e giorni di apertura.' },
  { cat: 'booking', q: 'Come gestisco le prenotazioni ricevute?', a: 'Vai su Booking → Prenotazioni. Puoi filtrare per data, risorsa e stato. Clicca su una prenotazione per vedere i dettagli, aggiungere note interne o cambiare lo stato (In attesa → Confermata → Completata). Puoi anche inviare automaticamente un link recensione al completamento.' },
  { cat: 'booking', q: 'Come blocco una data o un orario specifico?', a: 'In Booking → Risorse, apri la risorsa e scorri fino a "Blocchi". Aggiungi un blocco con data di inizio e fine: in quel periodo la risorsa non sarà prenotabile dal widget pubblico. Utile per manutenzione, ferie o eventi speciali.' },
  { cat: 'booking', q: 'Come faccio vedere il booking nel sito?', a: 'In Booking → Risorse, attiva il flag "Visibile nel minisito" per ogni risorsa che vuoi mostrare. Poi nel CMS del tuo sito (Sito & App → Sito) aggiungi la sezione "Booking" all\'ordine delle sezioni. Il widget di prenotazione apparirà automaticamente.' },
  { cat: 'booking', q: 'Gli ospiti ricevono una conferma email?', a: 'Sì, automaticamente. Quando arriva una prenotazione il sistema invia un\'email di conferma all\'ospite con i dettagli e un link per cancellare in autonomia se necessario. Assicurati di aver configurato l\'email della struttura in Informazioni.' },

  // ── Collaboratori ──
  { cat: 'collaboratori', q: 'Come invito un collaboratore?', a: 'Vai su Account → Collaboratori e clicca "+ Invita collaboratore". Inserisci email e nome, poi spunta le sezioni a cui vuole accedere. Il collaboratore riceverà un\'email con un link per impostare la sua password e accedere. Il link è valido 24 ore.' },
  { cat: 'collaboratori', q: 'Come modifico i permessi di un collaboratore?', a: 'In Account → Collaboratori, trova il collaboratore e clicca "Modifica accessi". Spunta o deseleziona le sezioni. Le modifiche sono immediate: il collaboratore vedrà i nuovi accessi al prossimo refresh della pagina.' },
  { cat: 'collaboratori', q: 'Come sospendo temporaneamente un accesso?', a: 'In Account → Collaboratori, clicca "Sospendi" accanto al collaboratore. L\'account viene bloccato immediatamente e il collaboratore non potrà più accedere. Puoi riabilitarlo in qualsiasi momento cliccando "Riabilita".' },
  { cat: 'collaboratori', q: 'Il collaboratore ha dimenticato la password, cosa fare?', a: 'Il collaboratore può usare il link "Password dimenticata?" nella pagina di login (/admin/login). Riceverà un\'email con un link di reset valido 1 ora. In alternativa puoi eliminarlo e reinvitarlo.' },
  { cat: 'collaboratori', q: 'Posso richiedere il 2FA obbligatorio per tutti i collaboratori?', a: 'Sì. In Account → Collaboratori, in cima alla pagina c\'è il toggle "2FA obbligatorio". Una volta attivato, ogni collaboratore dovrà configurare la verifica a due fattori prima di poter accedere al pannello.' },

  // ── Sito & App ──
  { cat: 'sito_app', q: 'Come attivo il minisito pubblico?', a: 'Vai su Sito & App → Sito dell\'entità. In alto trovi il toggle "Minisito attivo". Una volta attivato, inquadrare il QR o aprire il link mostra prima la landing page pubblica invece della PWA. Puoi configurare le sezioni, l\'ordine e il tema dalla stessa pagina.' },
  { cat: 'sito_app', q: 'Come aggiungo pagine al sito (es. "Chi siamo", "Servizi")?', a: 'In Sito & App → Sito, vai sulla tab "Pagine". Clicca "+ Nuova pagina", scegli un template o parti da zero. Ogni pagina ha un editor a blocchi (testi, immagini, CTA, FAQ, ecc.) con anteprima live. Le pagine pubblicate appaiono automaticamente nel menu di navigazione.' },
  { cat: 'sito_app', q: 'Come collego un dominio personalizzato?', a: 'Vai su Sito & App → Domini. Inserisci il tuo dominio (es. www.miostruttura.com). Il sistema ti fornirà le istruzioni DNS da configurare nel tuo registrar (Cloudflare, Aruba, ecc.). Una volta propagato (di solito 24-48 ore) clicca "Verifica" per attivarlo.' },
  { cat: 'sito_app', q: 'Come configuro il chatbot?', a: 'In Sito & App → Chatbot, costruisci l\'albero di conversazione aggiungendo nodi e opzioni. Ogni opzione può rimandare a un altro nodo, aprire un link, avviare una chiamata o aprire WhatsApp. Il chatbot appare come pulsante floating nel sito e nella PWA quando è attivo.' },
  { cat: 'sito_app', q: 'Come cambio i colori e il font del sito?', a: 'Vai su Sito & App → Tema e colori. Puoi cambiare il colore principale, il font del titolo e del corpo, lo stile dell\'header e i bordi (arrotondati, misti o squadrati). L\'anteprima si aggiorna in tempo reale.' },

  // ── Marketing ──
  { cat: 'marketing', q: 'Come invio la mia prima newsletter?', a: 'Vai su Marketing → Newsletter e clicca "+ Nuova newsletter". Scegli un template, scrivi oggetto e contenuto. Clicca "Invia email di test" per vederla nella tua casella prima di inviarla. Quando sei pronto clicca "Invia ora" oppure programma una data futura.' },
  { cat: 'marketing', q: 'Cos\'è il doppio opt-in e come funziona?', a: 'Quando un visitatore si iscrive alla newsletter dal tuo sito, riceve un\'email di conferma. Solo dopo aver cliccato "Conferma iscrizione" viene aggiunto alla lista definitiva. Questo protegge te da iscrizioni false e rispetta il GDPR. I contatti non confermati sono visibili ma non ricevono le newsletter.' },
  { cat: 'marketing', q: 'Come creo un\'automazione email?', a: 'In Marketing → Automazioni, clicca "+ Nuova automazione". Scegli il trigger (es. "Nuova prenotazione", "Nuovo contatto") e aggiungi uno o più step con delay e messaggio. Puoi usare variabili come {{nome}}, {{data}}, {{ora}} nel testo. L\'automazione si attiva automaticamente al verificarsi del trigger.' },
  { cat: 'marketing', q: 'Come gestisco il piano editoriale dei social?', a: 'Vai su Marketing → Piano Editoriale. Puoi visualizzare i contenuti in tre modi: calendario (vista mensile), lista e idee (backlog). Clicca su un giorno nel calendario per creare un post, scegli i canali (Instagram, Facebook, LinkedIn, ecc.), lo stato e aggiungi note. Le "Idee" sono contenuti senza data che puoi pianificare quando vuoi.' },
  { cat: 'marketing', q: 'Come richiedo una recensione a un ospite?', a: 'In Marketing → Recensioni, clicca "+ Richiedi recensione" e inserisci l\'email dell\'ospite. Riceverà un link personale per lasciare valutazione e commento. Se dà 4 o 5 stelle, viene automaticamente reindirizzato alla tua pagina Google/TripAdvisor. Con meno di 4 stelle la recensione resta privata.' },

  // ── Account ──
  { cat: 'account', q: 'Come cambio la mia password?', a: 'Vai su Account → Sicurezza. Clicca "Cambia password", inserisci la nuova password (minimo 8 caratteri) e conferma. In alternativa usa il link "Password dimenticata?" nella pagina di login per ricevere un link di reset via email.' },
  { cat: 'account', q: 'Come attivo la verifica a due fattori (2FA)?', a: 'In Account → Sicurezza, clicca "Attiva 2FA". Scansiona il QR code con un\'app come Google Authenticator o Authy. Inserisci il codice a 6 cifre per confermare. Da quel momento ti verrà chiesto il codice ad ogni accesso.' },
  { cat: 'account', q: 'Come funziona il trial gratuito?', a: 'Hai 14 giorni di accesso completo a tutte le funzionalità senza carta di credito. Il banner in alto nella sidebar mostra i giorni rimasti. Allo scadere del trial ti contatteremo per attivare il piano a pagamento. Nessun addebito automatico.' },
  { cat: 'account', q: 'I miei dati sono al sicuro?', a: 'Sì. I dati sono ospitati su Supabase (PostgreSQL) con backup notturni automatici su cloud geograficamente ridondante. La connessione è sempre HTTPS. I dati non vengono mai condivisi con terzi. Puoi richiedere l\'esportazione o la cancellazione in qualsiasi momento.' },
]

export default function HelpPage() {
  const { profile } = useAuth()
  const [search,     setSearch]     = useState('')
  const [activecat,  setActiveCat]  = useState(null)
  const [openFaq,    setOpenFaq]    = useState(null)
  const [tipo,       setTipo]       = useState('Bug')
  const [descrizione,setDescrizione]= useState('')
  const [sending,    setSending]    = useState(false)
  const [sent,       setSent]       = useState(false)
  const [sendError,  setSendError]  = useState(null)

  const q = search.toLowerCase()
  const filtered = FAQS.filter(f =>
    (!activecat || f.cat === activecat) &&
    (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  )

  async function handleSegnala(e) {
    e.preventDefault()
    if (!descrizione.trim()) return
    setSending(true); setSendError(null)
    try {
      await apiFetch('/api/help/segnala', {
        method: 'POST',
        body: JSON.stringify({ tipo, descrizione, email: profile?.email }),
      })
      setSent(true)
      setDescrizione('')
    } catch (err) {
      setSendError(err.message || 'Errore nell\'invio. Riprova.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LifeBuoy size={24} strokeWidth={1.5} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Centro Assistenza</h1>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Trova risposte rapide o segnala un problema</p>
        </div>
      </div>

      {/* ── Barra di ricerca ── */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} strokeWidth={1.8} color="#aaa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Cerca nella guida…"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCat(null) }}
          style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1.5px solid #ddd', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', background: '#fff', outline: 'none' }}
        />
      </div>

      {/* ── Categorie ── */}
      {!search && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
          {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
            const active = activecat === key
            return (
              <button
                key={key}
                onClick={() => setActiveCat(active ? null : key)}
                style={{
                  background: active ? color : '#fff',
                  border: `1.5px solid ${active ? color : '#e8e8e8'}`,
                  borderRadius: 12, padding: '14px 10px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .15s',
                }}
              >
                <Icon size={20} strokeWidth={1.6} color={active ? '#fff' : color} style={{ display: 'block', margin: '0 auto 8px' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#fff' : '#444', lineHeight: 1.3 }}>{label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── FAQ accordion ── */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 32, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            Nessun risultato trovato. Prova con altre parole o segnala il problema qui sotto.
          </div>
        ) : filtered.map((f, i) => {
          const isOpen = openFaq === i
          return (
            <div key={i} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <button
                onClick={() => setOpenFaq(isOpen ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 }}>{f.q}</span>
                <ChevronDown size={16} strokeWidth={2} color="#bbb" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              {isOpen && (
                <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#555', lineHeight: 1.7 }}>
                  {f.a}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Segnala problema ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Non hai trovato risposta?</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#888' }}>Segnalaci il problema e ti rispondiamo il prima possibile.</p>

        {sent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px' }}>
            <CheckCircle size={20} strokeWidth={1.8} color="#22c55e" />
            <div>
              <div style={{ fontWeight: 600, color: '#166534', fontSize: 14 }}>Segnalazione inviata</div>
              <div style={{ fontSize: 13, color: '#4ade80' }}>Ti risponderemo all'indirizzo email del tuo account.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSegnala}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp}>
                  <option>Bug</option>
                  <option>Domanda</option>
                  <option>Suggerimento</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Il tuo account</label>
                <input type="text" value={profile?.email || ''} readOnly style={{ ...inp, background: '#f9f9f9', color: '#888' }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Descrizione *</label>
              <textarea
                required
                value={descrizione}
                onChange={e => setDescrizione(e.target.value)}
                placeholder="Descrivi il problema o la domanda nel dettaglio…"
                rows={4}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {sendError && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{sendError}</p>}

            <button
              type="submit"
              disabled={sending || !descrizione.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: sending || !descrizione.trim() ? 0.6 : 1 }}
            >
              <Send size={14} strokeWidth={2} />
              {sending ? 'Invio…' : 'Invia segnalazione'}
            </button>
          </form>
        )}
      </div>

    </div>
  )
}

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 5 }
const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }
