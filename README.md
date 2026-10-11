# Kishore Sakthivel — Independent Research Portfolio

**Live site: https://blog-folio-six.vercel.app**

A portfolio for independent research on AI safety, evals and quantum-informed machine learning. The page is a live 3D particle cloud that stands for a quantum state: only the bright points are "measured", and the shape stays recognisable. Below it sit the research hypothesis, the experiment plan, my projects, and a writing section for notes, articles and sources.

## Current research question

> Can compact measurements of high-dimensional quantum states provide useful latent representations for an existing AI architecture, improving generation, search, or verification without requiring explicit reconstruction of the full quantum state?

The site lays this out as three tests (search, generation, verification). Each has a prediction and a kill condition written down before any experiment is run. No results are claimed yet.

## What is on the site

| Section | What it shows |
| --- | --- |
| Origin | Introduction, headline numbers, and a slider that sets how much of the cloud is "measured" |
| Hypothesis | The research question with tabs for search, generation and verification |
| Experiments | The experiment log (E-00 to E-04) and current status |
| Safety & evals | Why the work counts as AI safety: pre-registered claims, cheap verification, negative results |
| Built | Resume Engineer, Spatial Parse, TermsGuard and ATS Optimizer |
| Journey | Education and work history |
| Writing | The latest post, linking to the full writing page |
| Contact | Email, location, and links to GitHub and the Works page |

The cloud changes shape and colour as you scroll. Moving the mouse tilts it, and clicking empty space scatters it. The layout works on desktop and phone, in light and dark mode.

## Works page

`works.html` is a separate page that showcases projects. It has no database. Each project is one line in the HTML:

```html
<a class="work" href="https://github.com/owner/repo" data-tags="AI"></a>
```

The title, description and thumbnail are fetched from the link when the page loads: GitHub repos use the GitHub API and their social preview image, and other sites use the page's title, description and preview image through microlink.io. Anything can be written by hand instead and always wins over the automatic value:

| Attribute | What it sets |
| --- | --- |
| `data-title` | Project name |
| `data-desc` | One or two sentences |
| `data-image` | Thumbnail URL, or an image file in the repo |
| `data-tags` | Comma-separated tags. These also build the filter buttons |
| `data-status` | Small badge on the thumbnail, for example `Live` |

If every field is written by hand, nothing is fetched. Fetched results are cached in the visitor's browser for 12 hours. If a lookup fails, the card still shows the repo or site name, with a placeholder when there is no image.

The page uses three colours in a 50 / 30 / 10 split: black `#000000` for the background, white `#ffffff` for the frosted glass and text, and `#2C3480` for accents. The cards and the top bar are glassmorphism: translucent, blurred panels over a black scene made of a slow light beam, a drifting grid and three soft orbs.

Card motion:
- cards blur in as they scroll into view, a few at a time, and play the entrance again when a filter is chosen
- on a mouse, cards tilt toward the pointer and a soft sheen follows it
- on hover a light arc travels around the border, a scan sweeps across the thumbnail, the title underlines itself and the Open button turns white
- cards float gently while idle, and the Live badge pulses

Touch screens skip the tilt. Everything moves less or not at all for visitors who prefer reduced motion.

## Writing: notes, articles and links

Posts open at `/#/writing`. The writing pages have their own light design, separate from the dark home page: paper `#EDECE6` (about 50%), blue `#1546D9` (about 30%) and amber `#F9B318` (about 10%). Blue is used for the mastheads, titles and links. Amber is only a fill behind dark text, never text itself, because it is too pale to read on paper. Body text is set in Newsreader and the interface in Inter.

Motion on these pages: rings ripple out from an amber dot in each masthead, cards rise in one after another, an amber highlighter sweeps under a card title on hover, and an amber bar fills along the top as you read a post. Reduced-motion settings turn all of it off.

There are three kinds of post:

- **Note**: a short thought or log entry
- **Article**: a long piece
- **Link**: a source worth saving, with my take

Every post can have a numbered **Sources** list with links and a short note for each. The newest post is shown on the home page.

### Writing a post (owner only)

