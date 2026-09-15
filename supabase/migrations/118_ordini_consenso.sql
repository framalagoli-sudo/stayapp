-- Chi compra nello shop lascia nome, email, telefono e indirizzo: serve la prova
-- del consenso.
--
-- Il modulo d'ordine dello shop non chiedeva NIENTE. Non se n'era accorto
-- nessuno perché nessun sito lo mostrava: il catalogo esisteva ma non era
-- collegato a nessun blocco. Il 15/09/2026, prima di mettere lo shop sui siti,
-- lo si porta alla stessa regola di eventi (084), escursioni e richieste (090):
-- si salva **quando** è stato dato e **quale formula** è stata letta, non un
-- booleano. Se domani il testo cambia, gli ordini vecchi restano ricostruibili.
--
-- Il controllo vero sta nella ROUTE (400 se manca): una spunta nel browser si
-- toglie con due clic.

ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS privacy_accettata    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_accettata_il timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_testo        text;

-- Gli ordini non si leggono senza sessione: nessun GRANT al ruolo pubblico.
GRANT SELECT (privacy_accettata, privacy_accettata_il, privacy_testo)
  ON public.ordini TO authenticated;

COMMENT ON COLUMN public.ordini.privacy_testo IS
  'La formula esatta accettata da chi ha ordinato. Serve a ricostruire il consenso anche dopo che il testo è cambiato.';
