---
name: project_registrar_domini
description: Registrare i domini per i clienti — piano in REGISTRAR.md; sblocca l'onboarding, ma né Cloudflare né Vercel vendono .it
metadata:
  type: project
---

Idea di Francesco (23/08/2026), da lui indicata come **di estrema importanza**. Piano completo in **`REGISTRAR.md`** nel repo.

**Perché conta**: è l'unico passaggio dell'onboarding che dipende da terzi. Sito e contenuti funzionano già; è il DNS a casa del cliente che blocca. Fondaco Narni ha il sito pronto e l'indirizzo senza `www` fermo da giorni per un record su SiteGround. Se il dominio lo registriamo noi, il DNS è nostro → online in minuti, apex/www automatici, **inoltro email quasi gratis**.

**Verificato sulla documentazione Cloudflare (23/08/2026)**:
- Registrar API in **beta**: `search`, `check`, `register` ci sono; **rinnovi, trasferimenti e modifica contatti NO** (solo dal pannello).
- Prezzi **a costo**, nessun ricarico né tariffa-civetta.
- ⚠️ **`.it` NON supportato**, e nemmeno `.eu/.de/.fr/.es`: dei country-code europei c'è in pratica solo `.uk`. **Vercel** vende domini via API ma neanche lui fa i `.it`.
- Chi registra su Cloudflare resta vincolato ai loro nameserver.

**Decisione di Francesco**: *non fissarsi su un fornitore* — si sceglierà un partner migliore al momento giusto. Quindi architettura con **interfaccia unica** (`lib/registrar/index.js`) e implementazioni intercambiabili, instradate per estensione: stesso principio di `lib/vercel-domains.js` e `lib/whatsapp.js`.

**Domande aperte, non tecniche**: a nome di chi è intestato il dominio (la posizione onesta è **il cliente**, per non creare vincoli); chi paga i rinnovi e cosa succede se non paga (un dominio scaduto = azienda sparita da internet, email comprese); quale partner per i `.it` — Aruba/OVH/Namecheap hanno API ma **vanno provate**, non dedotte dai loro siti.

**Quando**: dopo l'onboarding "Inizia qui". Nel frattempo, se un cliente lo chiede, si compra a mano intestandolo a lui e si mette su Cloudflare: dieci minuti, zero codice.
