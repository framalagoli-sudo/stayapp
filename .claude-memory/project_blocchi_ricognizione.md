---
name: project_blocchi_ricognizione
description: "Ricognizione del 12/10/2026 sui blocchi e le opzioni di design che mancano rispetto a Elementor/Squarespace/Wix/Framer — proposta di Ettore, in attesa del sì di Francesco"
metadata:
  node_type: memory
  type: project
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-12T13:40:46.148Z
---

Chiesta da Francesco il 12/10/2026 («manca qualche blocco più di design? fai una ricognizione anche su altri siti»). Catalogo al 12/10: 46 tipi in `lib/blockTypes.js`. La ricerca in rete ha reso poco: il confronto è fatto soprattutto su quello che so di quei prodotti, più il catalogo letto dal codice. **Niente di questo è approvato.**

**Buchi misurati nel codice (non blocchi nuovi):**
- ✅ FATTO il 12/10 (CLAUDE.md nota 67, `components/FotoGrande.jsx`): le gallerie del sito (`gallery`, `galleria_immagini`) ora si ingrandiscono al clic. Restano fuori il blocco «Immagine» singola e il dettaglio delle vetrine.
- Il video di sfondo della copertina esiste (`bg_video`) ma è un campo «URL mp4»: nessun caricamento.

**Proposti da me, in ordine:**
1. Foto che si ingrandiscono (lightbox) — galleria, immagine, carosello.
2. Barra fissa su telefono «Chiama · WhatsApp · Prenota» — è un'opzione del sito, non un blocco; deve usare `sopraIlBanner` (nota 63).
3. ✅ FATTA il 13/10 — «Tabella» generica al posto della «tabella di confronto» del piano: copre confronto, orario settimanale dei corsi, tariffe per stagione.
4. Testo che scorre (marquee).
5. Mosaico / bento (riquadri di misure diverse, foto o testo).
6. Varianti di blocchi esistenti invece di blocchi nuovi: `steps` → «linea del tempo»; `hero` → testo a sinistra e foto a destra; `galleria_immagini` → mosaico.
7. ✅ FATTI il 13/10 (CLAUDE.md nota 70): Citazione, Titolo, Linguette, Popup. E la «Tabella» generica del punto 3 (con una colonna in risalto fa anche da confronto).

**Sconsigliati:** feed Instagram (serve Meta, e c'è `embed`), barre di avanzamento, contatori di prezzo mensile/annuale, effetti legati allo scorrimento.

**How to apply:** prima di aggiungere un blocco, chiedersi se è una **variante** di uno che c'è (nota 45 di CLAUDE.md). Vedi [[project_sezioni_universali]], [[project_block_system_roadmap]].
