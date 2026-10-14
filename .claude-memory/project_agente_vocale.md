---
name: project_agente_vocale
description: "Agente AI al telefono tipo bookli.ai — idea di Francesco del 12/10/2026, in valutazione: parere dato, niente deciso"
metadata:
  node_type: memory
  type: project
  originSessionId: 83de693b-bb51-4ae3-be58-46648e944853
  modified: 2026-10-14T12:18:49.285Z
---

Francesco, 12/10/2026, a fine sessione: «potremmo un domani introdurre un servizio
tipo bookli?» (https://bookli.ai — agente AI che chiama i lead o riceve chiamate;
«è una figata»). Poi: «noi non siamo in grado di fare un agente ai come bookli?».

Parere dato (scritto in `STRATEGIA.md` §6.3): **sì, siamo in grado**. Linea e voce
si prendono da un fornitore (non scelto: va provato in italiano); l'agente — cosa
sa, cosa fa, configurazione, dopo-chiamata — è il prodotto ed è nostro. Viene dopo
Meta/WhatsApp e le operazioni in `lib/`. Prima in entrata, poi in uscita.

**Why:** il nostro vantaggio sono dati e azioni già dentro la piattaforma; il caso
misurato è Garage 22 ([[reference_posti_riservati_eventi]]).

**How to apply:** niente è deciso. Proposta aperta: prototipo in entrata su un caso
solo (Garage 22). Prima di qualunque chiamata in uscita: verifica legale (consenso
per chiamate automatizzate, Registro delle Opposizioni — l'ho detto a memoria) e
dichiarare che è un'AI. Costo al minuto → serve l'abbonamento a OltreNova su Stripe.
Non ho letto la documentazione di Bookli né provato fornitori di voce.

**14/10/2026, due idee nuove di Francesco sulla stessa strada:**
- Comandi a voce nell'editor («dimmi cosa cambiare»): approvato di farlo **prima di
  Stripe**. Piano: interprete (frase → una mossa da un catalogo chiuso, Annulla, niente
  salvato da solo) + barra di testo, poi microfono (Web Speech, da provare su iPhone).
- **Intervista telefonica che genera il sito** («chiudi la telefonata e dopo 5 minuti
  il sito è pronto»). Lui stesso: «non lo farei mai al primo cliente». Mio parere: il
  valore sta nelle domande per mestiere (`profili_mestiere`), non nella voce;
  l'intervista è la **fonte dei fatti**, così l'AI non deve inventarli. Le foto non
  passano dal telefono (link via WhatsApp dopo). Ordine: questionario a voce
  nell'AI Builder → chiamata in **entrata** → in uscita solo dopo la verifica legale.
- Francesco: l'intervista è un **percorso nuovo** nell'AI Builder, le opzioni di oggi
  restano. Le foto: richieste **precise per sezione** («le foto dei tuoi 4 piatti
  migliori»), su una pagina con link firmato o in chat WhatsApp con guida AI. Mio
  parere: l'elenco delle richieste si ricava dai posti-foto vuoti del sito generato
  (`postoPerFoto` in `lib/editor-visuale.js`); prima la pagina col link (niente Meta),
  poi WhatsApp sulla stessa lista. Le foto arrivano come modifica, non pubblicate da sole.
