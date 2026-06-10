---
name: project-session-2026-06-10
description: "Fix team PE filtrato per azienda (super_admin), deploy.ps1 include git push"
metadata: 
  node_type: memory
  type: project
  originSessionId: 814df534-7fb3-41f8-b657-a325f7b1931d
---

## Fix team Piano Editoriale per super_admin (2026-06-10) ✅

### Problema
Il tab Team nel piano editoriale mostrava tutti gli utenti di tutte le aziende quando il super_admin era nel contesto di una specifica azienda (es. Borgo del Lago).

### Root cause
1. `GET /api/users` senza `?azienda_id=` → per super_admin il server restituisce tutti gli utenti senza filtro
2. `PianoEditorialePage` e `StaffPage` chiamavano `/api/users` senza passare l'azienda corrente
3. Il fix al server era stato scritto ma non deployato su Railway (mancava il `git push`)

### Fix

**Server (`server/src/routes/users.js`):**
`GET /api/users?azienda_id=xxx` — per super_admin, se passato, filtra solo `staff` di quella azienda:
```js
if (filterAzienda) {
  profiles.eq('azienda_id', filterAzienda).eq('role', 'staff')
}
```

**Frontend:**
- `PianoEditorialePage`: passa `?azienda_id=${aziendaId}` nella fetch del team (dependency su `aziendaId`)
- `StaffPage`: passa `?azienda_id=${azienda?.id}` nella fetch

**deploy.ps1:**
Aggiunto `git push origin main` come primo passo — Railway si aggiorna solo con git push, non con il deploy Vercel. Rimossi anche le emoji che causavano crash su PowerShell 5.1.

### File modificati
- `server/src/routes/users.js`
- `client-next/components/admin/PianoEditorialePage.jsx`
- `client-next/components/admin/StaffPage.jsx`
- `deploy.ps1`

### Smoke test
37/37 verde ✅

**Why:** Super_admin naviga nel contesto di un'azienda specifica — deve vedere solo il personale di quell'azienda, non di tutte. Il deploy.ps1 senza git push era la causa del bug persistente dopo il primo deploy.
**How to apply:** [[feedback-deploy]] — git push sempre prima del deploy Vercel.
