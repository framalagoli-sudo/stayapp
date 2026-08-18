---
name: project_upgrade_next15
description: Upgrade a Next 15.5.23 + React 19 completato il 18/08/2026 — molto meno invasivo del previsto, ma resta il debito dei params sincroni prima di Next 16
metadata:
  type: project
---

Fatto il 18/08/2026 su richiesta di Francesco, **a step e con la produzione live** (siti clienti attivi).

**Metodo seguito** (da riusare per il prossimo major): branch dedicato → build → server di produzione **in locale** su `:3001` puntato al DB reale → smoke test completo contro quel server → controllo **visivo** dei siti clienti → solo allora merge, deploy e verifica live. Il deployment precedente va annotato prima di pubblicare, per poterlo ripromuovere in un minuto.

**La sorpresa (in meglio)**: 84 route API e 18 pagine usano `params`/`searchParams` in modo **sincrono**, che in Next 15 è diventato asincrono — ma **la 15 mantiene la compatibilità**: zero errori in build e **zero avvisi runtime** sotto l'intera suite di test. Nessun codemod è stato necessario.

⚠️ **Debito aperto**: in **Next 16** l'accesso sincrono diventa errore. Quelle ~102 occorrenze andranno migrate (esiste il codemod ufficiale `npx @next/codemod@canary next-async-request-api`) **prima** di tentare la 16.

**Esito**: le 21 vulnerabilità Dependabot su `next` sono chiuse. Ne restano **2 su `sharp`** (`<0.35.0`, CVE libvips), dipendenza transitiva: da valutare a parte.

**Nota sui test**: durante le verifiche una corsa smoke si è interrotta a metà (37/67) subito dopo il deploy, con le funzioni ancora fredde; le due corse complete prima e dopo hanno dato **66/66**. Se ricapita, rilanciare a freddo prima di sospettare una regressione.

**Coda: `sharp` chiuso lo stesso giorno.** Era l'unico alert rimasto (CVE libvips, `<0.35.0`). Non è una nostra dipendenza: entra come **optionalDependency di Next** (`^0.34.3`) e non è importato da nessuna parte; `/_next/image` in produzione è servito da Vercel (`Server: Vercel`) e non usiamo `next/image`, quindi il rischio pratico era basso. Chiuso con un **override a `^0.35.3`** — versione fuori dal range dichiarato da Next, quindi verificata a mano: build pulita, `/_next/image` che restituisce un PNG vero (627 byte), log del server senza lamentele, smoke **66/66** contro il binario nuovo, `npm audit` → **found 0 vulnerabilities**.

⚠️ **Trappola in cui sono caduto**: la prima prova girava contro il **server vecchio**, perché la porta 3001 era ancora occupata da un'istanza precedente (`EADDRINUSE` nel log). Prima di dichiarare buono un binario, verificare che il server sia davvero quello nuovo — o usare una porta libera.
