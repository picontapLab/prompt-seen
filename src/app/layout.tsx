// Pass-through root layout. <html> is rendered one level down, by the language entry and by
// [locale]/layout.tsx, so every page gets its own lang and dir (design doc §8.6). Pages under
// [locale] that call notFound() need a [locale]/not-found.tsx without <html>; the root
// not-found.tsx renders a full document and is only used for unmatched URLs (404.html).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
