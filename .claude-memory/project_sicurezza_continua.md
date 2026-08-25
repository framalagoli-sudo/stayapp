---
name: project_sicurezza_continua
description: La sicurezza da fotografia a controllo continuo — 3 sonde a ogni deploy; chiusi 3 difetti veri il 25/08 (signup rotto, WiFi via chiave anon, chiave backup distruttiva)
metadata:
  type: project
---

**Il fatto che ha cambiato l'impostazione** (25/08/2026): il Punto A del check sicurezza
era stato dichiarato chiuso il 24, e il 25 ho trovato la password WiFi di un cliente vero
esposta. Non era un difetto di autorizzazione — nessuna delle otto classi lo copriva.
**Il catalogo delle classi non è chiuso**, quindi un check una tantum non basta: vale
finché nessuno tocca il codice.

**Il rimedio strutturale**: `deploy.ps1` lancia tre sonde a **ogni deploy**, dopo gli smoke.
- `probe-security-sweep` — 204 route con nessun token / token di un'altra azienda
- `probe-rls-secondo-muro` — cosa legge un estraneo con la chiave pubblica, **tabelle E colonne**
- `probe-colonne-pubbliche` — quali colonne escono dalle route senza login, con **elenco
  atteso fissato**: una colonna aggiunta domani fa scattare la segnalazione da sola

⚠️ La sweep aveva 7 segnalazioni permanenti (route pubbliche per costruzione). Guardate una
per una e dichiarate legittime nell'allowlist: **un allarme che suona sempre viene ignorato,
ed è peggio che non averlo.**

**I tre difetti chiusi quel giorno:**
1. `/api/auth/signup` non poteva riuscire ([[reference_signup_trigger_profili]])
2. `wifi_password` e `privacy_data` (codice fiscale dei titolari) leggibili da **chiunque**
   con la chiave anon → migration 082, permessi per colonna
   ([[reference_colonne_non_righe]])
3. la chiave R2 che scrive i backup poteva anche cancellarli
   ([[reference_backup_e_ripristino]])

**Cosa ho detto a Francesco, e va ripetuto**: «invulnerabili» non esiste — Cloudflare,
GitHub, Okta sono stati bucati tutti. I grandi sono organizzati per **contenere il danno e
rialzarsi**. La domanda giusta non è «possiamo essere invulnerabili» ma «quanto perdiamo e
in quanto tempo torniamo online». Sulla sua domanda se serva un umano: non al posto mio per
questo lavoro, ma **un pentest esterno quando ci saranno clienti paganti** sì — perché chi
scrive il sistema ha punti ciechi strutturali.
