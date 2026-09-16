---
name: reference_verifica_la_sequenza_del_fornitore
description: "Quando un pezzo di codice parla con un fornitore esterno, va verificata la SEQUENZA completa sulla sua documentazione, non solo la chiamata che ho scritto"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-16T17:25:47.287Z
---

Il 16/09/2026 avevo dichiarato pronto il collegamento WhatsApp: SDK, finestra di Meta, scambio del codice con il token, salvataggio. Tutto vero, e **non sarebbe partito un solo messaggio**. Mancavano due chiamate obbligatorie: iscrivere l'app ai webhook dell'account del cliente (`subscribed_apps`) e registrare il numero (`register` con PIN). Le ho trovate solo perché Francesco ha chiesto: **«ma basta solo quello che hai scritto?»**

**Why:** verificare la singola chiamata che ho scritto non dice niente sul fatto che sia l'unica necessaria. Con un fornitore esterno il difetto non è «questa riga è sbagliata», è «di righe ne servivano quattro». E non si vede né nel build né in una prova a tavolino: si vede al primo invio di un cliente vero, cioè nel posto peggiore.

**How to apply:** prima di dire «pronto» su un'integrazione, aprire la pagina *onboarding/getting started* del fornitore e ripercorrere **l'elenco dei passi**, non l'endpoint singolo. Se la documentazione ha una pagina «steps» o «onboarding», quella è la lista di controllo. Vale per Meta, Stripe, Vercel, Google. È la stessa famiglia di [[feedback_verificare_il_contesto]]: verifico il pezzo che ho scritto, non il percorso completo.
