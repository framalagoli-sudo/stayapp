---
name: project_whatsapp_fase0
description: WhatsApp — decisioni prese e fase 0 (liste e consensi) in produzione dal 21/08/2026; il canale vero dipende dalla verifica Meta
metadata:
  type: project
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
