---
name: todo_prossima_sessione
description: "LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 29/08/2026, fine sessione: rientro offerte + pagina offerta live)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-29T19:56:38.348Z
---

# Dove siamo — 29/08/2026

⚠️ **Prima di scrivere codice**, tre regole nate da errori veri:
- [[reference_cosa_si_prenota]] — **prenotabili sono SOLO Risorse ed Eventi.**
  Prodotti e Offerte no. Sbagliato tre volte in una conversazione sola.
- [[feedback_autorizzare_cambi_importanti]] — togliere voci di menu, spostare
  dove il cliente crea qualcosa: si **chiede**, non si comunica.
- [[feedback_verificare_il_contesto]] — l'ultimo miglio: apro col browser il
  punto da cui ci arriva Francesco. Se non l'ho aperto è «scritto, non provato».

## Chiuso oggi (live e verificato in produzione)

- **Il cancello in `verifica-regole.mjs`**: blocca il deploy se un commit toglie
  una voce di menu, una funzione, una pagina o una route. Si apre con
  `autorizzato: <motivo>` nel messaggio di commit.
- **Rientro dall'errore «offerte prenotabili»**: `impegno: prenota` tolto, le
  tre route booking rileggono solo `risorse`, `offerte-prenotabili.js` e
  `migra-risorse.mjs` eliminati, copia «Furgone» cancellata.
- **La pagina dell'offerta** `/{s|r|a}/[slug]/offerte/[id]`: **non era mai stata
  creata** e tutte le offerte pubblicate davano 404. Ora c'è, col modulo
  «Richiedi informazioni» → CRM (tag `offerta`) + WhatsApp dove il numero c'è.
- Sonda `probe-pagina-offerta.mjs`, e `probe-booking-giornaliero` aggiornata al
  consenso obbligatorio.

## 🔴 Il buco scoperto il 29/08: il RIPRISTINO non è mai stato provato

**Verifica ≠ ripristino.** Il 29/08 abbiamo accertato che l'archivio *contiene* i
dati giusti (`verifica-backup.mjs`, verde). Non abbiamo mai accertato che da quel
file si **torni operativi**: quanto tempo ci vuole, se le tabelle rientrano
nell'ordine giusto, se le chiavi esterne reggono. Non esiste uno script:
`INCIDENTE.md` §3.2 dice «si ripristina scrivendo le tabelle una per una».

Non siamo senza rete — **Supabase Pro ha backup propri con ripristino a un clic**,
ed è quella la difesa per un disastro normale. Il nostro file serve nei due casi
che quelli non coprono: recuperare **solo alcune tabelle**, o quando è **l'account
Supabase stesso** il problema. È il secondo a non essere mai stato provato.

**Come si prova sul serio, senza rischiare la produzione**: creare un progetto
Supabase nuovo e vuoto, eseguirci le 97 migration, riversare l'archivio nell'ordine
`aziende → profiles → entita → pagine → domini → contatti` e poi il resto,
puntarci un'istanza locale e **aprire davvero un sito cliente**. Alla fine si sa
la cosa che oggi non sappiamo: **quante ore costa tornare in piedi.**

## ⏭️ Tecnico, in ordine di quanto sposta

1. **Onboarding «Inizia qui»** — `/admin/onboarding` è **404**. È il capitolo
   più importante: la sicurezza è fatta, quello che manca è che un cliente nuovo
   arrivi al sito pubblicato **da solo**. Oggi trova 26 voci di menu e nessuna
   strada. Vedi [[project_onboarding_mappa]].
2. **Shop → Ordini e Clienti** (deciso da Francesco, stile Shopify).
3. **Design del modulo di prenotazione** — grezzo, notato da lui.
4. **Stripe Connect** — fermo in attesa dei requisiti (punto 5 della sua lista).
   Vincolo suo: *«io non voglio stare nel flusso di denaro»*.
5. **Pagamenti Stripe** su booking risorse ed eventi (colonne
   `pagamento_stato/pagamento_id` già presenti). Lo Shop è già integrato.
6. **Next 16** — manutenzione, non sicurezza. I `params` async sono già migrati.
7. **Multi-lingua DE** · **Import documento v2** (PDF/DOCX + chunking).

## A carico di Francesco

✅ **Chiuse**: chiave R2 → **bucket lock** provato · **prova del backup** verde ·
**copia di `PROGETTO.md`** su seconda cartella e **hard disk esterno** ·
*email entità*: sono clienti di prova, non è un problema (30/08).

Restano:

1. **Secondo fattore** su Vercel, Supabase, Cloudflare, GitHub → poi la data in
   `INCIDENTE.md` (~20 min). **È l'unica cosa di sicurezza ancora aperta.**
2. **Requisiti Stripe Connect** per un ristoratore italiano — sblocca i pagamenti
3. **Meta developer**: quando l'accesso si sblocca, WhatsApp riparte da lì

## Decisioni ferme (non ridiscuterle da solo)

- **Risorse è un'entità separata e resta tale.** Non si sposta, non si migra
  dentro Offerte, non diventa un attributo dei Prodotti.
- **Gli eventi restano fuori** da offerte e prenotazioni unificate: *«catalogo →
  offerte → shop sono consequenziali, l'evento no»*.
- **Attività ed Escursioni**: lasciate dove sono (29/08). Non toccarle.
- **Il Padel** lo creeranno i clienti in **Booking → Risorse**, che è il posto
  giusto: non va rifatto da noi.
- **Offerte a campo libero**, niente elenchi di tipi decisi da noi.
- **Shop = Ordini + Clienti**: un ordine occupa stock, non un posto nel tempo.
- `azienda_id` nell'HTML **resta**: apre solo ciò che è già pubblico (misurato).

## Debiti noti

- **Notifica WhatsApp al titolare: non può partire.** 0 account collegati, e
  **Meta non fa ancora accedere alla console developer** (confermato da Francesco
  il 30/08). Vedi [[project_whatsapp_fase0]] e [[reference_meta_blocco_dispositivo]].
- Il **ripristino** del backup non è mai stato provato (vedi sopra).

### Chiusi il 30/08
- ~~La sezione dell'app ospite si chiama «Escursioni»~~ → il debito era **vecchio**:
  diceva già «Proposte». Ora il **nome lo sceglie il cliente** dalla pagina
  Funzioni (`moduli.etichette`, taglio a 24 caratteri **nel server**). Sonda
  `probe-nome-sezione.mjs`.
- ~~Il booking non compare da solo sul sito~~ → **il blocco esiste già**: si chiama
  «Widget prenotazioni risorse» e Francesco l'ha già inserito su Automax. Non era
  un debito, era una mia informazione sbagliata.
- ~~Email mancanti sulle entità~~ → **sono tutti clienti di prova**, noto a
  Francesco. Non è un problema: rimosso dalla lista.
- ~~Copia di `PROGETTO.md` fuori da GitHub~~ → fatta: seconda cartella + **hard
  disk esterno**.
