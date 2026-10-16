# state

Small client stores with versioned local storage: `favorites/`, `preferences/` (design doc §11.5,
§11.6). `preferences/` holds the theme (step 1c): the store, the first-paint script and
`ThemeProvider`. Favorites: step 4c. Follow §11.6.1: one source of truth per kind of state; the
URL wins for anything addressable.
