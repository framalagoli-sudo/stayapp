---
name: project-backup-lacune
description: "PRIORITÀ — il backup non contiene gli account di accesso né le immagini dei clienti: da un ripristino nessuno entrerebbe e i siti sarebbero senza foto"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8edd7be8-ac09-496b-aa5b-8cf94981b523
  modified: 2026-09-09T15:57:54.377Z
---

# Nell'archivio mancano due cose, e sono grosse

Trovato il **9 settembre 2026** guardando `client-next/lib/backup.js` per
pianificare la prova di ripristino. Non è un sospetto: è la lettura del codice.
Francesco l'ha messa come **priorità della prossima sessione**.

## 1. Gli account di accesso non sono nel backup

`TABLES` elenca 51 tabelle dello schema `public`, e `auth.users` **non è fra
queste**; in tutto il file non c'è nessuna chiamata a `listUsers`. Il backup
salva `profiles` — nome, ruolo, azienda — ma non le credenziali a cui quei
profili sono attaccati.

Conseguenza nello scenario per cui il nostro file esiste (**quando è l'account
Supabase stesso il problema**): si ripristina tutto e **non entra più nessuno**.

⚠️ E c'è un secondo strato, peggiore del primo: `profiles.id` **è** l'id
dell'utente in `auth.users`. Ricreando gli account si otterrebbero id nuovi, e
ogni profilo resterebbe orfano — insieme a tutto ciò che punta al profilo.
**Da verificare**: se l'API admin di Supabase permetta di imporre l'id alla
creazione. Non lo so, e non va dato per scontato: se non si potesse, il
ripristino richiederebbe di riscrivere gli id nei profili e in tutto ciò che li
riferisce.

**Quanti**: 14 account, esclusi gli effimeri delle sonde (misurato 09/09).

## 2. Le immagini dei clienti non sono nel backup

Le foto stanno in **Supabase Storage**, bucket `property-media`. L'unico bucket
che `lib/backup.js` tocca è quello **R2 di destinazione** degli archivi: lo
storage delle immagini non viene mai letto. Un ripristino riporterebbe tutti i
testi dei siti con **tutte le immagini rotte**.

**Quanto**: 41 file, ~23,5 MB nelle cartelle principali (struttura, ristorante,
attivita, blog, eventi) — misurato 09/09. È poco: salvarle è facile, il
problema è solo che nessuno l'ha fatto.

## Perché viene prima della prova di ripristino

Provare il ripristino di questo archivio darebbe una risposta rassicurante a
una domanda incompleta, e **la falsa sicurezza è peggio del non sapere**. Prima
si completa l'archivio, poi si prova quello completo.

È lo stesso difetto del 24/08, quando la lista delle tabelle era rimasta
indietro e mancavano le `pagine`: *un backup incompleto ha lo stesso aspetto di
uno completo finché non serve*. La lista è stata allargata allora, ma nessuno ha
guardato **fuori** dallo schema `public`.

## Come procedere quando si riprende

1. **Completare l'archivio**: account (`auth.admin.listUsers`, senza mai
   scrivere password o token in chiaro nel file — vanno pensate: cosa serve
   davvero per ricostruire un accesso?) e immagini dello storage.
2. **Verificare che ci siano davvero dentro**: estendere
   `tests/verifica-backup.mjs`, che oggi guarda solo le tabelle.
3. **Poi** la prova di ripristino. Il piano concordato il 09/09:
   - bersaglio = **un secondo progetto Supabase sul piano Free**, mai la
     produzione e mai un Postgres locale (metà delle 113 migration usa ruoli e
     schemi che in un Postgres nudo non esistono: la prova sarebbe infedele);
   - credenziali del bersaglio in un file separato da quelle vere;
   - lo script **si rifiuta di scrivere** se l'URL di destinazione è quello di
     produzione — il controllo sta nel codice, non nell'attenzione di chi lancia;
   - ordine di caricamento già dichiarato in `INCIDENTE.md`: aziende → profiles
     → entita → pagine → domini → contatti;
   - **cronometrare**: «quante ore costa» è metà della domanda;
   - criterio di riuscita: **si apre il sito di un cliente e si entra nel
     pannello**. Non «le righe sono entrate».
4. Il file scaricato è il database dei clienti in chiaro: si cancella dal disco
   appena finito.

Vedi [[reference_backup_e_ripristino]], [[reference_guasti_silenziosi]].
