---
name: project-session-2026-10-31-11-01
description: "Sessione 31/10–01/11: archivio eventi passati (Garage 22, verificato da Francesco) e sentinella fornitori A live; B discussa e non iniziata"
metadata:
  node_type: memory
  type: project
  originSessionId: c69c02d8-2525-4043-b4de-493f6a4d0ef2
  modified: 2026-11-01T11:26:18.397Z
---

**31/10 — archivio degli eventi passati** (CLAUDE.md nota 90, commit 80b83033 + f2a7dfbf). Pagine numerate al posto di «Mostra altri»; nel blocco eventi «Quali eventi» con «solo i passati» (`data.solo_passati`). Francesco l'ha verificato: «verificato e cosi è top».

**01/11 — sentinella A** (CLAUDE.md nota 91, PROGETTO.md §5, commit 18c3c632 + fb73cbb2, LIVE). Francesco ha chiesto «dove lavori più tu che io» → mostrato il testo del 27/10 → «vai con A». Provata in produzione dal pulsante di Diagnostica: tutte ✓ tranne ○ «Conferma di consegna» (atteso finché Resend non è iscritto a email.delivered); email di prova arrivata. Casi ostili verificati: firma falsa sul tipo prova 400, delivered finto 401, cron senza segreto 401, Diagnostica senza login 401. Dettaglio in [[project-sentinella-fornitori]].

Errore mio da non ripetere: nell'esempio dell'email avevo scritto «certificato www.garage22terni.it scade fra 9 giorni», inventato. Francesco ha chiesto se Garage 22 avesse problemi; ammesso e misurati i certificati veri (75/76/45 giorni, Let's Encrypt). Un esempio va dichiarato finto o preso dai dati veri → [[feedback-niente-fatti-inventati-ai]].

Lezioni tecniche:
- **Deploy e merge di Dependabot**: Vercel ha pubblicato, poi `git push` rifiutato perché su GitHub era stato unito #68 (bump minori). Risolto con `git rebase origin/main` + push. ⚠️ **La produzione NON ha ancora il bump #68**: parte al prossimo deploy (prima `npm install` in client-next se serve). Prima di un deploy: `git fetch` e guardare se origin/main è avanti.
- Col push fallito, deploy.ps1 non ha lanciato smoke e sonde: lanciati a mano (smoke 74/74; unico rosso noto probe-molti-indirizzi, robots di Cloudflare su 4 sottodomini).
- TaskStop su un comando in sottofondo può lasciare processi orfani (node): controllare la porta 3000 dopo.
- `.env.local` non ha RESEND_API_KEY né ANTHROPIC_API_KEY: in locale quelle prove sono «spente», si provano in produzione.
- `domini` ha la colonna `dominio`, non `hostname`.

Ultima domanda di Francesco: «ma hai fatto sia A che B?» → risposto: solo A. Spiegato B e chiesto dove farla girare (routine Claude in cloud — consigliata — o cron in OltreNova). Poi ha chiuso la sessione senza scegliere.
