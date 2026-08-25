---
name: project_onboarding_mappa
description: Mappa del primo giorno di un cliente + uso reale delle funzioni + benchmark GoHighLevel + roadmap in 3 fasi (25/08/2026)
metadata:
  type: project
---

Documento pubblicato: **https://claude.ai/code/artifact/cda065de-41be-4b5d-aa70-9695ed58713b**

**Uso reale misurato in produzione il 25/08/2026** (righe nel DB): visite ai siti 1438,
invii form 55, contatti CRM 49, pagine 28, richieste 15, domini 14, entità 13, aziende 9.
**A zero**: booking risorse e prenotazioni, recensioni, automazioni, loyalty (programmi,
punti, gift card), shop (prodotti e ordini), WhatsApp (account e campagne), campagne PE,
snapshot sito. → *Vive il sito e ciò che porta contatti; il resto è costruito e fermo.*

**I punti di caduta del primo giorno**: la registrazione era rotta
([[reference_signup_trigger_profili]], corretta e live), `/admin/onboarding` è **404** benché
l'email di benvenuto ci mandi, e il cliente nuovo trova **26 voci di menu tutte a zero** senza
nessuna strada per creare il proprio sito (l'azienda nasce con i moduli spenti e solo il
super_admin può accenderli).

**Dal benchmark GoHighLevel**, le tre cose che ci mancano davvero: **pipeline** sui contatti,
**una casella unica** per chat/WhatsApp/email, **modelli di account pronti** per settore.
Da NON inseguire: SMS, app mobile, white-label (costo alto, fuori target ≤100€/mese —
vedi [[project_positioning_target]]). ⚠️ Il confronto viene dalla mia conoscenza, non da una
verifica sul loro sito: affidabile sull'impianto, le cifre dei piani vanno controllate prima
di usarle in una presentazione.

**Roadmap concordata**: (1) che il primo giorno funzioni — pagina «Inizia qui», moduli accesi
alla nascita, prima entità creata dall'onboarding, decidere di `/signup`; (2) che il pannello
serva ogni giorno — pipeline, casella unica, appuntamenti con una persona; (3) rimandare
consapevolmente le funzioni a zero utilizzi.
