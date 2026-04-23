import { createContext, useContext } from 'react'

// Overrides which property ID is used by useProperty.
// Used by /admin/struttura/:id/* routes to inject the ID from the URL.
export const PropertyIdContext = createContext(null)

export function usePropertyId() {
  return useContext(PropertyIdContext)
}
