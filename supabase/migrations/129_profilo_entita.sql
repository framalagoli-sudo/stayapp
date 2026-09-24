-- 129 — La categoria sta sull'ENTITÀ, e decide cosa il titolare trova acceso.
--
-- Deciso da Francesco il 24/09 (STRATEGIA.md §6.1): le funzioni le accendiamo
-- noi, per categoria; il cliente non le sceglie. E la categoria è dell'entità,
-- non dell'azienda: Borgo del Lago ha una partita IVA, una struttura ricettiva
-- e due ristoranti, e ognuno ha bisogno della sua.
--
-- Il profilo si APPLICA COME COPIA (lib/applica-profilo.js): le sue funzioni
-- finiscono negli interruttori dell'entità (`moduli`) e, per le funzioni di
-- livello azienda, in `aziende.funzioni` come unione di quelle delle sue
-- entità. Così il sito pubblico e l'app del QR continuano a leggere quello che
-- leggevano, e modificare un profilo non cambia nessun cliente in silenzio: si
-- riapplica, e lo si fa apposta.
--
-- Colonne nuove su tabelle esistenti: su `entita` il ruolo pubblico (anon) vede
-- solo le colonne elencate dalla migration 082, quindi queste restano invisibili
-- a chi non ha fatto login senza bisogno di altro. Nessuna tabella nuova.

BEGIN;

-- Da quale categoria è nata la configurazione dell'entità, e da quale versione:
-- se il profilo cambia dopo, lo si può sapere (e proporre di riapplicarlo).
ALTER TABLE public.entita
  ADD COLUMN IF NOT EXISTS profilo text
    REFERENCES public.profili_mestiere(chiave) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profilo_versione integer;

-- Le funzioni di livello azienda accese (contatti, eventi, newsletter…).
-- NULL = mai decise: il titolare vede tutto, come prima dei profili. È il valore
-- di tutte le aziende esistenti finché non ricevono una categoria.
ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS funzioni jsonb
    CHECK (funzioni IS NULL OR jsonb_typeof(funzioni) = 'object');

-- Due categorie che mancavano, emerse assegnando i clienti di oggi: i ristoranti
-- senza serate (Borgo del Lago, Fondaco) e chi organizza eventi senza avere un
-- locale (Giochi senza Panciere). Proposte: si cambiano dall'editor.
INSERT INTO public.profili_mestiere (chiave, nome, descrizione, tipo_entita, funzioni_entita, funzioni_azienda, ordine) VALUES
  ('ristorante', 'Ristorante',
   'Ristoranti, trattorie, bar: il menù, le foto, le prenotazioni e le recensioni.',
   'ristorante',
   '{"galleria":true,"menu":true,"offerte":true}',
   '{"contatti":true,"recensioni":true,"eventi":true,"offerte":true,"newsletter":true,"analytics":true}',
   15),
  ('organizzatore_eventi', 'Organizzatore di eventi',
   'Chi organizza eventi, giochi, manifestazioni: iscrizioni, contatti, comunicazione.',
   'attivita',
   '{"galleria":true,"offerte":true}',
   '{"contatti":true,"eventi":true,"form_builder":true,"newsletter":true,"analytics":true}',
   35)
ON CONFLICT (chiave) DO NOTHING;

COMMIT;

-- Verifica: SELECT chiave, nome FROM public.profili_mestiere ORDER BY ordine;  → 8 righe
