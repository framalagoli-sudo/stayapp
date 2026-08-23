---
name: reference_webhook_url_www
description: "Gli URL dei webhook vanno registrati su www, mai sull'apex (308 = consegna fallita per Svix); e un invio email fallito dà lo STESSO sintomo di un webhook morto"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-08-23T17:40:46.185Z
---

Il webhook dei rimbalzi di Resend è rimasto muto **dal 9 luglio al 23 agosto 2026**, finché Resend non l'ha disattivato da solo. Due cause sovrapposte: l'URL registrato era `https://oltrenova.com/api/resend-webhook` (**apex**) e l'endpoint era anche rimasto disabilitato.

**La regola**: l'apex risponde **308** verso `www`, e per Svix — il motore che Resend usa, header `svix-*` — **un 3xx è una consegna fallita**, non un redirect da seguire (non li segue apposta, per non trascinare gli header di firma su un altro host). Verificato che *tutti* i webhook danno 308 sull'apex e rispondono solo su `www`: `resend-webhook`, `shop/webhook/stripe`, `whatsapp/webhook`, `webhooks`. Da controllare anche presso Stripe e Meta.

**Il sintomo inganna due volte**:
1. L'endpoint provato a mano su `www` funziona benissimo → sembra tutto a posto. Il guasto si vede **solo** interrogando l'URL esattamente com'è registrato dal fornitore.
2. Un **invio email fallito** produce lo stesso identico sintomo di un webhook morto: il contatto non viene marcato. Ci sono cascato: ho quasi accusato il webhook mentre i log dicevano `[email:newsletter-subscribe] FALLITA ... statusCode: null` — l'email non era mai partita (errore transitorio di Resend). **Ordine giusto delle ipotesi**: prima `npx vercel logs https://www.oltrenova.com | grep "\[email:"` per vedere se è partita, poi accusare il webhook.

**Conseguenza silenziosa** di un webhook rimbalzi morto: le caselle inesistenti non vengono più marcate `email_non_valida`, si continua a scrivere a indirizzi morti e la reputazione del dominio peggiora — senza nessun errore visibile.

Sonda: `tests/probe-webhook-resend.mjs` — iscrive `bounced@resend.dev` (indirizzo di simulazione, rimbalzo vero senza intaccare la reputazione) e verifica che il contatto venga marcato. Verificato funzionante il 23/08: 5 secondi. ⚠️ La route di iscrizione accetta 3 richieste/ora per IP.

Vedi [[reference_email_resend]], [[reference_vercel_env_cli]], nota 27 in `CLAUDE.md`.
