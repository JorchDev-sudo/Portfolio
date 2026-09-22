# Portfolio admin (tiny backend)

A zero-dependency Node.js script that lets you add **projects** and **notes** from a form and regenerates the portfolio HTML for you. The public site stays 100% static HTML + CSS.

## Quick start

Requires Node.js 18+ (no `npm install`).

```bash
node admin/server.js        # admin panel → http://localhost:3000
                            # preview     → http://localhost:3000/site/
```

Add or edit a project or note in the panel. On every save the server writes `content/*.json` and rebuilds the site. Open `/site/` to preview (page transitions need `http://`, not `file://`).

No server? Edit the JSON by hand and run `node admin/build.js`.

## Layout

```
admin/server.js         local HTTP server + JSON API (127.0.0.1 only, no auth)
admin/build.js          generator: content/*.json → HTML/CSS
admin/index.html        the admin panel
files/                  uploaded résumé PDF (created on first upload)
img/                    uploaded images (created on first upload)
transitions.js          public page-transition helper (see DOCS.md §1)
content/projects.json   one object per project (order = order on the Work page)
content/notes.json      one object per note
content/site.json       calendar range: { "calendar": { "start": "2026-07", "end": "2028-12" } }
notes/*.html            GENERATED, one article page per note
```

## What gets generated

`build.js` only rewrites what is between these markers; everything else is yours to edit:

| File | Marker | Content |
|---|---|---|
| `work.html` | `BUILD:slides` | one slide per project |
| `work.html` | `BUILD:drum` | the 3D project selector (sets `--n`, the project count) |
| `index.html`, `contact.html` | `BUILD:status` | the "currently" block (online/offline + text) |
| `about.html` | `BUILD:about` | portrait frame + bio (description, location, focus, currently) |
| `notes.html` | `BUILD:calendar` | month radios, year headings, month ring, note feed |
| `style.css` | `BUILD:drum-fallback` | Firefox fallback rules for the selector |
| `style.css` | `BUILD:calendar-css` | per-month CSS (`--s`, visible year, visible feed) |
| `notes/*.html` | (whole files) | article pages; the folder is wiped and rewritten on every build |

Do not edit inside the markers or in `notes/`: your changes are overwritten. To change the look of generated parts, edit the templates in `build.js` (`buildWork`, `buildNotes`, `article`) or the static CSS.

## Status and About

Both live in `content/site.json` and are edited in the panel (top sections):

```json
"status": { "state": "online", "doing": "Doing something" },
"about":  { "description": "…", "location": "…", "focus": "…", "currently": "…", "portraitText": "", "image": "", "resumeUrl": "" }
```

- `state` is `online` (pulsing green dot) or `offline` (grey dot). `doing` is the quoted line under it; leave it empty to hide the line. Both appear on the home page and on the contact page.
- `description` supports blank-line separated paragraphs (and the same Markdown subset as notes). Empty `location`, `focus` or `currently` rows are hidden.
- `portraitText` is optional text shown inside the portrait frame only while `image` is empty.
- `image`: your photo, uploaded in the panel (saved in `img/`). **Size:** the frame is a 3:4 portrait rectangle; upload at least 1200×1600px (jpg/png/webp/avif, under 10MB) — it is cropped to fill the frame (`object-fit:cover`), so keep the subject centred.
- `resumeUrl`: upload a PDF in the panel (saved in `files/`) or paste any link (e.g. a Google Drive share link). Shown as a "Résumé ↗" tag on the About page; empty hides it.

## Projects

| Field | Meaning |
|---|---|
| `title` | shown as `"Title"` on the slide |
| `color` | slide background, hex (`#2b44ff`) |
| `image` | optional diagram image. Upload it in the panel (saved in `img/`); a hand-written `img/...` path or `https://` URL also works |
| `summary` | optional Markdown (paragraphs, `## heading`, `- list`, code fences, `` `inline code` ``) |
| `stack`, `role` | optional text rows |
| `status` | 0–100, fills the striped bar; hidden when 0 |

On the slide the order is: **image → summary → stack/role/status**. Everything except the title is optional; a slide with no image simply has no diagram. Long summaries scroll inside the slide.

Image uploads accept png, jpg, webp, gif and avif up to 10 MB (SVG is rejected on purpose); résumé uploads accept PDF only. Images are never deleted automatically; remove unused files from `img/` by hand.

Order = position in `projects.json`; reorder by moving objects in the file and running `node admin/build.js`. Keep it under about 14 projects: the drum is a 3D cylinder and wraps around after that.

## Notes

Fields: `title`, `type` (`note`, `deep`, `build`, `lab`), `date` (`YYYY-MM-DD`), `body`.

- A note appears under its month in the calendar and gets its own page at `notes/<id>.html`.
- The calendar opens on the latest month that has notes.
- A note dated outside `calendar.start`–`calendar.end` still gets a page but is not listed; the build prints a warning. Widen the range in `content/site.json`.
- Body syntax: blank-line separated paragraphs, `## Heading`, `- list item`, fenced code blocks and `` `inline code` ``. All text is HTML-escaped.
- New note type: add it to `TYPES` in `build.js` and as an `<option>` in `admin/index.html`.

## Deploying

Upload only the static files: `index.html`, `work.html`, `notes.html`, `about.html`, `contact.html`, `style.css`, `transitions.js`, `notes/`, `img/` and `files/`. Do **not** publish `admin/` or `content/`.

## Security

The server listens on `127.0.0.1` and has no login. Run it on your own machine only; do not expose the port or deploy it as-is. Input is validated and HTML-escaped, but there is no authentication.

## API

| Method | Path | Body |
|---|---|---|
| GET | `/api/content` | – |
| POST | `/api/projects`, `/api/notes` | item JSON; send `id` to update, omit it to create |
| DELETE | `/api/projects/:id`, `/api/notes/:id` | – |
| POST | `/api/upload` | `{ "name", "data"(base64), "kind"?: "resume" }` → `{ "path": "img/…" }` or `{ "path": "files/…" }` |
| POST | `/api/rebuild` | – |
