import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import {
  Search, ChevronDown, LifeBuoy, Send, CheckCircle,
  LayoutDashboard, Inbox, CalendarCheck, Calendar, Star, BarChart3,
  Users, Mail, Newspaper, BotMessageSquare, CalendarDays, Sparkles,
  FileText, FormInput, ShoppingBag, Gift, BarChart2, QrCode,
  UserCheck, Shield, Globe, Package,
} from 'lucide-react'

// ─── Sezioni — corrispondono 1:1 alle voci sidebar ────────────────────────────
// perm: null = tutti | 'admin' = solo admin_azienda/super_admin | 'chiave' = staff con quel permesso
const SECTIONS = [
  { key: 'dashboard',       label: 'Dashboard',         icon: LayoutDashboard, color: '#1a1a2e', perm: null },
  { key: 'richieste',       label: 'Richieste',          icon: Inbox,           color: '#e53e3e', perm: 'richieste' },
  { key: 'prenotazioni',    label: 'Prenotazioni',       icon: CalendarCheck,   color: '#2563eb', perm: 'prenotazioni' },
  { key: 'booking',         label: 'Booking',            icon: Calendar,        color: '#059669', perm: 'booking' },
  { key: 'eventi',          label: 'Eventi',             icon: CalendarDays,    color: '#d97706', perm: 'eventi' },
  { key: 'recensioni',      label: 'Recensioni',         icon: Star,            color: '#f59e0b', perm: 'recensioni' },
  { key: 'survey',          label: 'Survey & NPS',       icon: BarChart3,       color: '#06b6d4', perm: 'survey' },
  { key: 'contatti',        label: 'Contatti',           icon: Users,           color: '#7c3aed', perm: 'contatti' },
  { key: 'newsletter',      label: 'Newsletter',         icon: Mail,            color: '#db2777', perm: 'newsletter' },
  { key: 'blog',            label: 'Blog & News',        icon: Newspaper,       color: '#0891b2', perm: 'blog' },
  { key: 'automazioni',     label: 'Automazioni',        icon: BotMessageSquare,color: '#64748b', perm: 'automazioni' },
  { key: 'piano_editoriale',label: 'Piano Editoriale',   icon: CalendarDays,    color: '#6366f1', perm: 'piano_editoriale' },
  { key: 'content_studio',  label: 'Content Studio',     icon: Sparkles,        color: '#8b5cf6', perm: 'content_studio' },
  { key: 'preventivi',      label: 'Preventivi',         icon: FileText,        color: '#0369a1', perm: 'preventivi' },
  { key: 'form_builder',    label: 'Form Builder',       icon: FormInput,       color: '#0d9488', perm: 'form_builder' },
  { key: 'shop',            label: 'Shop',               icon: ShoppingBag,     color: '#b45309', perm: 'shop' },
  { key: 'loyalty',         label: 'Loyalty',            icon: Gift,            color: '#c026d3', perm: 'loyalty' },
  { key: 'analytics',       label: 'Analytics',          icon: BarChart2,       color: '#10b981', perm: 'analytics' },
  { key: 'sito_app',        label: 'Sito & App',         icon: Globe,           color: '#0284c7', perm: 'sito_app' },
  { key: 'qrcode',          label: 'QR Code',            icon: QrCode,          color: '#374151', perm: null },
  { key: 'collaboratori',   label: 'Collaboratori',      icon: UserCheck,       color: '#6b7280', perm: 'admin' },
  { key: 'account',         label: 'Account & Sicurezza',icon: Shield,          color: '#92400e', perm: null },
]

