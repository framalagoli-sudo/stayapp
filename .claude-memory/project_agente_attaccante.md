---
name: project_agente_attaccante
description: "Agente AI che prova a ENTRARE nel sistema vivo come un attaccante (bot/malintenzionato), non solo a leggere il codice — chiesto da Francesco il 16/10/2026. Sul sistema nostro, solo aziende di prova ZZ, recapiti finti. Da definire ambito con lui."
metadata:
  node_type: memory
  type: project
  originSessionId: 6f9bd65f-b088-450b-a68e-2f83f514299f
  modified: 2026-10-18T11:36:45.698Z
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

**Primo giro fatto il 17/10/2026** (CLAUDE.md nota 81, commit 5f03fd47): cervello = Ettore (chiave AI non
su questo PC). Bersaglio = dirottamento. Sonda `probe-dirottamento.mjs` (in deploy.ps1). **Trovato un
buco vero**: `POST /api/newsletter` non validava `entity_id` → B pubblicava sul sito di A via archivio.
Chiuso. Lezione: una sonda con marcatore condiviso fra A e B dà falsi positivi — il segnale va messo
SOLO dove il buco lo metterebbe.

**Secondo giro fatto il 17/10/2026** (CLAUDE.md nota 82): bersaglio = **XSS stored** (codice ostile
nell'HTML di chi apre il sito, gravità 3). **Nessun buco** — le difese reggono: `testo-ricco` escapa
tutto, `safeUrl`/`siteHref` filtrano gli URL dei blocchi, `getEmbedUrl` prende solo l'ID del video, il
blocco «Codice incorporato» è in un iframe sandbox **senza `allow-same-origin`** (provato: non tocca la
pagina madre), il blog passa da `sanitize-html` stretto. Sonda nuova `probe-xss-pubblico.mjs` (in
deploy.ps1): prova col **browser vero** (nessun alert, window.__xss assente) e sul **DOM renderizzato**,
non col grep sul corpo grezzo — i dati dei blocchi sono serializzati inerti nel JSON della pagina e un
grep ingenuo grida al lupo (6 falsi rossi alla prima stesura: terza volta che una sonda misura la cosa
sbagliata, vedi [[reference_sonda_misura_sbagliata]]).

**Classi ancora da guardare nei giri successivi** (nessun buco finché non si prova): iniezione nei filtri
delle liste/ricerche; abuso/rate-limit (senza volume contro produzione); contenuto dei file caricati
(oltre la firma del formato, già coperta); log dei fornitori (Resend/Stripe/Meta).

**PIANO DECISO col loop LLM autonomo (17/10/2026, Francesco: «mi torna come piano»).** NON ora: si fa
**dopo il lancio**, quando ci sarà un **utilizzo vero** della piattaforma — oggi è in test con qualche
suo piccolo cliente, 90% seguiti da lui ([[project_positioning_target]]). Fino ad allora: **zero euro**,
le sonde gratis (in deploy.ps1) coprono il noto a ogni deploy, e **Ettore fa un giro manuale a costo zero**
quando si tocca la sicurezza (come i due giri del 17/10). Quando si automatizza:
- ⛔ **NON agganciato a ogni deploy**: Francesco deploya ~1 volta al giorno → a ogni deploy = ~90 $/mese,
  insostenibile. Il costo si **separa dalla frequenza dei deploy**.
- Tre leve insieme: (1) le **sonde gratis** sono la guardia continua, l'agente serve solo a scoprire classi
  NUOVE; (2) l'agente parte solo se **≥1 settimana** dall'ultimo giro **e** è cambiato codice di sicurezza
  (route/authz/renderer/sanitizzatori) — deploy innocui → non parte → 0 $; (3) ogni giro è **mirato al diff**
  (pochi passi, contesto piccolo), non una spazzata da capo → centesimi, non 3 $.
- Risultato stimato: **~2–4 $/mese con Sonnet, <1 $ con Haiku**, con **tetto fisso 5 $/mese** via il
  meccanismo del budget AI (`chiamaAI`, come il tetto dei clienti): finito il tetto l'agente non parte
  (fail-closed, nessuna sorpresa in bolletta).
- Prima di accendere: **misurare il costo di un giro vero** e metterlo davanti a Francesco. Serve la chiave
  AI dove lo script la legge (oggi ANTHROPIC_API_KEY è solo su Vercel, non su questo PC). Decisioni di Francesco sull'ambito (le sue parole, 16/10):
«1 sul sito vero online; 2 ogni giorno e sganciato da noi; 3 evitare che ci buchino e che entrino;
4 fammi sapere cosa consigli». Parere di Ettore dato: no all'attacco dell'infra Vercel/Supabase (è
di terzi, ci sospendono), sì all'agente sul NOSTRO codice contro produzione ma solo aziende ZZ e senza
volume; «sganciato» = libero nelle tattiche, dentro un recinto (no DoS, solo ZZ, tetto richieste/min).

## 🗺️ ROADMAP DEI GIRI — «verificare TUTTO» (chiesto da Francesco il 17/10/2026)

Non è infinito: le classi d'attacco di una piattaforma così sono un insieme **limitato**. Ogni giro
produce una **sonda deterministica** in deploy.ps1 (l'agente scopre, la sonda sorveglia). I giri senza
costo li fa Ettore a mano (come 1 e 2); il loop LLM a pagamento si accende dopo il lancio (vedi sopra).

**GIÀ FATTI (le sonde sorvegliano):**
- ✅ G1 — IDOR/lettura multi-tenant: `probe-security-sweep`, `probe-rls-secondo-muro`, `probe-colonne-pubbliche` (A1, note 26/34).
- ✅ G2 — Enumerazione (una porta non rivela cosa esiste): `probe-enumerazione` (nota 80).
- ✅ G3 — Dirottamento/mass-assignment su scrittura (entity_id/azienda_id dal corpo, campi privilegiati role/plan/budget): `probe-dirottamento`, `probe-entita-campi-sistema` (nota 81).
- ✅ G4 — XSS stored/HTML ostile: `probe-xss-pubblico` (nota 82).
- ✅ G5 — Cancellazione/effetti cross-tenant (staccare i domini di un altro): `probe-cancella-entita-altrui`, `probe-cancella-azienda` (nota 51).
- ✅ G6 — Pagine di piattaforma sui domini cliente, `/admin` ovunque: `probe-molti-indirizzi` (nota 39).
- ✅ G7 — MFA/passkey/onboarding 2FA, super_admin unico, reinvito invito: `probe-mfa-bypass`, `probe-passkey`, `probe-onboarding-2fa` (note 25/29/80).
- ✅ G8 — Bozze/anteprima con token firmato, open redirect `?back=`: coperti (note 26/47).

**FATTI il 17/10/2026 (commit 3c03e609, CLAUDE.md nota 83, SECURITY-CHECK) — baseline chiuso:**
- ✅ G9 — Iniezione nei filtri: nessun buco (B non legge A). Irrobustito: date booking validate, non grezze nella `.or()`. `probe-iniezione-filtri`.
- ✅ G10 — File caricati: 🔴 **BUCO chiuso** — `/api/upload/cover` scriveva `cover_url` su qualunque entità senza controllo di proprietà (defacement copertina cross-tenant). `probe-upload-sicurezza`.
- ✅ G11 — Pagamenti e webhook: nessun buco (firme verificate, cron col secret, importo ≤ totale). `probe-webhook-cron-auth`.
- ✅ G12 — SSRF: 🟠 **BUCO chiuso** — webhook in uscita verso indirizzi interni. Nuovo `lib/url-sicuro.js`. `probe-ssrf-webhook`.
- ✅ G13 — Auth: nessun buco (ban fermato subito anche sul token emesso). `probe-ban-sessione`.
- ✅ G14 — Rate-limit: nessun buco (token-gated), irrobustite 4 scritture pubbliche. Sonda statica `probe-rate-limit`.
- ⚠️ Lezione: i builder Supabase sono «thenable» senza `.catch` — avvolgere la pulizia in `try` nel `finally`, o la sonda lascia un'azienda ZZ in produzione.

**Classi FUORI dal baseline, ancora aperte (serve Francesco o un pentest esterno):** log dei fornitori
(Resend/Stripe/Meta, dati personali — manuale); il pezzo LIVE di G11 che richiede un conto Stripe sandbox
ATTIVO (`node stripe-sandbox-link.mjs`); il **pentest esterno** prima di aprire le registrazioni.

**Fuori dai giri perché NON è codice nostro (serve Francesco, manuale):** i log dei fornitori
(Resend/Stripe/Meta contengono dati personali), la rotazione di `META_APP_SECRET`, il contratto art. 28
GDPR coi clienti, e il **pentest esterno vero** prima di aprire le registrazioni (SECURITY §4.2).
✅ **La chiave fisica sugli account è GIÀ fatta** (Google al massimo + Advanced Protection, login via
Google ovunque → tutti i servizi coperti; 17/07/2026, riconfermato 17/10 — [[project_session_2026_07_17]]).
Checklist e stato in `SICUREZZA-ACCOUNT.md`. ⚠️ Anche fatti tutti i 14 giri, NON è un pentest esterno e il catalogo
delle classi non è chiuso: codice nuovo = superficie nuova. I giri sono un **baseline**, poi le sonde +
i giri periodici lo tengono.

**Ambito ancora da decidere con Francesco**:
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
