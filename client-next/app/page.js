import LandingPage from '@/components/public/LandingPage'

// ⛔ Questa pagina non dichiarava il **canonical**, e nemmeno le altre nostre
// (blog, termini, privacy, cancellazione dati): misurato il 18/09/2026. Ai
// motori di ricerca serve sapere qual è l'indirizzo buono, altrimenti lo
// decidono loro fra apex, www e varianti con parametri — e possono sceglierne
// uno diverso da quello che promuoviamo. I siti dei clienti ce l'avevano già.
//
// ⚠️ Niente 'use client' qui: una pagina di browser non può dichiarare i
// metadati. Il componente sotto resta di browser, questa no.
export const metadata = { alternates: { canonical: '/' } }

export default function Home() { return <LandingPage /> }
