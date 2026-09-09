---
name: reference_domini_vercel
description: "Domini custom/sottodomini su Vercel — IP hardcodati morti, wildcard senza certificato, stato da misurare non dichiarare"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-17T08:43:13.774Z
---

Fatti verificati dal vivo il 17/08/2026 sul progetto Vercel `oltrenova-next`, indagando perché i domini dei clienti non si collegavano.

**1. Gli IP di ingresso Vercel cambiano: mai scriverli nel codice.**
`76.76.19.19` (hardcodato nelle istruzioni DNS per i domini apex) **non risponde più**: `curl --resolve` verso quell'IP dà connessione fallita, mentre `216.150.1.1` e `76.76.21.21` rispondono 200. Ogni cliente con dominio radice che seguiva le istruzioni restava offline per sempre. I valori corretti si chiedono a `GET /v6/domains/{dominio}/config` → `recommendedIPv4` / `recommendedCNAME` (ordinati per `rank`).

**2. Il dominio wildcard su Vercel NON emette il certificato per i sottodomini.**
`*.oltrenova.com` risulta `verified: true` sul progetto, ma la lista `/v7/certs` contiene solo certificati per singolo hostname: i sottodomini mai registrati esplicitamente falliscono l'handshake TLS (dietro Cloudflare il visitatore vede **525**). Verificato bypassando Cloudflare con `curl --resolve` sull'IP edge Vercel: stesso fallimento → la causa è Vercel, non Cloudflare. **Ogni hostname va aggiunto al progetto** (`POST /v10/projects/{id}/domains`).

**3. `verified: true` + `misconfigured: false` non significano "funziona".**
Per un sottodominio rotto Vercel riportava entrambi positivi mentre il sito era irraggiungibile. L'unica verifica affidabile è **una GET HTTPS vera** all'indirizzo (`probeHttps` in `lib/vercel-domains.js`).

**4. `apexName` nella risposta Vercel è l'unico modo corretto di distinguere radice e sottodominio** (usa la Public Suffix List): contare i punti sbaglia su `.co.uk`, `.com.br` ecc. — rilevante perché StayApp è worldwide.

**5. `/v6/domains/{d}/config` funziona anche per domini non ancora collegati** e restituisce `aValues`/`cnames` attuali + `nameservers`: da lì si dice al cliente "adesso punta a X, deve puntare a Y" e si riconosce il suo provider (Aruba, GoDaddy, Cloudflare…).

Token CLI Vercel per le indagini a freddo: `C:\Users\francesco\AppData\Roaming\com.vercel.cli\Data\auth.json` (campo `token`), progetto live `prj_RHAKm3p6UEXzVFm69mo7BvVO42u1`, team `team_2ODBmkiduLHX5Wz9fn8DnusG`. Il vecchio progetto `stayapp` esiste ancora ma ha solo `struttura-test.stayapp.it`.

Vedi anche [[project_session_2026_08_17_domini]] e la nota 24 in `CLAUDE.md`.

## La riga nel database è l'unica memoria (09/09/2026)

`domini.dominio` è l'**unico** posto in cui è scritto che un hostname è nostro.
Due punti la cancellavano senza sapere se Vercel era stato liberato davvero —
`rimuoviDominiEntita` ignorava l'esito di `removeProjectDomain`, e il ramo
«entità cancellata» del cron faceva un `delete` secco senza chiamare Vercel
affatto. Chi passava di lì diventava **invisibile**: nessuna query può trovare
un hostname di cui non resta nessuna riga.

⚠️ La nota precedente diceva «`removeProjectDomain` esiste, nessuno la chiama»:
**era falso**, veniva chiamata — il difetto era che nessuno guardava com'era
andata. E il residuo `futura-club-spiagge-bianche.oltrenova.com` non risponde
404 come annotato: risponde **200 servendo la landing marketing di OltreNova**,
cioè un indirizzo col nome di un ex cliente che pubblicizza noi.

Ora: si libera prima, si cancella dopo, e **solo ciò che è stato liberato**. Un
404 da Vercel vale «già libero». Quello che resta viene marcato `stato:
'errore'` — valore già ammesso dal CHECK, nessuna migration — perché il cron
guarda solo i domini NON attivi: una riga lasciata 'attivo' non l'avrebbe
ripresa più nessuno. Provato dal vivo creando e cancellando un'entità dalla
route vera: la riga sparisce, cioè Vercel ha confermato lo stacco.

