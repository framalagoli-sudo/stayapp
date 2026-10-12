---
name: project_session_2026_10_12
description: "Sessione 12/10/2026 — editor visuale rifinito, due blocchi nuovi, sezioni condivise LIVE (migration 136), foto che si ingrandiscono, idea agente vocale"
metadata:
  type: project
---

Sessione del 12/10/2026, chiusa la sera. Migration fino alla **136**. Tutto live,
sonde verdi in produzione, repo allineato.

**Fatto** (dettaglio in `CLAUDE.md` note 64–67):
- Editor visuale: tre giri dopo la prima prova di Francesco (nota 64).
- Blocchi «Contatti e orari» e «Listino prezzi»; AI istruita (nota 65).
- **Sezioni condivise** (nota 66, [[project_sezioni_universali]]). Primo uso vero:
  metodotvb, due sezioni (pulsante e banner), pagine identiche prima e dopo.
- **Foto delle gallerie che si aprono in grande** (nota 67). Nessun sito vero usa
  oggi un blocco galleria: provato solo su un'azienda di prova.
- Fondaco Narni: il vecchio blocco `contatti` è «Contatti e orari», titolo
  «Contatti» scelto da me e detto a Francesco.
- Idea agente al telefono: [[project_agente_vocale]], `STRATEGIA.md` §6.3.

**Francesco non ha ancora provato lui**: l'editor visuale dopo i tre giri, le
sezioni condivise, le foto in grande.

**Imparato**:
- jsonb restituisce le chiavi in ordine suo: in una sonda si confrontano i campi,
  non `JSON.stringify` (è la seconda volta: vedi `impronta()` in RichTextEditor).
- Le traduzioni delle pagine contano i blocchi per posizione: sostituire un blocco
  con una sezione che ne contiene uno solo non ritraduce niente.
- Un cambio ai dati di un cliente: copia delle pagine fuori dal repo, simulazione,
  poi HTML confrontato prima/dopo, anche in inglese.

**Prossimo**: punto 4 del piano, l'AI dentro la pagina ([[todo-prossima-sessione]]).
