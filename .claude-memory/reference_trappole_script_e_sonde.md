---
name: reference-trappole-script-e-sonde
description: "Trappole di lavoro viste il 03–05/10/2026: mai una sonda in catena dopo il deploy senza leggerne l'esito; node -e e heredoc in bash mangiano backtick e backslash (usare uno script scritto su file); le sonde aspettano l'esito e leggono i numeri dal database; limite 10 prenotazioni/ora; mai next build col dev acceso"
metadata:
  node_type: memory
  type: reference
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-05T17:00:28.968Z
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

Collegato: [[feedback-deploy]], [[reference-sonda-misura-sbagliata]], [[reference-smoke-corse-parziali]].
