# SNL Cards

A lightweight, client-side announcement-card generator for `snlcards.me`.
This is an independent fan project, not affiliated with NBC or Saturday Night Live.

## Run locally

Node 22.12+:

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The production site has no runtime npm dependencies, API keys, backend, accounts,
or AI generation calls. Vite is only used to build and serve the source.

## How cards work

- A single photographic cork asset is drawn once, without tiling. A deterministic
  tone adjustment matches the measured beige/pink of the reference board.
- Paper, subtle grain, shadows, and clear/colored pins are drawn with Canvas 2D.
- Studio Marker is self-hosted. Its main letterforms are based on a lettering
  study of actual announcement cards. It is an approximation of varied handwriting,
  not an official font or a promise of pixel-identical handwritten names.
- The font loads before the first render. Text fitting uses actual ink bounds,
  balanced line choices, and grapheme-aware emergency wrapping, including long
  unbroken input. Preview and PNG export use the same 2160 × 2700 canvas (2× vector rendering).
- Each edit invalidates the previous export. Revision checks prevent stale
  asynchronous PNG encodes from replacing the current image.
- Downloads use a Blob URL. A same-page image dialog supports saving on phones;
  Web Share is offered only when file sharing is supported.
- Inputs and images stay in the browser. There is no analytics or local storage.

## Celebrity suggestions

`src/celebrities.js` contains the host and music pools and a central exclusion
list. Suggestions are deduplicated, editable, and filtered before use in either
autocomplete or randomization. Randomization avoids immediately repeating a name.

These are editorial suggestions, not a verified reputational database. No person
can be guaranteed permanently "noncontroversial." Review the pool as circumstances
change; add normalized lowercase names to `excludedNames` to remove them from both
features. Custom user text is unrestricted within the input-length limits.

## Verification

`npm test` covers normalization, dates at month/year boundaries, repeat avoidance,
corpus filtering, and preservation of long strings/graphemes during fitting.

With the dev server running, open `/tests/browser.html`. This uses the real loaded
font and browser Canvas metrics to test every suggestion plus extreme unbroken
strings, accents, CJK, emoji, empty fields, and dates. It also checks PNG creation.
The test page is not included in the production build.

The optional font development script is `scripts/build-font.py`, using Python
`fonttools`, `shapely`, and `brotli`. Its checked-in WOFF2 output is sufficient for
normal web builds. See `ASSETS.md` for source and provenance details.

## GitHub → Netlify

Connect `maddiedreese/snl-new` to Netlify's GitHub integration:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `22` |

These settings and security headers are committed in `netlify.toml`. No environment
variables are required. GitHub pushes should trigger Netlify builds automatically.

## Domain cutover

Keep the existing `snlcards.me` site serving until the new Netlify URL is approved.
Then add `snlcards.me` to the new Netlify project's custom domains and follow the
DNS records Netlify supplies. Preserve unrelated mail/TXT records. Verify both the
apex and `www` alias, HTTPS, a real PNG download, and a mobile save before retiring
the old hosting. The canonical URL and sitemap already use `https://snlcards.me/`.

No domain or DNS change is part of the initial replacement deployment.
