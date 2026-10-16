---
name: project_agente_attaccante
description: "Agente AI che prova a ENTRARE nel sistema vivo come un attaccante (bot/malintenzionato), non solo a leggere il codice — chiesto da Francesco il 16/10/2026. Sul sistema nostro, solo aziende di prova ZZ, recapiti finti. Da definire ambito con lui."
metadata:
  node_type: memory
  type: project
  originSessionId: 6f9bd65f-b088-450b-a68e-2f83f514299f
  modified: 2026-10-16T21:12:12.289Z
---

**Francesco, 16/10/2026**: *«dobbiamo creare un agente AI che gira per tentare di
entrare come fosse un bot, un hacker».* La sicurezza è la priorità assoluta
([[feedback_sicurezza_priorita]]).

**Il bisogno vero**: le sonde (`probe-security-sweep`, `probe-enumerazione`,
`probe-colonne-pubbliche`, `probe-rls-secondo-muro`) sono il muro che Ettore
**conosce**: cercano le classi di difetto già note. Il limite strutturale, scritto
in SECURITY-CHECK.md, è che Ettore trova ciò che sa cercare — la password del WiFi
(25/08) e l'enumerazione (16/10) sono uscite perché qualcuno ci è inciampato, non
perché una sonda le cercava. Un **agente** serve a cercare quello che non sappiamo
di dover cercare: ragiona sulla risposta, cambia tattacco, combina passi.

**Cos'è (non ciò che non è)**:
- Gira **sul nostro sistema**, autorizzato (è security testing del proprietario).
- **Solo aziende di prova** `ZZ-…`, create e cancellate con `cancellaAziendaDiProva`;
  recapiti finti (`@playwright.internal`, `example.invalid`). Mai dati di clienti veri,
  mai scrivere a persone vere — vale la regola [[feedback_sonde_non_scrivono_a_persone]].
- **Non** attacca sistemi di terzi, **non** fa volume/DoS contro la produzione vera,
  **non** cerca di aggirare Stripe/Meta/fornitori. È contenuto al nostro recinto multi-tenant.

**Ambito da decidere con Francesco** (gliel'ho chiesto):
1. Dove gira: contro il **locale** (`:3000`, sul DB di produzione — attenzione) o contro
   un deployment di prova. Contro produzione solo prove che non lasciano residui.
2. Quando: a mano, o un passo in più del deploy, o un cron che prova ogni notte e avvisa.
3. Cosa prova: IDOR/enumerazione (già coperte in parte), poi mass-assignment, injection nei
   filtri, XSS stored negli URL dei blocchi, rate-limit, i file caricati, i log dei fornitori.
4. Quanto spende: usa `chiamaAI` (tetto azienda) o la Console? Un agente che ragiona a ogni
   passo costa — va misurato.

**Impianto proposto (parere di Ettore, da confermare)**:
- Riusa l'impalcatura di `probe-enumerazione.mjs`: due aziende ZZ con un oggetto di ogni tipo,
  token veri. L'agente riceve l'elenco delle porte e i dati di A e B, e **decide** cosa provare,
  legge la risposta grezza (corpo, non i campi attesi: un campo non previsto si vede solo così),
  e tiene un diario di cosa ha trovato.
- Ogni sospetto che sopravvive a una verifica avversariale diventa una **sonda deterministica**
  nuova in `deploy.ps1`: l'agente scopre, la sonda sorveglia. Un allarme che suona sempre viene
  ignorato: l'agente non sostituisce le sonde, le alimenta.
- Il `security-reviewer` (statico, già esistente) e questo (dinamico) sono complementari.

⚠️ **Limite onesto da dire sempre**: nemmeno questo è un pentest esterno. Un attaccante che non
conosce il sorgente, e una persona che fa questo di mestiere, restano un'altra cosa (SECURITY §4.2
punto 4: pentest prima di aprire le registrazioni). L'agente alza l'asticella, non la chiude.