const FAQS = [
  // ── Dashboard ──
  { sec: 'dashboard', q: 'Cosa vedo in dashboard?', a: 'La dashboard mostra un riepilogo in tempo reale: KPI (richieste aperte, prenotazioni oggi, visite sito, recensione media), le tue entità (strutture, ristoranti, attività) con accesso rapido, richieste recenti, prenotazioni di oggi, eventi imminenti e contatti recenti.' },
  { sec: 'dashboard', q: 'Come aggiorno i dati mostrati?', a: 'I dati si caricano automaticamente ogni volta che apri la dashboard. Per forzare un aggiornamento ricarica la pagina (F5).' },

  // ── Richieste ──
  { sec: 'richieste', q: 'Come funzionano le richieste degli ospiti?', a: 'Gli ospiti inviano richieste dalla PWA (es. pulizia camera, manutenzione, reception). Ogni richiesta ha un tipo, la camera e l\'orario. Puoi cambiare lo stato in Aperta → In corso → Risolta.' },
  { sec: 'richieste', q: 'Come rispondo a una richiesta?', a: 'Vai su Richieste, clicca sulla richiesta e cambia lo stato. Puoi aggiungere una nota interna per il tuo team. Le richieste chiuse rimangono nello storico.' },

  // ── Prenotazioni ──
  { sec: 'prenotazioni', q: 'Dove vedo le prenotazioni di attività ed escursioni?', a: 'In Prenotazioni trovi le richieste di prenotazione arrivate dalla PWA per attività, escursioni e interessi offerta. Sono organizzate in tab. Puoi filtrare per stato e vedere tutti i dettagli del cliente.' },
  { sec: 'prenotazioni', q: 'Qual è la differenza tra Prenotazioni e Booking?', a: '"Prenotazioni" raccoglie le richieste ospiti dalla PWA (attività, escursioni, offerte). "Booking" è il sistema di prenotazione risorse strutturato (slot orari, coperti) con calendario e gestione disponibilità.' },

  // ── Booking ──
  { sec: 'booking', q: 'Come creo una risorsa prenotabile?', a: 'In Booking → Risorse clicca "+ Nuova risorsa". Scegli "Slot" (durata fissa, es. campo da tennis) o "Coperti" (posti per servizio, es. ristorante). Imposta orari, quantità disponibile e giorni di apertura.' },
  { sec: 'booking', q: 'Come blocco date o orari specifici?', a: 'In Booking → Risorse, apri la risorsa e aggiungi un Blocco con date di inizio e fine. In quel periodo la risorsa non sarà prenotabile dal widget pubblico.' },
  { sec: 'booking', q: 'Come gestisco le prenotazioni ricevute?', a: 'In Booking → Prenotazioni filtra per data, risorsa e stato. Clicca su una prenotazione per i dettagli, aggiungere note interne o cambiare stato. Puoi anche inviare un link recensione al completamento.' },
  { sec: 'booking', q: 'Come mostro il booking nel mio sito?', a: 'In Booking → Risorse attiva "Visibile nel minisito" per ogni risorsa. Poi in Sito & App → Sito aggiungi la sezione "Booking" nell\'ordine sezioni. Il widget appare automaticamente.' },

  // ── Eventi ──
  { sec: 'eventi', q: 'Come creo un evento?', a: 'Vai su Eventi e clicca "+ Nuovo evento". Inserisci titolo, data, ora, descrizione, prezzo e foto. Puoi impostare il numero massimo di posti. L\'evento appare automaticamente nel sito se la sezione "eventi" è attiva.' },
  { sec: 'eventi', q: 'Come gestisco le iscrizioni a un evento?', a: 'In Events → clicca sull\'evento → "Prenotazioni". Vedi la lista degli iscritti con nome, email e stato. Puoi esportare la lista in CSV.' },

  // ── Recensioni ──
  { sec: 'recensioni', q: 'Come richiedo una recensione a un ospite?', a: 'In Recensioni clicca "+ Richiedi recensione" e inserisci l\'email dell\'ospite. Riceverà un link personale. Se dà ≥4 stelle viene reindirizzato su Google/TripAdvisor. Con meno di 4 stelle la recensione resta privata.' },
  { sec: 'recensioni', q: 'Come rispondo pubblicamente a una recensione?', a: 'In Recensioni, apri la recensione e scrivi la risposta nel campo dedicato. La risposta appare sul tuo sito pubblico accanto alla recensione, se questa è impostata come "pubblica".' },
  { sec: 'recensioni', q: 'Come importo recensioni da Google o TripAdvisor?', a: 'In Recensioni clicca "+ Importa". Puoi incollare manualmente le recensioni indicando la fonte (Google, TripAdvisor, Booking, ecc.). Non c\'è integrazione automatica diretta con queste piattaforme.' },

  // ── Survey ──
  { sec: 'survey', q: 'Come creo un survey per gli ospiti?', a: 'Vai su Survey & NPS. Puoi creare sondaggi di soddisfazione con domande personalizzate o usare il formato NPS (0-10). I risultati vengono raccolti e visualizzati con grafici.' },
  { sec: 'survey', q: 'Come condivido il survey?', a: 'Ogni survey ha un link pubblico e un QR code che puoi condividere via email, WhatsApp o stampare. Puoi anche incorporarlo in una pagina del sito.' },

  // ── Contatti ──
  { sec: 'contatti', q: 'Come aggiungo un contatto manualmente?', a: 'In Contatti clicca "+ Nuovo contatto". Inserisci nome, email, telefono e tag. Il contatto entra nella pipeline come "Lead" e puoi spostarlo nelle varie fasi (Contattato, In trattativa, Chiuso, Perso).' },
  { sec: 'contatti', q: 'Come funziona la pipeline Kanban?', a: 'In Contatti vai sulla vista Kanban. Trascina i contatti tra le colonne per aggiornarne lo stato: Lead → Contattato → In trattativa → Chiuso → Perso. Ogni spostamento può attivare un\'automazione.' },
  { sec: 'contatti', q: 'Come iscrivo un contatto alla newsletter?', a: 'Nella scheda del contatto attiva il flag "Iscritto newsletter". Il contatto riceverà le prossime newsletter inviate. Rispetta sempre il consenso esplicito dell\'utente.' },

  // ── Newsletter ──
  { sec: 'newsletter', q: 'Come invio la mia prima newsletter?', a: 'Vai su Newsletter e clicca "+ Nuova newsletter". Scegli un template (semplice, promozione, notizie, evento), scrivi oggetto e contenuto. Invia prima un\'email di test, poi clicca "Invia ora" o programma una data.' },
  { sec: 'newsletter', q: 'Cos\'è il doppio opt-in?', a: 'Quando qualcuno si iscrive dal sito riceve un\'email di conferma. Solo dopo aver cliccato il link entra nella lista definitiva. Protegge da iscrizioni false e rispetta il GDPR.' },
  { sec: 'newsletter', q: 'Posso programmare una newsletter per dopo?', a: 'Sì. Nell\'editor newsletter, invece di "Invia ora" usa "Programma invio" e scegli data e ora. La newsletter partirà automaticamente all\'orario impostato.' },

  // ── Blog ──
  { sec: 'blog', q: 'Come pubblico un articolo?', a: 'Vai su Blog & News e clicca "+ Nuovo articolo". L\'editor rich text supporta titoli, immagini, link e formattazione. Salva come bozza o pubblica subito. Gli articoli pubblicati appaiono nel blog del sito.' },
  { sec: 'blog', q: 'Come gestisco le categorie?', a: 'In Blog → Categorie puoi creare, rinominare e riordinare le categorie. Assegna una categoria a ogni articolo per organizzare il blog e migliorare la navigazione.' },

  // ── Automazioni ──
  { sec: 'automazioni', q: 'Come creo un\'automazione email?', a: 'In Automazioni clicca "+ Nuova automazione". Scegli il trigger (Nuova prenotazione, Pre-visita, Post-visita, Nuovo contatto) e aggiungi step con delay e messaggio. Usa variabili come {{nome}}, {{data}}, {{ora}}.' },
  { sec: 'automazioni', q: 'Quali variabili posso usare nei messaggi?', a: '{{nome}} — nome cliente, {{data}} — data prenotazione, {{ora}} — orario, {{servizio}} — nome servizio, {{n_persone}} — numero persone, {{link_recensione}} — link personale per recensione.' },
  { sec: 'automazioni', q: 'Come vedo se un\'automazione è partita?', a: 'In Automazioni, apri l\'automazione e vai su "Log esecuzioni". Vedi ogni invio con stato (inviato, in attesa, fallito), data e destinatario.' },

  // ── Piano Editoriale ──
  { sec: 'piano_editoriale', q: 'Come creo un post nel piano editoriale?', a: 'In Piano Editoriale clicca su un giorno nel calendario oppure "+ Nuovo post" nella vista lista. Inserisci titolo, testo, canali (Instagram, Facebook, LinkedIn, TikTok, X, Google Business) e stato (bozza, pianificato, pubblicato).' },
  { sec: 'piano_editoriale', q: 'Cosa sono le "Idee"?', a: 'Le Idee sono contenuti senza data — un backlog di spunti. Puoi aggiungerle velocemente con titolo, pillar e canale. Quando sei pronto clicca "Pianifica" e scegli la data: l\'idea diventa un post nel calendario.' },
  { sec: 'piano_editoriale', q: 'Il piano editoriale pubblica automaticamente sui social?', a: 'No, è uno strumento organizzativo. Gestisce il calendario editoriale e i testi, ma la pubblicazione vera va fatta manualmente sulle singole piattaforme social.' },

  // ── Content Studio ──
  { sec: 'content_studio', q: 'Cos\'è Content Studio?', a: 'Content Studio è il centro di produzione contenuti assistito dall\'AI. Puoi generare testi, caption social, articoli blog e copy marketing a partire da pochi input. Accessibile da Marketing → Content Studio.' },
  { sec: 'content_studio', q: 'Come genero un testo con Content Studio?', a: 'Scegli il tipo di contenuto (post social, articolo, email, ecc.), inserisci le informazioni di base (argomento, tono, lunghezza) e clicca "Genera". Puoi modificare il risultato e salvarlo direttamente nel piano editoriale o nel blog.' },

  // ── Preventivi ──
  { sec: 'preventivi', q: 'Come creo un preventivo?', a: 'In Preventivi clicca "+ Nuovo preventivo". Aggiungi le voci (descrizione, quantità, prezzo unitario, IVA). Il totale si aggiorna in tempo reale. Imposta una data di scadenza e invia il link al cliente.' },
  { sec: 'preventivi', q: 'Come il cliente accetta il preventivo?', a: 'Il cliente riceve un link al preventivo pubblico. Può visualizzarlo e accettarlo inserendo il suo nome (firma digitale). Ricevi una notifica e lo stato cambia in "Accettato".' },

  // ── Form Builder ──
  { sec: 'form_builder', q: 'Come creo un form personalizzato?', a: 'In Form Builder clicca "+ Nuovo form". Aggiungi campi trascinando i tipi disponibili (testo, email, telefono, numero, textarea, select, checkbox, data). Attiva il form e copia il codice embed per inserirlo nel sito.' },
  { sec: 'form_builder', q: 'Dove vedo le risposte ai form?', a: 'In Form Builder → clicca sul form → "Risposte". Vedi tutte le submission con data e dati inseriti. Puoi esportare in CSV. Se il form include un campo email, il contatto viene aggiunto automaticamente al CRM.' },

  // ── Shop ──
  { sec: 'shop', q: 'Come aggiungo un prodotto allo shop?', a: 'In Shop clicca "+ Nuovo prodotto". Inserisci nome, descrizione, prezzo, foto e disponibilità. Il prodotto appare nel sito quando lo shop è attivo nella sezione Sito & App.' },
  { sec: 'shop', q: 'Come gestisco gli ordini?', a: 'In Shop → Ordini vedi tutti gli acquisti con stato (in attesa, confermato, spedito, completato). Clicca su un ordine per i dettagli e per aggiornare lo stato.' },

  // ── Loyalty ──
  { sec: 'loyalty', q: 'Come funziona il programma fedeltà?', a: 'In Loyalty puoi creare un programma punti per i tuoi clienti. Ogni acquisto o prenotazione assegna punti che si accumulano. I clienti possono riscattarli per ottenere sconti o premi.' },
  { sec: 'loyalty', q: 'Come assegno punti a un cliente?', a: 'In Loyalty → Clienti cerca il cliente e clicca "+ Aggiungi punti". Puoi assegnare punti manualmente o configurare regole automatiche legate agli ordini o prenotazioni.' },

  // ── Analytics ──
  { sec: 'analytics', q: 'Cosa mostrano le analytics?', a: 'In Analytics trovi grafici su: visite al minisito, richieste ospiti, prenotazioni, iscrizioni newsletter e nuovi contatti. Puoi scegliere il range temporale (7, 30 o 90 giorni).' },
  { sec: 'analytics', q: 'Come viene contata una visita?', a: 'Una visita viene registrata quando un utente apre la pagina del minisito. Il sistema deduplica per sessione: la stessa persona che apre la pagina più volte nella stessa sessione browser conta come 1 visita.' },

  // ── Sito & App ──
  { sec: 'sito_app', q: 'Come attivo il minisito pubblico?', a: 'In Sito & App → Sito, in alto c\'è il toggle "Minisito attivo". Una volta attivato, il QR mostra la landing page pubblica. Puoi configurare sezioni, ordine, header, footer e tema.' },
  { sec: 'sito_app', q: 'Come aggiungo pagine al sito?', a: 'In Sito & App → Sito vai su "Pagine". Clicca "+ Nuova pagina", scegli un template o parti da zero. L\'editor a blocchi supporta 23 tipi di blocchi (testi, immagini, CTA, FAQ, gallery, ecc.).' },
  { sec: 'sito_app', q: 'Come collego un dominio personalizzato?', a: 'In Sito & App → Domini inserisci il tuo dominio. Il sistema fornisce le istruzioni DNS. Dopo la propagazione (24-48 ore) clicca "Verifica".' },
  { sec: 'sito_app', q: 'Come configuro il chatbot?', a: 'In Sito & App → Chatbot costruisci l\'albero di conversazione con nodi e opzioni (rimanda a nodo, link, chiamata, WhatsApp). Appare come pulsante floating nel sito quando è attivo.' },

  // ── QR Code ──
  { sec: 'qrcode', q: 'Come ottengo il QR code?', a: 'Vai su Account → QR Code. Scarica il QR in PNG ad alta risoluzione. Inquadrarlo porta direttamente alla PWA. Stampalo e posizionalo in reception, sui tavoli o in camera.' },
  { sec: 'qrcode', q: 'Posso personalizzare il QR code?', a: 'Al momento il QR code è standard. Puoi aggiungerlo a materiali grafici personalizzati usando l\'immagine scaricata. In futuro sarà possibile aggiungere il logo al centro.' },

  // ── Collaboratori ──
  { sec: 'collaboratori', q: 'Come invito un collaboratore?', a: 'In Account → Collaboratori clicca "+ Invita collaboratore". Inserisci email e nome, spunta le sezioni a cui può accedere. Riceverà un link via email per impostare la password. Valido 24 ore.' },
  { sec: 'collaboratori', q: 'Come modifico i permessi?', a: 'In Account → Collaboratori clicca "Modifica accessi" accanto al collaboratore. Le modifiche sono immediate: il collaboratore vede i nuovi accessi al prossimo refresh.' },
  { sec: 'collaboratori', q: 'Come sospendo un account?', a: 'In Account → Collaboratori clicca "Sospendi". L\'account viene bloccato immediatamente. Puoi riabilitarlo in qualsiasi momento cliccando "Riabilita".' },
  { sec: 'collaboratori', q: 'Posso rendere il 2FA obbligatorio?', a: 'Sì. In cima alla pagina Collaboratori c\'è il toggle "2FA obbligatorio". Ogni collaboratore dovrà configurare la verifica a due fattori prima di poter accedere.' },

  // ── Account & Sicurezza ──
  { sec: 'account', q: 'Come cambio la password?', a: 'Vai su Account → Sicurezza. In alternativa usa "Password dimenticata?" nella pagina di login per ricevere un link di reset via email (valido 1 ora).' },
  { sec: 'account', q: 'Come attivo la verifica a due fattori (2FA)?', a: 'In Account → Sicurezza clicca "Attiva 2FA". Scansiona il QR con Google Authenticator o Authy e inserisci il codice per confermare. Da quel momento ti verrà chiesto il codice ad ogni accesso.' },
  { sec: 'account', q: 'I miei dati sono al sicuro?', a: 'Sì. I dati sono su Supabase (PostgreSQL) con backup notturni automatici su cloud ridondante. Connessione sempre HTTPS. Nessuna condivisione con terzi. Puoi richiedere esportazione o cancellazione.' },
]

