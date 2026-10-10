// Shared helpers and the post store, backed by Supabase (table: posts)
const TYPE = {note: 'Note', article: 'Article', link: 'Link'};
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
// Only http(s) links are allowed, so a typo can never inject a script URL
const safeUrl = u => /^https?:\/\//i.test(u) ? u : '#';
const isUrl = u => /^https?:\/\/[^\s]+$/i.test(u);

const Store = {posts: [], loading: true, error: '', canWrite: false, sb: null, subs: new Set()};
const sorted = () => [...Store.posts].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const latestPost = () => sorted()[0] || null;
const onStore = fn => { Store.subs.add(fn); return () => Store.subs.delete(fn); };
const emit = () => Store.subs.forEach(f => f());

async function loadPosts() {
  const {data, error} = await Store.sb.from('posts').select('*').order('date', {ascending: false});
  Store.loading = false;
  Store.error = error ? 'Could not load posts.' : '';
  Store.posts = data || [];
  emit();
}

async function initStore() {
  const cfg = window.SITE_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { Store.loading = false; Store.error = 'Posts are not configured.'; emit(); return; }
  Store.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  // The editor is shown to anyone signed in. The database policy is what actually restricts writing to the owner.
  Store.sb.auth.onAuthStateChange((_e, session) => { Store.canWrite = !!session; emit(); });
  const {data} = await Store.sb.auth.getSession();
  Store.canWrite = !!(data && data.session);
  await loadPosts();
}

// ---- Editor text format <-> structured blocks ----
// blank line = new paragraph | "## " heading | "> quote | author" | "- " list item | ``` fenced code
function textToBody(text) {
  const out = [], lines = text.replace(/\r/g, '').split('\n');
  let para = [], list = [], code = null;
  const flush = () => {
    if (para.length) out.push(para.join(' ')); para = [];
    if (list.length) out.push({list}); list = [];
  };
  for (const raw of lines) {
    if (code) { if (raw.trim() === '```') { out.push({code: code.join('\n')}); code = null; } else code.push(raw); continue; }
    const l = raw.trim();
    if (l === '```') { flush(); code = []; }
    else if (!l) flush();
    else if (l.startsWith('## ')) { flush(); out.push({h: l.slice(3)}); }
    else if (l.startsWith('> ')) { flush(); const [q, ...by] = l.slice(2).split(' | '); out.push(by.length ? {quote: q, by: by.join(' | ')} : {quote: q}); }
    else if (l.startsWith('- ')) { if (para.length) { out.push(para.join(' ')); para = []; } list.push(l.slice(2)); }
    else { if (list.length) { out.push({list}); list = []; } para.push(l); }
  }
  if (code) out.push({code: code.join('\n')});
  flush();
  return out;
}
function bodyToText(blocks) {
  return (blocks || []).map(b => typeof b === 'string' ? b :
    b.h ? '## ' + b.h : b.quote ? '> ' + b.quote + (b.by ? ' | ' + b.by : '') :
    b.code ? '```\n' + b.code + '\n```' : b.list ? b.list.map(i => '- ' + i).join('\n') : '').join('\n\n');
}
// sources: one per line, "Title | https://url | optional note"
function textToSources(text) {
  const res = [], bad = [];
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
    const [title, url, ...note] = l.split('|').map(s => s.trim());
    if (title && url && isUrl(url)) res.push(note.length && note.join(' | ') ? {title, url, note: note.join(' | ')} : {title, url});
    else bad.push(l);
  });
  return {res, bad};
}
const sourcesToText = s => (s || []).map(x => [x.title, x.url, x.note].filter(Boolean).join(' | ')).join('\n');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';
