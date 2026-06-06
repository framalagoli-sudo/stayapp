'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const CarrelloContext = createContext(null)

export function CarrelloProvider({ children }) {
  const [voci, setVoci] = useState(() => {
    try { return JSON.parse(localStorage.getItem('oltrenova_cart') || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('oltrenova_cart', JSON.stringify(voci))
  }, [voci])

  function aggiungi(prodotto, qty = 1) {
    setVoci(prev => {
      const idx = prev.findIndex(v => v.prodotto_id === prodotto.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + qty }
        return next
      }
      return [...prev, {
        prodotto_id: prodotto.id,
        nome: prodotto.nome,
        prezzo: prodotto.prezzo_scontato ?? prodotto.prezzo,
        immagine: prodotto.immagini?.[0] || '',
        qty,
      }]
    })
  }

  function rimuovi(prodotto_id) {
    setVoci(prev => prev.filter(v => v.prodotto_id !== prodotto_id))
  }

  function aggiorna(prodotto_id, qty) {
    if (qty <= 0) return rimuovi(prodotto_id)
    setVoci(prev => prev.map(v => v.prodotto_id === prodotto_id ? { ...v, qty } : v))
  }

  function svuota() { setVoci([]) }

  const totale = voci.reduce((acc, v) => acc + v.prezzo * v.qty, 0)
  const count  = voci.reduce((acc, v) => acc + v.qty, 0)

  return (
    <CarrelloContext.Provider value={{ voci, totale, count, aggiungi, rimuovi, aggiorna, svuota }}>
      {children}
    </CarrelloContext.Provider>
  )
}

export function useCarrello() {
  return useContext(CarrelloContext)
}
