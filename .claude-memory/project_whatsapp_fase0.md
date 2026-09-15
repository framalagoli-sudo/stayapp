---
name: project_whatsapp_fase0
description: WhatsApp — decisioni prese e fase 0 (liste e consensi) in produzione dal 21/08/2026; il canale vero dipende dalla verifica Meta
metadata: 
  node_type: memory
  type: project
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-15T10:02:02.272Z
---

Modulo WhatsApp: **incluso nel prodotto**, voluto da Francesco come pezzo forte. Richiesto da due clienti veri: **Garage 22** ("posso mandare messaggi a una o più liste?") e **Debora Resinart**. Piano completo in `WHATSAPP.md` nel repo.

## Decisioni prese (non ridiscuterle senza motivo)

- **Strada autonoma**: Meta Tech Provider + Embedded Signup. Il WABA è **del cliente**, che **paga Meta direttamente** con la propria carta. Stesso modello di Spoki, che dichiara "WhatsApp fees are always billed separately by Meta" — nessuno vuole il rischio di credito e la contabilità del traffico altrui.
- **Catalogo template nostro**: i template sono asset del singolo WABA e non si condividono, ma **si creano via API** → al collegamento del numero li generiamo noi sul WABA del cliente. Lui non scrive mai un template: sceglie e riempie le variabili. È il "niente libero arbitrio" chiesto da Francesco.
- **Il consenso non si presume mai**: i contatti importati entrano sempre con `whatsapp_optin = false`. Un file non è un consenso, e presumerlo farebbe **bloccare il numero del cliente da Meta**.
- **La stima di costo si mostra prima dell'invio**, mai in fattura.

## Tariffe di riferimento (da Spoki, agosto 2026)

marketing ≈ 0,057 €/conversazione · utility ≈ 0,025 € · service (risposte entro 24h) gratis.
Per Garage 22: campagna a 200 clienti ≈ 11 €, contro un tagliando che vale ~100 €.

## Fase 0 — FATTA e in produzione (21/08/2026)

Le liste devono esistere prima del canale: Garage 22 aveva **zero contatti**.

- migration **073** (`contatti.whatsapp_optin` + data, fonte, revoca) e **074** (`form_builder.whatsapp_optin`), entrambe eseguite.
- `lib/contatti-import.js` — parser CSV: virgolette con separatori dentro, virgola e punto e virgola, numeri normalizzati in internazionale, doppioni, colonne riconosciute da sole. ⚠️ Google esporta **sia** `Name` sia `Given/Family Name`: vanno distinti o il cognome esce doppio ("Mario Rossi Rossi").
- `POST /api/contatti/import` in **due tempi**: anteprima che non scrive nulla, poi conferma. Chi c'è già non viene sovrascritto: si aggiungono lista e campi vuoti.
- UI: pulsante **Importa** in Contatti, casella "Può ricevere messaggi su WhatsApp" nell'inserimento manuale con **nota bene** che compare al clic, consenso raccoglibile dai form pubblici (interruttore nell'editor, con avviso se manca il campo Telefono).
- Verificato in produzione con `tests/probe-import-contatti.mjs`: anteprima senza scritture, 0 autorizzati a WhatsApp dopo un import, **stesso file due volte → 0 doppioni** (un cliente incerto ricarica, e non deve ritrovarsi la rubrica doppia).

## Da qui in avanti

- **Fase 1** (collegamento numero + template) e **Fase 2** (campagne su lista): dipendono dalla **verifica Meta**, che è la parte lunga e tocca a Francesco. Quando la avvia, scrivergli i passaggi uno per uno come per i DNS.
- Limite noto: **10 clienti/settimana** finché Business Verification e App Review non sono complete, poi 200.
- **Meta genera un numero di test**: si può sviluppare e provare tutto *prima* dell'approvazione.
- ⚠️ Da WhatsApp **non si esportano i contatti**: non ha una rubrica propria, legge quella del telefono. L'unica via è l'export da Google/iCloud/gestionale. Non promettere collegamenti diretti.

## Fasi 1-2 — codice completo in produzione (22/08/2026)

Migration `075` (4 tabelle) eseguita. In produzione ma **in attesa delle credenziali**: la pagina mostra "Stiamo completando l'attivazione" finché mancano `META_APP_ID` e `META_APP_SECRET`. `WHATSAPP_TOKEN_KEY` è già su Vercel.

- `lib/whatsapp.js` — unico punto verso Graph; token cifrato **AES-256-GCM**, mai verso il browser; senza la chiave il modulo resta spento di proposito. Errori Meta tradotti in cosa deve fare il cliente.
- `lib/whatsapp-catalogo.js` — 5 messaggi nostri con variabili; la versione entra nel nome Meta, così due versioni convivono durante una migrazione.
- `lib/whatsapp-send.js` — scrive **solo a chi ha il consenso**; se Meta inizia a limitare, l'invio **si sospende** e riprende dopo 15 min invece di bruciare la reputazione del numero; non parte se il template non è approvato.
- `/api/whatsapp/webhook` — pubblica per forza: **firma HMAC verificata a tempo costante**; chi risponde STOP viene disiscritto; i contatori si **ricalcolano** dai messaggi (i webhook arrivano anche due volte).
- Pagina: stato numero con qualità tradotta, messaggi con stato approvazione, invio con anteprima del testo e **stima costi prima di premere invia**.

**Bloccante attuale**: Francesco non riesce a rientrare nell'account Facebook (recupero password in avaria il 22/08), quindi l'app Meta non è ancora creata.

## ⛔ Correzioni del 15/09/2026 (Meta sbloccato, accesso a developers ottenuto)

- **«Codice completo» era FALSO.** Il pulsante «Collega WhatsApp» in `WhatsAppPage.jsx` fa solo `alert('Il collegamento guidato con Meta si aprirà qui.')`: il lancio dell'Embedded Signup nel browser (SDK, config, ascolto del risultato) **non esiste**. Esiste solo il lato server (`/api/whatsapp/connect` POST che scambia il codice).
- **Embedded Signup v2 dismesso il 15/10/2026** → scrivere direttamente la v4.
- **Coesistenza**: il numero dell'app WhatsApp Business del telefono si può collegare (storico fino a 180 gg, i messaggi dall'app restano gratis; broadcast in sola lettura, gruppi non sincronizzati, 20 msg/s). La frase nel pannello «serve un numero dedicato» è diventata falsa.
- **Tariffe a MESSAGGIO dal 1° luglio 2025**, non più a conversazione; service gratis dal 1/11/2024, utility gratis dentro la finestra di 24h. Le tariffe in `lib/whatsapp.js` (da Spoki) vanno riallineate al listino Meta Italia.
- **Modello deciso in bozza (da confermare con Francesco)**: un accesso per AZIENDA (Facebook Login for Business → token di sistema che non scade), asset (Pagina, Instagram, numero) assegnati alle ENTITÀ. Oggi `whatsapp_account` ha `UNIQUE(azienda_id)`: serve migration.
- Facebook/Instagram: oggi **nessuna pubblicazione vera** (solo caption AI + piano editoriale).
- Manca la **richiesta di cancellazione dati** che Meta pretende per le app con login Facebook.
- Guida pubblicata: https://claude.ai/artifact/NvjsW4esEj2QHFpmB72mvM (4 decisioni aperte A–D).
