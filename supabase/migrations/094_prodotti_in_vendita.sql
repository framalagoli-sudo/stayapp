-- Un prodotto del catalogo si può mettere in vendita.
--
-- Terzo e ultimo strato del modello (vedi `CATALOGO.md`): la cosa vive nei
-- **Prodotti**, e sopra ci vanno *in offerta* e *in vendita*. Finora lo shop
-- aveva un catalogo suo, la tabella `prodotti` — le stesse colonne di
-- `vetrina_elementi` scritte una seconda volta, e il cliente doveva chiedersi
-- ogni volta dove caricare la sua roba.
--
-- Non si migra niente: `prodotti` ha **zero righe**, misurate. Da qui in avanti
-- lo shop legge anche dal catalogo, e la vecchia tabella resta per i clienti
-- che un giorno l'avessero usata.

ALTER TABLE public.vetrina_elementi
  ADD COLUMN IF NOT EXISTS in_vendita     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prezzo_vendita numeric(10,2),
  ADD COLUMN IF NOT EXISTS stock          integer;

-- `prezzo_vendita` è distinto da `valore_primario` di proposito: quello è il
-- «prezzo da» che il catalogo mostra come richiamo, questo è la cifra che si
-- addebita davvero. Confonderli significa incassare un numero che il cliente
-- non ha mai accettato.
COMMENT ON COLUMN public.vetrina_elementi.prezzo_vendita IS
  'Quanto si paga davvero comprandolo. Distinto dal «prezzo da» del catalogo.';
COMMENT ON COLUMN public.vetrina_elementi.stock IS
  'Quanti pezzi restano. Null = senza limite.';

-- Solo chi ha una sessione. Le pagine pubbliche passano dalle route, che
-- elencano le colonne una per una: una colonna nuova non finisce online da sola.
GRANT SELECT (in_vendita, prezzo_vendita, stock) ON public.vetrina_elementi TO authenticated;

-- regola-ok: nessuna tabella nuova, tre colonne su una tabella che ha gia permessi e RLS
