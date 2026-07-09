---
name: reference_lucide_global_shadow
description: "Icone lucide-react che si chiamano come un global del browser (Image, ecc.) shadowano il costruttore DOM → new Image() crasha"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1ce3b18-eb34-4a91-a99d-4e4300ee6cb8
---

Bug trovato 9/7 in `PostSocialModal.jsx`: `import { Image } from 'lucide-react'` **shadowa `window.Image`**. Dentro l'hook `useRemoteImage` c'era `new Image()` → chiamava `new` sul componente lucide (un `forwardRef` = oggetto, non costruttore) → **`TypeError: Image is not a constructor`** → in produzione "Application error: a client-side exception has occurred".

Trigger: l'hook girava all'**mount** di `PostSocialModal` (renderizzato sempre nell'editor eventi, gli hook stanno prima di `if(!isOpen) return null`), e solo se l'evento aveva una `cover` (src truthy). → aprire un evento con copertina crashava l'editor.

**Fix**: `import { Image as ImageIcon }` + usare `new window.Image()` esplicito (immune a futuri shadowing). Vale per QUALSIASI icona lucide omonima di un global: `Image`, potenzialmente altri. Se serve un costruttore/oggetto globale del browser vicino a un import lucide con lo stesso nome → aliasare l'icona o usare `window.X`.

Diagnosi confermata a freddo con test node: `typeof lucide.Image === 'object'`, `new lucide.Image()` lancia. Vedi [[feedback_diagnosi_prima_del_deploy]].
