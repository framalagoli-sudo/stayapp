---
name: project-session-2026-10-10
description: "Sessione 10/10/2026 — slider eventi, anteprima dal vivo, sette ritocchi UX (live); Guru Management portato da WordPress con dominio; info@oltrenova.com su inoltro Cloudflare; posta di Guru rimasta a metà"
metadata:
  node_type: memory
  type: project
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-10T19:58:49.054Z
---

Sessione del 10/10/2026, chiusa la sera. Nessuna migration (ultima eseguita: 135).

**Piattaforma, tutto live e verificato in produzione** (`CLAUDE.md` note 60–61): blocco «Slider eventi», eventi stampati nell'HTML per i motori, elenco eventi non più tagliato a sei, moduli del blocco «Form contatti» limitati all'azienda del sito, anteprima dell'editor che tornava bianca sui siti con dominio proprio (dal 14/09), anteprima dal vivo prima di «Salva», «Pubblica» in un gesto, H1 automatico, scorrimento col dito.

**Fuori dal codice** (nota 62), perché l'hosting SiteGround di Francesco scade l'11/10:
- Guru Management ricostruito sulla piattaforma e online su `gurumanagement.it` → [[project-guru-management]].
- `info@oltrenova.com` su Cloudflare Email Routing, provato da Francesco → [[project-posta-elettronica]].
- Posta di Guru **a metà**: zona su Cloudflare creata, nameserver cambiati su SiteGround, inoltro non ancora acceso → [[todo-prossima-sessione]].

**Trovato e non corretto**: il pannello Domini dice «Online» quando risponde un server qualsiasi, anche quello vecchio del cliente → [[reference_domini_vercel]].

**Errori miei della giornata**: ho dedotto che `garage22terni.it` e `fondaconarni.com` scadessero col server di Francesco dal solo nome dei nameserver (non sono suoi); ho dato i record Vercel generici invece di quelli del progetto (corretti prima che salvasse); ho guidato Francesco passo passo su Cloudflare senza spiegargli prima il disegno — sue parole: «non ho capito cosa stiamo facendo». Prima il perché in tre righe, poi i clic.

**Il PC**: il server di sviluppo si avvia solo per le prove e si ferma subito dopo, verificando che il processo sia sparito (accordo con Francesco: «chiudi te e preoccupati te»). Alla chiusura è spento.
