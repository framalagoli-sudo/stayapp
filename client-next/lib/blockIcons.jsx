// Elenco icone selezionabili nei blocchi (highlights, servizi, step, paragrafi…).
// Le CHIAVI coincidono con quelle risolte dal renderer (HIGHLIGHT_LUCIDE), così
// il valore salrado si vede sia nell'editor sia sul sito. Usato dall'IconPicker.
import {
  Star, Heart, Award, Wifi, Car, Waves, Sparkles, Utensils, Activity, Umbrella, Mountain,
  Coffee, Wine, Bus, Bell, Wind, MapPin, Clock, Music, CheckCircle, Check, Phone, Calendar,
  Users, Gift, Home, Mail, Zap, Shield, Leaf, Sun, Briefcase, Wrench, Euro, Handshake, Smile,
  Target, TrendingUp, Globe, Camera, BookOpen, Layers, Tag,
} from 'lucide-react'

export const BLOCK_ICONS = [
  { key: 'star', label: 'Stella', Icon: Star },
  { key: 'heart', label: 'Cuore', Icon: Heart },
  { key: 'check-circle', label: 'Spunta', Icon: CheckCircle },
  { key: 'check', label: 'Check', Icon: Check },
  { key: 'award', label: 'Premio', Icon: Award },
  { key: 'sparkles', label: 'Brillantini', Icon: Sparkles },
  { key: 'gift', label: 'Regalo', Icon: Gift },
  { key: 'zap', label: 'Fulmine', Icon: Zap },
  { key: 'shield', label: 'Scudo', Icon: Shield },
  { key: 'target', label: 'Bersaglio', Icon: Target },
  { key: 'trending-up', label: 'Crescita', Icon: TrendingUp },
  { key: 'handshake', label: 'Stretta di mano', Icon: Handshake },
  { key: 'smile', label: 'Sorriso', Icon: Smile },
  { key: 'users', label: 'Persone', Icon: Users },
  { key: 'home', label: 'Casa', Icon: Home },
  { key: 'briefcase', label: 'Valigetta', Icon: Briefcase },
  { key: 'wrench', label: 'Chiave inglese', Icon: Wrench },
  { key: 'euro', label: 'Euro', Icon: Euro },
  { key: 'tag', label: 'Etichetta', Icon: Tag },
  { key: 'layers', label: 'Livelli', Icon: Layers },
  { key: 'book', label: 'Libro', Icon: BookOpen },
  { key: 'camera', label: 'Fotocamera', Icon: Camera },
  { key: 'globe', label: 'Globo', Icon: Globe },
  { key: 'phone', label: 'Telefono', Icon: Phone },
  { key: 'mail', label: 'Email', Icon: Mail },
  { key: 'calendar', label: 'Calendario', Icon: Calendar },
  { key: 'clock', label: 'Orario', Icon: Clock },
  { key: 'location', label: 'Posizione', Icon: MapPin },
  { key: 'wifi', label: 'WiFi', Icon: Wifi },
  { key: 'parking', label: 'Parcheggio', Icon: Car },
  { key: 'pool', label: 'Piscina', Icon: Waves },
  { key: 'spa', label: 'Spa / benessere', Icon: Sparkles },
  { key: 'restaurant', label: 'Ristorante', Icon: Utensils },
  { key: 'gym', label: 'Palestra', Icon: Activity },
  { key: 'beach', label: 'Spiaggia', Icon: Umbrella },
  { key: 'mountain', label: 'Montagna', Icon: Mountain },
  { key: 'breakfast', label: 'Colazione / caffè', Icon: Coffee },
  { key: 'bar', label: 'Bar / vino', Icon: Wine },
  { key: 'shuttle', label: 'Navetta', Icon: Bus },
  { key: 'reception', label: 'Reception', Icon: Bell },
  { key: 'ac', label: 'Aria condizionata', Icon: Wind },
  { key: 'music', label: 'Musica', Icon: Music },
  { key: 'leaf', label: 'Natura / eco', Icon: Leaf },
  { key: 'sun', label: 'Sole', Icon: Sun },
]

const BY_KEY = Object.fromEntries(BLOCK_ICONS.map(i => [i.key, i]))
export function blockIconEntry(key) { return BY_KEY[key] || null }
