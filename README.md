# Atlanta Care Center — website

A static rebuild of [atlantacare.com](https://www.atlantacare.com) that anyone can edit
from a browser, with no developer and (almost) no hosting bill.

- **Site:** [Astro](https://astro.build) → plain HTML/CSS. 16 pages, ~1 second build.
- **Content:** Markdown + YAML files in `src/content/`. That *is* the database.
- **Hosting:** Cloudflare Pages (free) with the source on GitHub (free).
- **Editing:** a form-based editor at `/admin/` ([Sveltia CMS](https://github.com/sveltia/sveltia-cms))
  that reads and writes the content files.

```
src/content/singles/site.yml   phone, address, hours, booking/portal links, menu, footer text
src/content/singles/home.yml   the home page
src/content/pages/*.md         every other page (folders = URL paths)
public/images/                 photos and icons
public/docs/                   the two privacy PDFs
```

## Run it locally

```bash
npm install
npm run dev            # site at http://localhost:8171, editor at /admin/
```

To try the editor against your working copy (no GitHub involved), open `/admin/` in
Chrome/Edge, choose **Work with Local Repository** and pick this folder. To try a pull
request before merging, check out its branch in your clone and run the same thing.

## How editing works

Every page is made of a small set of blocks the editor understands:

| Block | What it is |
|---|---|
| Call to action | Centered heading + "Book Now" button (the rose watermark) |
| Text block | Rich text, optionally over a wide background photo |
| Two columns | Two side-by-side columns; each is text *or* an image |
| Photo + text rows | Alternating image/text rows with "Learn More" buttons |
| Questions & answers | Accordion FAQ |
| Contact details | Phone, address and hours, pulled from Site Settings |

Phone number, hours and address live in **Site Settings** and appear everywhere
automatically (the phone number is auto-linked wherever it's typed).
In headings, `**bold**` is bold and `*italic*` becomes the handwriting style.

### The editor — Sveltia CMS (`/admin/`)

- Zero build step; one `<script>` tag (`src/pages/admin.astro`) and one config file
  (`public/admin/config.yml`).
- Editors sign in with GitHub. Saving commits straight to the repo; Cloudflare rebuilds
  the site in ~30 seconds.
- On a laptop, open `http://localhost:8171/admin/` in Chrome/Edge and choose
  **Work with Local Repository** → pick this folder. Edits are written to disk
  and the dev server reloads.
- **Buttons:** "Button text/link" is a section's main button; **More buttons** adds a second
  or third one beside it. It exists on every page section and home section that has a button.
- **Shortcut:** add `admin/` to any page's address to open that page in the editor, e.g.
  `www.atlantacare.com/team/admin/` or `.../services/free-ultrasound/admin/`. (The home page
  and Site Settings are a click away from `/admin/` itself.)
- Required fields are marked `*`. If Save is refused because something is missing or
  invalid, a banner at the top names each field (click one to jump to it), the page scrolls
  to the first one and every one of them flashes red until it's fixed. That is
  `public/admin/editor-help.js`, a small add-on that only watches the editor's own
  "This field is required" notes, so a Sveltia update can't break it.
  `npm run test:editor` drives the real editor in headless Chrome to check it
  (needs Chrome and `npm i --no-save puppeteer-core`).

## Tests: nothing an editor saves can break the build

```bash
npm test     # about 15 seconds
```

`tests/content.test.mjs` copies the site to a temp folder, writes the kinds of content a
careless, mischievous or random editor could save (blank and deleted fields, wrong types,
broken markdown and HTML, colliding page names, everything deleted, hundreds of pages), and
builds each. The content schema is deliberately forgiving: bad values are ignored and a
section it can't understand is skipped with a `[content] skipped ...` warning in the
Cloudflare build log, instead of failing the deploy. Run the tests before merging code.

## Search engines

This site should be found by everyone. Every page is indexable (no robots meta tag), the
build writes `sitemap-index.xml` (`@astrojs/sitemap` in `astro.config.mjs`, editor left
out), and `public/robots.txt` points to it. Only `/admin/` is hidden (meta tag plus an
`X-Robots-Tag` header in `public/_headers`). The tests check all of this. The sister site
supportatlantacare.com is the opposite: private, noindex everywhere, no sitemap.

## Going live (Cloudflare Pages + GitHub)

1. The source lives at [AtlantaCareCenter/atlantacare](https://github.com/AtlantaCareCenter/atlantacare)
   (`main`), owned by the Atlanta Care Center GitHub organization. The editor commits straight to it.
   Code changes come in as pull requests from a fork (currently acklenx/atlantacare): branch in the
   fork, open a PR against the org repo, an org owner merges it and Cloudflare deploys `main`.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the custom domain `www.atlantacare.com` (and `atlantacare.com`) in Pages → Custom domains.
   This needs the domain's DNS on Cloudflare — check who controls it before cutover.
4. **Editor sign-in:** deploy the tiny [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)
   Worker (free; ~5 minutes, it's a "Deploy to Cloudflare" button), create the GitHub OAuth
   app it asks for, then set `base_url` in `public/admin/config.yml` to the Worker's URL.
   Editors need a GitHub account with write access to the repo — one shared
   "atlantacare-web" account is fine.

Ongoing cost: the domain registration. Everything else is on free tiers.

## Where the content came from

`../atlantacare-scrape/` holds the original site's rendered HTML, images, theme CSS and
`extract.py`, which produced `src/content/`. The orphaned Testimonials page (lorem ipsum)
was not migrated. Fonts: the original used Adobe Fonts (Roboto Condensed + Al Fresco);
this uses self-hosted Roboto Condensed + Herr Von Muellerhoff, the closest free match.
