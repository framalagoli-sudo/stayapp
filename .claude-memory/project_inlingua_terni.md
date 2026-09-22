---
name: project_inlingua_terni
description: "Restyling di inlingua Terni da brief PDF + riferimento inlinguaverona.it — home rifatta il 22/09/2026, cosa resta da fare e i 3 difetti di piattaforma che ha fatto emergere"
metadata: 
  node_type: memory
  type: project
  originSessionId: e263e4b1-058b-42a5-9135-875e7c667ea8
  modified: 2026-09-22T10:14:39.312Z
---

**Il materiale** sta in `C:\Francesco Malagoli\Clienti\Inlingua\`: `brief_inlingua_terni.pdf`
(documento operativo, ottimo: mappa blocco per blocco, priorità delle fonti,
discrepanze dichiarate), il docx dei testi ufficiali del cliente e il pptx con
la progettualità. Riferimento visivo: **inlinguaverona.it**.

**Le regole che il brief impone** e che ho seguito: testi del docx **verbatim**;
niente numeri o nomi non presenti nelle fonti; in caso di conflitto vince il
docx (55+ anni, bambini **dai 3 anni**, elenco aziende del docx: AST, Alcantara,
Camera di Commercio dell'Umbria, Faurecia, Garofoli, Takeda); Verona solo come
registro, mai testi copiati.

## Fatto il 22/09/2026 (solo la HOME)

- **Registro visivo**: turchese + quasi-nero su bianco, Sora/Inter, angoli meno
  tondi. ⚠️ Il turchese di Verona (`#00b5b4`) come **testo** su bianco fa 2,54:
  il primario è `#00807f` (4,78) e il brillante resta come **accento**.
- **Home**: H1 «Corsi di lingua a Terni» (via «insieme a Roberta»), Chi siamo e
  Il network inlingua verbatim, numeri (55+ · 350+ · 40+ · 1968), «Un corso per
  ogni persona», metodo diretto, perché ci scelgono, **certificazioni per
  lingua**, online learning, «Iniziamo oggi». Eventi spostati in fondo.
- **Scheda entità**: contatti ufficiali (Via Cesare Battisti 7 · 0744 401560 ·
  WhatsApp 338 281 7713 · terni@inlingua.it · orari) — nella pagina «Contatti»
  erano già giusti, era il record a essere rimasto indietro.
- **SEO**: title/description del brief su entità e home.
- Versione precedente ripristinabile: snapshot `fb85573d-89ff-4c71-9af6-a234143600d1`.

## Secondo giro (22/09): tutte le pagine allineate

53 blocchi riscritti sulle 11 pagine interne, nel registro nuovo e con i fatti
delle fonti (metodo diretto, network dal 1968, 55+ anni, dai 3 anni, le aziende
clienti, le certificazioni lingua per lingua, Virtual Classroom/my.conversations/my.lab).
SEO per pagina: titoli entro 60 caratteri, descrizioni entro 145, **tutti unici**,
H1 con «Terni» su ogni pagina, canonical coerenti, 1100+ parole a pagina.

⛔ **Le CTA delle pagine interne non avevano URL**: i pulsanti non comparivano
affatto. Ora ognuna ha la sua — test di livello gratuito quasi ovunque, WhatsApp
su Contatti (dove mandare al test sarebbe stato un giro a vuoto).

## Resta da fare

- **Foto vere della scuola e dello staff**: non ce ne sono né in galleria né
  nella cartella del cliente. Oggi sono Unsplash, e le slide stesse dicono che
  servirebbero quelle vere.
- Payoff «Parla. Connetti. Cresci.» in chiusura, e versione EN (non richiesta).

## Tre difetti di piattaforma emersi facendo questo lavoro

1. ⛔ **Un pulsante sullo slider mandava la pagina in 500**: `HeroSlider` e
   `Carousel` sono definiti fuori dal renderer e usavano `siteHref`, che vive
   dentro. Mai emerso perché ogni slider aveva il link vuoto — il ramo non
   veniva eseguito. Vedi [[reference_identificatore_fuori_scope]].
2. ⛔ **`<p>` nei campi rich-text finisce stampato a schermo**: `lib/testo-ricco.js`
   riaccende solo b/strong/i/em/u/s/br/small/sup/sub/mark. I paragrafi si
   separano con una **riga vuota** e `RichText` li trasforma in `<p>` da solo.
   Il titolo di `about` è `title`, non `titolo`.
3. ⛔ **I grigi chiari erano sotto il minimo leggibile** (`#888888` = 3,54 su
   bianco) e `readableOn` aveva soglia fissa 3, quella del testo grande: i link
   del banner cookie passavano a 3,57. Corretti entrambi, per tutti i clienti.

Vedi [[reference_registro_visivo_siti]], [[reference_sonda_misura_sbagliata]].
