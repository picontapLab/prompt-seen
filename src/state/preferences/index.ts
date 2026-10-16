// Device preferences: theme now, later sort order and shortcut settings (design doc §11.6).
export { PREFERENCES_KEY, preferencesStore, type Preferences } from './store';
export { THEME_PREFERENCES, resolveTheme, themeInitScript, type ResolvedTheme, type ThemePreference } from './theme';
export { ThemeProvider, useThemePreference } from './theme-provider';
