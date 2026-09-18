---
name: project-search-console
description: "Da fare: creare Google Search Console per oltrenova.com e per i domini dei clienti — oggi NON esiste, quindi di ciò che Google capisce davvero non sappiamo niente"
metadata: 
  node_type: memory
  type: project
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-18T12:34:50.647Z
---

**Al 18/09/2026 non esiste nessuna proprietà Search Console**, né per `oltrenova.com` né per i clienti (detto da Francesco). Da fare, data da decidere.

**Perché conta**: dal codice si vede cosa *dichiariamo* (canonical, sitemap, dati strutturati). Solo Search Console dice cosa Google **ha capito e indicizzato**: pagine escluse e perché, duplicati con canonical diverso da quello scelto da noi, errori di scansione, query reali. Senza, ogni giudizio sulla SEO è una deduzione.

**Come si fa** (per ogni dominio, ~10 minuti l'uno):
1. `search.google.com/search-console` → Aggiungi proprietà → **Dominio** (copre www, apex, http e https insieme).
2. Google dà un record **TXT** da mettere nel DNS del dominio. Per i domini dei clienti serve **accesso al loro DNS** — oppure si usa la proprietà «Prefisso URL», che si verifica con un file o un meta tag che possiamo servire noi. ⚠️ Da valutare: la verifica via DNS sui domini dei clienti richiede una richiesta a loro.
3. Dopo la verifica: inviare la **sitemap** (la nostra è `https://www.oltrenova.com/sitemap.xml`; quella di un cliente è dichiarata nel suo `robots.txt` e punta a `/api/sitemap/<tipo>/<slug>`).
4. I dati compaiono dopo qualche giorno: non è un controllo istantaneo.

**Domanda di prodotto aperta**: la Search Console dei clienti la teniamo noi (e diventa un servizio che offriamo, con i dati nel pannello) o la lasciamo a loro? Se la teniamo noi, va scritto nei termini.

Vedi [[reference_visibilita_motori]], [[reference_un_sito_un_indirizzo]], [[reference_molti_indirizzi]].
