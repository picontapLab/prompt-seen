# Candidate review resolutions

The Standards and Spec axes independently reviewed base 0306b74b66ab9bf1f76eb5061bc466c3ebf86325 through candidate 88701511f2fa653cb4cdafb773a222a6bb80fd7b.

Standards found no hard violations or implementation smells. Follow-up suggested separating hover from keyboard focus in the accessibility regression; the test now moves the pointer away and asserts hover ended before checking keyboard focus.

Spec found two P2 issues. The phrase-alias implementation used queryTerms, whose deduplication removed repeated words from source phrases. A real serialized-engine regression first failed, then passed after switching phrase construction to the ordered tokenize sequence; analyzer version is now 5. A separate Portuguese test now injects both clipboard API and legacy copy rejection, checks the exact original selected text and localized manual-copy guidance, and checks dismissal/focus restoration across all browsers.

Actual Chromium acceptance exposed two UI defects: multiple landscape reference thumbnails could force a 365px layout at 360px; and a quick-search frame number had 4.46:1 contrast on its focused background. Wrapping reference thumbnails and using the existing primary text color for focused/hovered frame numbers fix the measured causes. The original failure scenarios remain, expanded for light/dark themes and separate hover/focus states.

An existing language-switch test treated parentheses in Português (Brasil) as regex syntax. It now passes the native name as a literal accessible-name string. The initial root HTTP failures were caused by reusing an nginx process configured before Portuguese was enabled; candidate runs restart the reference server after rebuilding. These are test-environment/locator corrections, not product routing changes.

Initial interrupted root suite and focused failure logs are retained under .artifacts/localization/pt-BR; final results must supersede them only after actual reruns. No production deployment is claimed.
