-- La tabella eventi è precedente al supporto "attività": il CHECK su entity_tipo
-- ammette solo struttura/ristorante → associare un evento a un'attività fallisce.
-- Allarga il vincolo ad 'attivita' (NULL resta valido = evento aziendale).
-- Il nuovo vincolo è più permissivo → nessuna riga esistente lo viola.

ALTER TABLE public.eventi DROP CONSTRAINT IF EXISTS eventi_entity_tipo_check;
ALTER TABLE public.eventi ADD CONSTRAINT eventi_entity_tipo_check
  CHECK (entity_tipo IS NULL OR entity_tipo IN ('struttura','ristorante','attivita'));
