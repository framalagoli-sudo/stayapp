---
name: project-session-2026-09-23-strategia
description: "Sessione 23/09 pomeriggio — solo strategia, nessun codice: nasce STRATEGIA.md, preconfiguratori approvati (si parte da F0+F1), aggregatore rimandato con 6 vincoli, uso reale misurato per azienda"
metadata:
  node_type: memory
  type: project
  originSessionId: 814befb6-1136-4fe1-9412-3d749d356419
  modified: 2026-09-23T17:01:34.966Z
---

**Sessione di strategia, nessuna riga di codice, nessuna migration** (ferme alla 126).
Recuperato dopo un reset del PC l'ultimo messaggio di Francesco dalle trascrizioni
(`~/.claude/projects/.../*.jsonl` + `~/.claude/history.jsonl`: lo storico registra solo i
prompt *inviati*).

**Cosa è nato:**
1. **Ruolo di Ettore** fissato: ingegnere di OltreNova con priorità sicurezza, e
   consulente/socio → [[user-nome-assistente]].
2. **`STRATEGIA.md`**, il documento cardine → [[project-strategia-cardine]]. Raccomandazione:
   B+C adesso (servizio «fatto con te» + verticale locali/eventi), fondamenta self-serve in
   parallelo. Lacune di sicurezza messe in checklist in `SECURITY.md` §6: chiave fisica,
   art. 28 verso i clienti, rotazione `META_APP_SECRET`, pentest esterno.
3. **Preconfiguratori per mestiere: VIA LIBERA di Francesco.** Progetto in §6.1: catalogo
   unico (entità + azienda), profili in DB applicati come copia, menu azienda = unione delle
   entità, area super_admin con matrice aziende × funzioni, fasi F0–F5. Si parte da
   **F0+F1** (nessun cambio visibile).
4. **Aggregatore locale**: sì come direzione, no come prossimo passo. Idea migliore: rete fra
   clienti dentro l'app del QR. Sei vincoli da rispettare già ora (§6.2).

**Misurato nel DB** (per azienda): a zero ovunque shop/automazioni/loyalty/gift card/campagne
PE/WhatsApp. Giochi senza Panciere: 52 invii di form per iscrizioni invece degli eventi.
⚠️ La colonna nome di `entita` è `name` (non `nome`), di `aziende` è `ragione_sociale`.

**Domande aperte a Francesco**: profili di partenza giusti? Funzioni a zero fuori dai
profili nuovi? Perché Giochi senza Panciere usa il form? Più §7 di `STRATEGIA.md` (più
clienti o clienti che pagano di più · verticale eventi · data della commercialista · città e
consorzio per l'aggregatore).
