# ui

`primitives/` wraps React Aria Components with project styles; feature components use only that
layer (design doc §4.1, §11.1.7). `brand/` holds the brand elements (film edge, frame number,
crop marks, wordmark), `motion/` the Motion provider and presets, `navigation/` the root document
and the replaceable shell. These belong to step 1c; each feature step owns its own folder
(`gallery/`, `prompt-detail/`, `detail-popup/`, `template-editor/`, …).

Import by file (`@/ui/primitives/Button`): there are no index files, so a server component never
pulls every client component into the first load. Stories sit next to components.
