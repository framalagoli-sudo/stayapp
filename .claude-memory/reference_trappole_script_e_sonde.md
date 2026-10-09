---
name: reference-trappole-script-e-sonde
description: "Trappole di lavoro viste il 03–05/10/2026: mai una sonda in catena dopo il deploy senza leggerne l'esito; node -e e heredoc in bash mangiano backtick e backslash (usare uno script scritto su file); le sonde aspettano l'esito e leggono i numeri dal database; limite 10 prenotazioni/ora; mai next build col dev acceso"
metadata:
  node_type: memory
  type: reference
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-09T12:00:00.000Z
---

- **Deploy**: prima `git fetch` e controllo di `HEAD..origin/main` (i merge di Dependabot fanno rifiutare il push e fermano smoke e sonde). Il codice d'uscita non è affidabile: si legge il registro. Un caricamento interrotto o «Not authorized» = rilanciare.
- ⛔ **Mai lanciare la sonda nello stesso comando del deploy**: il 05/10 il deploy era fallito, la sonda ha girato sul codice vecchio e ha dato quindici rossi che non dicevano niente. Prima si legge «tutto a posto», poi si prova.
- **Script di modifica**: in bash `node -e "…"` e gli heredoc mangiano backtick, backslash e apostrofi (un commento con `` `nome` `` è stato eseguito come comando). Si scrive lo script su file nello scratchpad con lo strumento di scrittura e lo si lancia con node. I file sono spesso CRLF/BOM: normalizzare a LF e ripristinare.
- **Sonde**:
  - si aspetta l'ESITO, non un tempo fisso, e non un riquadro che sta ancora caricando (in JSX `data-x` senza valore vale `"true"`: un selettore «non vuoto» lo prende);
  - i numeri attesi si leggono dal database: in produzione un indirizzo finto diventa `email_non_valida` in pochi secondi;
  - un campo riconosciuto dal valore cambia appena ci si scrive: mettergli prima un segno;
  - prenotazione eventi: 10/ora per indirizzo — una sonda che prenota 8–9 volte non si rilancia nell'ora;
  - col banner dei cookie aperto il pulsante fisso del carrello è coperto: si passa da «Vai al carrello» in pagina, come il visitatore;
  - in locale la pulizia dalla route dà 409 (manca `VERCEL_TOKEN`): cancella dal database, è previsto.
- ⛔ Mai `next build` in `client-next/` col dev server acceso: condividono `.next`. Riparazione: `touch next.config.js`.
- I comandi in background sono stati interrotti una volta per rete e una per poca memoria: non rilanciarli di propria iniziativa quando è la memoria.
- 🖥️ **Memoria del PC di Francesco (16 GB), misurata il 09/10/2026**: il server di sviluppo non rilascia le pagine compilate — dopo le sonde su 42 pagine teneva 6,9 GB — e con Chrome e CapCut aperti il margine era 2,9 GB. Francesco diceva «non ho programmi pesanti aperti» ed era in buona fede: prima di attribuire la colpa si MISURA (`Win32_OperatingSystem` + `PrivateMemorySize64` per processo) e si separano i processi node. Con poco margine: il sistema ferma i comandi in sottofondo, e `probe-molti-indirizzi` è morta a metà dentro il deploy due volte, senza messaggio (da sola passa). Rimedio: riavviare il server di sviluppo (col suo ok: è suo) e lanciare il deploy **in primo piano**.
- ⛔ Un deploy interrotto a metà degli smoke lascia in produzione l'utente `ci-…@playwright.internal` con ruolo **super_admin**: cercarlo e cancellarlo subito.
- Una sonda verde in locale non basta per ciò che compare coi dati: `probe-mobile-pannello` dava verde sul Blog in locale e rosso in produzione (misurava prima che arrivasse un pulsante).

Collegato: [[feedback-deploy]], [[reference-sonda-misura-sbagliata]], [[reference-smoke-corse-parziali]].
