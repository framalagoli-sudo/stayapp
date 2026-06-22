// Tema effettivo del SITO (minisito). Regola "chi vince", senza ambiguità:
//  - App  → usa sempre il tema base dell'entità (entity.theme).
//  - Sito → usa il proprio override (minisito.theme) SE use_app_style === false,
//           altrimenti eredita il tema base.
// Retrocompatibile: senza override (default) ritorna il tema base → nessun cambiamento.
export function resolveSiteTheme(entity) {
  const base = (entity && entity.theme) || {}
  const mini = (entity && entity.minisito) || {}
  if (mini.use_app_style === false && mini.theme && typeof mini.theme === 'object') {
    return { ...base, ...mini.theme }
  }
  return base
}
