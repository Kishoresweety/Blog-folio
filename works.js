// Works page: builds each project card from its link.
// Title, description and thumbnail are fetched automatically unless set by hand with data-* attributes.
// No database: results are only cached in the visitor's browser for a few hours.
(() => {
  const TTL = 12 * 3600 * 1000;
  const CACHE = 'works:v1:';
  const grid = document.getElementById('works');
  const cards = [...grid.querySelectorAll('a.work')];

  // ---------- helpers ----------
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const pretty = s => s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return u; } };
  const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const github = u => { const m = u.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)\/?$/i); return m ? {owner: m[1], repo: m[2]} : null; };

  const readCache = u => { try { const o = JSON.parse(localStorage.getItem(CACHE + u)); return o && Date.now() - o.t < TTL ? o.d : null; } catch (_) { return null; } };
  const writeCache = (u, d) => { try { localStorage.setItem(CACHE + u, JSON.stringify({t: Date.now(), d})); } catch (_) {} };

  // ---------- fetching ----------
  async function getJson(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try { const r = await fetch(url, {signal: ctl.signal}); if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(timer); }
  }

  async function fetchMeta(url) {
    const g = github(url);
    if (g) {
      // GitHub gives every repo a social preview image, so the thumbnail needs no request of its own.
      const out = {image: `https://opengraph.githubassets.com/1/${g.owner}/${g.repo}`, title: pretty(g.repo), desc: '', tags: []};
      try {
        const j = await getJson(`https://api.github.com/repos/${g.owner}/${g.repo}`);
        out.title = pretty(j.name || g.repo);
        out.desc = j.description || '';
        out.tags = [j.language, ...(j.topics || []).slice(0, 2)].filter(Boolean);
      } catch (_) { /* rate limited or offline: keep the repo name and image */ }
      return out;
    }
    const j = await getJson('https://api.microlink.io/?screenshot=true&url=' + encodeURIComponent(url));
    if (j.status !== 'success') throw new Error('meta');
    const d = j.data || {};
    return {title: d.title || '', desc: d.description || '', image: (d.image && d.image.url) || (d.screenshot && d.screenshot.url) || '', tags: []};
  }

  // ---------- card ----------
  function build(card, i) {
    const url = card.href;
    const manual = {title: card.dataset.title, desc: card.dataset.desc, image: card.dataset.image, tags: list(card.dataset.tags), status: card.dataset.status};
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.style.setProperty('--i', i);
    card.textContent = '';

    const fallbackTitle = manual.title || (github(url) ? pretty(github(url).repo) : hostOf(url));
    const thumb = el('div', 'thumb');
    const ph = el('div', 'ph', fallbackTitle.charAt(0).toUpperCase());
    ph.setAttribute('aria-hidden', 'true');
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onload = () => img.classList.add('on');
    img.onerror = () => img.remove();
    thumb.append(ph, img);
    if (manual.status) thumb.append(el('span', 'status', manual.status));

    const tags = el('div', 'tags');
    const title = el('h2', 't', fallbackTitle);
    const desc = el('p', 'd');
    const row = el('div', 'foot-row');
    const go = el('span', 'go', 'Open ');
    go.append(el('b', '', '↗'));
    row.append(el('span', 'host', hostOf(url)), go);
    const body = el('div', 'body');
    body.append(tags, title, desc, row);
    card.append(thumb, body);

    const showTags = arr => { tags.textContent = ''; arr.slice(0, 3).forEach(t => tags.append(el('span', '', t))); };
    const apply = d => {
      title.textContent = manual.title || d.title || fallbackTitle;
      const text = manual.desc || d.desc || '';
      desc.textContent = text;
      desc.hidden = !text;
      desc.classList.remove('loading');
      const src = manual.image || d.image;
      if (src && img.getAttribute('src') !== src) img.src = src;
      showTags(manual.tags.length ? manual.tags : (d.tags || []));
    };

    card.dataset.tagList = manual.tags.join('|');
    showTags(manual.tags);
    if (manual.image) img.src = manual.image;

    // Nothing to fetch when everything was written by hand.
    if (manual.title && manual.desc && manual.image) { apply({}); return; }

    const cached = readCache(url);
    if (cached) { apply(cached); return; }
    desc.classList.add('loading');
    desc.textContent = 'Loading description';
    fetchMeta(url).then(d => { writeCache(url, d); apply(d); }).catch(() => apply({}));
  }

  // ---------- filters ----------
  function filters() {
    const wrap = document.getElementById('filters');
    const all = [...new Set(cards.flatMap(c => list(c.dataset.tags)))];
    const count = document.getElementById('count');
    const empty = document.getElementById('empty');
    const show = tag => {
      let n = 0;
      cards.forEach(c => { const ok = !tag || list(c.dataset.tags).includes(tag); c.hidden = !ok; if (ok) n++; });
      count.textContent = n + (n === 1 ? ' project' : ' projects');
      empty.hidden = n > 0;
      [...wrap.children].forEach(b => b.setAttribute('aria-pressed', String((b.dataset.tag || '') === (tag || ''))));
    };
    if (all.length) {
      ['', ...all].forEach(t => {
        const b = el('button', '', t || 'All');
        b.type = 'button';
        b.dataset.tag = t;
        b.onclick = () => show(t);
        wrap.append(b);
      });
    }
    show('');
  }

  cards.forEach(build);
  filters();
})();
