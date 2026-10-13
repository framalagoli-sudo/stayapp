import { supabaseAdmin } from '@/lib/supabase-server'
import { iconeSito } from '@/lib/icone-sito'

// L'icona del sito vale per TUTTE le sue pagine (interne, privacy, vetrine…),
// non solo per la home: per questo sta nel layout. Si leggono due colonne
// sole, e se il cliente non ha caricato un'icona non si dichiara niente: le
// pagine restano com'erano.
export async function generateMetadata(props) {
  try {
    const { slug } = await props.params
    const { data } = await supabaseAdmin.from('entita').select('logo_url, icona:minisito->>icona_url').eq('slug', slug).maybeSingle()
    return data?.icona ? { icons: iconeSito({ icona: data.icona, logo: data.logo_url }) } : {}
  } catch { return {} }
}

export default function Layout({ children }) { return children }
