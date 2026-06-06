'use client'
export function injectJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
  return () => document.getElementById(id)?.remove()
}

export function buildEntitySchema({ entity, tipo, recensioni = [], eventi = [] }) {
  const typeMap = {
    struttura: 'LodgingBusiness',
    ristorante: 'Restaurant',
    attivita: 'TouristAttraction',
  }
  const schema = {
    '@context': 'https://schema.org',
    '@type': typeMap[tipo] || 'LocalBusiness',
    name: entity.name,
    url: window.location.origin + window.location.pathname,
  }
  const desc = entity.minisito?.seo_description || entity.description
  if (desc) schema.description = desc
  if (entity.logo_url) schema.logo = { '@type': 'ImageObject', url: entity.logo_url }
  if (entity.cover_url) schema.image = entity.cover_url
  if (entity.phone) schema.telephone = entity.phone
  if (entity.email) schema.email = entity.email
  if (entity.address) schema.address = { '@type': 'PostalAddress', streetAddress: entity.address }

  if (recensioni.length > 0) {
    const avg = recensioni.reduce((s, r) => s + (r.stelle || 0), 0) / recensioni.length
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(avg * 10) / 10,
      reviewCount: recensioni.length,
      bestRating: 5,
      worstRating: 1,
    }
    schema.review = recensioni.slice(0, 5).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.autore || 'Guest' },
      reviewRating: { '@type': 'Rating', ratingValue: r.stelle },
      ...(r.testo && { reviewBody: r.testo }),
      ...(r.created_at && { datePublished: r.created_at.split('T')[0] }),
    }))
  }

  if (eventi.length > 0) {
    schema.event = eventi.map(e => ({
      '@type': 'Event',
      name: e.title,
      startDate: e.date_start,
      ...(e.date_end && { endDate: e.date_end }),
      ...(e.description && { description: e.description }),
      ...(e.cover_url && { image: e.cover_url }),
      location: {
        '@type': 'Place',
        name: e.location || entity.name,
        ...(entity.address && { address: entity.address }),
      },
      organizer: { '@type': 'Organization', name: entity.name },
      ...(e.price != null && {
        offers: {
          '@type': 'Offer',
          price: e.price,
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
        },
      }),
    }))
  }

  return schema
}

export function buildFaqSchema(faqItems) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function buildProductsSchema(products, sellerName) {
  return products.map(p => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nome,
    ...(p.descrizione && { description: p.descrizione }),
    ...(p.immagini?.[0] && { image: p.immagini[0] }),
    ...(p.categoria && { category: p.categoria }),
    offers: {
      '@type': 'Offer',
      price: p.prezzo_scontato ?? p.prezzo,
      priceCurrency: 'EUR',
      availability: p.stock === 0
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: sellerName },
    },
  }))
}
