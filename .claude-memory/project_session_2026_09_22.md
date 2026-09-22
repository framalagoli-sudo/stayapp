---
name: project_session_2026_09_22
description: "Sessione 21–22/09 — varianti dei blocchi, eventi (posti riservati e note), inlingua Terni rifatto da brief; 5 difetti di piattaforma trovati facendo, non leggendo"
metadata: 
  node_type: memory
  type: project
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-22T11:39:08.694Z
---

**Migration eseguite: fino alla 126.** Tutto live e verificato in produzione.

## Il filo che lega la giornata

Tre lavori chiesti da Francesco — le varianti del blocco team, la vetrina «più
di design», il sito di inlingua Terni da brief — e **cinque difetti di
piattaforma** emersi mentre li facevo. Nessuno dei cinque è stato trovato
rileggendo il codice: tutti provando, aprendo pagine, chiamando route.

1. ⛔ **Un pulsante sullo slider = pagina in 500.** `siteHref` fuori scope in
   `HeroSlider` e `Carousel`. Invisibile per mesi perché nessuno slider aveva un
   link: il ramo non veniva mai eseguito → [[reference_identificatore_fuori_scope]]
2. ⛔ **Il modulo di prenotazione nell'app del QR era rotto da un mese**: non
   mandava `privacy_accettata` e riceveva 400 a ogni tentativo, senza che
   l'ospite avesse una spunta da mettere → [[reference_modulo_prenotazione_evento]]
3. ⛔ **Le CTA delle 11 pagine interne di inlingua non avevano link**: i
   pulsanti non comparivano affatto. Undici pagine che raccontavano bene e non
   portavano da nessuna parte.
4. ⛔ **Grigi sotto il minimo leggibile** su tutti i siti chiari, `readableOn`
   con la soglia del testo grande anche sui link piccoli, bianco fisso sui
   pulsanti del menu.
5. ⛔ **La sonda del contrasto segnalava ogni hero con foto** (un `<img>` non è
   un `background-image`). Terza volta che misura la cosa sbagliata: ora **prova
   sé stessa** prima di misurare, e si ferma se non trova un bianco-su-bianco
   messo lì apposta.

## Il pezzo di prodotto più interessante

Garage 22 va sold out e le prenotazioni telefoniche non entrano nel sistema:
60 posti, 29 registrati, **una sola** segnata a mano su una trentina. Il modulo
per segnarle esisteva già. La radice non è tecnica — chi è in servizio non apre
il gestionale mentre squilla il telefono — quindi invece di pretendere che quel
canale scriva, **gli si riserva una quota** e il sito non può sovravvendere
nemmeno se nessuno segna niente → [[reference_posti_riservati_eventi]]

È il tipo di problema in cui la soluzione ovvia (un pulsante più comodo) è
quella che non funziona.

## Metodo, confermato due volte

- **Lo snapshot prima di toccare** un sito vero: su inlingua è servito come rete
  mentre riscrivevo 53 blocchi (`fb85573d-89ff-4c71-9af6-a234143600d1`).
- **Provare senza toccare i dati del cliente**: per verificare video e mappa ho
  creato un elemento **in bozza** e l'ho aperto con un token d'anteprima
  firmato, poi cancellato — Francesco stava editando quegli stessi dati.
- **Fermarsi**: l'errore di hydration sul dettaglio evento l'ho diagnosticato
  (sono attributi, causa il ramo `typeof window`) ma **non corretto**, dopo sei
  deploy su siti di clienti in una giornata → [[project_backlog_hydration_evento]]

Vedi [[project_inlingua_terni]], [[reference_blocco_team_varianti]],
[[reference_vetrina_evidenza]], [[project_sezioni_universali]].
