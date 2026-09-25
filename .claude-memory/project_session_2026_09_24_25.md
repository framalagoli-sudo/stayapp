---
name: project-session-2026-09-24-25
description: "Sessione 24–25/09: preconfiguratori F0–F3 LIVE (menu nuovo col sito in cima, categorie per entità assegnate e obbligatorie alla nascita), buco domini di altre aziende chiuso, cancellazione azienda completa, account orfani bloccati; migration 127–129"
metadata:
  type: project
---

**Fatto e verificato in produzione** (migration 127, 128, 129 eseguite da Francesco):
1. **F0/F1**: catalogo unico, un menu solo, pagina «Funzioni e profili» (uso reale per azienda).
2. **F2**: profili di mestiere in DB (8), editor con anteprima.
3. **Menu nuovo** approvato («ci sta così»): il sito era la voce 27/43, ora la 1ª → [[reference-categorie-e-menu]].
4. **F3**: categoria per ENTITÀ (decisione di Francesco), assegnata a tutti i clienti il 25/09, obbligatoria alla nascita (solo super_admin). Titolari da 41 a 21–30 voci. Niente con contenuti o già usato sparisce.
5. 🔴 **Buco chiuso**: un'azienda poteva staccare i domini di un'altra (mai sfruttato) → [[reference-cancellazione-completa]].
6. **Cancellazione azienda completa** (account compresi); Deborah Perfetti cancellata su richiesta; 7 account senza azienda bloccati (Futura Vacanze + oltrenova@gmail.com, su ok).
7. **Giachini**: il titolare non vedeva il suo sito nel menu da sempre — corretto.
8. 21 indirizzi di prova orfani su Vercel staccati; le sonde ora puliscono dalla route.

**Aperti** (in `todo_prossima_sessione.md`): onboarding «Inizia qui» (prossimo), «Parto da zero» rinominare/togliere (domanda a Francesco), export GDPR incompleto, staff col permesso ristorante non vede l'entità, pagina elenco Strutture non crea per il super_admin, smoke security.spec può lasciare hostname su Vercel, probe-molti-indirizzi interrotta una volta senza messaggio.
