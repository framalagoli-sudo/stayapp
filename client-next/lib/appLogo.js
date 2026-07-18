// Sceglie quale logo mostrare nell'header della PWA ospite.
// L'header dell'app ha SEMPRE sfondo scuro (cover con velo scuro o colore primario,
// testo bianco): quindi di default preferisce il logo "negativo" per sfondi scuri
// (logo_dark_url) se presente. Il titolare può forzare la scelta con minisito.app_logo.
//   'auto'  → negativo se c'è, altrimenti normale  (default, header scuro)
//   'light' → sempre il logo normale (per sfondo chiaro)
//   'dark'  → sempre il logo negativo (fallback al normale se manca)
export function pickAppLogo(entity, mini) {
  const choice = mini?.app_logo || 'auto'
  const light  = entity?.logo_url || null
  const dark   = entity?.logo_dark_url || null
  if (choice === 'light') return light || dark
  if (choice === 'dark')  return dark || light
  return dark || light
}
