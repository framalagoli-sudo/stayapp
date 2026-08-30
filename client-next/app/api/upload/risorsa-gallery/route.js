import { requireEntityAccess } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

// Le foto di una cosa prenotabile: un furgone, una camera, un campo.
//
// ⚠️ Il permesso si chiede sull'**entità**, non sulla risorsa: le foto si
// caricano anche mentre la risorsa si sta creando, quando un id ancora non
// esiste. Chiedere il permesso su una riga non ancora scritta significherebbe
// non poterlo chiedere affatto — e la tentazione, a quel punto, è saltarlo.
//
// L'entità dev'essere della propria azienda: senza questo controllo, chiunque
// abbia un account potrebbe scrivere file nella cartella di un altro cliente.
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity_id = searchParams.get('entity_id')
    const entity_tipo = searchParams.get('entity_tipo')
    if (!entity_id || !entity_tipo)
      return Response.json({ error: 'entity_id ed entity_tipo obbligatori' }, { status: 400 })

    const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (response) return response

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })

    // ⚠️ Il percorso si compone solo con valori già verificati: `entity_id` è
    // passato da `requireEntityAccess`, e l'estensione da `parseUpload`. Niente
    // che arrivi grezzo dal client finisce in un nome di file.
    const result = await uploadToStorage(
      `risorse/${entity_id}/${Date.now()}.${parsed.ext}`,
      parsed.buffer, parsed.contentType
    )
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
