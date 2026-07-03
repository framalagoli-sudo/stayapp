// Schema blocchi + regole condivise per i prompt AI del site builder.
// Usato da /api/ai/generate-site (genera da risposte) e /api/ai/from-document
// (converte un documento del cliente nei nostri blocchi). Un'unica fonte di verità:
// se cambia lo schema dei blocchi, si aggiorna qui e vale per entrambi.

export const AI_BLOCKS_SCHEMA = `BLOCCHI DISPONIBILI — usa SOLO questi tipi (rispetta ESATTAMENTE i nomi dei campi):
• hero_slider: { height("full"), slides:[{ image_query, title, subtitle, cta1_text, cta1_url("") }] }  ← PREFERISCILO all'hero come primo blocco
• hero: { title, tagline, cta1_text, cta1_url(""), image_query, height("large"|"full") }
• about: { title, text }
• foto_testo: { title, text, image_query, inverti(bool), button_label(""), button_url("") }
• carosello: { titolo, items:[{ image_query, title, text }] }
• colonne: { titolo, columns(2|3), items:[{ title, text }] }
• paragrafi: { titolo, items:[{icon,title,text}] }
• highlights: { titolo, items:[{icon,text}] }
• stats: { titolo, items:[{value,label}] }
• steps: { titolo, items:[{icon,title,text}] }
• accordion: { titolo, items:[{title,text}] }
• faq: { titolo, items:[{question,answer}] }
• testimonianze: { titolo, items:[{author,role,text,stars(5)}] }
• pacchetti: { titolo, items:[{name,tagline,price,price_label,badge}] }
• team: { titolo, items:[{nome,ruolo,bio}] }
• cta_banner: { title, subtitle, button_text, button_url(""), variant("center"|"split") }
• countdown: { titolo, sottotitolo, target("YYYY-MM-DDTHH:MM") }  ← solo eventi con una data
• menu: { titolo }  ← SOLO ristoranti
• divisore: { variant("wave"|"diagonal"), color("muted"|"primary") }  ← separatore decorativo tra sezioni
• newsletter: { title, subtitle }
• form_builder: { form_token(""), titolo_sezione("Contattaci") }
• gallery (auto): data:{} · services (auto): data:{}`

export const AI_IMAGE_RULE = `IMMAGINI: per ogni campo "image_query" scrivi 2-5 parole in INGLESE che descrivono la foto ideale per QUESTO business (es. "cozy italian restaurant interior", "modern dental studio"). NON inventare URL: verranno risolte automaticamente.`

export const AI_BG_RULE = `SFONDI DI SEZIONE (ritmo premium): puoi aggiungere a un blocco "style":{"bg":"dark"} o "style":{"bg":"gradient"} o "style":{"bg":"light"}. La maggior parte delle sezioni resta chiara; usa 1-2 sezioni scure/gradiente (tipicamente stats o una cta_banner) per dare ritmo. Non esagerare.`

export const AI_ICONS = `Icone Lucide valide per "icon": star, check, check-circle, heart, home, phone, mail, users, zap, shield, award, clock, map-pin, coffee, utensils, sparkles, leaf, sun, briefcase, wrench, euro, handshake, smile, target, trending-up, calendar, globe, camera, music, activity, book, layers, tag`