// ─── Logica visibilità ────────────────────────────────────────────────────────
function isSectionVisible(sec, role, perm) {
  if (role !== 'staff') return true
  if (sec.perm === null) return true
  if (sec.perm === 'admin') return false
  if (sec.perm === 'sito_app') return !!(perm.struttura || perm.ristorante || perm.attivita_gestione)
  return !!perm[sec.perm]
}

export default function HelpPage() {
  const { profile } = useAuth()
  const [search,      setSearch]      = useState('')
  const [activeKey,   setActiveKey]   = useState(null)
  const [openIdx,     setOpenIdx]     = useState(null)
  const [tipo,        setTipo]        = useState('Bug')
  const [descrizione, setDescrizione] = useState('')
  const [sending,     setSending]     = useState(false)
  const [sent,        setSent]        = useState(false)
  const [sendError,   setSendError]   = useState(null)

  const role = profile?.role
  const perm = profile?.permissions || {}

  const visibleSections = SECTIONS.filter(s => isSectionVisible(s, role, perm))

  const q = search.toLowerCase()
  const filteredFaqs = FAQS.filter(f => {
    const sec = SECTIONS.find(s => s.key === f.sec)
    if (!sec || !isSectionVisible(sec, role, perm)) return false
    if (activeKey && f.sec !== activeKey) return false
    if (q) return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    return true
  })

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
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} strokeWidth={1.8} color="#aaa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Cerca in tutte le sezioni…"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveKey(null); setOpenIdx(null) }}
          style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1.5px solid #ddd', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', background: '#fff', outline: 'none' }}
        />
      </div>

      {/* ── Sezioni (chip) ── */}
      {!search && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {visibleSections.map(({ key, label, icon: Icon, color }) => {
            const active = activeKey === key
            return (
              <button
                key={key}
                onClick={() => { setActiveKey(active ? null : key); setOpenIdx(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: active ? color : '#fff',
                  color: active ? '#fff' : '#444',
                  border: `1.5px solid ${active ? color : '#e5e5e5'}`,
                  transition: 'all .15s',
                }}
              >
                <Icon size={13} strokeWidth={2} color={active ? '#fff' : color} />
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── FAQ accordion ── */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 32, overflow: 'hidden' }}>
        {filteredFaqs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            Nessun risultato. Prova altre parole o segnala il problema qui sotto.
          </div>
        ) : filteredFaqs.map((f, i) => {
          const sec = SECTIONS.find(s => s.key === f.sec)
          const isOpen = openIdx === i
          return (
            <div key={i} style={{ borderBottom: i < filteredFaqs.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {sec && <sec.icon size={14} strokeWidth={2} color={sec.color} style={{ flexShrink: 0 }} />}
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 }}>{f.q}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} color="#bbb" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              {isOpen && (
                <div style={{ padding: '0 20px 16px 44px', fontSize: 14, color: '#555', lineHeight: 1.7 }}>
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
              <div style={{ fontSize: 13, color: '#15803d' }}>Ti risponderemo all'indirizzo email del tuo account.</div>
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
                <label style={lbl}>Account</label>
                <input type="text" value={profile?.email || ''} readOnly style={{ ...inp, background: '#f9f9f9', color: '#888' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Descrizione *</label>
              <textarea required value={descrizione} onChange={e => setDescrizione(e.target.value)}
                placeholder="Descrivi il problema o la domanda nel dettaglio…" rows={4}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            {sendError && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{sendError}</p>}
            <button type="submit" disabled={sending || !descrizione.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: sending || !descrizione.trim() ? 0.6 : 1 }}>
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
