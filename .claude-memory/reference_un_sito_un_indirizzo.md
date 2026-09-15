---
name: reference_un_sito_un_indirizzo
description: "Se il cliente ha un dominio, tutto va lì (307, non 301); e sitemap/email devono dichiarare lo stesso indirizzo del canonical"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-15T07:58:07.725Z
---

Lo stesso sito viveva su tre indirizzi insieme: `oltrenova.com/r/slug`, `slug.oltrenova.com`, `www.dominiodelcliente.it`. Dal 14/09/2026 i primi due **reindirizzano** al terzo quando c'è (middleware, `versoIlDominioDelCliente`), e `lib/indirizzo-ufficiale.js` → `hostUfficiale(entityId)` è l'unica risposta alla domanda «qual è l'indirizzo vero»: dominio custom > sottodominio > nostro percorso.

**Quattro vincoli, ognuno nato da un guasto possibile:**
- **307, mai 301.** Un permanente resta nella cache dei browser per sempre: se quel dominio scade non si può più rimediare. La parte per i motori la fa il canonical.
- **Solo dai NOSTRI domini veri** (`oltrenova.com` / `www.`): mai da `localhost` né da `*.vercel.app`, altrimenti non si può più lavorare su una copia.
- **La query si porta dietro tutto**: `?qr=1` (app del QR già stampati), il token di anteprima dell'admin, le etichette delle campagne. Senza, si rompono in silenzio.
- **Solo `stato = 'attivo'`**, che è una misura (`diagnosticaDominio`: Vercel + DNS + GET HTTPS vera) e non una dichiarazione.
  ⛔ **Falso quello che avevo scritto il 14/09** («se il dominio cade, entro un quarto d'ora smettiamo di mandarci traffico»). Scoperto il 15/09: il cron passa `soloPendenti: true`, e **un dominio attivo non lo rimisura più nessuno**. Se il dominio di un cliente scade, il redirect continua a mandarci i visitatori. E non si risolve facendo ripassare gli attivi: `resolve-domain` serve il sito solo se `stato = 'attivo'`, la prova aspetta 10s e una pagina a freddo ne impiega 9–14 → un falso allarme **spegnerebbe il sito sul dominio del cliente**. Le due decisioni vanno separate: «servire il sito sul suo dominio» e «mandarci la gente» non possono dipendere dallo stesso interruttore.
  ✅ **Separate il 15/09** (opzione A, decisa da Francesco):
  - **servire** non si spegne mai in automatico: `salvaEsito` non riporta un dominio attivo «in attesa». Il pericolo c'era già da un'altra porta — aprire la pagina Domini rimisura i domini «stantii» da 6 ore (`aggiornaSeStantio`) e poteva declassarli per un avvio a freddo;
  - **mandare** dipende dalla `salute` (`lib/salute-dominio.js`, nel jsonb `verifica_dettaglio.salute`, nessuna migration): il cron prova ogni 15 min i domini `custom` attivi (`controllaSaluteDomini`, attesa 15s); dopo **3 prove fallite di fila** il redirect si sospende — e con lui canonical, sitemap, email e QR, che ripiegano sul sottodominio (`hostUfficiale`) — riparte alla **prima** riuscita, e parte **una** email.
  - ⚠️ `salvaEsito` riscrive tutta la diagnosi: la `salute` va conservata a mano, altrimenti ogni ricontrolla azzera il conto mentre il dominio sta cadendo.
  - La diagnosi del gemello ha `causa`: `manca` (aggiungi) · `altrove` (sostituisci, con `trovati`) · `certificato` (niente da fare).

**⚠️ Il canonical da solo non basta: chi dichiara indirizzi deve dichiarare LO STESSO.** Trovati nello stesso giorno tre punti che lo contraddicevano:
- la sitemap elencava `dominiocliente.it/r/slug/p/menu` mentre la pagina dichiarava `dominiocliente.it/p/menu` — il primo risponde lo stesso (il middleware lo riconosce) ed è proprio il problema: un secondo indirizzo per la stessa pagina, scritto da noi;
- la sitemap guardava solo `tipo='custom'`, quindi un sito col solo sottodominio si elencava sotto oltrenova.com mentre le sue pagine indicavano il sottodominio;
- nelle email (conferma evento, newsletter) il link all'informativa portava il nostro indirizzo. `unsubscribeUrl` invece resta sul nostro di proposito: la disiscrizione è un nostro servizio e deve funzionare anche se il dominio del cliente cade.

Aggiungendo un posto che scrive un URL pubblico di un cliente, passare da `hostUfficiale`. Vedi [[reference_domini_vercel]] e [[feedback_cercare_tutti_i_punti]].

**Anche il QR si incide sul dominio del cliente** (fatto il 14/09): `QRCodePage.jsx` chiede `/api/public/dominio-ufficiale` e **non mostra il codice** finché non sa l'indirizzo — un PNG scaricato nell'istante sbagliato resta stampato per sempre, e mezzo secondo di attesa costa meno di una ristampa.

⚠️ **Un apex che «non risponde» non sempre è un record mancante.** Su `metodotvb.it` la diagnosi salvata diceva «manca un record nei DNS», ma l'A record c'era: puntava ad Aruba (`62.149.128.40`) invece che a Vercel. E **il resolver di Telecom falsifica `nslookup`** (aggiunge `homenet.telecomitalia.it` e risponde 127.0.0.1): per il DNS vero usare `https://dns.google/resolve?name=…&type=A`.
