---
name: reference-visibilita-motori
description: Chi finisce nei motori di ricerca — regola unica in lib/visibilita-motori.js; i siti nuovi nascono invisibili (migration 116)
metadata:
  type: reference
---

**Una domanda, un posto solo: `lib/visibilita-motori.js`** (`fuoriDaiMotori`).
Tre motivi legittimi per restare fuori: è l'**app del QR** (contiene la password
WiFi), il **minisito è spento**, o il cliente ha spento l'interruttore
**«Visibile ai motori di ricerca»** (`entita.indicizzabile`, migration 116).

⛔ **La regola esisteva solo per le strutture**: l'app del QR di ristoranti e
attività era indicizzabile. Trovato il 14/09/2026 mentre si aggiungeva
l'interruttore. *Una regola scritta in uno dei tre posti non è una regola.*

- **I siti nuovi nascono invisibili** (default `false`; le entità che esistevano
  restano `true`): il giorno della registrazione il sito ha il testo di esempio,
  ed è quello che Google fotograferebbe. Deciso da Francesco.
- Copre anche le porte laterali: pagine interne, vetrina, **eventi** (stanno su
  `/eventi/…`, indirizzo globale: il noindex del sito non li coprirebbe) e la
  **sitemap**, che per un sito nascosto risponde vuota.
- ⚠️ **Mai `Disallow` nel robots per nascondere**: per leggere un `noindex` il
  motore deve poter scaricare la pagina. Vedi [[reference_eventi_conclusi]].
- Nel pannello: banner **in cima** alla pagina «Sito web». Non promette Google —
  dice che i tempi li decide lui e rimanda a Search Console.
- I due siti di prova (`prova`, `struttura-test`) sono spenti e non indicizzabili
  dal 14/09.
