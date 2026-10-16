# ui

`primitives/` wraps React Aria Components with project styles; feature components use only that layer (design doc §4.1, §11.1.7). Step 1c owns `primitives/`, `motion/`, `navigation/` (the replaceable shell) and the brand elements; each feature step owns its own folder (`gallery/`, `prompt-detail/`, `detail-popup/`, `template-editor/`, …).
