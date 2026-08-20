-- Il form pubblico può chiedere il consenso a ricevere messaggi WhatsApp.
-- È il canale che raccoglie consensi solidi mentre il cliente non fa nulla:
-- chi compila un form e spunta la casella è una persona che ha chiesto lei di
-- essere contattata — l'opposto di una rubrica importata.
ALTER TABLE public.form_builder ADD COLUMN IF NOT EXISTS whatsapp_optin boolean DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_builder TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_builder TO service_role;
GRANT SELECT ON public.form_builder TO anon;
