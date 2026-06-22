'use client'
import React from 'react'

// Renderer sicuro per il rich-text dei blocchi sito (Fase 1).
// Input = ProseMirror JSON (da Tiptap, format='json') o stringa legacy.
// Emette SOLO elementi React da una whitelist di nodi/marks → nessun
// dangerouslySetInnerHTML, nessuna superficie XSS. I tipi sconosciuti
// vengono ignorati; gli href dei link sono validati per protocollo.

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']
function safeHref(href) {
  if (!href || typeof href !== 'string') return null
  try {
    const u = new URL(href, 'https://_')
    return SAFE_PROTOCOLS.includes(u.protocol) ? href : null
  } catch { return null }
}

export function isRichDoc(v) {
  return !!v && typeof v === 'object' && v.type === 'doc' && Array.isArray(v.content)
}

export function richIsEmpty(v) {
  if (v == null || v === '') return true
  if (typeof v === 'string') return v.trim() === ''
  if (isRichDoc(v)) return !v.content.some(n => Array.isArray(n.content) && n.content.length)
  return true
}

function applyMarks(text, marks, primary) {
  let node = text
  for (const m of marks || []) {
    if (m.type === 'bold') node = <strong>{node}</strong>
    else if (m.type === 'italic') node = <em>{node}</em>
  }
  const link = (marks || []).find(m => m.type === 'link')
  if (link) {
    const href = safeHref(link.attrs?.href)
    if (href) node = <a href={href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: primary, textDecoration: 'underline' }}>{node}</a>
  }
  return node
}

function renderInline(content, primary) {
  if (!Array.isArray(content)) return null
  return content.map((n, i) => {
    if (n.type === 'hardBreak') return <br key={i} />
    if (n.type === 'text') return <React.Fragment key={i}>{applyMarks(n.text, n.marks, primary)}</React.Fragment>
    return null
  })
}

function renderBlocks(content, primary) {
  if (!Array.isArray(content)) return null
  return content.map((n, i) => {
    switch (n.type) {
      case 'paragraph':
        return <p key={i} style={{ margin: '0 0 1em' }}>{renderInline(n.content, primary)}</p>
      case 'heading': {
        const Tag = n.attrs?.level === 3 ? 'h3' : 'h2'
        return <Tag key={i} style={{ margin: '1.2em 0 0.4em', fontWeight: 700, lineHeight: 1.25 }}>{renderInline(n.content, primary)}</Tag>
      }
      case 'bulletList':
        return <ul key={i} style={{ margin: '0 0 1em', paddingLeft: 22 }}>{renderBlocks(n.content, primary)}</ul>
      case 'orderedList':
        return <ol key={i} style={{ margin: '0 0 1em', paddingLeft: 22 }}>{renderBlocks(n.content, primary)}</ol>
      case 'listItem':
        return <li key={i} style={{ marginBottom: 4 }}>{renderBlocks(n.content, primary)}</li>
      default:
        return null
    }
  })
}

// style: applicato al wrapper; fontSize/color/lineHeight vengono ereditati dai figli.
export function RichText({ value, primary = '#1a6fc4', style }) {
  if (richIsEmpty(value)) return null
  if (typeof value === 'string') {
    return <div style={style}><p style={{ margin: 0, whiteSpace: 'pre-line' }}>{value}</p></div>
  }
  if (!isRichDoc(value)) return null
  return <div style={style}>{renderBlocks(value.content, primary)}</div>
}
