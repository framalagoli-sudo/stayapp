---
name: project_backlog_hydration_evento
description: "RISOLTO 23/09/2026 — il #418 del dettaglio evento era la LINGUA letta nel browser (_lang non esiste nell'URL visibile); la diagnosi del 22/09 aveva trovato un artefatto di localhost"
metadata:
  node_type: memory
  type: project
  originSessionId: 6473d404-e9d1-4c54-a639-5864c6f60bbb
  modified: 2026-09-22T20:53:33.971Z
---

**Chiuso il 23/09/2026** (commit `8ddffecd`).

**Causa vera**: con un browser in inglese `LanguageSwitcher` porta su
`/en/eventi/…`; il middleware aggiunge `_lang=en` **solo nella riscrittura
interna**, quindi il server rende in inglese mentre il componente client, che
leggeva `useSearchParams().get('_lang')`, disegna in italiano. Errore
`#418 args[]=text` e pagina con etichette mescolate. Playwright Test apre il
browser in `en-US`: per questo lo smoke falliva e una sonda con
`chromium.launch()` (lingua di sistema, italiano) no.

**Stessa classe** in `BlogListPage` (rotto in produzione) e `ArticoloPage`.
Correzione: `lingua` passata come prop dalla pagina server. Regola: **un
componente client non legge mai `_lang` / `_domain` da `useSearchParams`**.

**Diagnosi del 22/09 sbagliata**: il ramo `typeof window` in
`suDominioDelCliente()` divergeva **solo su localhost** (che non è
`oltrenova.com`), non in produzione. Corretto comunque (dominio dall'header
Host, mai da `_domain` che sul nostro dominio chiunque scrive nell'URL).
Lezione: la diagnosi fatta sul dev locale va confermata con **lo stesso
host e la stessa lingua** dell'ambiente dove fallisce → [[feedback_sandbox_non_e_live]].

**Trovati nel giro**: i pulsanti di condivisione degli articoli condividevano un
URL **vuoto** in produzione (`window.location.href` nel render: React in
produzione tiene l'attributo del server); `?back=` finiva grezzo in
`router.push`/`href` → ora `lib/percorso-interno.js`.

Parente: [[project_backlog_hydration_landing]].
