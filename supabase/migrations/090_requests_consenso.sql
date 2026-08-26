-- Chi prenota un'escursione o un'attività lascia nome e recapito: serve la prova.
--
-- Il difetto trovato provando l'app dal vivo: quel modulo non chiedeva **niente**.
-- Il titolare riceveva «Prenotazione escursione: Degustazione vini — 2 persone»
-- e non poteva richiamare nessuno. Una prenotazione senza un modo per rispondere
-- non è una prenotazione.
--
-- Ora nome e recapito sono obbligatori, e con essi arriva il consenso — le
-- stesse tre colonne degli eventi (migration 084), perché la regola è la stessa
-- ovunque si raccolgano dati di una persona: si salva **quando** è stato dato e
-- **quale formula** è stata letta, non un booleano. Se domani il testo cambia,
-- le raccolte vecchie restano ricostruibili.

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS privacy_accettata    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_accettata_il timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_testo        text;

-- Le richieste non si leggono senza sessione: nessun GRANT al ruolo pubblico.
-- (E dal 26/08 sappiamo che senza REVOKE un GRANT mirato non restringe: qui non
--  se ne concede nessuno, quindi resta come la tabella era.)
GRANT SELECT (privacy_accettata, privacy_accettata_il, privacy_testo)
  ON public.requests TO authenticated;

COMMENT ON COLUMN public.requests.privacy_testo IS
  'La formula esatta accettata da chi ha scritto. Serve a ricostruire il consenso anche dopo che il testo è cambiato.';
