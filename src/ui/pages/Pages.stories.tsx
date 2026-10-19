import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LanguageChooser, type LanguageRow } from './LanguageChooser';
import { TableOfContents } from './TableOfContents';

// Client islands of step 3e (design doc §8.2, §11.8.5). The pages themselves are server
// components reading the content model; see them in the built site.

const rows: LanguageRow[] = [
  {
    code: 'en',
    htmlLang: 'en',
    dir: 'ltr',
    nativeName: 'English',
    href: '/en/',
    tagline: 'Tested image prompts and templates',
    suggested: 'Suggested for your browser',
    continueLabel: 'Continue in English',
  },
  {
    code: 'zh-Hans',
    htmlLang: 'zh-Hans',
    dir: 'ltr',
    nativeName: '简体中文',
    href: '/zh-hans/',
    tagline: '经过实测的图像提示词与模板',
    suggested: '根据浏览器语言推荐',
    continueLabel: '继续使用简体中文',
  },
  {
    code: 'ja',
    htmlLang: 'ja',
    dir: 'ltr',
    nativeName: '日本語',
    href: '/ja/',
    tagline: '実際に試した画像プロンプトとテンプレート',
    suggested: 'ブラウザーの言語に基づくおすすめ',
    continueLabel: '日本語で続ける',
  },
  {
    code: 'ar',
    htmlLang: 'ar',
    dir: 'rtl',
    nativeName: 'العربية',
    href: '/ar/',
    tagline: 'أوامر صور وقوالب مجرّبة',
    suggested: 'مقترحة حسب لغة متصفحك',
    continueLabel: 'المتابعة باللغة العربية',
  },
];

const meta = { title: 'Pages/Islands', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Each language in its own words; the browser's language is marked after hydration. */
export const Languages: Story = {
  render: () => (
    <div style={{ maxInlineSize: '28rem' }}>
      <LanguageChooser rows={rows} />
    </div>
  ),
};

/** The contents list; the section being read carries the safelight bar (§11.1.9). */
export const Contents: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 15rem', gap: 32 }}>
      <div>
        {['How are prompts tested?', 'What are the sample entries?', 'How do I report a problem?'].map((h, i) => (
          <section key={h} style={{ blockSize: '60vh' }}>
            <h2 id={`s${i}`}>{h}</h2>
          </section>
        ))}
      </div>
      <aside style={{ display: 'block' }}>
        <TableOfContents
          label="On this page"
          items={[
            { id: 's0', text: 'How are prompts tested?' },
            { id: 's1', text: 'What are the sample entries?' },
            { id: 's2', text: 'How do I report a problem?' },
          ]}
        />
      </aside>
    </div>
  ),
};
