// Writing view: list, single post, owner login and post editor. Rendered as an overlay on index.html.
// Routes: #/writing  #/writing/<id>  #/writing/new  #/writing/edit/<id>  #/writing/login
const blog = document.getElementById('blog');
const HOME_TITLE = document.title;
let filter = 'all';

// ---------- small helpers ----------
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
const wordCount = p => (p.body || []).map(b => typeof b === 'string' ? b : (b.h || b.h3 || b.quote || b.code || (b.list || []).join(' ') || '')).join(' ').split(/\s+/).filter(Boolean).length;
const readTime = p => Math.max(1, Math.round(wordCount(p) / 200)) + ' min read';
const badge = t => '<span class="badge b-' + esc(t) + '">' + esc(TYPE[t] || t) + '</span>';
const ripple = '<div class="deco" aria-hidden="true"><i></i><i></i><i></i><b></b></div>';

const block = b => {
  if (typeof b === 'string') return '<p>' + inline(b) + '</p>';
  if (b.h) return '<h2>' + inline(b.h) + '</h2>';
  if (b.h3) return '<h3>' + inline(b.h3) + '</h3>';
  if (b.img) return isUrl(b.img) ? '<figure class="fig"><img src="' + esc(imageUrl(b.img)) + '" alt="' + esc(b.alt || '') + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'bad\')">' +
    (b.alt ? '<figcaption>' + esc(b.alt) + '</figcaption>' : '') + '<p class="nofig">Image could not load. <a class="ext" href="' + esc(b.img) + '" target="_blank" rel="noopener noreferrer">Open the link</a>. For Google Drive set sharing to "Anyone with the link".</p></figure>' : '';
  if (b.quote) return '<blockquote>' + inline(b.quote) + (b.by ? '<cite>' + esc(b.by) + '</cite>' : '') + '</blockquote>';
  if (b.code) return '<pre><code>' + esc(b.code) + '</code></pre>';
  if (b.list) return '<ul>' + b.list.map(i => '<li>' + inline(i) + '</li>').join('') + '</ul>';
  return '';
};

const sourcesHtml = p => !(p.sources && p.sources.length) ? '' :
  '<aside class="src"><p class="mono">Sources</p><ol>' + p.sources.map(s =>
    '<li><a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer"><span class="st">' + esc(s.title) + '</span>' +
    '<span class="sh">' + esc(hostOf(s.url)) + ' ↗</span></a>' + (s.note ? '<small>' + esc(s.note) + '</small>' : '') + '</li>').join('') + '</ol></aside>';

// Page frame: top bar plus the view. `view` lets the stylesheet size each page differently.
const shell = (inner, view) => '<div class="bw" data-view="' + (view || 'list') + '"><div class="bt"><a class="home" href="#/">← Home</a>' +
  (Store.canWrite ? '<a class="bnew" href="#/writing/new">+ New post</a>' : '') + '</div>' + inner + '</div>';

// ---------- list ----------
function listView() {
  const all = sorted();
  const posts = all.filter(p => filter === 'all' || p.type === filter);
  const tabs = [['all', 'All'], ['note', 'Notes'], ['article', 'Articles'], ['link', 'Links']];
  const count = t => t === 'all' ? all.length : all.filter(p => p.type === t).length;
  const empty = Store.loading ? 'Loading…' : Store.error || 'Nothing here yet.';
  const card = (p, i) => '<a class="item' + (i === 0 ? ' lead' : '') + '" style="--i:' + i + '" href="#/writing/' + esc(p.id) + '">' +
    '<div class="meta">' + badge(p.type) + '<span class="date">' + fmtDate(p.date) + '</span>' + (i === 0 && filter === 'all' ? '<span class="flag">Latest</span>' : '') + '</div>' +
    '<h3><span>' + esc(p.title) + '</span></h3><p>' + esc(p.summary) + '</p>' +
    '<div class="more"><span>' + readTime(p) + ((p.sources || []).length ? ' · ' + p.sources.length + ' sources' : '') + '</span><b>Read →</b></div></a>';
  blog.innerHTML = shell('<header class="mast">' + ripple + '<p class="mono">Writing</p><h1>Notes, articles<br>and sources</h1>' +
    '<p class="intro">Short notes, long pieces, and links I have read with my take.</p>' +
    '<div class="filters" role="group" aria-label="Filter posts">' + tabs.map(t => '<button data-f="' + t[0] + '" class="' + (filter === t[0] ? 'on' : '') + '">' + t[1] + '<i>' + count(t[0]) + '</i></button>').join('') + '</div></header>' +
    (posts.length ? '<div class="cards">' + posts.map(card).join('') + '</div>' : '<p class="empty">' + esc(empty) + '</p>') +
    '<div class="tools end">' + (Store.canWrite ? '<button id="out">Sign out</button>' : '<a href="#/writing/login">Owner sign in</a>') + '</div>');
  blog.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; listView(); });
  const out = document.getElementById('out');
  if (out) out.onclick = () => Store.sb.auth.signOut();
}

