// Writing view: list, single post, owner login and post editor. Rendered as an overlay on index.html.
// Routes: #/writing  #/writing/<id>  #/writing/new  #/writing/edit/<id>  #/writing/login
const blog = document.getElementById('blog');
const HOME_TITLE = document.title;
let filter = 'all';

const block = b => {
  if (typeof b === 'string') return '<p>' + esc(b) + '</p>';
  if (b.h) return '<h2>' + esc(b.h) + '</h2>';
  if (b.quote) return '<blockquote>' + esc(b.quote) + (b.by ? '<cite>' + esc(b.by) + '</cite>' : '') + '</blockquote>';
  if (b.code) return '<pre><code>' + esc(b.code) + '</code></pre>';
  if (b.list) return '<ul>' + b.list.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>';
  return '';
};
const sourcesHtml = p => !(p.sources && p.sources.length) ? '' :
  '<div class="src"><div class="mono">Sources</div><ol>' + p.sources.map(s =>
    '<li><a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + '</a>' +
    (s.note ? '<small>' + esc(s.note) + '</small>' : '') + '</li>').join('') + '</ol></div>';
const shell = inner => '<div class="bw"><div class="bt"><a href="#/">← Home</a>' +
  (Store.canWrite ? '<a class="bnew" href="#/writing/new">+ New post</a>' : '') + '</div>' + inner + '</div>';

function listView() {
  const posts = sorted().filter(p => filter === 'all' || p.type === filter);
  const tabs = [['all', 'All'], ['note', 'Notes'], ['article', 'Articles'], ['link', 'Links']];
  const empty = Store.loading ? 'Loading…' : Store.error || 'Nothing here yet.';
  blog.innerHTML = shell('<p class="mono">Writing</p><h1>Notes, articles and sources</h1>' +
    '<p class="intro">Short notes, long pieces, and links I have read with my take.</p>' +
    '<div class="filters">' + tabs.map(t => '<button data-f="' + t[0] + '" class="' + (filter === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
    (posts.map(p => '<a class="item" href="#/writing/' + esc(p.id) + '"><span class="mono">' + TYPE[p.type] + ' · ' + fmtDate(p.date) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.summary) + '</p></a>').join('') || '<p class="intro">' + esc(empty) + '</p>') +
    '<div class="tools" style="margin-top:44px">' + (Store.canWrite ? '<button id="out">Sign out</button>' : '<a href="#/writing/login">Owner sign in</a>') + '</div>');
  blog.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; listView(); });
  const out = document.getElementById('out');
  if (out) out.onclick = () => Store.sb.auth.signOut();
}

function postView(p) {
  const tools = Store.canWrite ? '<div class="tools"><a href="#/writing/edit/' + esc(p.id) + '">Edit</a><button id="del">Delete</button></div>' : '';
  blog.innerHTML = shell('<a class="back" href="#/writing">← All writing</a><article class="post"><div class="mono">' + TYPE[p.type] + ' · ' + fmtDate(p.date) + '</div><h1>' + esc(p.title) + '</h1>' +
    '<div class="tags">' + (p.tags || []).map(t => '<span>#' + esc(t) + '</span>').join('') + '</div><div style="height:18px"></div>' +
    p.body.map(block).join('') + sourcesHtml(p) + '</article>' + tools);
  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Click again to delete'; return; }
    const {error} = await Store.sb.from('posts').delete().eq('id', p.id);
    if (error) { del.textContent = 'Could not delete: ' + error.message; return; }
    await loadPosts();
    location.hash = '#/writing';
  };
}

function loginView() {
  blog.innerHTML = shell('<p class="mono">Owner</p><h1>Sign in</h1><p class="intro">Only the site owner can write posts.</p>' +
    '<form id="lg"><label>Email<input id="l-email" type="email" autocomplete="username" required></label>' +
    '<label>Password<input id="l-pass" type="password" autocomplete="current-password" required></label>' +
    '<p class="err" id="err" role="alert"></p><div class="tools"><button class="primary" id="go" type="submit">Sign in</button></div></form>');
  document.getElementById('lg').onsubmit = async e => {
    e.preventDefault();
    const btn = document.getElementById('go'), err = document.getElementById('err');
    btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
    const {error} = await Store.sb.auth.signInWithPassword({email: document.getElementById('l-email').value.trim(), password: document.getElementById('l-pass').value});
    if (error) { btn.disabled = false; btn.textContent = 'Sign in'; err.textContent = 'Could not sign in. Check your email and password.'; return; }
    location.hash = '#/writing';
  };
}

function editorView(existing) {
  const p = existing || {type: 'note', date: new Date().toISOString().slice(0, 10), title: '', summary: '', tags: [], body: [], sources: []};
  const key = 'draft:' + (existing ? existing.id : 'new');
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) {}
  const v = draft || {type: p.type, date: p.date, title: p.title, summary: p.summary, tags: (p.tags || []).join(', '), body: bodyToText(p.body), sources: sourcesToText(p.sources)};
  const names = ['type', 'date', 'title', 'summary', 'tags', 'body', 'sources'];
  blog.innerHTML = shell('<p class="mono">' + (existing ? 'Edit post' : 'New post') + '</p><h1>' + (existing ? 'Edit' : 'Write') + '</h1>' +
    '<form id="ed" autocomplete="off">' +
    '<div class="r2"><label>Type<select id="f-type"><option value="note">Note</option><option value="article">Article</option><option value="link">Link</option></select></label>' +
    '<label>Date<input id="f-date" type="date"></label></div>' +
    '<label>Title<input id="f-title" maxlength="140"></label>' +
    '<label>Summary<input id="f-summary" maxlength="220" placeholder="One line shown in lists"></label>' +
    '<label>Tags<input id="f-tags" placeholder="comma, separated"></label>' +
    '<label>Body<textarea id="f-body" rows="14" placeholder="Blank line = new paragraph"></textarea></label>' +
    '<p class="hint">## Heading &nbsp;·&nbsp; &gt; quote | author &nbsp;·&nbsp; - list item &nbsp;·&nbsp; ``` on its own line to start and end code</p>' +
    '<label>Sources<textarea id="f-sources" rows="4" placeholder="Title | https://link | optional note"></textarea></label>' +
    '<p class="hint">One source per line.</p><p class="err" id="err" role="alert"></p>' +
    '<div class="tools"><button class="primary" id="save" type="submit">Publish</button><a href="#/writing' + (existing ? '/' + esc(existing.id) : '') + '">Cancel</a></div></form>');
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

function route() {
  const h = decodeURIComponent(location.hash);
  const open = h.startsWith('#/writing');
  blog.hidden = !open;
  document.documentElement.style.overflow = open ? 'hidden' : '';
  window.PAUSE = open;
  if (!open) { document.title = HOME_TITLE; return; }
  document.title = 'Writing — Kishore Sakthivel';
  const parts = h.split('/').slice(2);
  const get = id => Store.posts.find(x => x.id === id);
  if (parts[0] === 'login' && Store.sb) { Store.canWrite ? (location.hash = '#/writing') : loginView(); }
  else if (parts[0] === 'new' && Store.canWrite) editorView(null);
  else if (parts[0] === 'edit' && Store.canWrite && get(parts[1])) editorView(get(parts[1]));
  else if (parts[0] && get(parts[0])) { postView(get(parts[0])); document.title = get(parts[0]).title + ' — Kishore Sakthivel'; }
  else if (parts[0] && Store.loading) blog.innerHTML = shell('<p class="intro">Loading…</p>');
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
