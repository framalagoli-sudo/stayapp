---
name: todo_prossima_sessione
description: "LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 29/08/2026, fine sessione: rientro offerte + pagina offerta live)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-29T14:38:11.706Z
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

## A carico di Francesco (fermo da giorni)

1. Chiave R2 **in sola scrittura** + scadenza 30 giorni come regola del bucket
2. Prova del backup: `node tests/verifica-backup.mjs <percorso>` — finché non
   gira, «abbiamo i backup» è una speranza
3. Secondo fattore su Vercel, Supabase, Cloudflare, GitHub → data in `INCIDENTE.md`
4. Email mancante su `futura-club-spiagge-bianche` e `piano-editoriale-futura-vacanze`
5. Requisiti Stripe Connect per un ristoratore italiano

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

- La sezione dell'app ospite si chiama ancora «Escursioni».
- Il booking non compare da solo sul sito: va aggiunto il blocco alla pagina.
- Notifica WhatsApp al titolare: **non può partire**, 0 account collegati e
  canale Meta fermo — vedi [[project_whatsapp_fase0]] e
  [[reference_meta_blocco_dispositivo]].
