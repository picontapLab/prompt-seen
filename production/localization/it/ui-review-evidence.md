# Italian UI review

Reviewer: AI Codex, the same agent that authored the translations. This is not independent human or native-speaker review.

Compared the English source messages in all 14 namespaces with the Italian translations, including actions, errors, licensing scope, original-Prompt language warnings, device-local favorites, unknown model provenance and template values without a recorded result. The 427 message leaves retain their arguments and meaning. Portrait/landscape aspect ratios use Verticale/Orizzontale rather than subject names. Template labels distinguish modello di prompt from modello di IA.

The actual ICU tests passed: compiled and runtime output agree, including 0, 1, 2, 21, 1.5 and 1000000; zero search results and zero remaining tokens have explicit wording; typographic apostrophes do not consume the required-field label. The targeted search/format/language tests also passed (67 tests). These checks do not constitute browser or layout acceptance.

Untranslated leaves are individually justified in reviews.json: technical filename and dimension/count/label patterns, the invariant Italian loanword Prompt, and the Italian UI word Menu. No blanket prose exemption is used. Exact source and target hashes are recorded only after this text and ICU review.

Browser layout, real keyboard input, clipboard/download and font checks remain pending until an Italian preview artifact is available.
