'use client'
import { PropertyIdContext } from '@/context/PropertyIdContext'

export default function Layout({ children, params }) {
  return (
    <PropertyIdContext.Provider value={params.id}>
      {children}
    </PropertyIdContext.Provider>
  )
}
