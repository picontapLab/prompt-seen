# Candidate native zoom and font verification

Status: candidate native zoom and font verification complete. This is local candidate evidence; no deployment was performed. The root agent owns the separate full cross-browser acceptance matrix.

- Build ID: `c82dc12570e1af52bd7d4a967601fa84b061bbb7`, verified against local build metadata and HTTP `/generated/build.json`.
- Artifact: production, root base path, served at `http://127.0.0.1:8097`.
- Browser: Chromium `156.0.8078.4`.
- Run: `2026-11-11T14:00:24.653Z` through `2026-11-11T14:00:37.394Z`.

## Actual native 200% zoom

The isolated extension called `chrome.tabs.setZoom(tabId, 2)` on `/pt-br/templates/product-poster/` and `/pt-br/prompts/two-person-wedding-editorial/`. Outer width remained 1440; CSS viewport changed from 1440 × 993 to 720 × 496 and devicePixelRatio from 1 to 2. HTML/body CSS zoom stayed `1`; visualViewport scale stayed `1`. Both pages had scrollWidth = clientWidth = 720, zero detected layout problems, zero serious/critical axe violations, and zero captured page errors.

The template accepted `Luminária de latão — composição, iluminação e precisão`; Tab reached the next real button. Copy and download were visible and focusable; Enter downloaded `product-poster-v3.txt` (718 bytes). Prompt copy/save were visible and focusable; Enter saved the prompt (`aria-pressed=true`) and Tab reached Share. Direct CDP surface screenshots preserve the full physical width at native zoom.

## Fonts and initial requests

Four independent cold contexts covered Portuguese home, prompt detail, template, and English home. Each requested the same six Latin WOFF2 assets exactly once, all HTTP 200, totaling 126,020 bytes per page:

| Font | Bytes |
| --- | ---: |
| Fira Sans Extra Condensed 700 | 25,400 |
| IBM Plex Sans 400 | 22,588 |
| IBM Plex Sans 500 | 24,184 |
| IBM Plex Sans 600 | 24,252 |
| IBM Plex Mono 400 | 14,708 |
| IBM Plex Mono 500 | 14,888 |

CDP platform-font inspection of `h1`, `main p`, and `main h2` on each route reported only custom Fira Sans Extra Condensed / IBM Plex Sans / IBM Plex Mono glyphs, with no system fallback in those sampled nodes. All four initial-page request captures contained zero search-index requests and zero review/localization-evidence requests.

## Screenshot inspection and limits

All eight screenshots listed in `evidence.json` were inspected by the AI reviewer. The four native-zoom screenshots show full width, complete Portuguese text and wedding heading, readable diacritics, keyboard focus outlines and accessible controls. The four cold-page font screenshots show consistent typography, no visible missing glyphs or clipping, and source prompts correctly labeled as English. This is sampled Chromium automation plus AI screenshot review, not human native-browser review or whole-site/cross-browser certification.

The browser and isolated profile were closed/removed after execution. No source files, build output, or server state were modified by this verification pass.

## Retained screenshots

- [en-home-fonts.png](en-home-fonts.png)
- [p_115-native-200-controls.png](p_115-native-200-controls.png)
- [p_115-native-200-top.png](p_115-native-200-top.png)
- [pt-detail-fonts.png](pt-detail-fonts.png)
- [pt-home-fonts.png](pt-home-fonts.png)
- [pt-template-fonts.png](pt-template-fonts.png)
- [t_001-native-200-controls.png](t_001-native-200-controls.png)
- [t_001-native-200-top.png](t_001-native-200-top.png)

The JSON retains original capture paths as provenance; these relative links refer to the retained copies beside this report.
