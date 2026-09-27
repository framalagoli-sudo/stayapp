---
name: project-posta-elettronica
description: "Uscita da SiteGround: posta di OltreNova su Zoho Mail Lite (zoho.eu), Guru Management con inoltro Cloudflare o alias, clienti con posta intestata a loro; OltreNova non ospita né rivende posta (decisione 27/09/2026)"
metadata:
  node_type: memory
  type: project
  originSessionId: 814befb6-1136-4fe1-9412-3d749d356419
  modified: 2026-09-27T14:12:58.228Z
---

**Decisione di Francesco (27/09/2026)**: servizio semplice, non guadagnare sulla posta; «meno cazzi
abbiamo meglio è». Dettaglio in `STRATEGIA.md` §4.6.

**Stato misurato (27/09)**:
- `oltrenova.com`: DNS su **Cloudflare**; posta su **SiteGround** (MX `mx10/20/30.antispam.mailspamprotection.com`, SPF `include:oltrenova.com.spf.auto.dnssmarthost.net`), DMARC `p=quarantine`. Resend: `send.oltrenova.com` (SPF amazonses + MX feedback) e `resend._domainkey` — **da non toccare**. `info@oltrenova.com` è l'indirizzo dell'app Meta: zero ore di rimbalzi.
- `gurumanagement.it`: **sito, posta e DNS su SiteGround** (ns1/ns2.siteground.net). 3 indirizzi. `gurumanagement.com` non risponde.
- Garage 22 e Fondaco Narni: DNS su SiteGround e **nessun MX** (non ricevono posta sul dominio). Da spostare prima di disdire SiteGround, altrimenti i siti OltreNova vanno offline — rimandato da Francesco («ci penseremo poi»).

**Scelte**: OltreNova → **Zoho Mail Lite** (~1 $/casella/mese, annuale, 5 GB, alias gratis, IMAP), account da **zoho.eu** con paese Italia. Guru → **Cloudflare Email Routing** (gratis, solo ricezione e inoltro: niente casella, niente invio da quell'indirizzo) oppure alias nello Zoho di OltreNova. Clienti → account loro.

**Ordine per non perdere niente**: caselle nuove → copia delle mail vecchie via IMAP → MX/SPF/DKIM → seconda copia → solo alla fine disdetta SiteGround (cancella tutto).

Collegati: [[project-strategia-cardine]], [[reference_email_resend]].
