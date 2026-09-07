-- «Non prendiamo più prenotazioni».
--
-- Il caso vero: il titolare chiama e dice che è al completo, ma il sistema
-- conta 27 posti su 60 — perché le prenotazioni arrivate al telefono non sono
-- state segnate tutte, o perché ha deciso lui di fermarsi prima.
--
-- Finora l'unico modo era abbassare i posti totali fino a farli combaciare, che
-- è un trucco: falsa un dato per ottenere un comportamento. E spegnere l'evento
-- non va bene quando c'è una campagna a pagamento che manda su quella pagina —
-- chi clicca troverebbe il vuoto, e quel clic è stato pagato.
--
-- Qui il titolare lo dice, e basta. La pagina resta viva, racconta l'evento, e
-- al posto del modulo mostra che è al completo — con le parole che sceglie lui,
-- perché «siamo al completo» e «scrivici, teniamo una lista d'attesa» portano a
-- due cose molto diverse.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS prenotazioni_chiuse boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prenotazioni_chiuse_testo text;

COMMENT ON COLUMN public.eventi.prenotazioni_chiuse IS
  'Il titolare ha chiuso le prenotazioni a mano. La pagina resta pubblica: cambia solo che non si può più prenotare.';
COMMENT ON COLUMN public.eventi.prenotazioni_chiuse_testo IS
  'Cosa leggerà chi arriva. Se vuoto, un testo predefinito.';

-- 🔒 Le due colonne servono alla pagina pubblica dell'evento, che risponde a chi
-- non ha fatto login: si concedono una per una, perché la RLS filtra le righe e
-- non le colonne.
GRANT SELECT (prenotazioni_chiuse) ON public.eventi TO anon;
GRANT SELECT (prenotazioni_chiuse_testo) ON public.eventi TO anon;
