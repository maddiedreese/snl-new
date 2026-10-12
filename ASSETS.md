# Asset provenance

## Cork photograph

- File: `public/assets/cork-photo.jpg`
- Photographer: Josephine Barham (@sibilant)
- Title/description: *Empty corkboard at the end of the semester.*
- Source: https://unsplash.com/photos/a-close-up-view-of-a-brown-surface-KsAo8ouBn8A
- Download: https://images.unsplash.com/photo-1558051815-0f18e64e6280?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=90&w=2400
- License: https://unsplash.com/license (checked October 12, 2026).
- The photo page identifies this as a free Unsplash License image, not Unsplash+.
- The license permits downloading, copying, modifying, distributing, and using
  images, including for commercial purposes. Its restrictions include selling an
  unmodified photo and compiling images into a competing image service. This
  project uses one photograph as a component of customized announcement artwork.
- The renderer crops one instance of the photo and adjusts its tonal distribution.
  It does not tile the photo. Attribution is also visible on `/credits.html`.

The rejected generated cork textures are **not** included in this repository.
The earlier CC0 candidate is also not the final asset.

## Studio Marker font

- Files: `public/fonts/studio-marker.woff2`, `public/fonts/StudioMarker-Regular.ttf`
- Build source: `scripts/build-font.py`, `scripts/reference-paths.json`, `scripts/letterforms.json`.
- The font software is constructed in this project; no proprietary font binary
  or commercially licensed font program has been copied.
- Uppercase letter shapes are authored as smooth Bézier paths, preserving the
  shared scale and differing heights of the confirmed reference. Letters missing
  from the board are constructed to use the same pen weight. The font includes
  contextual A, O, S, and T alternates; no whole-word images or name-specific assets
  are used.
- Most uppercase/digit outlines use the September 2026 board consistently.
  Individual outlines were digitized and refined from
  letterforms in announcement references. Missing glyphs and punctuation are
  custom chisel-pen constructions, with composed Latin accents.
- A font cannot replicate all contextual differences of handwriting. It should
  be described as reference-derived lettering, never as an official NBC font.
- Complete reference photographs are used for design study only and are not
  distributed or embedded in the production site.

Letterform reference key used in the source outline JSON:

- `sep`: NBCUniversal's September 2026 board:
  https://www.nbcuniversal.com/article/saturday-night-live-premiere-52nd-season-sept-26-nbc-and-peacock
- `jan`: January 2026 board reproduced at
  https://sitcomsonline.com/photos/saturdaynightlive-january2026.jpg

## Paper, pins, favicon, and interface

The paper, grain, lighting, and pins are procedural Canvas 2D artwork written for
this project. The favicon is original SVG geometry. UI icons are simple inline
SVG paths or text symbols, with no third-party icon assets. The UI uses system fonts.

SNL, Saturday Night Live, and NBC names belong to their respective owners. The
site identifies itself as an independent fan project and does not claim endorsement.
