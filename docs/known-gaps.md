# Known gaps

Check Grammar does **not** claim Google Docs support in v1. Docs uses a canvas and gated annotation APIs reserved for a handful of vendors.

## Overlay targets we aim to support

| Surface | Status |
| --- | --- |
| Web editor in this repo | Supported |
| `textarea` and `contenteditable` on many sites | Extension overlay; test in `apps/extension` |
| Gmail compose | Best-effort; DOM is hostile |
| Notion | Best-effort |
| Reddit | Best-effort (`!important` overlay host) |
| Google Docs | **Unsupported** (documented, not a bug) |
| Microsoft Word | Later, Office.js |

If a site breaks the overlay, file an issue with the URL and a screenshot. Do not wrap the page's own DOM nodes (that corrupts React/ProseMirror). We paint underlines on a transparent overlay using `Range.getClientRects()`.
