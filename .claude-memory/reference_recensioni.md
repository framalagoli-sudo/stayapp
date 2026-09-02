---
name: reference-recensioni
description: Il giro delle recensioni e lo «smart redirect» verso Google — esisteva già e non l'aveva percorso nessuno; cinque difetti chiusi il 02/09/2026
metadata:
  type: reference
---

**0 richieste di recensione inviate in tutta la storia del progetto** (misurato
il 01/09). Il codice c'era e non l'aveva percorso nessuno — compreso lo **smart
redirect**, che stavo per costruire da capo: prima di aggiungere, cercare se
esiste già.

## Come funziona

- Il titolare chiede una recensione da `/admin/recensioni` → **+ Aggiungi** →
  «Genera link». Nasce una riga in `recensioni` con un token.
- L'ospite apre `/recensione?token=…` e vota.
- **≥ 4 stelle** → la recensione diventa pubblica e l'ospite viene mandato al
  profilo del cliente (`minisito.recensioni_redirect_url`: Google, TripAdvisor…).
- **< 4 stelle** → resta privata e il titolare riceve un'email.
- Lo stesso link non si riusa (410): senza, ogni riapertura manda un'altra email.

⚠️ **Non scriviamo mai un voto da nessuna parte**: il pulsante porta al profilo
vero. Un «4,8 su Google» digitato a mano è vero il giorno che lo scrivi e falso
il mese dopo — era il dubbio di Francesco, ed era già risolto in partenza.

## I cinque difetti chiusi il 02/09/2026

1. 🔒 **`recensioni/genera-link` non verificava niente**: bastava un account
   qualsiasi per generare una recensione sulla scheda di un'**altra azienda**, e
   quella sarebbe comparsa sul suo sito. Stessa classe di
   [[reference_entita_dal_corpo]]. Ora passa da `entitaDellaAzienda`.
2. 🔒 **L'URL del redirect non era validato**, e il browser ci va **da solo**:
   un `javascript:` salvato nel pannello sarebbe diventato codice eseguito nel
   browser di un ospite. Ora `lib/url-esterno.js` — solo http/https, e `URL`
   normalizza da sola i travestimenti («jAvAsCrIpT:», spazi, caratteri strani).
3. **Le tabelle morte**, terza volta in due giorni: la route leggeva da
   `properties/ristoranti/attivita`, e per un'entità creata dopo la migration 079
   la pagina usciva senza nome, senza logo e **senza il link a Google** — cioè
   senza la cosa per cui esiste. Cercata tutta la categoria: altri due punti
   nella **newsletter** (invio vero + email di prova), che usciva firmata da
   nessuno. Vedi [[reference_entita_unificata]].
4. **6 route con la guardia su `azienda_id`** (8 punti): da super_admin
   Recensioni e Webhook erano spenti — [[reference_super_admin_senza_azienda]].
5. **La pagina restava vuota** — solo il titolo — per chi ha **una sola entità**:
   il selettore spariva senza sceglierla, e tutto dipendeva da quella scelta.
   Cioè quasi tutti i clienti.

Sonda: `tests/probe-recensioni.mjs`, sugli **indirizzi veri**
(`/api/guest/recensione/<token>`) e su un ambiente che si crea da sé — vedi
[[feedback_sonde_non_scrivono_a_persone]].
