# Kishore Sakthivel — research portfolio

Static site (no build step). Posts live in Supabase; the owner writes them in the browser at `#/writing`.

## Files
- `index.html` page structure and meta tags
- `styles.css`, `blog.css` styles for the home page and the Writing overlay
- `scene.js` 3D particle scene and scroll-linked shapes
- `home.js` project cards, hypothesis tabs, latest-post card
- `blog.js` writing list, post view, owner sign-in and editor
- `util.js` helpers and the Supabase-backed post store
- `config.js` public Supabase URL and anon key (safe to publish; row-level security protects writes)

## Writing a post
Open `/#/writing/login`, sign in, then use **+ New post**. In the body: `## Heading`, `> quote | author`, `- list item`,
a line of three backticks to start and end code, blank line for a new paragraph. Sources: one per line as `Title | https://link | note`.

## Deploy
Push to GitHub. Vercel redeploys on every push. Framework preset: Other. No build command. Output directory: `.`
