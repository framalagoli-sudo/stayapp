// Kill-switch service worker.
// Il vecchio SW (next-pwa) precacheava lo shell dell'app con hash di chunk specifici;
// dopo i deploy gli hash cambiano e su browser con visite precedenti il precache stale
// serviva una versione rotta -> PAGINA BIANCA (es. Chrome bianco / Edge ok).
// Questo SW si auto-distrugge: svuota tutte le cache, si disiscrive e ricarica le tab
// aperte -> tutto torna a caricare fresco dalla rete. I browser ricontrollano /sw.js
// a ogni navigazione, quindi anche quelli "incastrati" lo prendono e si ripuliscono.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch (e) {}
    try { await self.registration.unregister() } catch (e) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    } catch (e) {}
  })())
})
