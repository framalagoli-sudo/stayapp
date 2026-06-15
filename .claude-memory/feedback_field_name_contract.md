---
name: feedback_field_name_contract
description: "Perdita dati silenziosa: form frontend e route backend devono usare gli STESSI nomi di campo (es. name vs nome)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5c9078da-e20b-4e33-9c9d-fb8574d5ed66
---

Classe di bug che fa **perdere dati** in silenzio: il form frontend invia un nome di campo, il route backend ne legge un altro → validazione fallisce (400) → nessun salvataggio, e l'utente pensa di aver inviato.

**Caso reale (2026-06-15)**: 3 form contatto su 4 (blocco contatti minisito in `LandingBlockRenderer`, `PaginaPage`, `AttivitaPWA`) inviavano `{ nome, messaggio }` ma `/api/guest/contact` leggeva `{ name, message }` → ogni lead perso. Solo `OffertaPage` usava i nomi giusti. Fix: route tollerante (`body.name ?? body.nome`, `body.message ?? body.messaggio`).

**How to apply:**
- Quando rivedi un form che scrive dati, **confronta i nomi di campo inviati nel body con quelli letti dal route**. Mismatch = perdita dati.
- Test live decisivo: POST reale all'endpoint + query DB per confermare che il record si salvi (come fatto per Form Builder e questo).
- Convenzione progetto incoerente (IT vs EN nei campi) → preferire route tolleranti o normalizzare. Priorità di Francesco: **tutti i dati inseriti devono restare**.

Vedi [[project_session_2026_06_15c_security]] e il tracker `PIANO_LAVORO.md`.
