---
name: reference_colonne_non_righe
description: La RLS filtra le righe, non le colonne — una tabella leggibile a ragione consegna l'intera riga a chiunque abbia la chiave anon; servono i GRANT per colonna
metadata:
  type: reference
---

**Il difetto** (25/08/2026, migration 082): dopo aver tolto `wifi_password` dalle select
delle pagine pubbliche, il dato usciva ancora — da un'altra porta. Un estraneo con la
**chiave anon** (che sta nel bundle di ogni pagina e chiunque può copiare) poteva chiedere
a Supabase `select slug, wifi_password from entita` e riceverla in chiaro. Insieme usciva
`privacy_data`, che contiene il **codice fiscale dei titolari**.

**Perché la RLS non bastava**: la politica su `entita` lascia leggere le entità attive —
ed è giusto, servono alle pagine pubbliche — ma **la RLS filtra le righe, non le colonne**:
con la riga partiva tutto.

**Lo strumento giusto sono i GRANT per colonna:**
```sql
REVOKE SELECT ON public.entita FROM anon;
GRANT SELECT (id, slug, name, ...) ON public.entita TO anon;
```
Da allora **ogni colonna nuova su `entita` nasce invisibile al ruolo pubblico** e va
concessa a mano se serve. È l'opposto di prima, dove una colonna nuova diventava pubblica
da sola.

⚠️ **Vale per ogni tabella leggibile senza sessione**, non solo `entita`. Aggiungendo una
colonna con dati riservati a una di quelle tabelle, la migration deve anche NON concederla.

Sonda: `tests/probe-rls-secondo-muro.mjs` — verifica sia le tabelle sia le colonne, e gira
a ogni deploy. Vedi anche [[reference_dato_riservato_a_monte]] (la difesa a monte) e
[[project_sicurezza_continua]].
