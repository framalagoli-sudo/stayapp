---
name: project_session_2026_09_15
description: "Sessione 15/09/2026 — domini, foto e shop live; Meta sbloccato (app creata, verifica respinta e corretta); costi AI messi sotto tetto con ricarica; decisione API"
metadata: 
  node_type: memory
  type: project
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-15T21:41:51.425Z
---

Giornata lunga, tutto **live e provato in produzione**. Migration eseguite: fino alla **121**.

**Mattina/pomeriggio** (dettaglio in [[todo_prossima_sessione]]): diagnosi domini con gemello manca/altrove/certificato, rete di sicurezza del redirect (sospende dopo 3 fallimenti), QR sul dominio del cliente, un campo foto/una galleria/miniature unificate, formato+punto focale su Team/foto_testo/carosello/paragrafi/blog/copertina/prodotti, **blocco Shop** con consenso e carrello per azienda (migration 117, 118).

**Meta** ([[reference_meta_app_setup]]): app creata, solo caso d'uso WhatsApp, `/cancellazione-dati` pubblicata. Verifica aziendale respinta («ragione sociale non presente sul sito») → piede di oltrenova.com ora «© OltreNova di Francesco Malagoli · P.IVA». **Francesco deve reinviarla.** Visione di Francesco: WhatsApp per i clienti (paga Meta), pubblicazione social dalla piattaforma, feed Instagram sui siti, assistente AI via WhatsApp/voce che aggiorna il sito.

**Costi AI** ([[project_ai_consumi]]) — priorità assoluta di Francesco perché le credenziali erano già ai clienti: 12 chiamate su 13 senza limite vero. Ora `lib/ai-consumi.js`, tetto **5 $/mese per azienda** (confermato), ricarica mensile da Aziende → Credito AI, banner cliente dall'80%, Diagnostica, regola 12. Migration 119 (tabella+RPC), 120 (revoke ai ruoli pubblici — ricaduta dell'invariante 17 di SECURITY.md), 121 (credito extra).

**Decisione API**: OltreNova non è API First e non va rifatta. Piano approvato: operazioni del dominio in `lib/` → assistente AI come primo utilizzatore → `/api/v1` con chiavi solo quando c'è un utilizzatore vero.

**Errori miei della giornata**: commit della migration su main con dentro la cancellazione di `ai-helpers.js` (main non compilava, sistemato subito, prod mai toccata); deploy lanciato due volte con output reindirizzato (`2>&1`/`*>`) che lo ferma → [[feedback_deploy]]; migration 119 senza REVOKE nonostante l'invariante 17 esistesse già.

**Trovato per strada**: `ai/blog-auto` accettava l'entità di un altro cliente; password delle sonde non conformi alla nuova policy di Supabase (31 file, anche global-setup degli smoke).

**Aperto per Francesco**: reinviare verifica Meta · limite di spesa sulla Console Anthropic · email di contatto unica (oltrenova@gmail.com vs info@oltrenova.com) · prezzo della ricarica AI · DNS metodotvb.it e fondaconarni.com · primo acquisto vero con Stripe dal blocco Shop.
