-- Il telefono nel modulo di prenotazione: lo decide chi organizza l'evento.
--
-- Chiesto da Francesco il 21/09/2026. Per una cena si richiama, per un webinar
-- il numero non serve: non è una regola della piattaforma, è una scelta di chi
-- fa l'evento. Il campo c'era già ma era sempre facoltativo, e non esisteva
-- nessun posto dove dire il contrario.
--
-- Predefinito `false`: gli eventi che esistono continuano a comportarsi
-- esattamente come oggi, nessun modulo diventa più severo da solo.
--
-- ⚠️ Il controllo vero sta nella route `/api/guest/eventi/[id]/book`: una
-- validazione nel browser si toglie con due clic.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS telefono_obbligatorio boolean NOT NULL DEFAULT false;

-- La colonna esce dalle route pubbliche dell'evento: senza il permesso, il
-- modulo non saprebbe che il telefono va chiesto.
GRANT SELECT (telefono_obbligatorio) ON public.eventi TO anon;
GRANT SELECT (telefono_obbligatorio) ON public.eventi TO authenticated;
GRANT UPDATE (telefono_obbligatorio) ON public.eventi TO authenticated;
GRANT SELECT (telefono_obbligatorio), UPDATE (telefono_obbligatorio), INSERT (telefono_obbligatorio)
  ON public.eventi TO service_role;
