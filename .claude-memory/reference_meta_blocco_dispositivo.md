---
name: reference_meta_blocco_dispositivo
description: Meta blocca le modifiche con "dispositivo che non usi abitualmente" anche sul PC di sempre — cosa lo causa e come si sblocca
metadata:
  type: reference
---

**Situazione bloccante dal 22/08/2026**: Francesco non riesce ad accedere a `developers.facebook.com` per creare l'app Meta. Il codice di conferma arriva via email, ma dopo averlo inserito Meta risponde:

> *"Il motivo è che abbiamo notato che stai usando un dispositivo che non usi abitualmente e dobbiamo proteggere il tuo account. Ti consentiremo di apportare questa modifica dopo che avrai usato questo dispositivo per un po' di tempo."*

È il **blocco antifrode di Meta**, e scatta anche sul PC usato da sempre: guarda cookie e impronta del browser, non l'anzianità reale dell'uso. Lo fanno scattare cookie cancellati, IP cambiato, VPN, browser aggiornato, modalità anonima.

**Cosa funziona, in ordine:**
1. **Farlo dall'app Facebook sul telefono**, se loggata da tempo: è il dispositivo più fidato per Meta, e passa dove il PC viene rifiutato.
2. Sul PC: **usare Facebook normalmente per qualche giorno** restando loggati, senza cancellare cookie né usare VPN o finestre anonime. La fiducia si accumula. ⚠️ **Non insistere**: ogni tentativo fallito peggiora il punteggio del dispositivo.
3. Controllare che non ci siano **VPN o DNS particolari** attivi: se l'IP visto da Meta cambia di continuo, il blocco continuerà a scattare.

**Via laterale spesso risolutiva**: l'app Meta **non deve essere creata dall'account di Francesco**. Chiunque abbia un account Facebook normale e anziano può crearla e aggiungerlo come amministratore; da quel momento la gestisce lui. Meta pesa l'anzianità e l'abitudine dell'account, non chi paga.

**Piano B se il blocco dura**: passare a un intermediario **a consumo** (Twilio: nessun canone, ~0,005 $/messaggio sopra le tariffe Meta) invece che a canone (360dialog: 49 €/mese per numero, o 250 €/mese per il programma partner — insostenibile per un posizionamento SMB sotto i 100 €/mese). ⚠️ L'intermediario toglie solo la parte da **Tech Provider** (App Review, permessi): l'account Meta Business del cliente serve comunque. Il nostro codice regge il cambio perché Meta è isolata in `lib/whatsapp.js`: si riscrive quel file, non il modulo.

Vedi [[project_whatsapp_fase0]] e `WHATSAPP.md`.
