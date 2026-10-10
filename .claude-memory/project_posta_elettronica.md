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

**Misurato il 10/10/2026 (SiteGround scade l'11/10)**: niente era stato spostato. `oltrenova.com` MX ancora SiteGround, nessun record Zoho. `gurumanagement.it`, `garage22terni.it` e `fondaconarni.com` hanno ancora i **nameserver** su SiteGround (`ns1/ns2.siteground.net`); `fondaconarni.com` è registrato via Tucows (scade 27/05/2027). Record da ricreare: `garage22terni.it` A `216.150.1.1` + `www` CNAME `cname.vercel-dns.com`; `fondaconarni.com` solo `www` CNAME `cname.vercel-dns.com` (nessun A sull'apex). Consigliato a Francesco: Cloudflare per le tre zone (importa i record finché SiteGround risponde) ed Email Routing per `info@oltrenova.com`. Esito: da verificare alla prossima sessione.

**Correzione di Francesco (10/10/2026, sera)**: `garage22terni.it` e `fondaconarni.com` NON sono suoi e non stanno sul suo SiteGround — i nameserver `siteground.net` dicono solo che anche i loro proprietari usano SiteGround. ⚠️ Errore mio: avevo dedotto «scadono col suo server» dal solo nome dei nameserver; un nameserver condiviso non dice di chi è l'account. Scade solo l'HOSTING di Francesco; i domini `oltrenova.com` e `gurumanagement.it` sono un servizio separato e restano su SiteGround. Deciso: `info@oltrenova.com` → inoltro alla sua Gmail; tutta la posta `@gurumanagement.it` → `infogururoma@gmail.com`. Guru: P.IVA = codice fiscale 18009121007, WhatsApp +39 351 7808613.

**FATTO il 10/10/2026**: `info@oltrenova.com` passa da **Cloudflare Email Routing** verso la Gmail di Francesco (MX `route1/2/3.mx.cloudflare.net`, SPF `include:_spf.mx.cloudflare.net`), provato da lui con un invio vero. Record di Resend (`send`, `resend._domainkey`, `_dmarc`) intatti, misurati dopo il cambio. È solo ricezione: non si scrive come `info@`. Zoho non è stato fatto. Inciampi nel guidarlo: Cloudflare non toglie da solo gli MX vecchi (vanno cancellati da DNS → Records) e verificare la destinazione non crea la regola (`Routing rules → Create address`). Resta `gurumanagement.it`: sito e posta verso `infogururoma@gmail.com`.

**Chiusura del 10/10/2026**: `gurumanagement.it` → zona su Cloudflare creata, nameserver cambiati su SiteGround, **inoltro non ancora acceso** (si accende quando la zona è attiva; destinazione `infogururoma@gmail.com`, casella di un cliente di Francesco che deve confermare). Dettaglio in [[project-guru-management]]. Gli indirizzi di destinazione di Email Routing valgono per tutto l'account: si possono far verificare da un'altra zona già attiva.
