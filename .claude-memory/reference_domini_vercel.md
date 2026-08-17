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
