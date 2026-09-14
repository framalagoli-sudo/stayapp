---
name: project_session_2026_09_14
description: "Sessione 14/09: un sito un indirizzo (307 + QR sul dominio del cliente), il campo foto unico con i 4 MB misurati, e la forma delle immagini che sceglie il cliente"
metadata: 
  node_type: memory
  type: project
  originSessionId: 98e39a37-374d-43a6-a1bf-16225619363f
  modified: 2026-09-14T20:01:48.999Z
---

# 14/09/2026 — l'indirizzo giusto, e le foto che il cliente governa

Sette deploy, tutti verdi e verificati dal vivo. Migration eseguite: fino alla **116**.

## 1. Un sito, un indirizzo
Richiesta di Francesco: *«se c'è dominio configurato l'app deve essere su sito del cliente assolutamente»*. Fatto: dal nostro percorso e dal sottodominio si va sul dominio del cliente con un **307**, query preservata (quindi `?qr=1` e i token di anteprima sopravvivono), e anche il **QR si incide sul suo dominio**. Dettaglio e i quattro vincoli in [[reference_un_sito_un_indirizzo]].

Trovati verificando: sitemap ed email dichiaravano indirizzi che contraddicevano il canonical.

## 2. Il campo foto unico
Erano **19 file** con un caricatore proprio, **27 campi immagine**, di cui uno solo con Unsplash e due col punto focale. Nato `components/admin/CampoImmagine.jsx`. Dettaglio in [[reference_caricamento_foto]].

Il numero che conta: **4 MB misurati**, non dedotti — a 4400 KB risponde 413 la piattaforma prima della nostra route. Prima era sbagliato in sette punti e in entrambe le direzioni.

## 3. La forma la sceglie il cliente
Selettore condiviso (`SelettoreFormato`) su evento, Team, Foto+Testo, Carosello, Card paragrafi. **Senza scelta resta il rapporto storico**: i siti online non cambiano faccia.

## Difetti trovati mentre facevo altro
- La foto si poteva solo **incollare come indirizzo** in due blocchi (Team, Card paragrafi): il caricatore c'era, mancava dirglielo.
- **Solo le strutture** non avevano il campo del logo negativo, pur avendo colonna, route e sito — il pattern di [[reference_motore_senza_porta]].
- Uno **smoke fragile** che ha bocciato un deploy sano: a freddo le pagine impiegano ~9s e il timeout era 10s. Il mio redirect aveva aggiunto un secondo avvio a freddo.

## Come ho provato le cose che toccano i siti dei clienti
Pagina temporanea su un'entità di prova, resa pubblica **prima con la scelta e poi togliendo la chiave** — devono tornare i rapporti storici — e poi cancellata. Le due direzioni, non solo quella che volevo vedere.

## Errore mio
[[feedback_vincolo_o_scelta]]: ho presentato come vincolo tecnico («il cerchio è fisso») una scelta di prodotto che spettava a Francesco.
