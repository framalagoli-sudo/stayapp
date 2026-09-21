---
name: reference_posti_riservati_eventi
description: "Il canale che non scrive (le prenotazioni al telefono) non si convince: gli si riserva una quota — posti_riservati, migration 126, e l'avviso a soglia senza colonna di stato"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-21T19:00:20.516Z
---

**Il caso** (Garage 22, 21/09/2026). Evento da 60 posti, **sold out nella
realtà**; nel sistema risultavano **29 posti presi**: 12 prenotazioni dal sito e
**una sola** segnata a mano. Una trentina di posti venduti al telefono non sono
mai entrati da nessuna parte, e il sito ha continuato a dire «liberi». La toppa
del titolare è stata «Non accetto più prenotazioni», a mano. Stessa storia su un
secondo evento (60 posti, 10 registrati, chiuso a mano).

⚠️ **Il modulo per segnarle esisteva già** («Prenotazione presa al telefono»,
dice *basta il nome* e mostra i posti liberi). È stato usato **una volta su
trenta**. La radice non è una funzione mancante: chi è in servizio non apre il
gestionale mentre squilla il telefono, e nessuna funzione lo convincerà.

**La regola che ne esce**: quando un canale non scrive nel sistema, ci sono due
strade sole — farlo scrivere (disciplina: non succede) o **togliergli il potere
di vendere ciò che il sistema crede libero**. La seconda non chiede niente a
nessuno, quindi funziona.

## Com'è fatto

`eventi.posti_riservati` (migration 126, default 0 → nessun evento cambia):

    posti vendibili online = seats_total - posti_riservati - prenotazioni

`seats_total` resta la **capienza vera**: il pannello mostra «31 liberi · 0
vendibili online», e chi segna una prenotazione dal pannello può usare i
riservati, perché sono suoi. Il campo sta nell'evento, sotto «Posti
disponibili», e dice in chiaro quanti ne venderà il sito.

⚠️ **`lib/posti-evento.js`**: la formula `seats_total - seats_booked` era scritta
a mano in **undici punti**. Con i riservati le risposte diventano due (pubblico
/ titolare) e undici copie sarebbero undici occasioni di sbagliarne una.
⚠️ **`confermaPostiEvento(id, bookingId, limite)`** prende il limite del canale:
senza, la corsa fra due richieste simultanee verrebbe arbitrata sulla capienza
piena e il sito venderebbe i posti riservati — un difetto che compare una volta
ogni tanto e poi non si riproduce.

## L'avviso a soglia, senza stato

Una mail quando restano **5** posti vendibili online, una quando il sito
esaurisce. Si manda **solo nell'istante in cui la soglia viene attraversata**
(liberi prima > soglia, liberi dopo ≤ soglia): così non serve nessuna colonna
«avviso già inviato», e non ne parte una per ogni prenotazione successiva.
Segue l'interruttore «Avvisami di ogni prenotazione» già esistente.

## Il difetto trovato provando

La lista d'attesa rispondeva *«Ci sono ancora posti: puoi prenotare
direttamente»* a chi il sito aveva appena respinto con «posti esauriti»: nella
**sua** select mancava `posti_riservati`. Il dato non arrivava fino in fondo
(regola 7 di CLAUDE.md). Trovato chiamando la route dal vivo, non rileggendo il
codice — ed è la terza volta che una select esplicita dimenticata costa un giro.

Vedi [[reference_modulo_prenotazione_evento]], [[reference_eventi_notifiche_email]],
[[reference_smoke_corse_parziali]].
