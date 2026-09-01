---
name: reference-anteprima-social
description: "Come si presenta una pagina condivisa su Facebook — la pagina evento mostrava OltreNova al posto del cliente; og:site_name e il ripiego dell'immagine valgono per ogni pagina pubblica"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e0aafe55-ef53-42ae-b608-67413a26565e
  modified: 2026-09-01T14:58:00.119Z
---

**Una campagna traffico a pagamento verso l'evento di un cliente mostrava su
Facebook titolo «OltreNova», descrizione «La piattaforma per il tuo business di
servizi» e il NOSTRO logo.** Il cliente pagava per pubblicizzare noi.

Causa: `app/eventi/[id]/page.js` non aveva `generateMetadata`, quindi ereditava
quelli del layout della piattaforma — ed è la pagina **più condivisa** che
abbiamo, perché un evento nasce per essere spinto sui social.

## Le tre regole, per ogni pagina pubblica

1. **Ogni pagina pubblica ha `generateMetadata` propri.** Senza, valgono quelli
   di OltreNova e la pagina di un cliente si presenta col nostro nome.
   ⚠️ Vale **anche per le pagine che sono codice di browser**: `EventoPage` fa la
   fetch da sé, ma `generateMetadata` gira sul server e si può costruire lo
   stesso. Chi legge i link **non esegue JavaScript**: conta solo l'HTML.
2. **`og:site_name` = il nome del cliente.** Senza, Facebook scrive il **dominio
   in maiuscolo** sopra il titolo: su un link `oltrenova.com` diventa
   «OLTRENOVA.COM» sul sito di un altro.
3. **L'immagine ripiega**: locandina → copertina → logo. Misurato il 01/09: 11
   entità su 15 non hanno `cover_url`, quindi l'anteprima era un rettangolo
   grigio. Meglio il logo che niente.

Coperte: minisiti (s/r/a), sotto-pagine, vetrine, offerte, eventi, blog.

## Per una campagna: l'URL sul dominio del cliente

`garage22terni.it/eventi/<id>` risponde 200 — il middleware lascia passare
`/eventi` come route globale. In un'inserzione va usato **quello**, non
`oltrenova.com/eventi/…`: così sotto il titolo compare il suo indirizzo.

⚠️ **Facebook tiene in cache l'anteprima.** Dopo una correzione non cambia da
sola: va passata dallo *Sharing Debugger* con «Scrape Again», altrimenti si
continua a vedere la vecchia e sembra che il fix non abbia funzionato.

## Il metodo

Sonda `tests/probe-anteprima-social.mjs`: chiede le pagine con lo **User-Agent di
Facebook** e verifica che il nostro nome, la nostra descrizione e la nostra
immagine non compaiano **mai** sulla pagina di un cliente. Prova ogni tipo di
indirizzo pubblico, perché il difetto stava proprio in quello a cui nessuno
aveva pensato — [[feedback_cercare_tutti_i_punti]].

⚠️ L'immagine mancante è un **avviso**, non un errore: se il cliente non ha
caricato niente non è il codice a doverlo risolvere, e un allarme che suona
sempre viene ignorato anche quando ha ragione.

⚠️ Applicando la correzione a 12 file con una sostituzione su tutto il testo, li
ho **riscritti dall'inizio**: se n'è accorto il `next build` e nessun altro. Per
modifiche ripetute su molti file: lavorare **riga per riga** e contare quante
sono andate a segno.

⚠️ Il deploy di quel giorno è fallito per una causa esterna: `npx vercel`
prendeva la 59.11.0 appena uscita, con una dipendenza rotta
(`@vercel/fastify@6.0.0` inesistente). Ripiego: la copia già autenticata nella
cache npx (`%LOCALAPPDATA%\npm-cache\_npx\...\node_modules\.bin\vercel.cmd`),
sempre lanciata **da `client-next/`**. `npx vercel@<versione>` non va: scarica
una copia nuova che non trova le credenziali.
