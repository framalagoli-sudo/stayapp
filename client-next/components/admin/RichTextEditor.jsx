'use client'
import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Bold, Italic, Link2, List, ListOrdered, Quote, Heading2, Heading3, Minus, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

const BTN = {
  background: 'none', border: '1px solid #e0e0e0', borderRadius: 6,
  padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  fontSize: 13, color: '#444',
}
const BTN_ACTIVE = { ...BTN, background: '#1a1a2e', color: '#fff', border: '1px solid #1a1a2e' }

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button type="button" onClick={onClick} title={title} style={active ? BTN_ACTIVE : BTN}>
      {children}
    </button>
  )
}

// Un documento scritto sempre nello stesso ordine di chiavi. Il database
// restituisce il JSON con le chiavi riordinate: confrontato così com'è, lo
// stesso identico testo risultava «diverso» da quello dell'editor, veniva
// rimesso dentro, e bastava aprire un blocco per trovarlo «non salvato».
function inOrdine(v) {
  if (Array.isArray(v)) return v.map(inOrdine)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, inOrdine(v[k])]))
  return v
}
const impronta = doc => JSON.stringify(inOrdine(doc))

// format: 'html' (blog, default) | 'json' (blocchi sito → render sicuro via walker).
// minimal: nasconde citazione/separatore per una toolbar essenziale (target SMB).
export default function RichTextEditor({ content, onChange, placeholder = 'Scrivi il contenuto dell\'articolo…', format = 'html', minimal = false }) {
  // Quello che l'editor ha appena detto di contenere. Il testo fa un giro
  // (editor → pagina → di nuovo qui) e mentre si scrive in fretta torna
  // indietro una versione di un istante prima: rimetterla dentro cancellava
  // l'ultima lettera battuta.
  const eco = useRef([])
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto', 'tel'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const v = format === 'json' ? editor.getJSON() : editor.getHTML()
      eco.current = [...eco.current.slice(-40), format === 'json' ? impronta(v) : v]
      onChange(v)
    },
  })

  // Il testo con cui l'editor è nato ce l'ha già dentro: rimetterglielo viene
  // letto come una modifica, e bastava APRIRE un blocco con un testo scritto nel
  // formato di prima per trovarlo «non salvato» e riscritto senza aver toccato niente.
  const allaNascita = useRef(content)
  const giaAllineato = useRef(false)

  // Aggiorna il contenuto quando cambia esternamente (es. caricamento da DB, insert AI)
  // ⚠️ `emitUpdate: false`: un testo arrivato da fuori chi sta sopra ce l'ha già.
  // Rimandarglielo indietro (il predefinito) lo fa passare per una modifica, e —
  // peggio — arriva in ritardo: se nel frattempo il testo è cambiato ancora (si
  // sta scrivendo sulla pagina dell'editor visuale), la versione vecchia gli
  // passa sopra e le ultime lettere spariscono.
  useEffect(() => {
    if (!editor || content === undefined) return
    const primaVolta = !giaAllineato.current
    giaAllineato.current = true
    // Mentre ci si scrive dentro, una versione che l'editor stesso ha appena
    // emesso non è una novità. Fuori dal campo (annulla, inserimento dell'AI)
    // quello che arriva si applica sempre.
    const inArrivo = format === 'json' ? (content && typeof content === 'object' ? impronta(content) : null) : content
    if (inArrivo !== null && editor.isFocused && eco.current.includes(inArrivo)) return
    if (format === 'json') {
      const incoming = inArrivo
      if (incoming === null) {
        // stringa legacy o da AI: imposta solo se non vuota (Tiptap la converte in doc)
        if (primaVolta && content === allaNascita.current) return
        if (typeof content === 'string' && content.trim() !== '') editor.commands.setContent(content, { emitUpdate: false })
      } else if (incoming !== impronta(editor.getJSON())) {
        editor.commands.setContent(content, { emitUpdate: false })
      }
    } else if (editor.getHTML() !== content) {
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  }, [editor, content, format])

  if (!editor) return null

  function setLink() {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL del link:', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const tb = editor
  const sz = 14

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <ToolbarButton onClick={() => tb.chain().focus().toggleBold().run()} active={tb.isActive('bold')} title="Grassetto">
          <Bold size={sz} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton onClick={() => tb.chain().focus().toggleItalic().run()} active={tb.isActive('italic')} title="Corsivo">
          <Italic size={sz} strokeWidth={2} />
        </ToolbarButton>
        <div style={{ width: 1, background: '#e0e0e0', margin: '0 2px' }} />
        <ToolbarButton onClick={() => tb.chain().focus().toggleHeading({ level: 2 }).run()} active={tb.isActive('heading', { level: 2 })} title="Titolo H2">
          <Heading2 size={sz} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton onClick={() => tb.chain().focus().toggleHeading({ level: 3 }).run()} active={tb.isActive('heading', { level: 3 })} title="Titolo H3">
          <Heading3 size={sz} strokeWidth={2} />
        </ToolbarButton>
        <div style={{ width: 1, background: '#e0e0e0', margin: '0 2px' }} />
        <ToolbarButton onClick={() => tb.chain().focus().toggleBulletList().run()} active={tb.isActive('bulletList')} title="Lista puntata">
          <List size={sz} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton onClick={() => tb.chain().focus().toggleOrderedList().run()} active={tb.isActive('orderedList')} title="Lista numerata">
          <ListOrdered size={sz} strokeWidth={2} />
        </ToolbarButton>
        {!minimal && (
          <>
            <ToolbarButton onClick={() => tb.chain().focus().toggleBlockquote().run()} active={tb.isActive('blockquote')} title="Citazione">
              <Quote size={sz} strokeWidth={2} />
            </ToolbarButton>
            <ToolbarButton onClick={() => tb.chain().focus().setHorizontalRule().run()} active={false} title="Separatore">
              <Minus size={sz} strokeWidth={2} />
            </ToolbarButton>
          </>
        )}
        <div style={{ width: 1, background: '#e0e0e0', margin: '0 2px' }} />
        <ToolbarButton onClick={() => tb.chain().focus().setTextAlign('left').run()} active={tb.isActive({ textAlign: 'left' })} title="Allinea a sinistra">
          <AlignLeft size={sz} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton onClick={() => tb.chain().focus().setTextAlign('center').run()} active={tb.isActive({ textAlign: 'center' })} title="Centra">
          <AlignCenter size={sz} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton onClick={() => tb.chain().focus().setTextAlign('right').run()} active={tb.isActive({ textAlign: 'right' })} title="Allinea a destra">
          <AlignRight size={sz} strokeWidth={2} />
        </ToolbarButton>
        <div style={{ width: 1, background: '#e0e0e0', margin: '0 2px' }} />
        <ToolbarButton onClick={setLink} active={tb.isActive('link')} title="Inserisci link">
          <Link2 size={sz} strokeWidth={2} />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <style>{`
        .tiptap { outline: none; min-height: 260px; padding: 16px; font-size: 15px; line-height: 1.7; color: #1a1a2e; }
        .tiptap h2 { font-size: 20px; margin: 20px 0 10px; }
        .tiptap h3 { font-size: 17px; margin: 16px 0 8px; }
        .tiptap p { margin: 0 0 12px; }
        .tiptap ul, .tiptap ol { padding-left: 22px; margin: 0 0 12px; }
        .tiptap li { margin-bottom: 4px; }
        .tiptap blockquote { border-left: 3px solid #1a1a2e; margin: 12px 0; padding: 8px 16px; color: #555; }
        .tiptap hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
        .tiptap a { color: #1a6fc4; text-decoration: underline; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #bbb; pointer-events: none; height: 0; }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  )
}
