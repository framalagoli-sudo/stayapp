---
name: reference_un_sito_un_indirizzo
description: "Se il cliente ha un dominio, tutto va lì (307, non 301); e sitemap/email devono dichiarare lo stesso indirizzo del canonical"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-14T11:39:48.524Z
---

Lo stesso sito viveva su tre indirizzi insieme: `oltrenova.com/r/slug`, `slug.oltrenova.com`, `www.dominiodelcliente.it`. Dal 14/09/2026 i primi due **reindirizzano** al terzo quando c'è (middleware, `versoIlDominioDelCliente`), e `lib/indirizzo-ufficiale.js` → `hostUfficiale(entityId)` è l'unica risposta alla domanda «qual è l'indirizzo vero»: dominio custom > sottodominio > nostro percorso.

**Quattro vincoli, ognuno nato da un guasto possibile:**
- **307, mai 301.** Un permanente resta nella cache dei browser per sempre: se quel dominio scade non si può più rimediare. La parte per i motori la fa il canonical.
- **Solo dai NOSTRI domini veri** (`oltrenova.com` / `www.`): mai da `localhost` né da `*.vercel.app`, altrimenti non si può più lavorare su una copia.
- **La query si porta dietro tutto**: `?qr=1` (app del QR già stampati), il token di anteprima dell'admin, le etichette delle campagne. Senza, si rompono in silenzio.
- **Solo `stato = 'attivo'`**, che è una misura (`diagnosticaDominio`: Vercel + DNS + GET HTTPS vera, cron ogni 15 min) e non una dichiarazione. È la rete di sicurezza: se il dominio del cliente cade, entro un quarto d'ora smettiamo di mandarci traffico.

**⚠️ Il canonical da solo non basta: chi dichiara indirizzi deve dichiarare LO STESSO.** Trovati nello stesso giorno tre punti che lo contraddicevano:
- la sitemap elencava `dominiocliente.it/r/slug/p/menu` mentre la pagina dichiarava `dominiocliente.it/p/menu` — il primo risponde lo stesso (il middleware lo riconosce) ed è proprio il problema: un secondo indirizzo per la stessa pagina, scritto da noi;
- la sitemap guardava solo `tipo='custom'`, quindi un sito col solo sottodominio si elencava sotto oltrenova.com mentre le sue pagine indicavano il sottodominio;
- nelle email (conferma evento, newsletter) il link all'informativa portava il nostro indirizzo. `unsubscribeUrl` invece resta sul nostro di proposito: la disiscrizione è un nostro servizio e deve funzionare anche se il dominio del cliente cade.

Aggiungendo un posto che scrive un URL pubblico di un cliente, passare da `hostUfficiale`. Vedi [[reference_domini_vercel]] e [[feedback_cercare_tutti_i_punti]].

**Anche il QR si incide sul dominio del cliente** (fatto il 14/09): `QRCodePage.jsx` chiede `/api/public/dominio-ufficiale` e **non mostra il codice** finché non sa l'indirizzo — un PNG scaricato nell'istante sbagliato resta stampato per sempre, e mezzo secondo di attesa costa meno di una ristampa.

⚠️ **Un apex che «non risponde» non sempre è un record mancante.** Su `metodotvb.it` la diagnosi salvata diceva «manca un record nei DNS», ma l'A record c'era: puntava ad Aruba (`62.149.128.40`) invece che a Vercel. E **il resolver di Telecom falsifica `nslookup`** (aggiunge `homenet.telecomitalia.it` e risponde 127.0.0.1): per il DNS vero usare `https://dns.google/resolve?name=…&type=A`.
