import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Link2, List, ListOrdered, Quote, Heading2, Heading3, Minus } from 'lucide-react'

const BTN = {
  background: 'none', border: '1px solid #e0e0e0', borderRadius: 6,
  padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  fontSize: 13, color: '#444',
}
const BTN_ACTIVE = { ...BTN, background: '#1a1a2e', color: '#fff', borderColor: '#1a1a2e' }

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button type="button" onClick={onClick} title={title} style={active ? BTN_ACTIVE : BTN}>
      {children}
    </button>
  )
}

export default function RichTextEditor({ content, onChange, placeholder = 'Scrivi il contenuto dell\'articolo…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

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
        <ToolbarButton onClick={() => tb.chain().focus().toggleBlockquote().run()} active={tb.isActive('blockquote')} title="Citazione">
          <Quote size={sz} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton onClick={() => tb.chain().focus().setHorizontalRule().run()} active={false} title="Separatore">
          <Minus size={sz} strokeWidth={2} />
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
