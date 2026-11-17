# Independent AI engineering acceptance

Reviewer: Codex subagent `/root/rtl_acceptance`. Inspected 2026-11-17 against worktree baseline `53cbc8efce854f8f067acef8372daf49be82f9c3`.

This is a static code/spec review plus inspection of existing test logs. No build, browser interaction, native zoom, media inspection, or screen-reader session was performed by this reviewer.

## Evidence examined

- Arabic spec sections 4–7; search analyzer/profile/index changes; template field and TokenInput direction; font declarations and typography tokens; interpolation helper and detail metadata changes.
- `/tmp/arabic-template-green.log`: 3 Chromium tests passed (state assertion, mixed template input/copy/download/draft restoration, mixed search direction/query preservation).
- `/tmp/arabic-shortcut-red.log`: physical KeyK test failed against the previous artifact, supporting the shortcut change's red phase. A later green run is still required.
- `/tmp/arabic-focused.log`: 58 focused tests passed. This does not prove the full corpus or real Worker search acceptance.

## Findings sent to implementer

1. Spec §5.1 requires known technical values and inline code to have LTR isolation. The reviewed RichText inline code uses `dir="auto"`; TestInfo also renders dimensions/aspect ratios using automatic direction. Use explicit LTR boundaries for technical values, retaining auto for unknown human text. Check actual mixed punctuation examples in browsers.
2. The inspected evidence does not cover the required three-engine layout/font/interaction matrix, frozen full-corpus search/Worker cases, native 200% browser zoom, or screen-reader behavior. These must remain separate pending checks until actually performed.

## Positive checks

Arabic digit folding changes only indexed/search terms and leaves displayed strings intact. Whole-phrase matching prevents Arabic aliases from forming across punctuation or field boundaries. Analyzer version increments for index compatibility. Template rendering/copy functions and canonical stored values are unchanged; DOM isolation is at variable boundaries and retains the existing `closest('[data-field]')` click handling. Fonts declare actual Arabic 400/500/600 weights without preload; Arabic display now requests the delivered 600 weight. Enabled remains false.

This record is not an approval of unreviewed content or a replacement for human language/screen-reader acceptance.
