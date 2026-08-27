---
name: reference_booking_giornaliero
description: "Booking a giornate (case, auto, camere) — l'ultimo giorno è l'uscita, non una notte; il doppio affitto si blocca dopo l'insert"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-27T14:31:04.481Z
---

Terza modalità del booking, aggiunta il **27/08/2026** (migration `093`) perché
un cliente vero — Automax, noleggio auto — ne aveva bisogno. Le altre due
occupano un punto nel tempo (un'ora, un servizio); questa occupa un
**intervallo**.

**Il conteggio sta in un posto solo**: `lib/booking-giornaliero.js`.
- **L'ultimo giorno è l'uscita, non una notte**: da martedì a sabato sono
  **quattro** notti. Sbagliarlo significa addebitare una notte non dormita.
- Chi noleggia conta invece i **giorni** (dal 3 al 5 sono tre): interruttore
  `conta_giorno_uscita`, perché cambia il totale che paga il cliente.
- Chi esce il 10 e chi entra il 10 **non** si sovrappongono: la casa si libera
  quel mattino. Invertire il confronto costa una notte affittabile a ogni cambio.

⚠️ **Il punto pericoloso è il doppio affitto.** `confermaPostiPrenotazione`
(`lib/capienza.js`) inserisce prima e verifica dopo, contando solo le
prenotazioni arrivate **prima** della propria: regge anche a richieste
simultanee. A slot un doppio è un fastidio, qui sono due famiglie davanti alla
stessa porta.

Le regole (minimo/massimo notti, giorni d'arrivo, chiusure su **tutto** il
periodo) vivono nella route, non nel browser: una pagina si aggira.

**Sonde**: `probe-booking-giornaliero.mjs` (API, 13 controlli),
`probe-widget-giornate.mjs` (il giro dal sito fino alla conferma, 11 controlli).

⚠️ **Trappole di misura imparate scrivendole** — costano giri su guasti che non
esistono:
- la scheda si raggiunge con **`?tab=prenota`**: cliccando la voce in fondo si
  finisce altrove e sembra che il widget non esista;
- il **banner dei cookie** intercetta i click sui pulsanti in basso;
- filtrare le risposte con `includes('prenota')` cattura anche l'URL della
  pagina: sembra un POST riuscito mai partito;
- **`npm run build` mentre gira `npm run dev` corrompe `.next`** e il server
  risponde «Cannot find module»: sembra un difetto del codice e non lo è;
- in locale la **prima visita a una route la compila**: senza attese generose
  sembra che la pagina non carichi niente.

⚠️ Il booking **non compare da solo sul sito**: va aggiunto il blocco
«Widget prenotazione» alla pagina, oppure sta nella scheda Prenota della PWA
ristorante. È una cosa che il cliente non può indovinare.

Vedi anche [[project_catalogo_strati]].
