-- 023_booking.sql
-- Sistema prenotazioni risorse: slot orari (professionisti, sport, spa)
-- e coperti (ristoranti). Base scalabile per futuri vertical.

-- ─── Risorse prenotabili ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risorse (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id    uuid REFERENCES aziende(id) ON DELETE CASCADE,
  entity_tipo   text NOT NULL,   -- 'struttura' | 'ristorante' | 'attivita'
  entity_id     uuid NOT NULL,
  nome          text NOT NULL,
  descrizione   text,
  modalita      text NOT NULL DEFAULT 'slot', -- 'slot' | 'coperti'

  -- modalita = 'slot'
  durata_minuti int  NOT NULL DEFAULT 60,
  quantita      int  NOT NULL DEFAULT 1,  -- risorse identiche in parallelo (es. 3 campi)

  -- modalita = 'coperti'
  max_coperti   int,

  -- pricing
  prezzo        numeric NOT NULL DEFAULT 0,
  valuta        text    NOT NULL DEFAULT 'EUR',

  -- display
  colore        text    NOT NULL DEFAULT '#00b5b5',

  -- disponibilita
  -- slot:    { "lun": [{"start":"09:00","end":"20:00"}], "mar": [], ... }
  -- coperti: { "servizi": [{"nome":"Pranzo","orari":["12:00","12:30"]}, ...],
  --            "giorni_chiusura": [0] }   0=dom, 1=lun, ... 6=sab (JS getDay)
  disponibilita jsonb NOT NULL DEFAULT '{}',

  -- blocchi puntuali o a range: [{"data":"2026-08-15","motivo":"Ferragosto"},
  --                               {"data_inizio":"2026-08-01","data_fine":"2026-08-14","motivo":"Ferie"}]
  blocchi       jsonb NOT NULL DEFAULT '[]',

  -- regole prenotazione
  anticipo_ore        int     NOT NULL DEFAULT 1,   -- minimo anticipo
  cancellazione_ore   int     NOT NULL DEFAULT 24,  -- entro cui si può cancellare
  conferma_auto       boolean NOT NULL DEFAULT true,

  attiva        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Promozioni su slot (marketing hook) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS risorse_promozioni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risorsa_id  uuid NOT NULL REFERENCES risorse(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descrizione text,

  -- finestra temporale (null = senza limite)
  data_inizio date,
  data_fine   date,
  ora_inizio  time,   -- null = tutto il giorno
  ora_fine    time,

  -- null = tutti i giorni; 0=dom,1=lun,...,6=sab (JS convention)
  giorni_settimana int[],

  prezzo_speciale numeric NOT NULL,
  badge_label     text    NOT NULL DEFAULT 'Offerta',
  colore          text    NOT NULL DEFAULT '#e53e3e',
  attiva          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Prenotazioni ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prenotazioni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risorsa_id  uuid NOT NULL REFERENCES risorse(id) ON DELETE RESTRICT,
  azienda_id  uuid REFERENCES aziende(id),

  -- denormalizzato per query senza join costosi
  entity_tipo text,
  entity_id   uuid,

  -- quando — slot
  data        date NOT NULL,
  ora_inizio  time,
  ora_fine    time,

  -- quando — coperti
  servizio    text,   -- 'Pranzo' | 'Cena' | nome custom

  -- chi prenota
  cliente_nome     text NOT NULL,
  cliente_email    text NOT NULL,
  cliente_telefono text,
  n_persone        int  NOT NULL DEFAULT 1,
  note_cliente     text,

  -- gestione interna
  stato        text NOT NULL DEFAULT 'confermata',
  -- confermata | in_attesa | cancellata | completata | no_show
  note_interne text,

  -- pricing al momento della prenotazione (snapshot, non FK dinamica)
  prezzo_unitario  numeric NOT NULL DEFAULT 0,
  importo_totale   numeric NOT NULL DEFAULT 0,
  promozione_id    uuid REFERENCES risorse_promozioni(id) ON DELETE SET NULL,

  -- Stripe (futuro — colonne già presenti per non fare migration dopo)
  pagamento_stato text NOT NULL DEFAULT 'non_richiesto',
  -- non_richiesto | in_attesa | pagato | rimborsato
  pagamento_id    text,

  -- self-service cancellation via link email
  cancellation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  reminder_inviato   boolean NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Indici ───────────────────────────────────────────────────────────────────

-- Cuore dell'algoritmo disponibilità: query per risorsa + data
CREATE INDEX IF NOT EXISTS idx_prenotazioni_risorsa_data
  ON prenotazioni(risorsa_id, data);

CREATE INDEX IF NOT EXISTS idx_prenotazioni_azienda
  ON prenotazioni(azienda_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_prenotazioni_stato
  ON prenotazioni(stato);

-- Cancellazione self-service via token
CREATE INDEX IF NOT EXISTS idx_prenotazioni_token
  ON prenotazioni(cancellation_token);

CREATE INDEX IF NOT EXISTS idx_risorse_entity
  ON risorse(entity_tipo, entity_id);

CREATE INDEX IF NOT EXISTS idx_risorse_azienda
  ON risorse(azienda_id);

CREATE INDEX IF NOT EXISTS idx_risorse_promozioni_risorsa
  ON risorse_promozioni(risorsa_id);
