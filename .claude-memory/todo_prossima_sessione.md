---
name: todo_prossima_sessione
description: "LEGGERE PER PRIMO — dove siamo e cosa si fa dopo (aggiornato 31/08/2026: Stripe live, prenotazioni ed eventi incassano)"
metadata:
  node_type: memory
  type: project
---

# Dove siamo — 31/08/2026

⚠️ **Prima di scrivere codice**, le regole nate da errori veri:
- [[feedback_verificare_il_contesto]] — **l'ultimo miglio**: apro col browser il
  punto da cui ci arriva Francesco. Oggi l'ho violata due volte: il 404 dopo il
  pagamento (trovato da lui pagando) e «Nessuna azienda» sulla pagina Pagamenti
  (provata con un utente normale, mai da super_admin, che è il suo ruolo).
- [[reference_cosa_si_prenota]] — prenotabili sono **solo Risorse ed Eventi**.
- [[feedback_autorizzare_cambi_importanti]] — togliere si chiede, non si comunica.

## ⏭️ DOMANI SI RIPRENDE DA QUI

**1. Pulire gli account Stripe di prova** *(5 minuti, tuoi)*
   Stripe → **modalità Live** → Connect → Accounts: cancellare i `ZZ-…` che la
   sonda `probe-acconto` ha creato girando per sbaglio in produzione. Sono vuoti
   e innocui, ma è sporcizia. La sonda ora si rifiuta di girare fuori da locale.

**2. Il primo incasso vero** *(rimandato dal 31/08)*
   Un'azienda vera collega il conto da `Account → Pagamenti`, poi un ordine da
   1 € con carta vera, poi rimborso da Stripe. ⚠️ Stripe può non attivare subito
   gli incassi: a volte chiede verifiche che richiedono ore.

**3. L'ONBOARDING — `/admin/onboarding` è 404**
   E adesso pesa il doppio: chi si registra viene mandato **proprio lì**. Le
   registrazioni sono chiuse, quindi non fa male a nessuno — ma è il primo muro
   contro cui sbatterebbe il primo cliente il giorno che le apri.
   Vedi [[project_onboarding_mappa]].

**4. Le 10 aziende esistenti non hanno mai accettato i Termini**
   Colonne pronte (`101`). Vanno fatte accettare al primo accesso, con la stessa
   prova (quando + versione). Francesco: «sono tutti miei contatti diretti, per
   ora non sono un problema» — quindi non è urgente, ma resta aperto.

**5. Termini e privacy a un avvocato**
   Il contenuto rispecchia il sistema; la forma giuridica va rivista.

## ✅ Chiuso il 31/08 — tutto live e verificato

- **Stripe Connect completo**: collegamento (`Account → Pagamenti`), checkout
  sul conto del cliente, **due webhook** (pagamenti + requisiti), pagine di
  ritorno. Le tre responsabilità su Stripe, verificate nella risposta dell'API.
  Vedi [[reference_stripe_connect]].
- **Prenotazioni ed eventi incassano** (migration `102`): un campo, un numero —
  *«quanto si paga prenotando (%)»*. 0 = sul posto, 100 = tutto, 30 = acconto.
  Zero per tutti di partenza: incassare si accende, non si eredita.
- **Termini di servizio** e **informativa privacy**: **non esistevano affatto**.
  Ora ci sono, linkati nel piede della landing, nel pannello e nell'iscrizione.
- **Spunta all'iscrizione**: prima ci si registrava senza accettare niente. Il
  controllo sta nella route (400 se `!== true`) e si salva la **prova**.
- Migration eseguite: `099` (conto Stripe), `100` (pagamento eventi),
  `101` (accettazione termini), `102` (acconto).

⚠️ **Scoperto oggi**: Stripe **non era mai stato collegato** — il codice c'era,
la chiave su Vercel no, e la documentazione diceva «integrato». Corretta.

## 🔴 Ancora aperti da giorni

- **2FA** su Vercel, Supabase, Cloudflare, GitHub — l'unica cosa di sicurezza
  scoperta. ~20 minuti.
- **Il ripristino del backup non è mai stato provato.** L'archivio è buono
  (verificato), ma non sappiamo quante ore costa tornare in piedi.
- **WhatsApp**: Meta non fa ancora accedere alla console developer.

## Decisioni ferme (non ridiscuterle da solo)

- **Risorse è un'entità separata**; un'offerta non si prenota, si chiede o si
  acquista; gli eventi restano fuori dalle prenotazioni unificate.
- **Stripe: nessuna commissione trattenuta.** Francesco resta fuori dal denaro,
  e le perdite sono di Stripe (`losses_collector: 'stripe'`).
  ⚠️ Se quel campo venisse omesso creando un account, il valore predefinito è
  `application` — cioè noi. Per questo la creazione sta in un posto solo.
- **Niente tassonomie**: campi liberi e numeri, non elenchi chiusi di scelte.
- Shop = Ordini + Clienti, e i clienti escono dagli ordini.

## Trappole da ricordare

- ⚠️ **Mai lanciare `deploy.ps1` dentro una pipe PowerShell**: risulta fallito
  mentre riesce, o non parte affatto.
- ⚠️ **Le sonde che creano account Stripe non vanno lanciate in produzione**:
  in live restano per sempre, e Stripe rifiuta la cassa su conti non attivati —
  un rifiuto giusto che la sonda leggerebbe come un nostro difetto.
- ⚠️ `CLIENT_URL` esiste su Vercel ma **non** in `.env.local`: chi la usa deve
  avere un ripiego, o funziona in produzione e si rompe in locale.
