-- Il secondo fattore diventa la condizione predefinita: ogni azienda creata da qui
-- in avanti nasce con require_2fa attivo, da qualunque percorso (signup pubblico,
-- registrazione, creazione da super_admin). Il default sta sulla colonna e non nel
-- codice proprio perché i percorsi di creazione sono tre e nessuno deve poterlo
-- dimenticare.
ALTER TABLE public.aziende ALTER COLUMN require_2fa SET DEFAULT true;

-- NOTA: le aziende GIÀ esistenti non vengono toccate da questa migration.
-- Attivarlo su di loro significa che al primo accesso successivo i loro utenti
-- vengono mandati a registrare l'app di autenticazione prima di poter lavorare:
-- è una decisione con impatto sui clienti, si esegue a parte e consapevolmente.
