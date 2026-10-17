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
// Table helpers: "| a | b |" rows, a "|---|:--:|" separator under the header. Write \| for a literal bar.
const isSep = l => !!l && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && l.includes('|');
const cells = l => l.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim());
function textToBody(text) {
  const out = [], lines = text.replace(/\r/g, '').split('\n');
  let para = [], list = [], code = null, m;
  const flush = () => {
    if (para.length) out.push(para.join('\n')); para = [];
    if (list.length) out.push({list}); list = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (code) { if (raw.trim() === '```') { out.push({code: code.join('\n')}); code = null; } else code.push(raw); continue; }
    const l = raw.trim();
    if (l === '```') { flush(); code = []; }
    else if (!l) flush();
    else if (l.startsWith('|') && isSep(lines[i + 1])) {
      flush();
      const head = cells(l), align = cells(lines[i + 1].trim()).map(c => /^:-*:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : '');
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i].trim())); i++; }
      i--;
      out.push({table: {head, align, rows}});
    }
    else if (l.startsWith('### ')) { flush(); out.push({h3: l.slice(4)}); }
    else if (l.startsWith('## ')) { flush(); out.push({h: l.slice(3)}); }
    else if ((m = l.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/))) { flush(); out.push(m[1] ? {img: m[2], alt: m[1]} : {img: m[2]}); }
    else if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i.test(l)) { flush(); out.push({img: l}); }
    else if (l.startsWith('> ')) { flush(); const [q, ...by] = l.slice(2).split(' | '); out.push(by.length ? {quote: q, by: by.join(' | ')} : {quote: q}); }
    else if (l.startsWith('- ')) { if (para.length) { out.push(para.join('\n')); para = []; } list.push(l.slice(2)); }
    else { if (list.length) { out.push({list}); list = []; } para.push(raw.replace(/\s+$/, '').trimStart()); }
  }
  if (code) out.push({code: code.join('\n')});
  flush();
  return out;
}
function tableToText(t) {
  const row = r => '| ' + r.map(c => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |';
  return [row(t.head), '|' + t.align.map(a => a === 'center' ? ' :---: ' : a === 'right' ? ' ---: ' : ' --- ').join('|') + '|', ...t.rows.map(row)].join('\n');
}
function bodyToText(blocks) {
  return (blocks || []).map(b => typeof b === 'string' ? b :
    b.table ? tableToText(b.table) : b.h ? '## ' + b.h : b.h3 ? '### ' + b.h3 : b.img ? '![' + (b.alt || '') + '](' + b.img + ')' : b.quote ? '> ' + b.quote + (b.by ? ' | ' + b.by : '') :
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

// ---- Inline text: **bold**, [label](url) and bare URLs. Everything is escaped; only http(s) links are made. ----
const INLINE_SRC = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
function inline(s) {
  let out = '', last = 0, m;
  const INLINE = new RegExp(INLINE_SRC.source, 'g');
  while ((m = INLINE.exec(s))) {
    out += esc(s.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] !== undefined) out += '<strong>' + inline(m[1]) + '</strong>';
    else if (m[2] !== undefined) out += '<a class="ext" href="' + esc(m[3]) + '" target="_blank" rel="noopener noreferrer">' + esc(m[2]) + '</a>';
    else {
      let url = m[4], tail = '';
      const t = url.match(/[.,;:!?)\]'"]+$/);
      if (t) { tail = t[0]; url = url.slice(0, -tail.length); }
      out += '<a class="ext" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url.replace(/^https?:\/\/(www\.)?/, '')) + '</a>' + esc(tail);
    }
  }
  return (out + esc(s.slice(last))).replace(/\n/g, '<br>');
}
// Turn a share link into a direct image address (Google Drive and GitHub pages do not load as <img> directly).
function imageUrl(u) {
  let m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600';
  m = u.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+?)(\?.*)?$/);
  if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3];
  return u;
}
