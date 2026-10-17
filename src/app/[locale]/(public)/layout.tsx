import { enterLocale } from '@/i18n/locale';
import { DisplayFontStylesheet } from '@/styles/fonts/DisplayFontStylesheet';
import { Shell } from '@/ui/navigation/Shell';

// Public pages get the shell: header, the <main> landmark and footer (§15.5.2), and, in CJK
// locales, the build's display font subsets (§11.1.2). Pages render their content only.
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return (
    <>
      <DisplayFontStylesheet code={entry.code} />
      <Shell locale={entry}>{children}</Shell>
    </>
  );
}
