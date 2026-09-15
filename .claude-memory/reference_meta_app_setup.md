---
name: reference_meta_app_setup
description: "Com'è stata creata l'app Meta di OltreNova il 15/09/2026, dove stanno le cose nella dashboard e le trappole trovate facendolo"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-15T16:00:48.919Z
---

**App Meta «OltreNova» creata il 15/09/2026**, App ID `28469155976047675` (non segreto), collegata al portafoglio business OltreNova. Guida viva: https://claude.ai/artifact/NvjsW4esEj2QHFpmB72mvM

## Scelte fatte
- **Caso d'uso: SOLO «Connettiti con i clienti tramite WhatsApp».** I casi d'uso si aggiungono dopo ma **non si tolgono**. Verificato a schermo che con WhatsApp restano selezionabili Pagina, Instagram e Messenger → **un'app sola basta** per le fasi successive. Facebook Login (consumer) diventa grigio: non serve, ci serve Login for Business.
- **oEmbed di Instagram NON scelto**: un post alla volta + script di Instagram sui siti dei clienti (banner cookie da rivedere). Proposto invece un blocco «Instagram» col feed dell'account collegato (fase 3).
- Impostazioni di base: domini `oltrenova.com`, piattaforma Sito web `https://www.oltrenova.com/`, `/privacy`, `/termini`, `/cancellazione-dati` (pagina creata e pubblicata il 15/09 apposta).
- «Istruzioni per il test» lasciate VUOTE: si scrivono all'App Review, con account di prova, quando il flusso esiste.

## ⚠️ Trappole trovate facendolo
- **La pagina Impostazioni → Di base salva UN CAMPO ALLA VOLTA**: tutti insieme il salvataggio fallisce senza messaggio chiaro. Francesco si è arrabbiato prima di scoprirlo.
- **La verifica aziendale NON è nella dashboard dell'app** (la doc per sviluppatori dice Settings → Basic → Verification, ma nella dashboard attuale non c'è): è in **business.facebook.com → Impostazioni → Centro sicurezza → Avvia la verifica**. Io l'avevo indicata nel posto sbagliato due volte.
- La verifica dell'accesso («Diventa un Tech Provider») si può avviare **solo dopo** la verifica aziendale; decisione in ~5 giorni.
- Nella dashboard ci sono campi precompilati con `https://www.facebook.com/` (condizioni d'uso, eliminazione dati): vanno sostituiti.
- Le pagine d'aiuto `facebook.com/business/help/...` NON si leggono con WebFetch (solo titolo): usare `developers.facebook.com` o guide di BSP (Wati, Superchat, Gupshup).

## Stato
- **Verifica aziendale inviata il 15/09** con il **certificato di attribuzione della partita IVA** (Francesco è consulente in regime forfettario: **niente visura**). Nome legale = **Francesco Malagoli** (non «OltreNova»). Risposta: da minuti a 14 giorni lavorativi. Piano B se rifiutata: bolletta intestata.
- **Chiavi NON su Vercel di proposito**: con `META_APP_ID`+`META_APP_SECRET` presenti, il pannello di tutti i clienti mostra «Collega WhatsApp», che oggi è un `alert()` segnaposto.
- **Token client incollato in chat il 15/09**: rigenerarlo prima della produzione.
- In «Avanzate» consigliato: riautorizzazione 2FA sì, accesso API alle impostazioni no, email notifica info@oltrenova.com; «Richiedi chiave segreta» (appsecret_proof) solo DOPO che il codice firma le chiamate.
- Incoerenza da risolvere con Francesco: email privacy `oltrenova@gmail.com` (informativa), `info@oltrenova.com` (app), `fra.malagoli@gmail.com` (campo DPO).

Vedi [[project_whatsapp_fase0]], [[reference_meta_blocco_dispositivo]].
