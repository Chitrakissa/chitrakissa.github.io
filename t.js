/* Chitrakissa visits: anonymous counting (no cookies, no IP, no third party). Counts a page view (and where the visitor came from), which
   sections are actually seen, what is tapped (buttons and links, by their words), how far the page is scrolled, and which samples are played.
   Pages can add their own moments with window.ckTrack(event, label). Everything goes to our own inbox (/api/t) with sendBeacon. */
(() => {
  const API = 'https://chitrakissa-orders.mickydroch.workers.dev/api/t';
  const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  let ref = '-'; try { const r = document.referrer && new URL(document.referrer); if (r && r.host !== location.host) ref = r.host.replace(/^www\.|^l\.|^lm\./, ''); } catch (e) {}
  const q = new URLSearchParams(location.search); if (q.get('utm_source')) ref = q.get('utm_source');
  const send = (e, l) => { const b = JSON.stringify({ p: page, e, l: (l || '').slice(0, 60), r: ref });
    try { navigator.sendBeacon ? navigator.sendBeacon(API, new Blob([b], { type: 'text/plain' })) : fetch(API, { method: 'POST', body: b, keepalive: true }); } catch (x) {} };
  window.ckTrack = send;
  send('view', location.hash.slice(1, 30));
  // sections seen (each once): any element with an id that is a section/article
  const seen = new Set(), io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting && !seen.has(x.target.id)) { seen.add(x.target.id); send('section', x.target.id); } }), { threshold: .4 });
  document.querySelectorAll('section[id], article[id], [data-track-section]').forEach(el => { if (!el.id) el.id = el.dataset.trackSection; io.observe(el); });
  // taps on buttons and links, by their words (or data-track)
  document.addEventListener('click', ev => { const a = ev.target.closest('a, button, label.place, .chip'); if (!a) return;
    const l = a.dataset.track || (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50); if (l) send('click', l); }, true);
  // scroll depth
  let s50 = false, s90 = false; addEventListener('scroll', () => { const d = (scrollY + innerHeight) / document.documentElement.scrollHeight;
    if (d > .5 && !s50) { s50 = true; send('scroll50'); } if (d > .9 && !s90) { s90 = true; send('scroll90'); } }, { passive: true });
  // samples played with sound (a tap on a video)
  document.querySelectorAll('video').forEach(v => v.addEventListener('play', () => { if (!v.muted) send('play', (v.currentSrc || v.src).split('/').pop().split('?')[0]); }));
})();
