---
name: project_session_2026_08_26_27
description: "Sessione 26-27/08 — FK rimaste sulla vecchia tabella (500 su 9 entità), Escursioni rotte in tutte le PWA, voce Offerte creata e poi semplificata a campo libero"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-26T23:21:54.856Z
---

## I due guasti trovati **provando**, non leggendo

**1. Le prenotazioni puntavano ancora a `properties`** (migration `091`).
Un POST `/api/requests` per un'entità assente dalla vecchia tabella rispondeva
**500**: 9 entità su 13 — tutti i ristoranti e le attività — più ogni entità
creata da qui in avanti, perché le nuove nascono solo in `entita`.
- Invisibile perché si prova sempre con `struttura-test`, una delle quattro
  rimaste in `properties`: **la prova andava sempre bene**.
- La migrazione a `entita` (079–081) aveva spostato i **dati** e lasciato
  indietro i **vincoli**. Un vincolo verso una tabella ferma non dà errore
  finché nessuno ci scrive.
- Stessa radice, secondo sintomo: i join `properties(name)` /
  `properties(azienda_id)` tornavano vuoti per ristoranti e attività → richieste
  senza nome nel pannello e `admin_azienda` che non riusciva a chiuderle.
- La `091` sposta le tre FK (`requests`, `messages`, `profiles`) e **chiede il
  nome del vincolo al catalogo** invece di indovinarlo: un `DROP … IF EXISTS`
  col nome sbagliato non fa nulla in silenzio.

**2. `numeroWa is not defined`** — «Ops, qualcosa è andato storto» su Escursioni
in **tutte e tre** le PWA: definito nel componente radice, usato dentro
`EsploraPage`, che è un componente a sé. Terza volta per questa classe (nota 32).
- ⚠️ **La sonda apriva l'app senza entrare nelle sezioni**: ogni sezione si monta
  **al click**, e finché nessuno clicca il suo codice non gira. `probe-app-ospite`
  ora le apre tutte e riconosce la schermata d'errore.

## Offerte: costruita, poi smontata

Creata la voce di menu «Offerte» (route + pagina + `probe-offerte.mjs`). Poi
**Francesco ha smontato il mio design, con ragione** — vedi
[[feedback_niente_tassonomie]]:
- via i sei preset con nomi decisi da me, via la tendina «modo»;
- titolo e categoria sono **campi liberi**, il «quando» si deduce dalle date
  (`modoDedotto`), resta solo `impegno` (chiedi/prenota/acquista).

⚠️ **Le offerte create dal pannello non arrivavano al sito**: `guest-data`
filtrava `origine IN ('attivita','escursione')` e l'origine ce l'hanno solo le
righe migrate. Provata la creazione e i permessi, **non tracciato il dato fino
al sito** — la regola 7 del progetto. La sonda ora pubblica, cerca nell'app
ospite, rimette in bozza e verifica che sparisca.

## Altro

- **Consenso obbligatorio** sulle prenotazioni escursioni (migration `090`) +
  doppio canale email/WhatsApp. `probe-consenso-richieste.mjs` prova **tutti e
  tre i tipi**: provarne uno solo è ciò che nascondeva il difetto.
- `tests/pulisci-residui.mjs` — le sonde lasciavano aziende di prova nel
  selettore del pannello: troncando l'output con `head` la pipe si chiude e il
  processo muore a pulizia iniziata. Non tocca nulla senza `--esegui`.
- Uno smoke falliva a torto: cercava la parola «Indietro» sulla pagina evento,
  che ora dice «Torna a *nome*». Verificava l'etichetta, non la via d'uscita.

## ⚠️ `deploy.ps1` e la pipeline PowerShell

`.\deploy.ps1 | Select-String …` fa risultare il deploy **fallito** mentre
riesce: il filtro corrompe il codice di uscita del CLI Vercel (`$LASTEXITCODE`
è 0 se non si filtra). Lanciarlo **senza pipe** —
`powershell -ExecutionPolicy Bypass -File deploy.ps1 > log 2>&1` da Bash
funziona e fa girare smoke + sonde. Lo script è corretto, era il modo di
invocarlo.