// ---------- single post ----------
function postView(p) {
  const tools = Store.canWrite ? '<div class="tools"><a href="#/writing/edit/' + esc(p.id) + '">Edit</a><button id="del">Delete</button></div>' : '';
  blog.innerHTML = shell('<div class="prog" id="prog"></div>' +
    '<header class="mast post-mast">' + ripple + '<a class="back" href="#/writing">← All writing</a>' +
    '<div class="meta">' + badge(p.type) + '<span class="date">' + fmtDate(p.date) + ' · ' + readTime(p) + '</span></div>' +
    '<h1>' + esc(p.title) + '</h1>' +
    ((p.tags || []).length ? '<div class="tags">' + p.tags.map(t => '<span>#' + esc(t) + '</span>').join('') + '</div>' : '') + '</header>' +
    '<article class="post">' + p.body.map(block).join('') + sourcesHtml(p) + '</article>' + tools, 'post');
  // Reading progress: an amber bar that fills as you scroll the article
  const bar = document.getElementById('prog');
  blog.onscroll = () => { const m = blog.scrollHeight - blog.clientHeight; bar.style.width = (m > 0 ? blog.scrollTop / m * 100 : 0) + '%'; };
  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Click again to delete'; return; }
    const {error} = await Store.sb.from('posts').delete().eq('id', p.id);
    if (error) { del.textContent = 'Could not delete: ' + error.message; return; }
    await loadPosts();
    location.hash = '#/writing';
  };
}

// ---------- owner sign in ----------
function loginView() {
  blog.innerHTML = shell('<header class="mast mini">' + ripple + '<p class="mono">Owner</p><h1>Sign in</h1><p class="intro">Only the site owner can write posts.</p></header>' +
    '<form id="lg" class="panel"><label>Email<input id="l-email" type="email" autocomplete="username" required></label>' +
    '<label>Password<input id="l-pass" type="password" autocomplete="current-password" required></label>' +
    '<p class="err" id="err" role="alert"></p><div class="tools"><button class="primary" id="go" type="submit">Sign in</button></div></form>', 'form');
  document.getElementById('lg').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('go'), err = document.getElementById('err');
    btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
    const {error} = await Store.sb.auth.signInWithPassword({email: document.getElementById('l-email').value.trim(), password: document.getElementById('l-pass').value});
    if (error) { btn.disabled = false; btn.textContent = 'Sign in'; err.textContent = 'Could not sign in. Check your email and password.'; return; }
    location.hash = '#/writing';
  };
}

