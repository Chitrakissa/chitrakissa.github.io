/* Chitrakissa — the studio pages' small engine: the nav, things settling in on scroll, drifting petals, the painting that paints
   itself (sketch → colour, and your cursor paints too), and the feedback forms (chips are real buttons; answers go to our inbox). */
(() => {
  const API = 'https://chitrakissa-orders.mickydroch.workers.dev';
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav: solid once you scroll; a full-screen menu on phones
  const nav = document.querySelector('.nav');
  if (nav) {
    const solid = () => nav.classList.toggle('solid', scrollY > 10); solid(); addEventListener('scroll', solid, { passive: true });
    const m = nav.querySelector('.menu');
    if (m) { m.onclick = () => { const o = nav.classList.toggle('open'); m.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
      $$('nav a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); document.body.style.overflow = ''; })); }
  }

  // settle in on scroll
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv, .lines').forEach(el => io.observe(el));

  // videos play only while seen (phones thank us)
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { const p = v.play(); p && p.catch(() => {}); } else v.pause(); }), { threshold: .25 });
  $$('video[data-auto]').forEach(v => vio.observe(v));

  // parallax: [data-px="0.08"] drifts against the scroll (data-rot keeps a tilt)
  const px = $$('[data-px]');
  if (px.length && !still) {
    const run = () => { for (const el of px) { const r = el.getBoundingClientRect(), k = parseFloat(el.dataset.px); el.style.transform = `translate3d(0, ${((r.top + r.height / 2) - innerHeight / 2) * -k}px, 0) ${el.dataset.rot ? `rotate(${el.dataset.rot}deg)` : ''}`; } };
    addEventListener('scroll', () => requestAnimationFrame(run), { passive: true }); run();
  }

  // petals: a few marigold, rose and jasmine petals on a slanting breeze (the same petals as in our films, just fewer)
  function petals(host) {
    if (still) return;
    const c = document.createElement('canvas'); c.className = 'petals'; host.appendChild(c); const g = c.getContext('2d');
    const cols = ['#f0a12a', '#e0861d', '#fff4de', '#d9466f', '#b8322e'], n = +host.dataset.petals || 14;
    let W, H, dpr; const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = host.clientWidth; H = host.clientHeight; c.width = W * dpr; c.height = H * dpr; };
    size(); addEventListener('resize', size);
    const P = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), z: .4 + Math.random() * .6, ph: Math.random() * 6.3, s: Math.random() < .5 ? -1 : 1, c: cols[Math.floor(Math.random() * cols.length)] }));
    let seen = true; new IntersectionObserver(([e]) => seen = e.isIntersecting).observe(host);
    let t0 = performance.now();
    (function f(t) {
      requestAnimationFrame(f); if (!seen) return; const dt = Math.min(.05, (t - t0) / 1000); t0 = t;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y += dt * (.035 + p.z * .05); p.x += dt * (.018 + .012 * Math.sin(t / 900 + p.ph)); if (p.y > 1.08 || p.x > 1.08) { p.y = -.06; p.x = Math.random() * .9 - .1; }
        const x = p.x * W, y = p.y * H, r = 5 + p.z * 7, flip = Math.cos(t / 600 * (1 + p.z) + p.ph);
        g.save(); g.translate(x, y); g.rotate(t / 1400 * p.s + p.ph); g.scale(.35 + .65 * Math.abs(flip), 1); g.globalAlpha = .55 + p.z * .35;
        g.fillStyle = p.c; g.beginPath(); g.moveTo(0, r); g.bezierCurveTo(-r * .85, r * .4, -r * .6, -r * .8, 0, -r); g.bezierCurveTo(r * .6, -r * .8, r * .85, r * .4, 0, r); g.fill();
        g.restore();
      }
    })(t0);
  }
  $$('[data-petals]').forEach(petals);

  // the painter: a pencil sketch that fills with watercolour. data-painter="a.jpg|a_sketch.jpg|caption; b.jpg|…"
  function painter(host) {
    const items = host.dataset.painter.split(';').map(s => { const [c, k, cap] = s.trim().split('|'); return { c, k, cap }; });
    const cv = document.createElement('canvas'), g = cv.getContext('2d'); host.prepend(cv);
    const mask = document.createElement('canvas'), mg = mask.getContext('2d'), tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
    const capEl = (host.closest('figure, .frame') || host).querySelector('[data-cap]');
    const load = src => new Promise(r => { const i = new Image(); i.decoding = 'async'; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    let W, H, dpr, idx = 0, imgs = [], cover = 0, auto = null, fade = 1;
    function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = host.clientWidth; H = host.clientHeight; for (const c of [cv, tmp]) { c.width = W * dpr; c.height = H * dpr; } mask.width = Math.ceil(W / 2); mask.height = Math.ceil(H / 2); mg.clearRect(0, 0, mask.width, mask.height); cover = 0; }
    function fit(ctx, im) { const s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s; ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); }
    function blob(x, y, r) {   // a watercolour dab: an uneven edge, soft inside, a little bloom at the rim
      const k = .5, n = 14, ph = Math.random() * 6.3; mg.save(); mg.translate(x * k, y * k); mg.beginPath();
      for (let i = 0; i <= n; i++) { const a = i / n * 6.283, rr = r * k * (.78 + .22 * Math.sin(a * 3 + ph) + .12 * Math.random()); i ? mg.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : mg.moveTo(rr, 0); }
      const gr = mg.createRadialGradient(0, 0, 0, 0, 0, r * k); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.75, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = gr; mg.fill(); mg.restore(); cover += r * r * .55 / (W * H) * 3.1;
    }
    function draw() {
      const it = imgs[idx]; if (!it) return; g.setTransform(dpr, 0, 0, dpr, 0, 0); tg.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1; g.clearRect(0, 0, W, H); fit(g, it.k);
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); fit(tg, it.c);
      tg.globalCompositeOperation = 'destination-in'; tg.drawImage(mask, 0, 0, W, H);
      g.drawImage(tmp, 0, 0, W, H, 0, 0, W, H);
      if (fade < 1) { g.globalAlpha = 1 - fade; g.fillStyle = '#f5ecdd'; g.fillRect(0, 0, W, H); fade = Math.min(1, fade + .04); }
    }
    function stroke(dur) {   // the brush crosses the paper in loose diagonal sweeps
      const t0 = performance.now(), rows = 7, base = Math.max(W, H) * .11;
      return new Promise(done => { (function f(t) {
        const u = Math.min(1, (t - t0) / dur), row = Math.floor(u * rows), v = u * rows - row, dir = row % 2 ? -1 : 1;
        const x = W * (.5 + dir * (v - .5) * 1.15) + Math.sin(t / 90) * 12, y = H * ((row + .5) / rows) + (v - .5) * H * .14 + Math.cos(t / 130) * 10;
        for (let i = 0; i < 3; i++) blob(x + (Math.random() - .5) * base * .7, y + (Math.random() - .5) * base * .7, base * (.6 + Math.random() * .7));
        draw(); u < 1 ? requestAnimationFrame(f) : done();
      })(t0); });
    }
    // each sketch waits for a visitor to paint it; untouched, the brush paints it by itself. Once painted, it settles, holds, and the next arrives.
    let user = 0, lastMove = 0;   // user: when the visitor started painting this sketch (0 = not yet); lastMove: their last stroke
    const wait = ms => new Promise(r => setTimeout(r, ms)), frame = () => new Promise(r => requestAnimationFrame(r));
    function painted() {   // how much of the sketch has colour now (sampled from the mask)
      const d = mg.getImageData(0, 0, mask.width, mask.height).data; let n = 0, on = 0;
      for (let i = 3; i < d.length; i += 4 * 9) { n++; if (d[i] > 90) on++; } return on / Math.max(1, n);
    }
    async function settle() { mg.fillStyle = '#000'; for (let a = 0; a <= 1; a += .06) { mg.globalAlpha = a * .5; mg.fillRect(0, 0, mask.width, mask.height); draw(); await frame(); } mg.globalAlpha = 1; }
    async function cycle() {
      if (auto) return; auto = true;
      const touch = matchMedia('(hover: none)').matches;
      while (host.isConnected) {
        if (capEl) capEl.textContent = items[idx].cap || '';
        mg.clearRect(0, 0, mask.width, mask.height); cover = 0; fade = 0; user = 0;
        for (let i = 0; i < 20; i++) { draw(); await frame(); }
        if (touch || still) { await wait(900); await stroke(still ? 1 : 4200); }
        else {
          const t0 = performance.now(); while (!user && performance.now() - t0 < 3500) await wait(100);   // a few seconds for them to start
          if (user) { while (painted() < .7 && performance.now() - lastMove < 2600) await wait(150); }   // they paint; we wait while they do
          else await stroke(4200);
        }
        await settle(); host.classList.toggle('painted', true);
        await wait(user ? 3200 : 4200); host.classList.toggle('painted', false);
        idx = (idx + 1) % imgs.length;
      }
    }
    // your cursor paints too (mouse and pen; on phones the brush paints by itself, and your finger stays free to scroll)
    let last = null;
    host.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      lastMove = performance.now(); if (!user) user = lastMove; host.classList.add('touched');
      if (last) { const d = Math.hypot(x - last[0], y - last[1]), n = Math.ceil(d / 14); for (let i = 1; i <= n; i++) blob(last[0] + (x - last[0]) * i / n, last[1] + (y - last[1]) * i / n, Math.max(W, H) * .032); }   // a fine brush: painting should take a few strokes
      last = [x, y]; draw(); });
    host.addEventListener('pointerleave', () => last = null);
    (async () => {
      size(); addEventListener('resize', () => { size(); draw(); });
      imgs = (await Promise.all(items.map(async it => ({ c: await load(it.c), k: await load(it.k) })))).filter(x => x.c && x.k);
      if (!imgs.length) return; host.classList.add('ready'); cycle();
    })();
  }
  $$('[data-painter]').forEach(painter);

  // chips are buttons that toggle (data-one = pick one)
  $$('.chips').forEach(box => box.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    if (box.dataset.one != null) $$('.chip', box).forEach(x => x !== b && x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  }));
  const picked = box => $$('.chip[aria-pressed="true"]', box).map(b => b.dataset.v);

  // a page's feedback (data-voice="comic|gifts|films") or "what should we paint next" (data-interest)
  $$('form[data-voice], form[data-interest]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault(); const out = f.querySelector('.ok'), btn = f.querySelector('button[type=submit]');
    const note = (f.querySelector('[name=note]') || {}).value || '', ig = (f.querySelector('[name=ig]') || {}).value || '';
    let url, body;
    if (f.dataset.voice) { const answers = {}; $$('.chips[data-q]', f).forEach(b => { const v = picked(b); if (v.length) answers[b.dataset.q] = v; });
      if (!Object.keys(answers).length && !note.trim()) { out.textContent = 'Pick at least one answer, or write us a line.'; return; }
      url = API + '/api/voice'; body = { page: f.dataset.voice, answers, note: note.trim(), ig: ig.trim() };
    } else { const wants = picked(f.querySelector('.chips'));
      if (!wants.length) { out.textContent = 'Pick at least one.'; return; }
      url = API + '/api/interest'; body = { wants, note: note.trim(), ig: ig.trim() }; }
    btn.disabled = true; out.textContent = 'Sending…';
    try { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      out.textContent = r.ok ? (f.dataset.thanks || 'Thank you. We read every answer, and it decides what we make next.') : 'That did not go through. Please try again.';
      if (r.ok) { $$('.chip', f).forEach(c => c.setAttribute('aria-pressed', 'false')); f.reset(); }
    } catch (x) { out.textContent = 'We could not reach our inbox. Please check your internet and try again.'; }
    btn.disabled = false;
  }));

  // the year in the footer
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
