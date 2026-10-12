---
name: project_agente_vocale
description: "Agente AI al telefono tipo bookli.ai — idea di Francesco del 12/10/2026, in valutazione: parere dato, niente deciso"
metadata:
  type: project
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
