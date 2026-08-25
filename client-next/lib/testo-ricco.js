// Un po' di formattazione nei campi di testo, senza aprire la porta a nulla.
//
// I testi che il cliente scrive nel pannello finiscono in pagina come
// `{testo}`, e React li stampa alla lettera: chi scriveva `<b>offerta</b>` sul
// sito vedeva comparire proprio `<b>offerta</b>`. Serviva poter mettere in
// grassetto una parola e andare a capo.
//
// **Perché non DOMPurify**: gira solo nel browser, e le pagine pubbliche sono
// servite dal server — il contenuto deve stare nell'HTML, o i siti si vedono
// bianchi finché non parte JavaScript (è una regola del progetto, imparata sul
// campo). Qui serve qualcosa che funzioni identico da entrambe le parti.
//
// **Come è sicuro**: non si prova a riconoscere ciò che è pericoloso — si
// escapa **tutto**, e solo dopo si riaccendono i pochi tag ammessi, che sono
// tutti senza attributi. Un `<script>`, un `<img onerror=...>` o un
// `<b onclick=...>` restano testo visibile, perché non c'è nessuna regola che
// li riporti indietro. È l'opposto di una lista di cose vietate, che si
// dimentica sempre qualcosa.

// Solo formattazione del testo. Niente attributi, quindi niente `href`,
// `style` o gestori di eventi: aggiungerne uno richiederebbe di validare anche
// il suo contenuto, ed è un'altra cosa da quella che serve qui.
const AMMESSI = ['b', 'strong', 'i', 'em', 'u', 's', 'br', 'small', 'sup', 'sub']

const RIACCENDI = new RegExp(`&lt;(/?)(${AMMESSI.join('|')})\\s*/?&gt;`, 'gi')

// Restituisce HTML pronto da inserire, con i soli tag ammessi.
export function testoRicco(testo) {
  if (testo === null || testo === undefined) return ''
  return String(testo)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(RIACCENDI, (_, chiusura, tag) => `<${chiusura}${tag.toLowerCase()}>`)
}

// Il testo contiene qualcosa da interpretare? Serve a non pagare un
// `dangerouslySetInnerHTML` quando non c'è niente da formattare.
export function haFormattazione(testo) {
  return typeof testo === 'string' && RIACCENDI.test(testo.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
}

// Da sparpagliare sull'elemento che deve mostrare il testo:
//
//   <p style={...} {...ricco(dati.descrizione)} />
//
// Quando non c'è formattazione restituisce `children`, così il testo resta un
// nodo normale — nessun HTML inserito dove non serve.
export function ricco(testo) {
  if (!haFormattazione(testo)) return { children: testo }
  return { dangerouslySetInnerHTML: { __html: testoRicco(testo) } }
}