// ---------- editor ----------
function editorView(existing) {
  const p = existing || {type: 'note', date: new Date().toISOString().slice(0, 10), title: '', summary: '', tags: [], body: [], sources: []};
  const key = 'draft:' + (existing ? existing.id : 'new');
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) {}
  const v = draft || {type: p.type, date: p.date, title: p.title, summary: p.summary, tags: (p.tags || []).join(', '), body: bodyToText(p.body), sources: sourcesToText(p.sources)};
  const names = ['type', 'date', 'title', 'summary', 'tags', 'body', 'sources'];
  blog.innerHTML = shell('<header class="mast mini">' + ripple + '<p class="mono">' + (existing ? 'Edit post' : 'New post') + '</p><h1>' + (existing ? 'Edit' : 'Write') + '</h1></header>' +
    '<form id="ed" class="panel" autocomplete="off">' +
    '<div class="r2"><label>Type<select id="f-type"><option value="note">Note</option><option value="article">Article</option><option value="link">Link</option></select></label>' +
    '<label>Date<input id="f-date" type="date"></label></div>' +
    '<label>Title<input id="f-title" maxlength="140"></label>' +
    '<label>Summary<input id="f-summary" maxlength="220" placeholder="One line shown in lists"></label>' +
    '<label>Tags<input id="f-tags" placeholder="comma, separated"></label>' +
    '<label>Body<textarea id="f-body" rows="14" placeholder="Blank line = new paragraph"></textarea></label>' +
    '<p class="hint">## Heading &nbsp;·&nbsp; ### Subheading &nbsp;·&nbsp; **bold** &nbsp;·&nbsp; [text](https://link) or a plain https link &nbsp;·&nbsp; ![caption](image link) on its own line &nbsp;·&nbsp; &gt; quote | author &nbsp;·&nbsp; - list item &nbsp;·&nbsp; ``` on its own line to start and end code</p>' +
    '<label>Sources<textarea id="f-sources" rows="4" placeholder="Title | https://link | optional note"></textarea></label>' +
    '<p class="hint">One source per line.</p><p class="err" id="err" role="alert"></p>' +
    '<div class="tools"><button class="primary" id="save" type="submit">Publish</button><a href="#/writing' + (existing ? '/' + esc(existing.id) : '') + '">Cancel</a></div></form>', 'form');
  const f = n => document.getElementById('f-' + n);
  names.forEach(n => {
    f(n).value = v[n];
    f(n).addEventListener('input', () => {
      try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(names.map(k => [k, f(k).value])))); } catch (_) {}
    });
  });
  document.getElementById('ed').onsubmit = async e => {
    e.preventDefault();
    const err = document.getElementById('err'), title = f('title').value.trim(), date = f('date').value, body = textToBody(f('body').value);
    const {res, bad} = textToSources(f('sources').value);
    if (!title || !date || !body.length) { err.textContent = 'Add a title, a date and some body text.'; return; }
    if (bad.length) { err.textContent = 'Fix this source line (needs Title | https://link): ' + bad[0]; return; }
    const id = existing ? existing.id : slug(title) + '-' + date;
    const doc = {id, type: f('type').value, date, title, summary: f('summary').value.trim() || title, tags: f('tags').value.split(',').map(s => s.trim()).filter(Boolean), body, sources: res, updated_at: new Date().toISOString()};
    const btn = document.getElementById('save'); btn.disabled = true; btn.textContent = 'Publishing…';
    const {error} = await Store.sb.from('posts').upsert(doc);
    if (error) { btn.disabled = false; btn.textContent = 'Publish'; err.textContent = 'Could not publish: ' + error.message + '. Your draft is kept here.'; return; }
    try { localStorage.removeItem(key); } catch (_) {}
    await loadPosts();
    location.hash = '#/writing/' + id;
  };
}

// ---------- routing ----------
function route() {
  const h = decodeURIComponent(location.hash);
  const open = h.startsWith('#/writing');
  blog.hidden = !open;
  document.documentElement.style.overflow = open ? 'hidden' : '';
  window.PAUSE = open;
  blog.onscroll = null;
  if (!open) { document.title = HOME_TITLE; return; }
  document.title = 'Writing — Kishore Sakthivel';
  const parts = h.split('/').slice(2);
  const get = id => Store.posts.find(x => x.id === id);
  if (parts[0] === 'login' && Store.sb) { Store.canWrite ? (location.hash = '#/writing') : loginView(); }
  else if (parts[0] === 'new' && Store.canWrite) editorView(null);
  else if (parts[0] === 'edit' && Store.canWrite && get(parts[1])) editorView(get(parts[1]));
  else if (parts[0] && get(parts[0])) { postView(get(parts[0])); document.title = get(parts[0]).title + ' — Kishore Sakthivel'; }
  else if (parts[0] && Store.loading) blog.innerHTML = shell('<p class="empty">Loading…</p>');
  else listView();
  blog.scrollTop = 0;
}
addEventListener('hashchange', route);
// Re-render when posts or the login state change, without jumping to the top or wiping an open form
onStore(() => {
  if (blog.hidden || document.getElementById('ed') || document.getElementById('lg')) return;
  const keep = blog.scrollTop; route(); blog.scrollTop = keep;
});
route();
initStore();
