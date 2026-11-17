# Arabic RTL acceptance

Real nginx-served `/prompt-seen` preview artifacts were exercised in Chromium, Firefox and WebKit. The 137-test main run passed: 30 frozen searches per browser through an actual Worker, Arabic/Latin mixed query direction with raw URL preservation, template free text and tokens, exact Chromium clipboard text and cross-browser download bytes, draft restoration, physical KeyK with composition guard, raw HTML/SEO/source-only prompt output, and light/dark layout at 360/768/1024/1440px.

Additional runs passed 320px reflow in both themes, loaded IBM Plex Sans Arabic 600 faces, language-picker en→ar→en document and portal direction, and existing RTL popup ArrowLeft/ArrowRight navigation (12 tests). Worker-constructor failure falls back to the main thread and stale analyzer indexes show Arabic reload actions (6 tests). A collapsed mobile preview is expanded before checking its intentionally concealed actions.

The initial typography tests correctly failed because a zero-specificity Arabic token selector lost to :root's weight 700. The corrected selector requests the actually delivered 600 face and the three-engine font/layout checks pass. Screenshots in evidence/preview show the verified 320px light/dark renders. Physical left/right positions retained in annotation overlays and popup flight geometry describe image/DOM coordinates; ScrollRow already handles RTL scroll signs.

These are browser and automated accessibility checks, not screen-reader speech or native zoom sessions. Actual VoiceOver/NVDA Arabic speech, native 200% zoom and production/live flows remain explicitly pending. Final candidate matrix results are tracked in production-acceptance.json.
