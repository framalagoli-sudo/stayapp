---
name: project-sentinella-fornitori
description: "27/10: proposta sentinella fornitori (A quotidiana in OltreNova + B agente settimanale). ⛔ A inizio sessione MOSTRARE A FRANCESCO IL TESTO QUI SOTTO ESATTAMENTE COM'È, poi ripartire dalla A."
metadata:
  node_type: memory
  type: project
  originSessionId: c69c02d8-2525-4043-b4de-493f6a4d0ef2
  modified: 2026-10-27T18:12:51.709Z
---

⛔ **Richiesta esplicita di Francesco (27/10): «quando ripartiamo riportami questa schermata esattamente come è».** A inizio della prossima sessione: incollargli il testo fra le due righe, parola per parola, senza riassumerlo né aggiornarlo. Poi si parte dalla sentinella A (prima l'elenco preciso delle prove e cosa arriva nell'email d'allarme, da approvare). Nessun codice scritto il 27/10.

**Why:** il webhook dei conti Stripe rotto in silenzio dal 31/08 e gli avvisi Dependabot critici aperti dal 25/10 senza che nessuno se ne accorgesse. Lega con [[reference-guasti-silenziosi]] e [[todo-prossima-sessione]].

----- TESTO DA MOSTRARE -----

Sì, il punto 2 lo consiglio. Ma hai ragione che, da solo, guarda solo le librerie. Il rischio che descrivi è diverso, e l'abbiamo già vissuto. Il webhook dei conti Stripe **non ha mai funzionato dal 31/08**: Stripe aveva rinominato una funzione e niente ce l'ha segnalato. L'abbiamo scoperto per caso, guardando altro. E il webhook di Resend è rimasto muto 45 giorni.

Le minacce sono tre, e ognuna va presa in modo diverso.

**1. Una libreria vulnerabile, come oggi.** La segnala GitHub: basta che qualcuno legga l'avviso entro un giorno.

**2. Un fornitore annuncia un cambiamento con una data.** Esempi: Meta che chiude la versione 2 dell'Embedded Signup il 15/10, Stripe che ritira una versione dell'API, Anthropic che spegne un modello. Si vede in anticipo, ma solo se qualcuno legge gli annunci.

**3. Qualcosa si rompe in silenzio.** È il caso del webhook di Stripe: nessun errore, nessuna email, semplicemente non funziona. Questa è la più pericolosa.

Per coprirle propongo due pezzi.

**A. Una sentinella dentro OltreNova, ogni giorno.** Copre il punto 3 ed è quella che conta di più. È un cron come quelli che abbiamo già, e se qualcosa non va ti manda l'email d'allarme che esiste già. Per ogni fornitore fa una prova vera ma innocua:
- **Stripe:**
  - la chiave funziona;
  - i webhook risultano **attivi** e non disattivati, cosa che si chiede all'API di Stripe;
  - un evento di prova **firmato col nostro segreto** viene mandato al nostro webhook, e deve passare tutto il percorso. Questa prova avrebbe trovato il guasto del 31/08 il giorno dopo.
- **Resend:** un invio al loro indirizzo pozzo (`delivered@resend.dev`).
- **Webhook dei rimbalzi:** stessa prova firmata, sull'indirizzo esatto registrato presso il fornitore.
- **Supabase:** il database risponde.
- **Backup:** l'ultimo archivio su R2 ha meno di 30 ore.
- **Domini:** i certificati non sono in scadenza.
- **Meta, quando ci sarà:** stessa logica.

Costa quasi niente, perché usa strumenti che abbiamo già. Il limite onesto: si accorge di un guasto **entro un giorno**, non prima che succeda.

**B. Un agente settimanale, il lunedì.** Copre i punti 1 e 2. Legge gli avvisi di GitHub e gli annunci di modifiche dei fornitori che usiamo, li confronta con quello che usiamo davvero e ti scrive un resoconto breve:
- cosa ci tocca;
- entro quando;
- cosa serve fare.

Se c'è una correzione la prepara, ma il deploy lo decidi tu. Gli serve un **registro delle scadenze** (versione dell'API Stripe, versione delle API Meta, modelli AI, rinnovo dei domini), che oggi non esiste e che scriverei io in `PROGETTO.md`. Il limite onesto: vede solo ciò che il fornitore annuncia per tempo.

**Il mio consiglio sull'ordine:** prima la **A**, perché è quella che ci avrebbe salvato davvero. Poi la **B**. L'email di Dependabot su GitHub attivala comunque adesso, è un minuto.

Se ti torna, parto dalla sentinella nella prossima sessione. Prima ti porto l'elenco preciso delle prove e cosa ti arriverà nell'email d'allarme.

----- FINE TESTO -----
