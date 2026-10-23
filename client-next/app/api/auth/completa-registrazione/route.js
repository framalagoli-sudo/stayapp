import { requireAuth } from '@/lib/server-auth'
import { completaRegistrazione } from '@/lib/registrazione'

// Dopo la conferma dell'email nascono azienda e profilo da titolare. Si chiama
// dalla pagina di conferma e, per chi si fosse perso a metà, a ogni accesso:
// senza una registrazione in attesa non fa niente.
export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    return Response.json(await completaRegistrazione(user))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
