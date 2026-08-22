'use client';
import { use } from "react";
import { PropertyIdContext } from '@/context/PropertyIdContext'

export default function Layout(props) {
  const params = use(props.params);

  const {
    children
  } = props;

  return (
    <PropertyIdContext.Provider value={params.id}>
      {children}
    </PropertyIdContext.Provider>
  )
}