`tests/probe-domini-orfani.mjs` trova quelli **già** rimasti — l'unico modo è
chiedere a Vercel cosa ha e confrontare. Simula per default; la piattaforma
(apex, www, wildcard, `.vercel.app`) è in una allowlist che `--esegui` non
scavalca. Richiede `VERCEL_TOKEN` e `VERCEL_PROJECT_ID` in `tests/.env.test`,
che **oggi lì non ci sono**.

⚠️ Un sottodominio appena creato risponde **525** finché Vercel non emette il
certificato, anche se è registrato correttamente: visto il 09/09 su un'entità
di prova. Quindi un cliente nuovo, nei primi minuti, trova il proprio indirizzo
rotto — quanto duri non è stato misurato. Vale anche come avvertenza per le
sonde: la rete non distingue «non registrato» da «certificato non ancora
pronto», entrambi danno 525.

### La stessa ferita da un'altra porta: cancellare l'AZIENDA

Corretta la cancellazione dell'entità, restava aperta quella dell'azienda —
trovata solo perché Francesco ha detto cosa stava per fare. `DELETE
/api/aziende/[id]` faceva un `delete` secco e il database portava via in
cascata (migration 035) **entità e righe `domini` insieme**, senza che nessuno
chiamasse Vercel. Ora `rimuoviDominiAzienda` stacca prima; se anche un solo
hostname non si stacca la cancellazione **non parte** (409 col motivo, mostrato
in un alert dalla pagina). L'azienda si cancella fra un minuto, un hostname
perso no.

**Cosa fa davvero la cascata** (misurato su un'azienda effimera il 09/09):

| | |
|---|---|
| entità | cancellata |
| riga `domini` | cancellata — e prima di oggi Vercel non lo sapeva |
| profili | **restano**, con `azienda_id` azzerato |
| account di accesso | **restano**: quelle persone possono ancora fare login |

L'ultima riga il testo di conferma non la diceva. Ora la dice. Gli account
restano visibili in `/admin/users`, che per il super_admin elenca tutti gli
utenti auth e non solo quelli con un'azienda: si tolgono da lì, anche dopo.

### La radice: nascono «attivi», e il cron guardava solo i pendenti

Il perché dei 56. Un sottodominio nasce con stato **`attivo`** — sta sotto un
dominio che è già nostro, quindi Vercel lo verifica subito — e la passata di
manutenzione filtra `soloPendenti` (`stato != 'attivo'`). Quindi un'entità
cancellata **direttamente nel database** — lo fanno 27 sonde, e una query a
mano pure — lasciava una riga che nessun processo automatico riguardava mai, e
un hostname agganciato al progetto.

Ora la passata ha un secondo blocco che cerca le righe **la cui entità non
esiste più, a prescindere dallo stato**, e le stacca. Per le righe sane è una
domanda sola al database, nessuna chiamata di rete: gira per intero ogni volta
senza pesare. **Le 27 sonde non sono state toccate**: il fix sta in un punto
solo. Provato dal vivo riproducendo il comportamento di una sonda — entità
creata dalla route, cancellata dal database, manutenzione lanciata: riga
sparita, hostname staccato.

Tutti i punti che cancellano un dominio (entità, azienda, ramo orfano del cron,
blocco nuovo) passano dalla stessa `staccaERimuoviRiga`.

**Pulizia del 09/09**: erano 77 hostname su Vercel contro 15 righe nel
database. Staccati 56 — residui delle sonde (`zz-*`, `ci-sec-*`) più
`futura-club-spiagge-bianche`. Nessun dominio di cliente era nell'elenco.
Ora: 21 hostname, zero orfani.

⚠️ Il token della CLI Vercel (`~/AppData/Roaming/com.vercel.cli/Data/auth.json`)
**scade dopo poche ore** e il campo `expiresAt` è in **secondi**, non
millisecondi. Quando l'API risponde `Not authorized`, basta un qualsiasi
comando `npx vercel` per rinnovarlo. Con quelle credenziali la sonda gira senza
scrivere niente in `.env.test`.
