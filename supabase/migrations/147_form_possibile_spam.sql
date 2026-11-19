-- 147 — Le risposte ai moduli sospette si SALVANO, marcate, invece di sparire.
--
-- Fino al 19/11/2026 il filtro anti-spam del modulo dei siti rispondeva «ok» e
-- buttava la richiesta quando un campo conteneva lettere cirilliche, cinesi o
-- arabe, la parola «casino» o due link: un ospite straniero, o un italiano che
-- scrive «che casino», spariva senza traccia. Ora la risposta si salva sempre;
-- se ha i segni dello spam si marca, e nel pannello sta sotto «Possibile spam»,
-- dove il titolare decide (lib/spam-moduli.js).
--
-- Colonne nuove su una tabella che esiste già: valgono i GRANT e la RLS della
-- tabella. Nessuna concessione al ruolo pubblico (le risposte non escono mai).

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS possibile_spam boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spam_motivo text;

ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS form_submissions_spam_motivo_lunghezza;
ALTER TABLE public.form_submissions
  ADD CONSTRAINT form_submissions_spam_motivo_lunghezza CHECK (spam_motivo IS NULL OR length(spam_motivo) <= 200);

COMMENT ON COLUMN public.form_submissions.possibile_spam IS
  'Vero = ha i segni dello spam (lib/spam-moduli.js) o il titolare l''ha segnata. Si salva comunque: decide una persona.';
COMMENT ON COLUMN public.form_submissions.spam_motivo IS
  'Perché è sospetta, in parole (es. «due o più link»), o «segnata dal titolare».';

CREATE INDEX IF NOT EXISTS form_submissions_form_spam_idx
  ON public.form_submissions (form_id, possibile_spam, created_at DESC);

-- Verifica: SELECT column_name FROM information_schema.columns
--           WHERE table_name = 'form_submissions' AND column_name IN ('possibile_spam','spam_motivo');
