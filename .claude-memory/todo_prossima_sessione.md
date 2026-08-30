---
name: todo_prossima_sessione
description: "LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 30/08/2026: si riprende da Stripe Connect)"
metadata:
  node_type: memory
  type: project
---

# Dove siamo — 30/08/2026

⚠️ **Prima di scrivere codice**, tre regole nate da errori veri:
- [[reference_cosa_si_prenota]] — **prenotabili sono SOLO Risorse ed Eventi.**
  Prodotti e Offerte no. Sbagliato tre volte in una conversazione sola.
- [[feedback_autorizzare_cambi_importanti]] — togliere voci di menu, spostare
  dove il cliente crea qualcosa: si **chiede**, non si comunica.
- [[feedback_verificare_il_contesto]] — l'ultimo miglio: apro col browser il
  punto da cui ci arriva Francesco. Se non l'ho aperto è «scritto, non provato».

## ⏭️ SI RIPRENDE DA QUI: Stripe Connect

Deciso il 30/08: **account Standard + addebiti diretti, senza commissione**.
Tutto in [[reference_stripe_connect]] — configurazione, costi, requisiti italiani.

**Francesco deve fare tre cose** (poi implemento io):
1. Attivare Connect su `dashboard.stripe.com/connect/settings/profile`
2. Scegliere Standard + addebiti diretti + nessuna commissione
3. Passare il **client ID** (`ca_...`) e autorizzare il ritorno su **www**

Poi tocca a me: pulsante «Collega Stripe», checkout con header `Stripe-Account`,
webhook. E il pezzo non tecnico: **i Termini vanno aggiornati**, perché la
configurazione da sola non sposta la responsabilità.

## Chiuso il 30/08 (live e verificato in produzione)

- **Il nome della sezione lo sceglie il cliente** (`moduli.etichette`, taglio a
  24 caratteri **nel server**). Il debito «si chiama Escursioni» era vecchio:
  diceva già «Proposte». Sonda `probe-nome-sezione.mjs`.
- **Modulo di prenotazione — quattro difetti, il primo non estetico**: diceva
  «2 notti · €90 a notte» sopra un totale di €270. Il totale era giusto (3
  giorni di noleggio), il testo no. Ora quante unità **e come si chiamano** le
  manda il server. Più: passi calcolati sulla modalità (prima prometteva
  «Orario» su una risorsa a giornate), primo passo saltato con una sola risorsa,
  parole nostre tolte. Sonda `probe-conto-prenotazione.mjs`.
- **Foto delle risorse** (migration `097`): galleria fino a 10, la prima è
  copertina. ⚠️ Si vedono anche nella **testata** dopo la scelta: con una sola
  risorsa il passo di scelta si salta, e sarebbero rimaste invisibili proprio
  nel caso più comune. Sonda `probe-foto-risorsa.mjs`.
- **Shop → Ordini e Clienti** (migration `098`), modello Shopify:
  **due stati separati** (`pagamento_stato` / `evasione_stato`) perché «ho
  incassato?» e «è partito?» sono domande diverse; **Clienti ricavati dagli
  ordini**, non una tabella nuova — l'anagrafica è già i Contatti. «Speso» somma
  **solo l'incassato**. Sonda `probe-shop-ordini-clienti.mjs`.

## ⏭️ Tecnico, in ordine di quanto sposta

1. **Onboarding «Inizia qui»** — `/admin/onboarding` è **404**. Il capitolo più
   importante: la sicurezza è fatta, manca che un cliente nuovo arrivi al sito
   pubblicato **da solo**. Merita una sessione dedicata, non ritagli.
   Vedi [[project_onboarding_mappa]].
2. **Stripe Connect** (vedi sopra) — poi i pagamenti su booking ed eventi
3. **Next 16** — manutenzione, non sicurezza
4. **Multi-lingua DE** · **Import documento v2** (PDF/DOCX + chunking)

## 🔴 Il buco del ripristino, ancora aperto

**Verifica ≠ ripristino.** L'archivio *contiene* i dati giusti (verificato, verde
il 29/08). Non sappiamo se da lì si **torna operativi**: quante ore costa, se le
chiavi esterne reggono. Non esiste uno script. Supabase Pro fa da rete per un
disastro normale; il caso scoperto è **«l'account Supabase stesso è il problema»**.

Come si prova: progetto Supabase nuovo e vuoto, le 98 migration, l'archivio
nell'ordine `aziende → profiles → entita → pagine → domini → contatti`, e poi
**aprire davvero un sito cliente**.

## A carico di Francesco

✅ Chiuse: bucket lock provato · prova del backup verde · copia di `PROGETTO.md`
su seconda cartella e hard disk esterno · email entità (sono clienti di prova).

Restano:

1. **Secondo fattore** su Vercel, Supabase, Cloudflare, GitHub → poi la data in
   `INCIDENTE.md`. **È l'unica cosa di sicurezza ancora aperta.**
2. **I tre passi Stripe Connect** qui sopra
3. **Meta developer**: quando l'accesso si sblocca, WhatsApp riparte da lì

## Decisioni ferme (non ridiscuterle da solo)

- **Risorse è un'entità separata e resta tale.** Non si sposta, non si migra
  dentro Offerte, non diventa un attributo dei Prodotti.
- **Un'offerta non si prenota**: si chiede o si acquista.
- **Gli eventi restano fuori** da offerte e prenotazioni unificate.
- **Attività ed Escursioni**: lasciate dove sono.
- **Shop = Ordini + Clienti**, e i clienti escono dagli ordini.
- **Stripe: nessuna commissione trattenuta.** Francesco resta fuori dal denaro.
- **Offerte a campo libero**, niente elenchi di tipi decisi da noi.

## Debiti noti

- **WhatsApp**: 0 account collegati e **Meta non fa ancora accedere alla console
  developer** (confermato il 30/08).
- Il **ripristino** non è mai stato provato (vedi sopra).
- ⚠️ **Mai lanciare `deploy.ps1` dentro una pipe PowerShell**: risulta fallito
  mentre riesce, o non parte affatto. Rifatto il 30/08 pur avendolo in memoria.
