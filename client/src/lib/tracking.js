// Inject/remove third-party tracking scripts dynamically for minisito landing pages.
// Called inside useEffect — returns cleanup fn that removes all injected nodes.
export function injectTracking(cfg = {}) {
  const cleanup = []

  function addScript(id, setup) {
    if (document.getElementById(id)) return
    const el = document.createElement('script')
    el.id = id
    setup(el)
    document.head.appendChild(el)
    cleanup.push(() => document.getElementById(id)?.remove())
  }

  // ── Meta Pixel ──────────────────────────────────────────────────────────────
  if (cfg.meta_pixel_id) {
    addScript('meta-pixel', el => {
      el.textContent = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${cfg.meta_pixel_id}');fbq('track','PageView');`
    })
  }

  // ── Google Analytics 4 ──────────────────────────────────────────────────────
  if (cfg.ga4_id) {
    addScript('ga4-async', el => {
      el.async = true
      el.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.ga4_id}`
    })
    addScript('ga4-config', el => {
      el.textContent = `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${cfg.ga4_id}');`
    })
  }

  // ── Google Tag Manager ──────────────────────────────────────────────────────
  if (cfg.gtm_id) {
    addScript('gtm-head', el => {
      el.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.gtm_id}');`
    })
  }

  // ── TikTok Pixel ────────────────────────────────────────────────────────────
  if (cfg.tiktok_pixel_id) {
    addScript('tiktok-pixel', el => {
      el.textContent = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};
ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};
ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";
o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];
a.parentNode.insertBefore(o,a)};ttq.load('${cfg.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`
    })
  }

  return () => cleanup.forEach(fn => fn())
}
