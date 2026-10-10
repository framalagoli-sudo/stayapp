---
name: project-guru-management
description: "Guru Management srl (sito di Francesco, era WordPress su SiteGround): ricostruito su OltreNova il 10/10/2026; archivio del vecchio sito, id, cosa manca"
metadata:
  node_type: memory
  type: project
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-10T19:58:56.421Z
---

Il 10/10/2026 Francesco ha chiesto di portare `gurumanagement.it` (fatto da lui in WordPress/Elementor, su SiteGround in scadenza l'11/10) sulla piattaforma: «molto simile, magari come design anche meglio».

- **Archivio del vecchio sito**: `C:\Users\francesco\progetti\gurumanagement-archivio` (fuori dal repo): 29 pagine HTML it+en, 178 file, `articoli.json` e `media.json` dal feed WordPress, schermate prima/dopo, `stato-oltrenova.json` con gli id creati.
- **Su OltreNova**: azienda `02830bb5-81d3-4ea5-8681-51aea0b24887` (Guru Management srl), entità attività `d59d9e5c-7972-469e-928f-ebabebda94a0`, slug `guru-management`, categoria `studio_professionale`, online su `guru-management.oltrenova.com`. Pagine: home, chi-siamo, contatti, blog; 4 articoli con le date originali; modulo «Contatti Guru Management» (notifica a infogururoma@gmail.com).
- **Come**: `tests/costruisci-guru.mjs`, rilanciabile (riscrive sopra gli stessi id), tutto via route con un super_admin effimero `@playwright.internal`. Unica scrittura diretta: la data degli articoli, che la route non lascia scegliere.
- **Fatto la sera del 10/10**: P.IVA = codice fiscale 18009121007, dati per la privacy, WhatsApp +39 351 7808613 (dati di Francesco). Dominio `gurumanagement.it` + `www` collegato: A `216.150.1.1` e `216.150.16.1`, `www` CNAME `0d1d7632c8ecc768.vercel-dns-017.com` (valori del progetto, letti dal pannello). Verificato da quattro resolver pubblici: l'apex serve il sito nuovo, `www` rimanda lì.
- **DNS**: zona creata su Cloudflare nell'account di Francesco (nameserver `mona` / `quincy.ns.cloudflare.com`), i tre record del sito in DNS only, i vecchi MX SiteGround lasciati fino allo scambio. Nameserver cambiati su SiteGround il 10/10 sera; alla chiusura il cambio non era ancora visibile. Il dominio resta registrato su SiteGround. Nessun DNSSEC.
- **Posta, DA FINIRE**: tutta `@gurumanagement.it` → `infogururoma@gmail.com` con Email Routing (catch-all). La casella è di un cliente di Francesco, che deve cliccare il link di verifica di Cloudflare; Francesco lo avvisa. Dopo: togliere i tre MX `mailspamprotection.com` e l'SPF `dnssmarthost.net`.
- **Ancora aperto**: nessun utente titolare creato; l'invio del modulo NON è stato provato (scriverebbe a persone vere — percorso per Francesco: `gurumanagement.it/p/contatti`, compilare, deve arrivare a infogururoma@gmail.com); le vecchie caselle SiteGround spariscono con l'hosting.
- Colori misurati dal vecchio sito: blu notte `#14305D`, verde acqua dei pulsanti; titoli Inter, testo Heebo.

Collegati: [[project-posta-elettronica]].