1. Open `/#/writing/login` and sign in.
2. Click **+ New post**.
3. Fill in type, date, title, summary, tags, body and sources, then click **Publish**.

Body format:

```
## A heading
### A smaller subheading
A paragraph with **bold text**, a [labelled link](https://example.com) and a plain https://example.com link.
![Caption shown under the image](https://drive.google.com/file/d/FILE_ID/view)
> A quote | Who said it
- A list item
```

- A blank line starts a new paragraph.
- Links are underlined in blue and open in a new tab. Only `http` and `https` links work.
- **Images are links, not uploads.** Put `![caption](link)` on its own line (the caption is optional). Google Drive share links and GitHub `blob` links are converted to direct image addresses automatically. A bare link ending in `.png`, `.jpg`, `.gif`, `.webp` or `.svg` on its own line also becomes an image.
- For a Google Drive image, set sharing to **Anyone with the link**. If an image cannot load, the post shows a note with the link instead.
- A line containing only three backticks starts and ends a code block.

Sources, one per line:

```
Title | https://link | optional note
```

Drafts are kept in the browser while you type. Delete asks for a second click.

## How it works

- **No build step.** Plain HTML, CSS and JavaScript. Vercel serves the files as they are.
- **3D scene.** A custom 3D projection drawn on a Canvas 2D element (2,400 points), with no 3D library.
- **Posts** are stored in a Supabase Postgres table and read by the browser through the Supabase JavaScript library.
- **Security** is enforced in the database, not in the page. Row-level security lets everyone read posts, and only the owner's verified email can insert, update or delete them. The key in `config.js` is the public Supabase publishable key and is meant to be visible.
- **Text is escaped** before it is shown, and only `http` and `https` links are accepted as sources.

## Project structure

```
index.html    Page structure and meta tags
works.html    Project showcase page (works.css and works.js style and fill it)
styles.css    Home page styles and theme colours
blog.css      Styles for the writing pages and editor
scene.js      3D cloud, shapes per section, scroll and pointer effects
home.js       Project cards, hypothesis tabs, latest-post card
blog.js       Writing list, post view, owner sign-in and editor
util.js       Helpers, text-to-post conversion and the Supabase post store
config.js     Public Supabase URL and key
vercel.json   Security headers and clean URLs
```

## Run your own copy

1. **Create a Supabase project**, then run this in the SQL editor. Replace the email with the one that may write posts.

   ```sql
   create table public.posts (
     id text primary key,
     type text not null check (type in ('note','article','link')),
     date date not null,
     title text not null check (char_length(title) between 1 and 140),
     summary text not null default '' check (char_length(summary) <= 220),
     tags text[] not null default '{}',
     body jsonb not null default '[]'::jsonb,
     sources jsonb not null default '[]'::jsonb,
     updated_at timestamptz not null default now()
   );
   alter table public.posts enable row level security;

   create policy "posts are public to read" on public.posts
     for select to anon, authenticated using (true);

   create policy "owner can insert posts" on public.posts
     for insert to authenticated
     with check ((auth.jwt() ->> 'email') = 'you@example.com');
   create policy "owner can update posts" on public.posts
     for update to authenticated
     using ((auth.jwt() ->> 'email') = 'you@example.com')
     with check ((auth.jwt() ->> 'email') = 'you@example.com');
   create policy "owner can delete posts" on public.posts
     for delete to authenticated
     using ((auth.jwt() ->> 'email') = 'you@example.com');
   ```

2. **Create your login** in Supabase under Authentication → Users → Add user, with auto-confirm ticked. Use the same email as in the policies.
3. **Turn off public sign-ups** in the Supabase Authentication settings.
4. **Edit `config.js`** with your project URL and publishable key (Project Settings → API).
5. **Deploy** to Vercel or Netlify: import the repo, framework "Other", no build command, output directory `.`. Every push to `main` then redeploys.

## Notes

- Text content (hypothesis, experiment log, project descriptions) is written directly in `index.html`. To change it, edit that file and push.
- The experiment log lists the planned protocol only. Results will be added when there are results.

## Contact

Kishore Sakthivel — Thanjavur, India (open to relocation)
kishore.sakthivel@zohomail.in
